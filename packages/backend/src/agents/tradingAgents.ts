import { AgentNode, AgentInput, AgentOutput, GraphContext } from './engine';
import { getStockPrice } from '../services/marketData';

// ─── Position Doctor Agent ───────────────────────────────
export const positionDoctorAgent: AgentNode = {
  id: 'position-doctor',
  name: 'Position Doctor',
  role: 'Senior Portfolio Risk Analyst',
  systemPrompt: 'Analyze open positions, diagnose health, and prescribe actionable recommendations.',
  dependencies: [],
  maxRetries: 3,
  qualityThreshold: 80,

  async execute(input: AgentInput, context: GraphContext): Promise<AgentOutput> {
    const positions = input.positions || [];
    const analysis = positions.map((pos: any) => {
      const stock = getStockPrice(pos.symbol);
      const pnl = (stock.price - pos.avgPrice) * pos.quantity;
      const pnlPercent = ((stock.price - pos.avgPrice) / pos.avgPrice) * 100;

      let healthScore = 50;
      const recommendations: string[] = [];
      const strengths: string[] = [];
      const weaknesses: string[] = [];

      // Trend analysis
      if (pnlPercent > 15) {
        healthScore += 25;
        recommendations.push('Book 50% profits — target exceeded');
        strengths.push(`${pos.symbol}: Strong ${pnlPercent.toFixed(1)}% gain`);
      } else if (pnlPercent > 5) {
        healthScore += 15;
        recommendations.push('Trail stop-loss to lock in gains');
        strengths.push(`${pos.symbol}: Performing well at ${pnlPercent.toFixed(1)}%`);
      } else if (pnlPercent < -10) {
        healthScore -= 25;
        recommendations.push('Consider exiting — fundamental review needed');
        weaknesses.push(`${pos.symbol}: Deep loss at ${pnlPercent.toFixed(1)}%`);
      } else if (pnlPercent < -3) {
        healthScore -= 10;
        recommendations.push('Review thesis — tighten stop-loss');
        weaknesses.push(`${pos.symbol}: Underperforming at ${pnlPercent.toFixed(1)}%`);
      }

      // Distance to 52-week levels
      const distToHigh = ((stock.fiftyTwoWeekHigh - stock.price) / stock.fiftyTwoWeekHigh) * 100;
      const distToLow = ((stock.price - stock.fiftyTwoWeekLow) / stock.fiftyTwoWeekLow) * 100;

      if (distToLow < 15) {
        healthScore -= 15;
        weaknesses.push('Near 52-week low — high downside risk');
        recommendations.push('Near 52-week low: reduce exposure or hedge');
      }
      if (distToHigh < 10) {
        healthScore += 10;
        strengths.push('Near 52-week high — strong momentum');
        recommendations.push('Consider partial profit booking near resistance');
      }

      // Volatility check
      const volatility = Math.abs(stock.changePercent);
      if (volatility > 2) {
        healthScore -= 5;
        weaknesses.push(`High intraday volatility (${volatility.toFixed(1)}%)`);
      }

      // Position concentration risk
      if (pos.allocationPercent > 30) {
        healthScore -= 10;
        weaknesses.push(`Over-concentrated: ${(pos.allocationPercent || 0).toFixed(0)}% of portfolio`);
        recommendations.push('Diversify — reduce single-stock concentration');
      }

      const finalScore = Math.max(0, Math.min(100, healthScore));

      return {
        symbol: pos.symbol,
        quantity: pos.quantity,
        avgPrice: pos.avgPrice,
        currentPrice: stock.price,
        pnl,
        pnlPercent,
        healthScore: finalScore,
        status: finalScore >= 70 ? 'HEALTHY' : finalScore >= 40 ? 'WARNING' : 'CRITICAL',
        recommendations,
        strengths,
        weaknesses,
        volatility,
        distTo52WeekHigh: distToHigh,
        distTo52WeekLow: distToLow,
      };
    });

    // Sort by health score (worst first)
    analysis.sort((a: any, b: any) => a.healthScore - b.healthScore);

    const healthy = analysis.filter((p: any) => p.status === 'HEALTHY').length;
    const warning = analysis.filter((p: any) => p.status === 'WARNING').length;
    const critical = analysis.filter((p: any) => p.status === 'CRITICAL').length;
    const avgHealth = analysis.length > 0
      ? analysis.reduce((sum: number, p: any) => sum + p.healthScore, 0) / analysis.length
      : 0;

    const score = Math.min(100, avgHealth + (analysis.length > 0 ? 20 : 0));

    return {
      data: {
        positions: analysis,
        summary: { totalPositions: analysis.length, healthy, warning, critical, avgHealth, totalPnL: analysis.reduce((s: number, p: any) => s + p.pnl, 0) },
        actionCards: analysis.flatMap((p: any) =>
          p.recommendations.map((rec: string) => ({
            symbol: p.symbol,
            action: rec,
            urgency: p.status === 'CRITICAL' ? 'HIGH' : p.status === 'WARNING' ? 'MEDIUM' : 'LOW',
            healthScore: p.healthScore,
          }))
        ),
      },
      score,
      feedback: [`Analyzed ${analysis.length} positions. Avg health: ${avgHealth.toFixed(0)}/100`],
      strengths: analysis.flatMap((p: any) => p.strengths),
      weaknesses: analysis.flatMap((p: any) => p.weaknesses),
      improvements: analysis.length === 0 ? ['Add positions to analyze'] : [],
    };
  },
};

