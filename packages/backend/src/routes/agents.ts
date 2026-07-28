import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';
import { getStockPrice, getAllStocks, getMarketIndices } from '../services/marketData';
import { AgenticEngine, AgentNode, AgentInput, AgentOutput, GraphContext } from '../agents/engine';
import { GRAPHS } from '../agents/graph';
import {
  positionDoctorAgent, tradeAnalyzerAgent, strategyAdvisorAgent,
  newsSentimentAgent, marketOverviewAgent,
} from '../agents/tradingAgents';
import { competitorAnalysisAgent, marketAnalysisAgent } from '../agents/agents';

const router = Router();

// Helper: create a fresh engine, register agents, run
async function runGraphForUser(
  graphId: string,
  agent: AgentNode,
  input: AgentInput,
  reviewer?: AgentNode
): Promise<any> {
  const engine = new AgenticEngine();
  engine.registerAgent({ ...agent, dependencies: [] });

  if (reviewer) {
    engine.registerAgent({ ...reviewer, dependencies: [] });
    engine.registerReviewer(agent.id, reviewer);
  }

  const context: GraphContext = {
    sharedMemory: new Map(),
    executionLog: [],
    startTime: Date.now(),
  };

  // Execute the main agent
  let output = await agent.execute(input, context);
  let attempt = 1;

  // Review loop
  if (reviewer && output.score < agent.qualityThreshold && attempt < agent.maxRetries) {
    const reviewInput = { artifact: output.data, originalInput: input };
    const review = await reviewer.execute(reviewInput, context);

    context.executionLog.push({
      agentId: agent.id,
      agentName: agent.name,
      attempt,
      score: output.score,
      status: 'FAIL',
      feedback: review.feedback,
      timestamp: Date.now(),
      duration: 0,
    });

    // Regenerate with feedback
    if (review.score < agent.qualityThreshold) {
      const improvedInput = {
        ...input,
        previousOutput: output.data,
        reviewFeedback: review.feedback,
        reviewImprovements: review.improvements,
        attempt: ++attempt,
      };
      output = await agent.execute(improvedInput, context);
    }
  }

  context.executionLog.push({
    agentId: agent.id,
    agentName: agent.name,
    attempt,
    score: output.score,
    status: output.score >= agent.qualityThreshold ? 'PASS' : 'FAIL',
    feedback: output.feedback,
    timestamp: Date.now(),
    duration: Date.now() - context.startTime,
  });

  const totalDuration = Date.now() - context.startTime;

  return {
    overallScore: output.score,
    passed: output.score >= agent.qualityThreshold,
    totalDuration,
    logs: context.executionLog,
    agentOutputs: { [agent.id]: output },
  };
}

// GET /api/agents/graphs
router.get('/graphs', (_req: AuthRequest, res: Response) => {
  res.json(Object.entries(GRAPHS).map(([id, def]) => ({ id, ...def })));
});

