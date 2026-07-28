import prisma from '../config/prisma';
import { getStockPrice } from './marketData';

export const executeTrade = async (userId: string, data: {
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  strategy?: string;
  notes?: string;
}) => {
  const total = data.quantity * data.price;
  
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

      // Update or create paper position
      const existingPosition = await prisma.paperPosition.findFirst({
        where: { walletId: paperWallet.id, symbol: data.symbol },
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
          data: { walletId: paperWallet.id, symbol: data.symbol, quantity: data.quantity, avgPrice: data.price },
        });
      }
    } else {
      // SELL
      const existingPosition = await prisma.paperPosition.findFirst({
        where: { walletId: paperWallet.id, symbol: data.symbol },
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

  return prisma.trade.create({
    data: {
      userId,
      symbol: data.symbol.toUpperCase(),
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
