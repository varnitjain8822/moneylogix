import prisma from '../config/prisma';
import { getStockPrice } from './marketData';

const SECTOR_MAP: Record<string, string> = {
  RELIANCE: 'Energy', TCS: 'IT', HDFCBANK: 'Banking', INFY: 'IT',
  ICICIBANK: 'Banking', SBIN: 'Banking', ITC: 'Consumer', BHARTIARTL: 'Telecom',
  KOTAKBANK: 'Banking', LT: 'Infrastructure', WIPRO: 'IT', TATAMOTORS: 'Automotive',
  SUNPHARMA: 'Healthcare', MARUTI: 'Automotive', AXISBANK: 'Banking',
};

async function getDefaultPortfolio(userId: string) {
  let portfolio = await prisma.portfolio.findFirst({ where: { userId } });
  if (!portfolio) {
    portfolio = await prisma.portfolio.create({
      data: { userId, name: 'Default Portfolio' },
    });
  }
  return portfolio;
}

const upsertPortfolioHolding = async (userId: string, symbol: string, quantity: number, avgPrice: number) => {
  const portfolio = await getDefaultPortfolio(userId);
  const sector = SECTOR_MAP[symbol] || 'Trading';
  const existingHolding = await prisma.holding.findFirst({
    where: { portfolioId: portfolio.id, symbol },
  });
  if (existingHolding) {
    const newQty = existingHolding.quantity + quantity;
    const newAvg = ((existingHolding.quantity * existingHolding.avgPrice) + (quantity * avgPrice)) / newQty;
    await prisma.holding.update({
      where: { id: existingHolding.id },
      data: { quantity: newQty, avgPrice: newAvg, currentPrice: avgPrice },
    });
  } else {
    await prisma.holding.create({
      data: {
        portfolioId: portfolio.id,
        symbol, quantity, avgPrice,
        currentPrice: avgPrice,
        sector,
        assetClass: 'Equity',
        buyDate: new Date(),
      },
    });
  }
};

const reducePortfolioHolding = async (userId: string, symbol: string, quantity: number) => {
  const portfolio = await prisma.portfolio.findFirst({ where: { userId } });
  if (!portfolio) return;
  const existingHolding = await prisma.holding.findFirst({
    where: { portfolioId: portfolio.id, symbol },
  });
  if (!existingHolding) return;
  const newQty = existingHolding.quantity - quantity;
  if (newQty <= 0) {
    await prisma.holding.delete({ where: { id: existingHolding.id } });
  } else {
    await prisma.holding.update({
      where: { id: existingHolding.id },
      data: { quantity: newQty },
    });
  }
};

export const executeTrade = async (userId: string, data: {
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  strategy?: string;
  notes?: string;
}) => {
  const total = data.quantity * data.price;
  const symbol = data.symbol.toUpperCase();

  // Update paper wallet if paper trading
  const paperWallet = await prisma.paperWallet.findUnique({ where: { userId } });
  if (paperWallet) {
    if (data.type === 'BUY') {
      if (paperWallet.balance < total) {
        throw new Error('Insufficient balance');
      }
      await prisma.paperWallet.update({
        where: { userId },
        data: { balance: paperWallet.balance - total },
      });

      const existingPosition = await prisma.paperPosition.findFirst({
        where: { walletId: paperWallet.id, symbol },
      });

      if (existingPosition) {
        const newQuantity = existingPosition.quantity + data.quantity;
        const newAvgPrice = ((existingPosition.quantity * existingPosition.avgPrice) + total) / newQuantity;
        await prisma.paperPosition.update({
          where: { id: existingPosition.id },
          data: { quantity: newQuantity, avgPrice: newAvgPrice },
        });
      } else {
        await prisma.paperPosition.create({
          data: { walletId: paperWallet.id, symbol, quantity: data.quantity, avgPrice: data.price },
        });
      }
    } else {
      const existingPosition = await prisma.paperPosition.findFirst({
        where: { walletId: paperWallet.id, symbol },
      });

      if (!existingPosition || existingPosition.quantity < data.quantity) {
        throw new Error('Insufficient shares');
      }

      const newQuantity = existingPosition.quantity - data.quantity;
      if (newQuantity === 0) {
        await prisma.paperPosition.delete({ where: { id: existingPosition.id } });
      } else {
        await prisma.paperPosition.update({
          where: { id: existingPosition.id },
          data: { quantity: newQuantity },
        });
      }

      await prisma.paperWallet.update({
        where: { userId },
        data: { balance: paperWallet.balance + total },
      });
    }
  }

  if (data.type === 'BUY') {
    await upsertPortfolioHolding(userId, symbol, data.quantity, data.price);
  } else {
    await reducePortfolioHolding(userId, symbol, data.quantity);
  }

  return prisma.trade.create({
    data: {
      userId,
      symbol,
      type: data.type,
      quantity: data.quantity,
      price: data.price,
      total,
      status: 'EXECUTED',
      strategy: data.strategy,
      notes: data.notes,
    },
  });
};

export const getTradeHistory = async (userId: string, days?: number) => {
  const where: any = { userId };
  if (days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    where.createdAt = { gte: startDate };
  }

  return prisma.trade.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
};

export const getTradeAnalytics = async (userId: string, days: number = 30) => {
  const trades = await getTradeHistory(userId, days);
  
  const buyTrades = trades.filter(t => t.type === 'BUY');
  const sellTrades = trades.filter(t => t.type === 'SELL');
  
  const totalTrades = trades.length;
  const buyCount = buyTrades.length;
  const sellCount = sellTrades.length;
  
  const totalVolume = trades.reduce((sum, t) => sum + t.total, 0);
  const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;

  // Group by symbol
  const tradesBySymbol: Record<string, { count: number; volume: number; pnl: number }> = {};
  for (const trade of trades) {
    if (!tradesBySymbol[trade.symbol]) {
      tradesBySymbol[trade.symbol] = { count: 0, volume: 0, pnl: 0 };
    }
    tradesBySymbol[trade.symbol].count++;
    tradesBySymbol[trade.symbol].volume += trade.total;
    if (trade.type === 'SELL') {
      tradesBySymbol[trade.symbol].pnl += trade.total;
    } else {
      tradesBySymbol[trade.symbol].pnl -= trade.total;
    }
  }

  return {
    totalTrades,
    buyCount,
    sellCount,
    totalVolume,
    avgTradeSize,
    tradesBySymbol,
    trades,
  };
};