// POST /api/agents/run/:graphId
router.post('/run/:graphId', async (req: AuthRequest, res: Response) => {
  try {
    const { graphId } = req.params;
    const userId = req.userId!;
    let result;

    switch (graphId) {
      case 'positionDoctor': {
        const wallet = await prisma.paperWallet.findUnique({ where: { userId }, include: { positions: true } });
        const positions = (wallet?.positions || []).map(p => {
          const stock = getStockPrice(p.symbol);
          return { ...p, currentPrice: stock.price, pnl: (stock.price - p.avgPrice) * p.quantity, pnlPercent: ((stock.price - p.avgPrice) / p.avgPrice) * 100 };
        });
        result = await runGraphForUser('position-doctor', positionDoctorAgent, { positions });
        break;
      }

      case 'tradeAnalyzer': {
        const trades = await prisma.trade.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });
        result = await runGraphForUser('trade-analyzer', tradeAnalyzerAgent, { trades, period: req.body.period || 30 });
        break;
      }

      case 'strategyAdvisor': {
        const riskProfile = await prisma.riskProfile.findUnique({ where: { userId } });
        const wallet = await prisma.paperWallet.findUnique({ where: { userId }, include: { positions: true } });
        result = await runGraphForUser('strategy-advisor', strategyAdvisorAgent, {
          riskProfile: riskProfile?.riskAppetite || req.body.riskAppetite || 'MODERATE',
          currentHoldings: wallet?.positions || [],
        });
        break;
      }

      case 'newsSentiment': {
        const news = await (await import('../services/newsService')).getNews(req.body.symbol);
        result = await runGraphForUser('news-sentiment', newsSentimentAgent, { news });
        break;
      }

      case 'competitorAnalysis': {
        const reviews = req.body.reviews || [
          { title: 'Good app but slow', text: 'The app is good for trading but it crashes sometimes and is very slow during market hours', rating: 3, source: 'App Store' },
          { title: 'Excellent charts', text: 'Best charting tools I have used. Very intuitive design and easy to place orders', rating: 5, source: 'Play Store' },
          { title: 'Hidden charges', text: 'Too many hidden charges and fees. Customer support is very slow to respond to complaints', rating: 2, source: 'App Store' },
          { title: 'Login issues', text: 'Login problems with OTP not received frequently. Session expires too quickly and password reset is painful', rating: 2, source: 'Play Store' },
          { title: 'Decent platform', text: 'Decent platform for beginners. UI could be more intuitive and the app lags during peak hours', rating: 3, source: 'App Store' },
          { title: 'Great research tools', text: 'Love the research reports and stock analysis tools. Market data is accurate and real-time', rating: 4, source: 'Play Store' },
          { title: 'Brokerage too high', text: 'Brokerage and charges are way too high compared to competitors. Need to reduce trading costs significantly', rating: 2, source: 'App Store' },
          { title: 'Security concerns', text: 'Had unauthorized access to my account once. Security features need major improvement', rating: 1, source: 'Play Store' },
        ];
        result = await runGraphForUser('competitor-analysis', competitorAnalysisAgent, { reviews });
        break;
      }

      case 'marketOverview': {
        const stocks = getAllStocks();
        const indices = getMarketIndices();
        result = await runGraphForUser('market-overview', marketOverviewAgent, { stocks, indices });
        break;
      }

      case 'marketAnalysis': {
        const stocks = getAllStocks();
        const indices = getMarketIndices();
        result = await runGraphForUser('market-analysis', marketAnalysisAgent, { stocks, indices });
        break;
      }

      default:
        return res.status(404).json({ error: `Unknown graph: ${graphId}` });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Agent graph error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/agents/review-loop
router.post('/review-loop', async (req: AuthRequest, res: Response) => {
  try {
    const { graphId, input: bodyInput, maxIterations = 3 } = req.body;
    const iterations: any[] = [];
    const userId = req.userId!;

    for (let i = 0; i < maxIterations; i++) {
      let result;
      switch (graphId) {
        case 'positionDoctor': {
          const wallet = await prisma.paperWallet.findUnique({ where: { userId }, include: { positions: true } });
          const positions = (wallet?.positions || []).map(p => {
            const stock = getStockPrice(p.symbol);
            return { ...p, currentPrice: stock.price, pnl: (stock.price - p.avgPrice) * p.quantity, pnlPercent: ((stock.price - p.avgPrice) / p.avgPrice) * 100 };
          });
          result = await runGraphForUser('position-doctor', positionDoctorAgent, { positions });
          break;
        }
        case 'tradeAnalyzer': {
          const trades = await prisma.trade.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });
          result = await runGraphForUser('trade-analyzer', tradeAnalyzerAgent, { trades });
          break;
        }
        default:
          return res.status(400).json({ error: `Review loop not supported for ${graphId}` });
      }

      iterations.push({ iteration: i + 1, ...result });
      if (result.overallScore >= 85) {
        return res.json({ iterations, finalResult: result, passedAtIteration: i + 1 });
      }
    }

    res.json({ iterations, finalResult: iterations[iterations.length - 1], passedAtIteration: null });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
