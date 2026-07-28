import prisma from '../config/prisma';
import { getStockPrice } from './marketData';

interface PositionHealth {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  healthScore: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  recommendations: string[];
  distanceToStopLoss: number;
  distanceToTarget: number;
  volatility: number;
}

export const analyzePositions = async (userId: string): Promise<PositionHealth[]> => {
  const paperWallet = await prisma.paperWallet.findUnique({
    where: { userId },
    include: { positions: true },
  });

  if (!paperWallet) return [];

  const positions: PositionHealth[] = [];

  for (const position of paperWallet.positions) {
    const stockPrice = getStockPrice(position.symbol);
    const currentPrice = stockPrice.price;
    const pnl = (currentPrice - position.avgPrice) * position.quantity;
    const pnlPercent = ((currentPrice - position.avgPrice) / position.avgPrice) * 100;

    // Calculate health score (0-100)
    let healthScore = 50;
    const recommendations: string[] = [];

    // P&L impact
    if (pnlPercent > 10) {
      healthScore += 20;
      recommendations.push('Consider booking partial profits');
    } else if (pnlPercent > 5) {
      healthScore += 10;
      recommendations.push('Position performing well, consider trailing stop');
    } else if (pnlPercent < -5) {
      healthScore -= 20;
      recommendations.push('Position in loss, review stop loss level');
    } else if (pnlPercent < -10) {
      healthScore -= 30;
      recommendations.push('Significant loss, consider exiting or averaging down');
    }

    // Distance to 52-week high/low
    const distanceToHigh = ((stockPrice.fiftyTwoWeekHigh - currentPrice) / stockPrice.fiftyTwoWeekHigh) * 100;
    const distanceToLow = ((currentPrice - stockPrice.fiftyTwoWeekLow) / stockPrice.fiftyTwoWeekLow) * 100;

    if (distanceToLow < 10) {
      healthScore -= 15;
      recommendations.push('Near 52-week low, high risk');
    }
    if (distanceToHigh < 10) {
      healthScore += 10;
      recommendations.push('Near 52-week high, consider booking profits');
    }

    // Determine status
    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    if (healthScore >= 70) {
      status = 'HEALTHY';
    } else if (healthScore >= 40) {
      status = 'WARNING';
    } else {
      status = 'CRITICAL';
    }

    // Add more recommendations based on analysis
    if (pnlPercent > 15 && status !== 'CRITICAL') {
      recommendations.push('Strong performer - consider adding to position');
    }
    if (pnlPercent < -15) {
      recommendations.push('Cut losses - position may continue to deteriorate');
    }

    positions.push({
      symbol: position.symbol,
      quantity: position.quantity,
      avgPrice: position.avgPrice,
      currentPrice,
      pnl,
      pnlPercent,
      healthScore: Math.max(0, Math.min(100, healthScore)),
      status,
      recommendations,
      distanceToStopLoss: Math.abs(pnlPercent), // Simplified
      distanceToTarget: Math.max(0, 15 - pnlPercent), // Simplified
      volatility: Math.abs(stockPrice.changePercent), // Simplified
    });
  }

  return positions.sort((a, b) => a.healthScore - b.healthScore);
};

export const getPositionDoctorSummary = async (userId: string) => {
  const positions = await analyzePositions(userId);
  
  const healthy = positions.filter(p => p.status === 'HEALTHY').length;
  const warning = positions.filter(p => p.status === 'WARNING').length;
  const critical = positions.filter(p => p.status === 'CRITICAL').length;
  
  const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
  const avgHealth = positions.length > 0 
    ? positions.reduce((sum, p) => sum + p.healthScore, 0) / positions.length 
    : 0;

  return {
    totalPositions: positions.length,
    healthy,
    warning,
    critical,
    totalPnL,
    avgHealth,
    positions,
  };
};
