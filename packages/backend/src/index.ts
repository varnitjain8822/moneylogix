import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from './config';
import { authenticate } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { setupWebSocket } from './websocket';
import { logger } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth';
import watchlistRoutes from './routes/watchlist';
import portfolioRoutes from './routes/portfolio';
import tradeRoutes from './routes/trade';
import marketDataRoutes from './routes/marketData';
import positionDoctorRoutes from './routes/positionDoctor';
import strategyRoutes from './routes/strategy';
import aiAdvisorRoutes from './routes/aiAdvisor';
import newsRoutes from './routes/news';
import backtestRoutes from './routes/backtest';
import agentRoutes from './routes/agents';
import paperOrderRoutes from './routes/paperOrder';
import analyticsRoutes from './routes/analytics';

const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/watchlists', authenticate, watchlistRoutes);
app.use('/api/portfolios', authenticate, portfolioRoutes);
app.use('/api/trades', authenticate, tradeRoutes);
app.use('/api/market', authenticate, marketDataRoutes);
app.use('/api/position-doctor', authenticate, positionDoctorRoutes);
app.use('/api/strategies', authenticate, strategyRoutes);
app.use('/api/ai', authenticate, aiAdvisorRoutes);
app.use('/api/news', authenticate, newsRoutes);
app.use('/api/backtest', authenticate, backtestRoutes);
app.use('/api/agents', authenticate, agentRoutes);
app.use('/api/paper', authenticate, paperOrderRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// WebSocket
setupWebSocket(server);

// Start server
server.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
  console.log(`🚀 MoneyLogix API running on http://localhost:${config.port}`);
});

export default app;
