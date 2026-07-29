import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as analyticsService from '../services/analyticsService';

const router = Router();

router.get('/performance', async (req: AuthRequest, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const data = await analyticsService.getPerformanceDashboard(req.userId!);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/risk', async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await analyticsService.getRiskMetrics(req.userId!);
    res.json(metrics);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/leaderboard', async (req: AuthRequest, res: Response) => {
  try {
    const users = await analyticsService.getLeaderboard();
    res.json(users);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
