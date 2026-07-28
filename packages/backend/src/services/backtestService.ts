import prisma from '../config/prisma';

export const runBacktest = async (strategyId: string, startDate: Date, endDate: Date) => {
  const strategy = await prisma.strategy.findUnique({ where: { id: strategyId } });
  if (!strategy) throw new Error('Strategy not found');

  // Simulate backtest results
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const equityCurve: { date: Date; value: number }[] = [];
  let currentValue = 1000000; // Starting capital
  let trades: any[] = [];

  // Generate simulated equity curve
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Simulate daily returns
    const dailyReturn = (Math.random() - 0.48) * 0.02; // Slightly positive bias
    currentValue *= (1 + dailyReturn);
    
    equityCurve.push({ date, value: currentValue });
  }

  // Calculate metrics
  const totalReturn = ((currentValue - 1000000) / 1000000) * 100;
  const dailyReturns = equityCurve.map((point, i) => {
    if (i === 0) return 0;
    return (point.value - equityCurve[i - 1].value) / equityCurve[i - 1].value;
  });

  const avgDailyReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
  const stdDev = Math.sqrt(dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / dailyReturns.length);
  const sharpeRatio = stdDev > 0 ? (avgDailyReturn / stdDev) * Math.sqrt(252) : 0;

  // Calculate max drawdown
  let maxDrawdown = 0;
  let peak = equityCurve[0].value;
  for (const point of equityCurve) {
    if (point.value > peak) peak = point.value;
    const drawdown = ((peak - point.value) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // Calculate win rate
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

  const result = await prisma.backtestResult.create({
    data: {
      strategyId,
      startDate,
      endDate,
      totalReturn,
      sharpeRatio,
      maxDrawdown,
      winRate,
      trades: trades,
      equityCurve: equityCurve.map(p => ({ date: p.date.toISOString(), value: p.value })),
    },
  });

  return {
    ...result,
    summary: {
      totalReturn: `${totalReturn.toFixed(2)}%`,
      sharpeRatio: sharpeRatio.toFixed(2),
      maxDrawdown: `${maxDrawdown.toFixed(2)}%`,
      winRate: `${winRate.toFixed(1)}%`,
      totalTrades: trades.length,
    },
  };
};

export const getBacktestResults = async (strategyId: string) => {
  return prisma.backtestResult.findMany({
    where: { strategyId },
    orderBy: { createdAt: 'desc' },
  });
};
