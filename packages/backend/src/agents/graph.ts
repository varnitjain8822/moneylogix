import { AgenticEngine, GraphContext, AgentInput, AgentOutput } from './engine';
import {
  marketAnalysisAgent,
  riskAssessmentAgent,
  tradeReviewAgent,
  tradeReviewReviewer,
  positionHealthAgent,
  strategyAdvisorAgent,
  sentimentAgent,
  competitorAnalysisAgent,
} from './agents';
import {
  positionDoctorAgent,
  positionDoctorReviewer,
  tradeAnalyzerAgent,
  tradeAnalyzerReviewer,
  strategyAdvisorAgent as strategyAdv,
  strategyAdvisorReviewer,
  newsSentimentAgent,
  marketOverviewAgent,
} from './tradingAgents';

// Create engine instance
const engine = new AgenticEngine();

// Register all agents
engine.registerAgent(marketAnalysisAgent);
engine.registerAgent(riskAssessmentAgent);
engine.registerAgent(tradeReviewAgent);
engine.registerAgent(tradeReviewReviewer);
engine.registerAgent(positionHealthAgent);
engine.registerAgent(strategyAdvisorAgent);
engine.registerAgent(sentimentAgent);
engine.registerAgent(competitorAnalysisAgent);
engine.registerAgent(positionDoctorAgent);
engine.registerAgent(positionDoctorReviewer);
engine.registerAgent(tradeAnalyzerAgent);
engine.registerAgent(tradeAnalyzerReviewer);
engine.registerAgent(strategyAdv);
engine.registerAgent(strategyAdvisorReviewer);
engine.registerAgent(newsSentimentAgent);
engine.registerAgent(marketOverviewAgent);

// Register reviewers for review loops
engine.registerReviewer('position-doctor', positionDoctorReviewer);
engine.registerReviewer('trade-analyzer', tradeAnalyzerReviewer);
engine.registerReviewer('trade-review', tradeReviewReviewer);
engine.registerReviewer('strategy-advisor', strategyAdvisorReviewer);

// ─── Graph Definitions ───────────────────────────────────
export interface GraphDefinition {
  name: string;
  description: string;
  entryPoint: string;
  expectedNodes: string[];
}

export const GRAPHS: Record<string, GraphDefinition> = {
  positionDoctor: {
    name: 'Position Doctor Graph',
    description: 'Analyzes open positions, assesses risk, and generates health diagnostics',
    entryPoint: 'position-doctor',
    expectedNodes: ['position-doctor', 'position-doctor-reviewer'],
  },
  tradeAnalyzer: {
    name: 'Trade Analyzer Graph',
    description: 'Analyzes trading behavior, detects biases, and provides coaching',
    entryPoint: 'trade-analyzer',
    expectedNodes: ['trade-analyzer', 'trade-analyzer-reviewer'],
  },
  strategyAdvisor: {
    name: 'Strategy Advisor Graph',
    description: 'Generates risk-appropriate strategy recommendations',
    entryPoint: 'strategy-advisor',
    expectedNodes: ['strategy-advisor', 'strategy-advisor-reviewer'],
  },
  marketAnalysis: {
    name: 'Market Analysis Graph',
    description: 'Full market analysis with risk assessment and opportunities',
    entryPoint: 'market-analysis',
    expectedNodes: ['market-analysis', 'risk-assessment'],
  },
  newsSentiment: {
    name: 'News Sentiment Graph',
    description: 'Analyzes news sentiment and market impact',
    entryPoint: 'news-sentiment',
    expectedNodes: ['news-sentiment'],
  },
  competitorAnalysis: {
    name: 'Competitor Analysis Graph',
    description: 'Analyzes competitor reviews for product insights',
    entryPoint: 'competitor-analysis',
    expectedNodes: ['competitor-analysis'],
  },
  marketOverview: {
    name: 'Market Overview Graph',
    description: 'Real-time market dashboard with gainers, losers, breadth',
    entryPoint: 'market-overview',
    expectedNodes: ['market-overview'],
  },
};

// ─── Graph Execution Functions ───────────────────────────
export async function runPositionDoctor(positions: any[]) {
  const result = await engine.executeGraph('position-doctor');
  return { ...result, agentOutputs: Object.fromEntries(result.outputs) };
}

export async function runTradeAnalyzer(trades: any[], period: number = 30) {
  const result = await engine.executeGraph('trade-analyzer');
  return { ...result, agentOutputs: Object.fromEntries(result.outputs) };
}

export async function runStrategyAdvisor(riskProfile: string, holdings: any[]) {
  const result = await engine.executeGraph('strategy-advisor');
  return { ...result, agentOutputs: Object.fromEntries(result.outputs) };
}

export async function runMarketAnalysis(stocks: any[], indices: any[]) {
  const result = await engine.executeGraph('market-analysis');
  return { ...result, agentOutputs: Object.fromEntries(result.outputs) };
}

export async function runNewsSentiment(news: any[]) {
  const result = await engine.executeGraph('news-sentiment');
  return { ...result, agentOutputs: Object.fromEntries(result.outputs) };
}

export async function runCompetitorAnalysis(reviews: any[]) {
  const result = await engine.executeGraph('competitor-analysis');
  return { ...result, agentOutputs: Object.fromEntries(result.outputs) };
}

export async function runMarketOverview(stocks: any[], indices: any[]) {
  const result = await engine.executeGraph('market-overview');
  return { ...result, agentOutputs: Object.fromEntries(result.outputs) };
}

export async function runFullAnalysis(positions: any[], trades: any[], riskProfile: string) {
  // Run the complete graph for a full portfolio health check
  const entryPoints = ['position-doctor', 'trade-analyzer', 'strategy-advisor'];
  const allResults: any[] = [];

  for (const ep of entryPoints) {
    try {
      const result = await engine.executeGraph(ep);
      allResults.push({ graph: ep, ...result });
    } catch (e) {
      allResults.push({ graph: ep, error: (e as Error).message });
    }
  }

  const overallScore = allResults
    .filter(r => r.overallScore)
    .reduce((s, r, _, arr) => s + r.overallScore / arr.length, 0);

  return {
    results: allResults,
    overallScore,
    executionLogs: allResults.flatMap(r => r.logs || []),
    summary: {
      positionHealth: allResults.find(r => r.graph === 'position-doctor')?.overallScore || 0,
      tradingBehavior: allResults.find(r => r.graph === 'trade-analyzer')?.overallScore || 0,
      strategyFit: allResults.find(r => r.graph === 'strategy-advisor')?.overallScore || 0,
    },
  };
}

export { engine };
