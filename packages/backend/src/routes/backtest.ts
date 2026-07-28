import { Router, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { AuthRequest } from '../middleware/auth';
import * as backtestService from '../services/backtestService';

const router = Router();

const runBacktestSchema = z.object({
  strategyId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

router.post('/run', validate(runBacktestSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { strategyId, startDate, endDate } = req.body;
    const result = await backtestService.runBacktest(
      strategyId,
      new Date(startDate),
      new Date(endDate)
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/strategy/:strategyId', async (req: AuthRequest, res: Response) => {
  try {
    const { strategyId } = req.params;
    const results = await backtestService.getBacktestResults(strategyId);
    res.json(results);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
