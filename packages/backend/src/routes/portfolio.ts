import { Router, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { AuthRequest } from '../middleware/auth';
import * as portfolioService from '../services/portfolioService';

const router = Router();

const createPortfolioSchema = z.object({
  name: z.string().min(1),
});

const addHoldingSchema = z.object({
  symbol: z.string().min(1),
  quantity: z.number().int().positive(),
  avgPrice: z.number().positive(),
  sector: z.string().optional(),
  assetClass: z.string().optional(),
  buyDate: z.string().datetime(),
});

router.post('/', validate(createPortfolioSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const portfolio = await portfolioService.createPortfolio(req.userId!, name);
    res.json(portfolio);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const portfolios = await portfolioService.getPortfolios(req.userId!);
    res.json(portfolios);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/holdings', validate(addHoldingSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const holding = await portfolioService.addHolding(id, req.body);
    res.json(holding);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/analytics', async (req: AuthRequest, res: Response) => {
  try {
    const analytics = await portfolioService.getPortfolioAnalytics(req.userId!);
    res.json(analytics);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
