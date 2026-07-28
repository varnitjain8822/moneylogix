import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as marketDataService from '../services/marketData';

const router = Router();

router.get('/stocks', async (req: AuthRequest, res: Response) => {
  try {
    const stocks = marketDataService.getAllStocks();
    res.json(stocks);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/stocks/:symbol', async (req: AuthRequest, res: Response) => {
  try {
    const { symbol } = req.params;
    const stock = marketDataService.getStockPrice(symbol);
    res.json({ symbol, ...stock });
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

export default router;
