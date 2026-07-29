import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as marketDataService from '../services/marketData';

const router = Router();

router.get('/stocks', async (req: AuthRequest, res: Response) => {
  try {
    const stocks = await marketDataService.getAllStocksReal();
    res.json(stocks);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/stocks/:symbol', async (req: AuthRequest, res: Response) => {
  try {
    const { symbol } = req.params;
    const stock = await marketDataService.getStockQuoteReal(symbol);
    res.json(stock);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/indices', async (req: AuthRequest, res: Response) => {
  try {
    const indices = marketDataService.getMarketIndices();
    res.json(indices);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const results = await marketDataService.searchStocks(q as string);
    res.json(results);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/market-news', async (req: AuthRequest, res: Response) => {
  try {
    const { symbol } = req.query;
    const marketNews = await marketDataService.getNews(symbol as string);
    res.json(marketNews);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/history/:symbol', async (req: AuthRequest, res: Response) => {
  try {
    const { symbol } = req.params;
    const days = req.query.days ? parseInt(req.query.days as string) : 90;
    const candles = await marketDataService.getHistoricalCandles(symbol, days);
    res.json({ symbol, bars: candles });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
