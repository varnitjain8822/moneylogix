import { Router, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { AuthRequest } from '../middleware/auth';
import * as paperService from '../services/paperTradingService';
import * as achievementService from '../services/achievementService';

const router = Router();

const placeOrderSchema = z.object({
  symbol: z.string().min(1),
  type: z.enum(['MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LIMIT']),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().int().positive(),
  price: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
  strategy: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/order', validate(placeOrderSchema), async (req: AuthRequest, res: Response) => {
  try {
    const order = await paperService.placeOrder(req.userId!, req.body);
    const newAchievements = await achievementService.checkAchievements(req.userId!, order);
    res.json({ order, newAchievements });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/orders', async (req: AuthRequest, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string,
      symbol: req.query.symbol as string,
      side: req.query.side as string,
      days: req.query.days ? parseInt(req.query.days as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
    };
    const result = await paperService.getOrders(req.userId!, filters);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/orders/:id', async (req: AuthRequest, res: Response) => {
  try {
    const order = await paperService.getOrderById(req.userId!, req.params.id);
    res.json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/orders/:id/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const order = await paperService.cancelOrder(req.userId!, req.params.id);
    res.json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const summary = await paperService.getPaperTradingSummary(req.userId!);
    res.json(summary);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const history = await paperService.getPortfolioHistory(req.userId!, days);
    res.json(history);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/achievements', async (req: AuthRequest, res: Response) => {
  try {
    const [userAch, allAch] = await Promise.all([
      achievementService.getUserAchievements(req.userId!),
      achievementService.getAllAchievements(),
    ]);
    res.json({ userAchievements: userAch, allAchievements: allAch });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/analytics', async (req: AuthRequest, res: Response) => {
  try {
    const analytics = await paperService.getPaperTradingSummary(req.userId!);
    res.json(analytics);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
