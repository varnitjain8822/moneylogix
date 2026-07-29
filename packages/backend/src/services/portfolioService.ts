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

  const paperWallet = await prisma.paperWallet.findUnique({ where: { userId } });

  const allHoldings = portfolios.flatMap(p => p.holdings);

  const paperPositions = paperWallet
    ? await prisma.paperPosition.findMany({
        where: { walletId: paperWallet.id },
      })
    : [];

  // Build paper positions as portfolio-like entries
  const paperHoldings = paperPositions.map(pp => ({
    symbol: pp.symbol,
    quantity: pp.quantity,
    avgPrice: pp.avgPrice,
    currentPrice: pp.avgPrice,
    sector: undefined as string | undefined,
    assetClass: 'Paper Trade' as string,
    id: `paper-${pp.id}`,
    isPaperTrade: true,
  }));

  const combinedHoldings = [
    ...allHoldings.map(h => ({ ...h, isPaperTrade: false })),
    ...paperHoldings,
  ];

  let totalInvested = 0;
  let currentValue = 0;
  const sectorAllocation: Record<string, number> = {};
  const assetAllocation: Record<string, number> = {};

  for (const holding of combinedHoldings) {
    const stockPrice = getStockPrice(holding.symbol);
    const investedValue = holding.quantity * holding.avgPrice;
    const currentHoldingValue = holding.quantity * (stockPrice.price || holding.currentPrice);

    totalInvested += investedValue;
    currentValue += currentHoldingValue;

    const sector = holding.sector || (holding.isPaperTrade ? 'Paper Trading' : 'Unknown');
    if (sector) {
      sectorAllocation[sector] = (sectorAllocation[sector] || 0) + currentHoldingValue;
    }
    const assetClass = holding.assetClass || (holding.isPaperTrade ? 'Paper Trade' : 'Unknown');
    if (assetClass) {
      assetAllocation[assetClass] = (assetAllocation[assetClass] || 0) + currentHoldingValue;
    }
  }

  const totalPnL = currentValue - totalInvested;
  const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  const sectorAllocationPercent: Record<string, number> = {};
  for (const [sector, value] of Object.entries(sectorAllocation)) {
    sectorAllocationPercent[sector] = (value / currentValue) * 100;
  }

  const detailedHoldings = combinedHoldings.map(holding => {
    const stock = getStockPrice(holding.symbol);
    const currentPrice = stock.price || holding.currentPrice;
    const invested = holding.quantity * holding.avgPrice;
    const currentVal = holding.quantity * currentPrice;
    const pnl = currentVal - invested;
    const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
    return {
      ...holding,
      currentPrice,
      change: stock.change || 0,
      changePercent: stock.changePercent || 0,
      currentValue: currentVal,
      investedValue: invested,
      pnl,
      pnlPercent,
    };
  });

  const paperBalance = paperWallet ? paperWallet.balance : 0;

  return {
    totalInvested,
    currentValue,
    totalPnL,
    totalPnLPercent,
    holdingsCount: combinedHoldings.length,
    holdings: detailedHoldings,
    sectorAllocation: sectorAllocationPercent,
    assetAllocation,
    paperBalance,
    paperPositionsCount: paperPositions.length,
  };
};
