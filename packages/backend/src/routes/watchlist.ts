import { Router, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { AuthRequest } from '../middleware/auth';
import * as watchlistService from '../services/watchlistService';

const router = Router();

const createWatchlistSchema = z.object({
  name: z.string().min(1),
});

const addSymbolSchema = z.object({
  symbol: z.string().min(1),
});

router.post('/', validate(createWatchlistSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const watchlist = await watchlistService.createWatchlist(req.userId!, name);
    res.json(watchlist);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const watchlists = await watchlistService.getWatchlists(req.userId!);
    res.json(watchlists);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/symbols', validate(addSymbolSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { symbol } = req.body;
    const watchlistSymbol = await watchlistService.addSymbolToWatchlist(id, symbol);
    res.json(watchlistSymbol);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id/symbols/:symbol', async (req: AuthRequest, res: Response) => {
  try {
    const { id, symbol } = req.params;
    await watchlistService.removeSymbolFromWatchlist(id, symbol);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await watchlistService.deleteWatchlist(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
