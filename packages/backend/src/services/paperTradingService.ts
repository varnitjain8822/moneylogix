import prisma from '../config/prisma';
import { getStockPrice, simulatePriceUpdate } from './marketData';

const FEE_RATE = 0.001;

function calculateFees(total: number): number {
  return Math.round(total * FEE_RATE * 100) / 100;
}

export async function placeOrder(userId: string, data: {
  symbol: string;
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LIMIT';
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  stopPrice?: number;
  strategy?: string;
  notes?: string;
}) {
  const symbol = data.symbol.toUpperCase();
  const stock = getStockPrice(symbol);
  if (stock.price === 0) {
    throw new Error(`Stock ${symbol} not found`);
  }

  let executionPrice: number;
  let status: string;

  if (data.type === 'MARKET') {
    executionPrice = stock.price;
    status = 'FILLED';
  } else if (data.type === 'LIMIT') {
    if (!data.price) throw new Error('Limit price required');
    executionPrice = data.price;
    const canFill = data.side === 'BUY'
      ? stock.price <= data.price
      : stock.price >= data.price;
    status = canFill ? 'FILLED' : 'PENDING';
  } else if (data.type === 'STOP_LOSS') {
    if (!data.stopPrice) throw new Error('Stop price required');
    executionPrice = data.stopPrice;
    const triggered = data.side === 'SELL'
      ? stock.price <= data.stopPrice
      : stock.price >= data.stopPrice;
    status = triggered ? 'FILLED' : 'PENDING';
  } else {
    if (!data.price || !data.stopPrice) throw new Error('Limit price and stop price required');
    executionPrice = data.price;
    const triggered = data.side === 'SELL'
      ? stock.price <= data.stopPrice
      : stock.price >= data.stopPrice;
    status = triggered ? 'FILLED' : 'PENDING';
  }

  const totalCost = data.quantity * executionPrice;
  const fees = calculateFees(totalCost);

  if (status === 'FILLED') {
    const totalWithFees = data.side === 'BUY' ? totalCost + fees : totalCost - fees;
    const paperWallet = await prisma.paperWallet.findUnique({ where: { userId } });

    if (!paperWallet) {
      throw new Error('Paper wallet not found');
    }

    if (data.side === 'BUY') {
      if (paperWallet.balance < totalWithFees) {
        throw new Error('Insufficient balance');
      }
      await prisma.paperWallet.update({
        where: { userId },
        data: { balance: paperWallet.balance - totalWithFees },
      });

      const existingPosition = await prisma.paperPosition.findFirst({
        where: { walletId: paperWallet.id, symbol },
      });
      if (existingPosition) {
        const newQty = existingPosition.quantity + data.quantity;
        const newAvg = ((existingPosition.quantity * existingPosition.avgPrice) + totalCost) / newQty;
        await prisma.paperPosition.update({
          where: { id: existingPosition.id },
          data: { quantity: newQty, avgPrice: newAvg },
        });
      } else {
        await prisma.paperPosition.create({
          data: { walletId: paperWallet.id, symbol, quantity: data.quantity, avgPrice: executionPrice },
        });
      }
    } else {
      const existingPosition = await prisma.paperPosition.findFirst({
        where: { walletId: paperWallet.id, symbol },
      });
      if (!existingPosition || existingPosition.quantity < data.quantity) {
        throw new Error('Insufficient shares');
      }
      const newQty = existingPosition.quantity - data.quantity;
      if (newQty === 0) {
        await prisma.paperPosition.delete({ where: { id: existingPosition.id } });
      } else {
        await prisma.paperPosition.update({
          where: { id: existingPosition.id },
          data: { quantity: newQty },
        });
      }
      await prisma.paperWallet.update({
        where: { userId },
        data: { balance: paperWallet.balance + totalCost },
      });
    }
  }

  const order = await prisma.paperOrder.create({
    data: {
      userId,
      symbol,
      type: data.type,
      side: data.side,
      quantity: data.quantity,
      price: data.price,
      stopPrice: data.stopPrice,
      filledQty: status === 'FILLED' ? data.quantity : 0,
      filledPrice: status === 'FILLED' ? executionPrice : null,
      totalCost: status === 'FILLED' ? totalCost : null,
      fees: status === 'FILLED' ? fees : 0,
      status: status as any,
      reason: status === 'PENDING' ? 'Awaiting price trigger' : undefined,
      strategy: data.strategy,
      notes: data.notes,
    },
  });

  if (status === 'FILLED') {
    await prisma.orderFill.create({
      data: {
        orderId: order.id,
        quantity: data.quantity,
        price: executionPrice,
        total: totalCost,
        fees,
      },
    });

    await syncPaperTradeToPortfolio(userId, data.side, symbol, data.quantity, executionPrice);
  }

  return order;
}

