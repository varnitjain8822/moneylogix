import prisma from '../config/prisma';
import { getStockPrice } from './marketData';

export const createPortfolio = async (userId: string, name: string) => {
  return prisma.portfolio.create({
    data: { userId, name },
  });
};

export const getPortfolios = async (userId: string) => {
  return prisma.portfolio.findMany({
    where: { userId },
    include: { holdings: true },
  });
};

export const addHolding = async (portfolioId: string, data: {
  symbol: string;
  quantity: number;
  avgPrice: number;
  sector?: string;
  assetClass?: string;
  buyDate: Date;
}) => {
  return prisma.holding.create({
    data: { portfolioId, ...data, currentPrice: data.avgPrice },
  });
};

export const getPortfolioAnalytics = async (userId: string) => {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId },
    include: { holdings: true },
  });

  const allHoldings = portfolios.flatMap(p => p.holdings);

  // Calculate P&L
  let totalInvested = 0;
  let currentValue = 0;
  const sectorAllocation: Record<string, number> = {};
  const assetAllocation: Record<string, number> = {};

  for (const holding of allHoldings) {
    const stockPrice = getStockPrice(holding.symbol);
    const investedValue = holding.quantity * holding.avgPrice;
    const currentHoldingValue = holding.quantity * (stockPrice.price || holding.currentPrice);
    
    totalInvested += investedValue;
    currentValue += currentHoldingValue;

    if (holding.sector) {
      sectorAllocation[holding.sector] = (sectorAllocation[holding.sector] || 0) + currentHoldingValue;
    }
    if (holding.assetClass) {
      assetAllocation[holding.assetClass] = (assetAllocation[holding.assetClass] || 0) + currentHoldingValue;
    }
  }

  const totalPnL = currentValue - totalInvested;
  const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  // Convert allocations to percentages
  const sectorAllocationPercent: Record<string, number> = {};
  for (const [sector, value] of Object.entries(sectorAllocation)) {
    sectorAllocationPercent[sector] = (value / currentValue) * 100;
  }

  return {
    totalInvested,
    currentValue,
    totalPnL,
    totalPnLPercent,
    holdingsCount: allHoldings.length,
    sectorAllocation: sectorAllocationPercent,
    assetAllocation,
  };
};
