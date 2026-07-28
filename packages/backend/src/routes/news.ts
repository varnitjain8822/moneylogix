import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as newsService from '../services/newsService';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const symbol = req.query.symbol as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const news = await newsService.getNews(symbol, limit);
    res.json(news);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/sentiment', async (req: AuthRequest, res: Response) => {
  try {
    const symbol = req.query.symbol as string | undefined;
    const sentiment = await newsService.getSentimentSummary(symbol);
    res.json(sentiment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