async function syncPaperTradeToPortfolio(userId: string, side: 'BUY' | 'SELL', symbol: string, quantity: number, price: number) {
  const SECTOR_MAP: Record<string, string> = {
    RELIANCE: 'Energy', TCS: 'IT', HDFCBANK: 'Banking', INFY: 'IT',
    ICICIBANK: 'Banking', SBIN: 'Banking', ITC: 'Consumer', BHARTIARTL: 'Telecom',
    KOTAKBANK: 'Banking', LT: 'Infrastructure', WIPRO: 'IT', TATAMOTORS: 'Automotive',
    SUNPHARMA: 'Healthcare', MARUTI: 'Automotive', AXISBANK: 'Banking',
  };

  let portfolio = await prisma.portfolio.findFirst({ where: { userId } });
  if (!portfolio) {
    portfolio = await prisma.portfolio.create({
      data: { userId, name: 'Default Portfolio' },
    });
  }

  if (side === 'BUY') {
    const existing = await prisma.holding.findFirst({
      where: { portfolioId: portfolio.id, symbol },
    });
    if (existing) {
      const newQty = existing.quantity + quantity;
      const newAvg = ((existing.quantity * existing.avgPrice) + (quantity * price)) / newQty;
      await prisma.holding.update({
        where: { id: existing.id },
        data: { quantity: newQty, avgPrice: newAvg, currentPrice: price },
      });
    } else {
      await prisma.holding.create({
        data: {
          portfolioId: portfolio.id,
          symbol, quantity, avgPrice: price,
          currentPrice: price,
          sector: SECTOR_MAP[symbol] || 'Trading',
          assetClass: 'Equity',
          buyDate: new Date(),
        },
      });
    }
  } else {
    const existing = await prisma.holding.findFirst({
      where: { portfolioId: portfolio.id, symbol },
    });
    if (existing) {
      const newQty = existing.quantity - quantity;
      if (newQty <= 0) {
        await prisma.holding.delete({ where: { id: existing.id } });
      } else {
        await prisma.holding.update({
          where: { id: existing.id },
          data: { quantity: newQty },
        });
      }
    }
  }
}

export async function cancelOrder(userId: string, orderId: string) {
  const order = await prisma.paperOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');
  if (order.userId !== userId) throw new Error('Unauthorized');
  if (order.status !== 'PENDING' && order.status !== 'PARTIALLY_FILLED') {
    throw new Error('Cannot cancel order with status: ' + order.status);
  }

  return prisma.paperOrder.update({
    where: { id: orderId },
    data: { status: 'CANCELLED', reason: 'Cancelled by user', updatedAt: new Date() },
  });
}

