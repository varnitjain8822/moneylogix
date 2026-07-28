import { Router, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { AuthRequest } from '../middleware/auth';
import * as tradeService from '../services/tradeService';

const router = Router();

const executeTradeSchema = z.object({
  symbol: z.string().min(1),
  type: z.enum(['BUY', 'SELL']),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  strategy: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/execute', validate(executeTradeSchema), async (req: AuthRequest, res: Response) => {
  try {
    const trade = await tradeService.executeTrade(req.userId!, req.body);
    res.json(trade);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : undefined;
    const trades = await tradeService.getTradeHistory(req.userId!, days);
    res.json(trades);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/analytics', async (req: AuthRequest, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const analytics = await tradeService.getTradeAnalytics(req.userId!, days);
    res.json(analytics);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
