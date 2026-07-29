import { create } from 'zustand';
import { connectSocket } from '../services/socket';
import { Stock } from '../types';

interface MarketState {
  stocks: Record<string, Stock>;
  connected: boolean;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  setStocks: (stocks: Stock[]) => void;
  init: () => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  stocks: {},
  connected: false,
  subscribe: (symbols) => {
    connectSocket().emit('subscribe-watchlist', symbols);
  },
  unsubscribe: (symbols) => {
    connectSocket().emit('unsubscribe-watchlist', symbols);
  },
  setStocks: (stocksList) => {
    set((state) => {
      const newStocks = { ...state.stocks };
      stocksList.forEach(s => {
        if (!newStocks[s.symbol]) newStocks[s.symbol] = s;
      });
      return { stocks: newStocks };
    });
  },
  init: () => {
    const socket = connectSocket();
    socket.on('connect', () => set({ connected: true }));
    socket.on('disconnect', () => set({ connected: false }));
    socket.on('price-update', (stock: Stock) => {
      set((state) => ({
        stocks: {
          ...state.stocks,
          [stock.symbol]: stock
        }
      }));
    });
  }
}));

// Initialize the store on creation
useMarketStore.getState().init();
