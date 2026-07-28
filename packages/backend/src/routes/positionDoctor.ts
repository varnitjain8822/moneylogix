import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as positionDoctorService from '../services/positionDoctorService';
import { getHistoricalData } from '../services/marketData';
import prisma from '../config/prisma';

const router = Router();

router.get('/positions', async (req: AuthRequest, res: Response) => {
  try {
    const positions = await positionDoctorService.analyzePositions(req.userId!);
    res.json(positions);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const summary = await positionDoctorService.getPositionDoctorSummary(req.userId!);
    res.json(summary);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/history/:symbol', async (req: AuthRequest, res: Response) => {
  try {
    const { symbol } = req.params;
    const days = parseInt(req.query.days as string) || 90;
    const data = getHistoricalData(symbol, days);
    if (!data) return res.status(404).json({ error: 'Symbol not found' });
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/all-history', async (req: AuthRequest, res: Response) => {
  try {
    const wallet = await prisma.paperWallet.findUnique({
      where: { userId: req.userId! },
      include: { positions: true },
    });
    if (!wallet) return res.json([]);

    const days = parseInt(req.query.days as string) || 90;
    const allData = wallet.positions.map(p => getHistoricalData(p.symbol, days)).filter(Boolean);
    res.json(allData);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
