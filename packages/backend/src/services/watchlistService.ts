import prisma from '../config/prisma';
import { getStockPrice } from './marketData';

export const createWatchlist = async (userId: string, name: string) => {
  return prisma.watchlist.create({
    data: { userId, name },
  });
};

export const getWatchlists = async (userId: string) => {
  const watchlists = await prisma.watchlist.findMany({
    where: { userId },
    include: { symbols: true },
  });

  return watchlists.map(watchlist => ({
    ...watchlist,
    symbols: watchlist.symbols.map(s => ({
      ...s,
      ...getStockPrice(s.symbol),
    })),
  }));
};

export const addSymbolToWatchlist = async (watchlistId: string, symbol: string) => {
  return prisma.watchlistSymbol.create({
    data: { watchlistId, symbol: symbol.toUpperCase() },
  });
};

export const removeSymbolFromWatchlist = async (watchlistId: string, symbol: string) => {
  return prisma.watchlistSymbol.deleteMany({
    where: { watchlistId, symbol: symbol.toUpperCase() },
  });
};

export const deleteWatchlist = async (id: string) => {
  return prisma.watchlist.delete({ where: { id } });
};
