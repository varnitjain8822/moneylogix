import prisma from '../config/prisma';

const ACHIEVEMENTS = [
  { id: 'first_trade', name: 'First Trade', description: 'Execute your first paper trade', icon: '🎯', category: 'trading' },
  { id: 'ten_wins', name: 'Winning Streak', description: 'Complete 10 winning trades', icon: '🏆', category: 'trading' },
  { id: 'hundred_trades', name: 'Trading Pro', description: 'Complete 100 paper trades', icon: '⭐', category: 'trading' },
  { id: 'portfolio_doubled', name: ' doubled', description: 'Double your portfolio value', icon: '📈', category: 'performance' },
  { id: 'consistent_trader', name: 'Consistent Trader', description: 'Trade on 7 consecutive days', icon: '🔥', category: 'consistency' },
  { id: 'low_risk', name: 'Risk Manager', description: 'Maintain low risk exposure consistently', icon: '🛡️', category: 'risk' },
  { id: 'diversified', name: 'Diversified', description: 'Hold positions in 5+ different sectors', icon: '🌐', category: 'diversification' },
  { id: 'first_sell', name: 'Exit Strategy', description: 'Complete your first profitable sell trade', icon: '💰', category: 'trading' },
  { id: '50k_portfolio', name: 'Half a Million', description: 'Reach $50,000 portfolio value', icon: '💎', category: 'performance' },
  { id: '100k_portfolio', name: 'Millionaire', description: 'Reach $100,000 portfolio value', icon: '👑', category: 'performance' },
];

export async function checkAchievements(userId: string, _trade?: any) {
  const orders = await prisma.paperOrder.count({ where: { userId } });
  const filledOrders = await prisma.paperOrder.findMany({
    where: { userId, status: 'FILLED' },
  });

  const winningTrades = filledOrders.filter(o => (o.side === 'SELL' && o.filledPrice && o.totalCost && o.totalCost > 0)).length;
  const summary = await getSummaryForAchievements(userId);

  const existingAchievements = await prisma.achievement.findMany();
  if (existingAchievements.length === 0) {
    for (const ach of ACHIEVEMENTS) {
      await prisma.achievement.create({ data: ach });
    }
  }

  const results = [];

  for (const ach of ACHIEVEMENTS) {
    const alreadyUnlocked = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: ach.id } },
    });

    if (alreadyUnlocked) continue;

    let shouldUnlock = false;

    switch (ach.id) {
      case 'first_trade':
        shouldUnlock = orders >= 1;
        break;
      case 'ten_wins':
        shouldUnlock = winningTrades >= 10;
        break;
      case 'hundred_trades':
        shouldUnlock = orders >= 100;
        break;
      case 'portfolio_doubled':
        shouldUnlock = summary != null && summary.totalValue > 200000;
        break;
      case 'consistent_trader': {
        const recentOrders = filledOrders.filter(o => {
          const daysDiff = (Date.now() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= 7;
        });
        shouldUnlock = recentOrders.length >= 5;
        break;
      }
      case 'low_risk':
        shouldUnlock = summary != null && summary.totalPnl > 0 && summary.totalValue > 0;
        break;
      case 'diversified':
        shouldUnlock = summary != null && summary.positionsCount >= 5;
        break;
      case 'first_sell':
        shouldUnlock = filledOrders.some(o => o.side === 'SELL' && o.filledPrice !== null && o.totalCost !== null && o.totalCost > 0);
        break;
      case '50k_portfolio':
        shouldUnlock = summary != null && summary.totalValue >= 50000;
        break;
      case '100k_portfolio':
        shouldUnlock = summary != null && summary.totalValue >= 100000;
        break;
    }

    if (shouldUnlock) {
      try {
        await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: ach.id,
          },
        });
        results.push(ach);
      } catch {

      }
    }
  }

  return results;
}

async function getSummaryForAchievements(userId: string) {
  const wallet = await prisma.paperWallet.findUnique({
    where: { userId },
    include: { positions: true },
  });

  if (!wallet) return null;

  let totalValue = wallet.balance;
  for (const pos of wallet.positions) {
    totalValue += pos.quantity * pos.avgPrice * 1.05;
  }

  return {
    totalValue,
    positionsCount: wallet.positions.length,
    totalPnl: 0,
  };
}

export async function getUserAchievements(userId: string) {
  return prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
    orderBy: { unlockedAt: 'desc' },
  });
}

export async function getAllAchievements() {
  return prisma.achievement.findMany();
}
