import prisma from '../config/prisma';
import { getStockPrice, getHistoricalData } from './marketData';

export async function getPerformanceDashboard(userId: string) {
  const summary = await getPaperTradingSummary(userId);
  const orders = await prisma.paperOrder.findMany({
    where: { userId, status: 'FILLED' },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const history = await prisma.portfolioHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    take: 90,
  });

  const totalTrades = orders.length;
  const buyTrades = orders.filter(o => o.side === 'BUY');
  const sellTrades = orders.filter(o => o.side === 'SELL');

  const pnlTrades = sellTrades.map(sell => {
    const buy = buyTrades.find(b => b.symbol === sell.symbol);
    return {
      symbol: sell.symbol,
      side: 'SELL',
      quantity: sell.quantity,
      buyPrice: buy?.filledPrice || 0,
      sellPrice: sell.filledPrice || 0,
      pnl: ((sell.filledPrice || 0) * sell.quantity) - ((buy?.filledPrice || sell.filledPrice || 0) * sell.quantity),
      buyDate: buy?.createdAt,
      sellDate: sell.createdAt,
    };
  });

  const winningTrades = pnlTrades.filter(t => t.pnl > 0).length;
  const losingTrades = pnlTrades.filter(t => t.pnl <= 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const totalPnl = pnlTrades.reduce((sum, t) => sum + t.pnl, 0);
  const bestTrade = pnlTrades.length > 0 ? pnlTrades.reduce((a, b) => a.pnl > b.pnl ? a : b) : null;
  const worstTrade = pnlTrades.length > 0 ? pnlTrades.reduce((a, b) => a.pnl < b.pnl ? a : b) : null;

  const avgHoldingTime = sellTrades.length > 0
    ? sellTrades.reduce((sum, sell) => {
        const buy = buyTrades.find(b => b.symbol === sell.symbol && b.createdAt);
        if (!buy?.createdAt) return sum;
        return sum + (sell.createdAt.getTime() - buy.createdAt.getTime()) / (1000 * 60 * 60);
      }, 0) / sellTrades.length
    : 0;

  const totalVolume = orders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
  const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;

  const pnlBySymbol: Record<string, number> = {};
  for (const order of orders) {
    if (!pnlBySymbol[order.symbol]) pnlBySymbol[order.symbol] = 0;
    if (order.side === 'SELL' && order.filledPrice) {
      pnlBySymbol[order.symbol] += order.filledQty * order.filledPrice;
    } else if (order.side === 'BUY') {
      pnlBySymbol[order.symbol] -= order.totalCost || 0;
    }
  }

  const equityCurve = history.map(h => ({
    date: h.createdAt.toISOString().split('T')[0],
    value: h.totalValue,
  }));

  const dailyReturns = history.map((h, i) => {
    if (i === 0) return 0;
    const prev = history[i - 1].totalValue;
    return prev > 0 ? ((h.totalValue - prev) / prev) * 100 : 0;
  });

  const avgDailyReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length || 0;
  const stdDevDaily = Math.sqrt(
    dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / dailyReturns.length || 1
  );
  const sharpeRatio = stdDevDaily > 0 ? (avgDailyReturn / stdDevDaily) * Math.sqrt(252) : 0;

  let peak = summary?.totalValue || 0;
  let maxDrawdown = 0;
  for (const h of history) {
    if (h.totalValue > peak) peak = h.totalValue;
    const dd = peak > 0 ? ((peak - h.totalValue) / peak) * 100 : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const totalReturn = history.length > 1
    ? ((history[history.length - 1].totalValue - history[0].totalValue) / history[0].totalValue) * 100
    : 0;

  return {
    summary,
    totalTrades,
    buyCount: buyTrades.length,
    sellCount: sellTrades.length,
    totalPnl,
    winRate,
    winningTrades,
    losingTrades,
    bestTrade,
    worstTrade,
    avgHoldingTime: Math.round(avgHoldingTime * 10) / 10,
    totalVolume,
    avgTradeSize,
    pnlBySymbol,
    equityCurve,
    dailyReturns,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
  };
}

export async function getPaperTradingSummary(userId: string) {
  const wallet = await prisma.paperWallet.findUnique({
    where: { userId },
    include: { positions: true },
  });

  if (!wallet) return null;

  let totalValue = wallet.balance;
  let totalPnl = 0;
  const positions = wallet.positions.map(pos => {
    const stock = getStockPrice(pos.symbol);
    const currentValue = pos.quantity * (stock.price || 0);
    const investedValue = pos.quantity * pos.avgPrice;
    const unrealizedPnl = currentValue - investedValue;
    totalValue += currentValue;
    totalPnl += unrealizedPnl;
    return {
      ...pos,
      currentPrice: stock.price || 0,
      change: stock.change || 0,
      changePercent: stock.changePercent || 0,
      marketValue: currentValue,
      investedValue,
      unrealizedPnl,
      unrealizedPnlPercent: investedValue > 0 ? (unrealizedPnl / investedValue) * 100 : 0,
    };
  });

  return {
    balance: wallet.balance,
    totalValue,
    totalPnl,
    totalPnLPercent: totalValue > 0 ? (totalPnl / totalValue) * 100 : 0,
    buyingPower: wallet.balance,
    positions,
    positionsCount: positions.length,
  };
}

export async function getRiskMetrics(userId: string) {
  const summary = await getPaperTradingSummary(userId);
  const orders = await prisma.paperOrder.findMany({
    where: { userId, status: 'FILLED' },
  });

  const sectorAllocation: Record<string, number> = {};
  const positionSizes: number[] = [];

  if (summary?.positions) {
    for (const pos of summary.positions) {
      const stock = getStockPrice(pos.symbol);
      const sector = stock.price > 0 ? 'Trading' : 'Unknown';
      sectorAllocation[sector] = (sectorAllocation[sector] || 0) + pos.marketValue;
      positionSizes.push(pos.marketValue);
    }
  }

  const totalValue = summary?.totalValue || 0;
  const maxPositionSize = positionSizes.length > 0 ? Math.max(...positionSizes) : 0;
  const diversificationScore = positionSizes.length > 0
    ? Math.min(100, (Object.keys(sectorAllocation).length / 5) * 100)
    : 0;

  const cashAllocation = totalValue > 0 ? (summary?.balance || 0) / totalValue * 100 : 100;
  const equityAllocation = totalValue > 0 ? 100 - cashAllocation : 0;

  const volatility = orders.length >= 2
    ? orders.reduce((sum, o) => {
        const returns = o.filledPrice ? (o.totalCost || 0) / o.quantity : 0;
        return sum + Math.abs(returns);
      }, 0) / orders.length
    : 0;

  return {
    diversificationScore: Math.round(diversificationScore),
    sectorAllocation,
    cashAllocation: Math.round(cashAllocation * 10) / 10,
    equityAllocation: Math.round(equityAllocation * 10) / 10,
    maxPositionSize,
    positionCount: positionSizes.length,
    avgPositionSize: positionSizes.length > 0
      ? positionSizes.reduce((a, b) => a + b, 0) / positionSizes.length
      : 0,
    volatility: Math.round(volatility * 100) / 100,
    totalExposure: totalValue - (summary?.balance || 0),
    positions: summary?.positions || [],
    positionsCount: positionSizes.length,
  };
}

export async function getLeaderboard() {
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      paperWallet: {
        select: {
          balance: true,
          positions: true,
        },
      },
      paperOrders: {
        where: { status: 'FILLED' },
        select: { id: true, symbol: true, side: true, quantity: true, filledPrice: true, totalCost: true, fees: true },
      },
    },
  });

  const leaderboard = allUsers.map(user => {
    const orders = user.paperOrders;
    const balance = user.paperWallet?.balance || 0;
    let positionsValue = 0;
    if (user.paperWallet?.positions) {
      for (const pos of user.paperWallet.positions) {
        const estimatedPrice = pos.avgPrice * 1.02;
        positionsValue += pos.quantity * estimatedPrice;
      }
    }
    const totalPortfolioValue = balance + positionsValue;
    const totalTrades = orders.length;
    const buyOrders = orders.filter(o => o.side === 'BUY');
    const sellOrders = orders.filter(o => o.side === 'SELL');
    const totalVolume = orders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
    const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;

    return {
      userId: user.id,
      name: user.name || user.email,
      totalPortfolioValue,
      cash: balance,
      positionsValue,
      totalTrades,
      buyCount: buyOrders.length,
      sellCount: sellOrders.length,
      avgTradeSize,
      totalVolume,
      winRate: totalTrades > 0 ? Math.round((sellOrders.length / totalTrades) * 100) : 0,
      rank: 0,
    };
  });

  leaderboard.sort((a, b) => b.totalPortfolioValue - a.totalPortfolioValue);
  leaderboard.forEach((user, i) => { user.rank = i + 1; });

  return leaderboard;
}
