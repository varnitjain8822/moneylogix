import prisma from '../config/prisma';

export const createStrategy = async (userId: string, data: {
  name: string;
  description?: string;
  rules: any;
  riskAppetite: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
}) => {
  return prisma.strategy.create({
    data: { userId, ...data },
  });
};

export const getStrategies = async (userId: string) => {
  return prisma.strategy.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

export const getStrategyRecommendations = async (userId: string) => {
  const riskProfile = await prisma.riskProfile.findUnique({ where: { userId } });
  const riskAppetite = riskProfile?.riskAppetite || 'MODERATE';

  // Generate recommendations based on risk appetite
  const recommendations = {
    CONSERVATIVE: [
      { type: 'DEBT_FUND', allocation: 40, rationale: 'Stable returns with low risk' },
      { type: 'BLUE_CHIP', allocation: 30, rationale: 'Large-cap stocks with consistent dividends' },
      { type: 'FIXED_DEPOSIT', allocation: 20, rationale: 'Guaranteed returns' },
      { type: 'GOLD', allocation: 10, rationale: 'Hedge against inflation' },
    ],
    MODERATE: [
      { type: 'INDEX_FUND', allocation: 35, rationale: 'Diversified market exposure' },
      { type: 'MID_CAP', allocation: 25, rationale: 'Growth potential with moderate risk' },
      { type: 'BLUE_CHIP', allocation: 20, rationale: 'Stability and dividends' },
      { type: 'DEBT_FUND', allocation: 15, rationale: 'Risk mitigation' },
      { type: 'GOLD', allocation: 5, rationale: 'Portfolio diversification' },
    ],
    AGGRESSIVE: [
      { type: 'SMALL_CAP', allocation: 30, rationale: 'High growth potential' },
      { type: 'MID_CAP', allocation: 25, rationale: 'Growth with some stability' },
      { type: 'SECTOR_FUND', allocation: 20, rationale: 'Targeted sector exposure' },
      { type: 'INDEX_FUND', allocation: 15, rationale: 'Market beta' },
      { type: 'CRYPTO', allocation: 10, rationale: 'High-risk high-reward' },
    ],
  };

  return {
    riskAppetite,
    recommendations: recommendations[riskAppetite],
    disclaimer: 'This is for educational purposes only. Consult a financial advisor before investing.',
  };
};

export const updateStrategy = async (id: string, data: any) => {
  return prisma.strategy.update({
    where: { id },
    data,
  });
};

export const deleteStrategy = async (id: string) => {
  return prisma.strategy.delete({ where: { id } });
};
