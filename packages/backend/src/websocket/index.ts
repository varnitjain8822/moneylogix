import { Server as SocketServer } from 'socket.io';
import { Server } from 'http';
import { checkAndFillPendingOrders } from '../services/paperTradingService';

export const setupWebSocket = (server: Server) => {
  const io = new SocketServer(server, {
    cors: {
      origin: '*', // Allow all origins for dev environment (Vite ports can change)
      methods: ['GET', 'POST'],
    },
  });

  const activeSymbols = new Set<string>([
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS', 
    'SBIN.NS', 'ITC.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS', 'LT.NS', 
    'WIPRO.NS', 'TATAMOTORS.NS', 'SUNPHARMA.NS', 'MARUTI.NS', 'AXISBANK.NS'
  ]);
  const clientSubscriptions = new Map<string, Set<string>>();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    clientSubscriptions.set(socket.id, new Set<string>());

    socket.on('subscribe-watchlist', (symbols: string[]) => {
      const subs = clientSubscriptions.get(socket.id)!;
      symbols.forEach(symbol => {
        socket.join(`watchlist:${symbol}`);
        subs.add(symbol);
        activeSymbols.add(symbol);
      });
    });

    socket.on('unsubscribe-watchlist', (symbols: string[]) => {
      const subs = clientSubscriptions.get(socket.id)!;
      symbols.forEach(symbol => {
        socket.leave(`watchlist:${symbol}`);
        subs.delete(symbol);
      });
      // Optionally prune activeSymbols here if no clients are subscribed, 
      // but keeping them is harmless for a small demo.
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      clientSubscriptions.delete(socket.id);
    });
  });

  // Fetch real price updates every 2 seconds and emit
  setInterval(async () => {
    try {
      if (activeSymbols.size === 0) return;
      const symbolsArray = Array.from(activeSymbols);
      
      const { getMultiQuotes } = await import('../services/realMarketData');
      
      // Yahoo finance can handle up to a certain chunk, but for demo we just fetch all
      const updates = await getMultiQuotes(symbolsArray);
      
      for (const update of updates) {
        if (update && update.symbol) {
          io.to(`watchlist:${update.symbol}`).emit('price-update', update);
          io.emit('price-update', update);
          try {
            const result = await checkAndFillPendingOrders(update.symbol);
            if (result.filledCount > 0) {
              io.emit('order-filled', { symbol: update.symbol, count: result.filledCount });
            }
          } catch (err) {
            // silently handle order fill errors
          }
        }
      }
    } catch (err) {
      console.error('Error in websocket interval:', err);
    }
  }, 2000);

  return io;
};

