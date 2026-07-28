import { Router, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { AuthRequest } from '../middleware/auth';
import * as strategyService from '../services/strategyService';

const router = Router();

const createStrategySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  rules: z.any(),
  riskAppetite: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE']),
});

router.post('/', validate(createStrategySchema), async (req: AuthRequest, res: Response) => {
  try {
    const strategy = await strategyService.createStrategy(req.userId!, req.body);
    res.json(strategy);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const strategies = await strategyService.getStrategies(req.userId!);
    res.json(strategies);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/recommendations', async (req: AuthRequest, res: Response) => {
  try {
    const recommendations = await strategyService.getStrategyRecommendations(req.userId!);
    res.json(recommendations);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const strategy = await strategyService.updateStrategy(id, req.body);
    res.json(strategy);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await strategyService.deleteStrategy(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