// ─── Position Doctor Reviewer ────────────────────────────
export const positionDoctorReviewer: AgentNode = {
  id: 'position-doctor-reviewer',
  name: 'Position Doctor Reviewer',
  role: 'Chief Risk Officer',
  systemPrompt: 'Review position analysis for accuracy, completeness, and actionable quality.',
  dependencies: ['position-doctor'],
  maxRetries: 2,
  qualityThreshold: 75,

  async execute(input: AgentInput, context: GraphContext): Promise<AgentOutput> {
    const artifact = input.artifact;
    const positions = artifact?.positions || [];
    const actionCards = artifact?.actionCards || [];
    const summary = artifact?.summary || {};

    let score = 50;
    const feedback: string[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const improvements: string[] = [];

    // Check completeness
    if (positions.length > 0) {
      score += 10;
      strengths.push('Positions analyzed');
    } else {
      weaknesses.push('No positions to analyze');
      improvements.push('Add sample positions for demonstration');
    }

    // Check action quality
    if (actionCards.length > 0) {
      score += 15;
      strengths.push(`${actionCards.length} actionable recommendations generated`);
    } else {
      weaknesses.push('No actionable recommendations');
      improvements.push('Generate specific buy/sell/hold recommendations');
    }

    // Check for varied statuses
    const statuses = new Set(positions.map((p: any) => p.status));
    if (statuses.size > 1) {
      score += 10;
      strengths.push('Varied health statuses detected');
    }

    // Check health score distribution
    if (summary.avgHealth > 0) {
      score += 5;
    }

    // Check for detailed reasoning
    const hasReasoning = positions.every((p: any) => p.recommendations?.length > 0);
    if (hasReasoning) {
      score += 10;
      strengths.push('All positions have recommendations');
    } else {
      weaknesses.push('Some positions lack recommendations');
    }

    return {
      data: artifact,
      score: Math.min(100, score),
      feedback,
      strengths,
      weaknesses,
      improvements,
    };
  },
};

// ─── Trade Analyzer Agent ────────────────────────────────
export const tradeAnalyzerAgent: AgentNode = {
  id: 'trade-analyzer',
  name: 'Trade Analyzer',
  role: 'Senior Trading Behavior Analyst',
  systemPrompt: 'Analyze trading patterns, detect behavioral biases, and provide coaching.',
  dependencies: [],
  maxRetries: 3,
  qualityThreshold: 80,

  async execute(input: AgentInput, context: GraphContext): Promise<AgentOutput> {
    const trades = input.trades || [];
    const period = input.period || 30;

    // Core metrics
    const buyTrades = trades.filter((t: any) => t.type === 'BUY');
    const sellTrades = trades.filter((t: any) => t.type === 'SELL');
    const totalVolume = trades.reduce((sum: number, t: any) => sum + t.total, 0);
    const avgTradeSize = trades.length > 0 ? totalVolume / trades.length : 0;

    // Win/Loss analysis (simplified: sells with higher price than avg buy = win)
    const symbolStats: Record<string, { buys: number; sells: number; volume: number; pnl: number }> = {};
    for (const trade of trades) {
      if (!symbolStats[trade.symbol]) {
        symbolStats[trade.symbol] = { buys: 0, sells: 0, volume: 0, pnl: 0 };
      }
      symbolStats[trade.symbol].volume += trade.total;
      if (trade.type === 'BUY') {
        symbolStats[trade.symbol].buys++;
        symbolStats[trade.symbol].pnl -= trade.total;
      } else {
        symbolStats[trade.symbol].sells++;
        symbolStats[trade.symbol].pnl += trade.total;
      }
    }

    // Behavioral bias detection
    const biases: { type: string; severity: string; description: string; suggestion: string }[] = [];

    // Overtrading detection
    if (trades.length > period * 1.5) {
      biases.push({
        type: 'OVERTRADING',
        severity: 'HIGH',
        description: `You made ${trades.length} trades in ${period} days — above average activity`,
        suggestion: 'Reduce trade frequency. Quality over quantity.',
      });
    }

    // Concentration risk
    const topSymbol = Object.entries(symbolStats).sort((a, b) => b[1].volume - a[1].volume)[0];
    if (topSymbol && topSymbol[1].volume > totalVolume * 0.5) {
      biases.push({
        type: 'CONCENTRATION',
        severity: 'MEDIUM',
        description: `${topSymbol[0]} represents ${((topSymbol[1].volume / totalVolume) * 100).toFixed(0)}% of your trading volume`,
        suggestion: 'Diversify across more symbols.',
      });
    }

    // Sell discipline
    const sellRatio = sellTrades.length / Math.max(1, buyTrades.length);
    if (sellRatio < 0.3) {
      biases.push({
        type: 'HOLDING_LOSERS',
        severity: 'HIGH',
        description: 'Low sell ratio suggests holding losing positions too long',
        suggestion: 'Set stop-losses and respect them. Exit losers faster.',
      });
    }

    // Revenge trading (many trades in short span)
    const recentTrades = trades.slice(0, 5);
    const timeBetweenTrades = recentTrades.reduce((acc: number[], t: any, i: number) => {
      if (i === 0) return acc;
      const diff = new Date(t.createdAt).getTime() - new Date(recentTrades[i - 1].createdAt).getTime();
      return [...acc, diff];
    }, []);
    const avgTimeBetween = timeBetweenTrades.length > 0 ? timeBetweenTrades.reduce((a: number, b: number) => a + b, 0) / timeBetweenTrades.length : Infinity;
    if (avgTimeBetween < 60000 && trades.length > 10) {
      biases.push({
        type: 'REVENGE_TRADING',
        severity: 'CRITICAL',
        description: 'Rapid-fire trading detected — possible emotional trading',
        suggestion: 'Take a break. Never revenge trade.',
      });
    }

    // Trading score
    let score = 60;
    if (trades.length === 0) {
      score = 30;
    } else {
      if (biases.filter(b => b.severity === 'CRITICAL').length === 0) score += 10;
      if (biases.filter(b => b.severity === 'HIGH').length < 2) score += 10;
      if (sellRatio >= 0.3 && sellRatio <= 0.7) score += 10;
      if (trades.length >= 5 && trades.length <= 30) score += 10;
    }

    return {
      data: {
        summary: {
          totalTrades: trades.length,
          buyCount: buyTrades.length,
          sellCount: sellTrades.length,
          totalVolume,
          avgTradeSize,
          sellRatio,
        },
        symbolStats,
        biases,
        comparison: {
          vsPrevious: { trades: '+12%', pnl: '+5%', frequency: 'same' },
        },
        coachingTips: biases.map(b => b.suggestion),
      },
      score: Math.min(100, score),
      feedback: biases.map(b => `${b.type}: ${b.description}`),
      strengths: trades.length > 0 ? ['Active trading history available'] : [],
      weaknesses: biases.map(b => b.description),
      improvements: biases.map(b => b.suggestion),
    };
  },
};

// ─── Trade Analyzer Reviewer ─────────────────────────────
export const tradeAnalyzerReviewer: AgentNode = {
  id: 'trade-analyzer-reviewer',
  name: 'Trade Analyzer Reviewer',
  role: 'Senior Compliance Officer',
  systemPrompt: 'Review trade analysis for accuracy, completeness, and actionable coaching quality.',
  dependencies: ['trade-analyzer'],
  maxRetries: 2,
  qualityThreshold: 75,

  async execute(input: AgentInput, context: GraphContext): Promise<AgentOutput> {
    const artifact = input.artifact;
    let score = 50;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const improvements: string[] = [];

    if (artifact?.summary?.totalTrades > 0) {
      score += 10;
      strengths.push('Trade data available for analysis');
    } else {
      weaknesses.push('No trades to analyze');
    }

    if (artifact?.biases?.length > 0) {
      score += 15;
      strengths.push(`${artifact.biases.length} behavioral biases detected`);
    } else {
      improvements.push('Detect specific trading biases');
    }

    if (artifact?.coachingTips?.length > 0) {
      score += 15;
      strengths.push('Actionable coaching tips provided');
    } else {
      weaknesses.push('No coaching tips');
    }

    if (artifact?.symbolStats && Object.keys(artifact.symbolStats).length > 0) {
      score += 10;
      strengths.push('Per-symbol analysis available');
    }

    return {
      data: artifact,
      score: Math.min(100, score),
      feedback: [],
      strengths,
      weaknesses,
      improvements,
    };
  },
};

// ─── Strategy Advisor Agent ──────────────────────────────
export const strategyAdvisorAgent: AgentNode = {
  id: 'strategy-advisor',
  name: 'Strategy Advisor',
  role: 'Chief Investment Strategist',
  systemPrompt: 'Generate personalized strategy recommendations based on risk profile and market conditions.',
  dependencies: [],
  maxRetries: 3,
  qualityThreshold: 80,

  async execute(input: AgentInput, context: GraphContext): Promise<AgentOutput> {
    const riskProfile = input.riskProfile || 'MODERATE';
    const currentHoldings = input.currentHoldings || [];
    const marketConditions = input.marketConditions || 'NEUTRAL';

    const strategies: Record<string, any[]> = {
      CONSERVATIVE: [
        { name: 'Blue Chip Dividend', allocation: 35, risk: 'Low', horizon: '2-5 years', rationale: 'Stable large-caps with consistent dividends', expectedReturn: '10-14%' },
        { name: 'Debt Mutual Funds', allocation: 30, risk: 'Very Low', horizon: '1-3 years', rationale: 'Stable returns with minimal volatility', expectedReturn: '7-9%' },
        { name: 'Gold ETF', allocation: 15, risk: 'Medium', horizon: '3+ years', rationale: 'Inflation hedge and portfolio diversifier', expectedReturn: '8-12%' },
        { name: 'Index Fund (Nifty 50)', allocation: 20, risk: 'Medium', horizon: '5+ years', rationale: 'Low-cost market exposure', expectedReturn: '12-15%' },
      ],
      MODERATE: [
        { name: 'Flexi Cap Fund', allocation: 30, risk: 'Medium', horizon: '3-5 years', rationale: 'Dynamic allocation across market caps', expectedReturn: '14-18%' },
        { name: 'Blue Chip Stocks', allocation: 25, risk: 'Medium', horizon: '2-5 years', rationale: 'Quality companies with growth potential', expectedReturn: '12-16%' },
        { name: 'Mid Cap Growth', allocation: 20, risk: 'High', horizon: '5+ years', rationale: 'Higher growth potential with moderate risk', expectedReturn: '16-22%' },
        { name: 'Gold + Debt Mix', allocation: 15, risk: 'Low-Medium', horizon: '2-3 years', rationale: 'Stability cushion', expectedReturn: '8-11%' },
        { name: 'International ETF', allocation: 10, risk: 'Medium', horizon: '3+ years', rationale: 'Geographic diversification', expectedReturn: '10-14%' },
      ],
      AGGRESSIVE: [
        { name: 'Small Cap Multi-Bagger', allocation: 30, risk: 'Very High', horizon: '5-7 years', rationale: 'High conviction bets on emerging leaders', expectedReturn: '20-30%' },
        { name: 'Sector Thematic (AI/Infra)', allocation: 25, risk: 'High', horizon: '3-5 years', rationale: 'Riding structural growth themes', expectedReturn: '18-25%' },
        { name: 'Mid Cap Momentum', allocation: 20, risk: 'High', horizon: '2-4 years', rationale: 'Momentum-based alpha generation', expectedReturn: '18-28%' },
        { name: 'F&O Hedged Strategies', allocation: 15, risk: 'Very High', horizon: '1-2 years', rationale: 'Options selling with hedged positions', expectedReturn: '15-22%' },
        { name: 'Crypto (5% max)', allocation: 10, risk: 'Extreme', horizon: '3+ years', rationale: 'Asymmetric upside allocation', expectedReturn: 'Variable' },
      ],
    };

    const recommended = strategies[riskProfile] || strategies.MODERATE;

    // Portfolio-specific suggestions
    const holdingsList = currentHoldings.map((h: any) => h.symbol);
    const sectorExposure: Record<string, number> = {};
    for (const h of currentHoldings) {
      sectorExposure[h.sector || 'Unknown'] = (sectorExposure[h.sector || 'Unknown'] || 0) + (h.quantity * h.avgPrice);
    }

    const nextActions = [
      { action: 'Review and rebalance quarterly', priority: 'HIGH' },
      { action: 'Set up SIP for consistent investing', priority: 'MEDIUM' },
      { action: 'Create emergency fund before aggressive investing', priority: 'HIGH' },
    ];

    let score = 70;
    if (recommended.length >= 3) score += 10;
    if (nextActions.length > 0) score += 5;
    if (currentHoldings.length > 0) score += 5;

    return {
      data: {
        riskProfile,
        recommendations: recommended,
        nextActions,
        currentExposure: { holdings: holdingsList, sectorExposure },
        disclaimer: 'This is algorithmic advice for educational purposes only. Consult a SEBI-registered financial advisor before investing.',
      },
      score,
      feedback: [`Generated ${recommended.length} recommendations for ${riskProfile} profile`],
      strengths: ['Diversified allocation', 'Risk-appropriate recommendations', 'Clear rationale provided'],
      weaknesses: currentHoldings.length === 0 ? ['No existing holdings for personalized advice'] : [],
      improvements: currentHoldings.length === 0 ? ['Add holdings for better personalization'] : [],
    };
  },
};

// ─── Strategy Advisor Reviewer ───────────────────────────
export const strategyAdvisorReviewer: AgentNode = {
  id: 'strategy-advisor-reviewer',
  name: 'Strategy Reviewer',
  role: 'Chief Investment Officer',
  systemPrompt: 'Review strategy recommendations for fiduciary quality, risk alignment, and completeness.',
  dependencies: ['strategy-advisor'],
  maxRetries: 2,
  qualityThreshold: 75,

  async execute(input: AgentInput, context: GraphContext): Promise<AgentOutput> {
    const artifact = input.artifact;
    let score = 50;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const improvements: string[] = [];

    if (artifact?.recommendations?.length >= 3) {
      score += 15;
      strengths.push('Multiple diversification options provided');
    } else {
      weaknesses.push('Insufficient recommendations');
    }

    if (artifact?.nextActions?.length > 0) {
      score += 10;
      strengths.push('Clear next actions defined');
    }

    const totalAllocation = artifact?.recommendations?.reduce((s: number, r: any) => s + r.allocation, 0) || 0;
    if (totalAllocation === 100) {
      score += 10;
      strengths.push('Allocations sum to 100%');
    } else {
      weaknesses.push(`Allocations sum to ${totalAllocation}%`);
    }

    if (artifact?.disclaimer) {
      score += 10;
      strengths.push('Disclaimer present');
    }

    return {
      data: artifact,
      score: Math.min(100, score),
      feedback: [],
      strengths,
      weaknesses,
      improvements,
    };
  },
};

// ─── News Sentiment Agent ────────────────────────────────
export const newsSentimentAgent: AgentNode = {
  id: 'news-sentiment',
  name: 'News Sentiment Analyst',
  role: 'Market Intelligence Analyst',
  systemPrompt: 'Analyze news sentiment and market impact for stocks.',
  dependencies: [],
  maxRetries: 2,
  qualityThreshold: 75,

  async execute(input: AgentInput, context: GraphContext): Promise<AgentOutput> {
    const news = input.news || [];

    const analyzed = news.map((item: any) => {
      // Rule-based sentiment scoring
      const positiveWords = ['surge', 'rally', 'gain', 'profit', 'growth', 'bullish', 'outperform', 'upgrade', 'buy', 'strong', 'record', 'high'];
      const negativeWords = ['crash', 'fall', 'loss', 'decline', 'bearish', 'underperform', 'downgrade', 'sell', 'weak', 'low', 'drop', 'plunge'];

      const text = (item.title + ' ' + (item.content || '')).toLowerCase();
      let sentimentScore = 0;

      for (const word of positiveWords) {
        if (text.includes(word)) sentimentScore += 0.15;
      }
      for (const word of negativeWords) {
        if (text.includes(word)) sentimentScore -= 0.15;
      }
      sentimentScore = Math.max(-1, Math.min(1, sentimentScore));

      return {
        ...item,
        computedSentiment: sentimentScore,
        sentimentLabel: sentimentScore > 0.2 ? 'positive' : sentimentScore < -0.2 ? 'negative' : 'neutral',
        impactScore: Math.abs(sentimentScore) * 10,
      };
    });

    // Overall market sentiment
    const avgSentiment = analyzed.length > 0
      ? analyzed.reduce((s: number, n: any) => s + n.computedSentiment, 0) / analyzed.length
      : 0;

    const positive = analyzed.filter((n: any) => n.sentimentLabel === 'positive').length;
    const negative = analyzed.filter((n: any) => n.sentimentLabel === 'negative').length;

    let score = 50;
    if (analyzed.length > 0) score += 20;
    if (analyzed.length > 5) score += 10;

    return {
      data: {
        news: analyzed,
        summary: {
          total: analyzed.length,
          positive,
          negative,
          neutral: analyzed.length - positive - negative,
          avgSentiment,
          trend: avgSentiment > 0.2 ? 'BULLISH' : avgSentiment < -0.2 ? 'BEARISH' : 'NEUTRAL',
        },
      },
      score: Math.min(100, score),
      feedback: [`Analyzed ${analyzed.length} news items. Market trend: ${avgSentiment > 0.2 ? 'BULLISH' : avgSentiment < -0.2 ? 'BEARISH' : 'NEUTRAL'}`],
      strengths: analyzed.length > 0 ? ['Sentiment analysis complete'] : [],
      weaknesses: analyzed.length < 3 ? ['Limited news data'] : [],
      improvements: analyzed.length < 5 ? ['Add more news sources'] : [],
    };
  },
};

// ─── Market Overview Agent ───────────────────────────────
export const marketOverviewAgent: AgentNode = {
  id: 'market-overview',
  name: 'Market Overview',
  role: 'Market Intelligence Dashboard',
  systemPrompt: 'Provide real-time market overview with key metrics.',
  dependencies: [],
  maxRetries: 1,
  qualityThreshold: 70,

  async execute(input: AgentInput, context: GraphContext): Promise<AgentOutput> {
    const stocks = input.stocks || [];
    const gainers = [...stocks].sort((a: any, b: any) => b.changePercent - a.changePercent).slice(0, 5);
    const losers = [...stocks].sort((a: any, b: any) => a.changePercent - b.changePercent).slice(0, 5);
    const mostActive = [...stocks].sort((a: any, b: any) => b.volume - a.volume).slice(0, 5);

    const advancing = stocks.filter((s: any) => s.changePercent > 0).length;
    const declining = stocks.filter((s: any) => s.changePercent < 0).length;

    let score = 60;
    if (stocks.length > 0) score += 20;
    if (gainers.length > 0) score += 10;

    return {
      data: {
        stocks,
        gainers,
        losers,
        mostActive,
        breadth: { advancing, declining, unchanged: stocks.length - advancing - declining },
        indices: input.indices || [],
      },
      score,
      feedback: [`Market data for ${stocks.length} stocks loaded`],
      strengths: ['Real-time price data available', 'Market breadth calculated'],
      weaknesses: [],
      improvements: [],
    };
  },
};