export async function getOrders(userId: string, filters?: {
  status?: string;
  symbol?: string;
  side?: string;
  days?: number;
  page?: number;
  pageSize?: number;
}) {
  const where: any = { userId };
  if (filters?.status) where.status = filters.status;
  if (filters?.symbol) where.symbol = filters.symbol.toUpperCase();
  if (filters?.side) where.side = filters.side;
  if (filters?.days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - filters.days);
    where.createdAt = { gte: startDate };
  }

  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;

  const [orders, total] = await Promise.all([
    prisma.paperOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { orderFills: true },
    }),
    prisma.paperOrder.count({ where }),
  ]);

  return { orders, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getOrderById(userId: string, orderId: string) {
  const order = await prisma.paperOrder.findUnique({
    where: { id: orderId },
    include: { orderFills: true },
  });
  if (!order) throw new Error('Order not found');
  if (order.userId !== userId) throw new Error('Unauthorized');
  return order;
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

  const totalInvested = positions.reduce((sum, p) => sum + p.investedValue, 0);
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  return {
    balance: wallet.balance,
    totalValue,
    totalPnl,
    totalPnLPercent: totalPnlPercent,
    buyingPower: wallet.balance,
    positions,
    positionsCount: positions.length,
  };
}

export async function getPortfolioHistory(userId: string, days: number = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const history = await prisma.portfolioHistory.findMany({
    where: {
      userId,
      createdAt: { gte: startDate, lte: endDate },
    },
    orderBy: { createdAt: 'asc' },
  });

  return history;
}

export async function checkAndFillPendingOrders(symbol: string) {
  const stock = getStockPrice(symbol);
  if (!stock || stock.price === 0) return { filledCount: 0 };

  const pendingOrders = await prisma.paperOrder.findMany({
    where: {
      symbol,
      status: 'PENDING',
    },
  });

  let filledCount = 0;

  for (const order of pendingOrders) {
    let shouldFill = false;
    let fillPrice = stock.price;

    if (order.type === 'LIMIT') {
      const limitPrice = order.price || 0;
      shouldFill = order.side === 'BUY' ? stock.price <= limitPrice : stock.price >= limitPrice;
      fillPrice = limitPrice;
    } else if (order.type === 'STOP_LOSS') {
      const stopPrice = order.stopPrice || 0;
      shouldFill = order.side === 'SELL' ? stock.price <= stopPrice : stock.price >= stopPrice;
      fillPrice = stock.price;
    } else if (order.type === 'STOP_LIMIT') {
      const stopPrice = order.stopPrice || 0;
      const limitPrice = order.price || 0;
      const triggered = order.side === 'SELL' ? stock.price <= stopPrice : stock.price >= stopPrice;
      if (triggered) {
        shouldFill = order.side === 'SELL' ? stock.price >= limitPrice : stock.price <= limitPrice;
        fillPrice = limitPrice;
      }
    }

    if (shouldFill) {
      const totalCost = order.quantity * fillPrice;
      const fees = calculateFees(totalCost);
      const wallet = await prisma.paperWallet.findUnique({ where: { userId: order.userId } });
      if (!wallet) continue;

      if (order.side === 'BUY') {
        const totalWithFees = totalCost + fees;
        if (wallet.balance < totalWithFees) continue;
        await prisma.paperWallet.update({
          where: { userId: order.userId },
          data: { balance: wallet.balance - totalWithFees },
        });

        const existingPos = await prisma.paperPosition.findFirst({
          where: { walletId: wallet.id, symbol },
        });
        if (existingPos) {
          const newQty = existingPos.quantity + order.quantity;
          const newAvg = ((existingPos.quantity * existingPos.avgPrice) + totalCost) / newQty;
          await prisma.paperPosition.update({ where: { id: existingPos.id }, data: { quantity: newQty, avgPrice: newAvg } });
        } else {
          await prisma.paperPosition.create({ data: { walletId: wallet.id, symbol, quantity: order.quantity, avgPrice: fillPrice } });
        }
      } else {
        const existingPos = await prisma.paperPosition.findFirst({ where: { walletId: wallet.id, symbol } });
        if (!existingPos || existingPos.quantity < order.quantity) {
          await prisma.paperOrder.update({ where: { id: order.id }, data: { status: 'REJECTED', reason: 'Insufficient shares at fill time' } });
          continue;
        }
        const newQty = existingPos.quantity - order.quantity;
        if (newQty === 0) {
          await prisma.paperPosition.delete({ where: { id: existingPos.id } });
        } else {
          await prisma.paperPosition.update({ where: { id: existingPos.id }, data: { quantity: newQty } });
        }
        await prisma.paperWallet.update({ where: { userId: order.userId }, data: { balance: wallet.balance + totalCost } });
      }

      await prisma.paperOrder.update({
        where: { id: order.id },
        data: {
          status: 'FILLED',
          filledQty: order.quantity,
          filledPrice: fillPrice,
          totalCost,
          fees,
          reason: 'Filled by price trigger',
          updatedAt: new Date(),
        },
      });

      await prisma.orderFill.create({
        data: { orderId: order.id, quantity: order.quantity, price: fillPrice, total: totalCost, fees },
      });

      await syncPaperTradeToPortfolio(order.userId, order.side, symbol, order.quantity, fillPrice);
      filledCount++;
    }
  }

  return { filledCount };
}

export async function savePortfolioSnapshot(userId: string, portfolioAnalytics: any) {
  await prisma.portfolioHistory.create({
    data: {
      userId,
      totalValue: portfolioAnalytics.totalValue,
      cash: portfolioAnalytics.cash,
      holdingsValue: portfolioAnalytics.holdingsValue,
      pnl: portfolioAnalytics.totalPnl,
      pnlPercent: portfolioAnalytics.totalPnLPercent,
      dayPnl: portfolioAnalytics.dayPnl || 0,
      dayPnlPercent: portfolioAnalytics.dayPnLPercent || 0,
    },
  });
}
