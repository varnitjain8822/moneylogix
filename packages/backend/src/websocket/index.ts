import { Server as SocketServer } from 'socket.io';
import { Server } from 'http';
import { simulatePriceUpdate } from '../services/marketData';

export const setupWebSocket = (server: Server) => {
  const io = new SocketServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join watchlist room
    socket.on('subscribe-watchlist', (symbols: string[]) => {
      symbols.forEach(symbol => {
        socket.join(`watchlist:${symbol}`);
      });
    });

    // Leave watchlist room
    socket.on('unsubscribe-watchlist', (symbols: string[]) => {
      symbols.forEach(symbol => {
        socket.leave(`watchlist:${symbol}`);
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Simulate price updates every 2 seconds
  setInterval(() => {
    const symbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'ITC', 'BHARTIARTL'];
    symbols.forEach(symbol => {
      const update = simulatePriceUpdate(symbol);
      if (update) {
        io.to(`watchlist:${symbol}`).emit('price-update', update);
      }
    });
  }, 2000);

  return io;
};
