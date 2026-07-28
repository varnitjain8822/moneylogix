import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { AuthRequest } from '../middleware/auth';
import * as aiAdvisorService from '../services/aiAdvisorService';

const router = Router();

const createSessionSchema = z.object({
  type: z.enum(['AI_ADVISOR', 'RESEARCH', 'TRADE_COACH']),
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
});

router.post('/sessions', validate(createSessionSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.body;
    const session = await aiAdvisorService.createChatSession(req.userId!, type);
    res.json(session);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/sessions/:sessionId/messages', validate(sendMessageSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;
    const response = await aiAdvisorService.sendMessage(sessionId, content);
    res.json({ response });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/sessions/:sessionId/messages', async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const messages = await aiAdvisorService.getChatHistory(sessionId);
    res.json(messages);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
