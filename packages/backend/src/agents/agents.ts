import { AgentNode, AgentOutput } from './engine';

// ─── Market Analysis Agent ──────────────────────────────
export const marketAnalysisAgent: AgentNode = {
  id: 'market-analysis',
  name: 'Market Analyst',
  role: 'Senior Market Analyst',
  systemPrompt: 'Analyze market conditions and identify opportunities.',
  dependencies: [],
  maxRetries: 3,
  qualityThreshold: 80,
  execute: async (input) => {
    const { stocks, indices, news } = input;

    const stockAnalysis = (stocks || []).map((s: any) => ({
      symbol: s.symbol,
      trend: s.changePercent > 0.5 ? 'BULLISH' : s.changePercent < -0.5 ? 'BEARISH' : 'NEUTRAL',
      momentum: Math.abs(s.changePercent),
      nearFiftyTwoWeekHigh: s.price > s.fiftyTwoWeekHigh * 0.9,
      nearFiftyTwoWeekLow: s.price < s.fiftyTwoWeekLow * 1.1,
      signal: s.changePercent > 1 ? 'STRONG_BUY' : s.changePercent > 0 ? 'BUY' : s.changePercent > -1 ? 'SELL' : 'STRONG_SELL',
    }));

    const bullishCount = stockAnalysis.filter((s: any) => s.trend === 'BULLISH').length;
    const bearishCount = stockAnalysis.filter((s: any) => s.trend === 'BEARISH').length;
    const marketSentiment = bullishCount > bearishCount ? 'BULLISH' : bullishCount < bearishCount ? 'BEARISH' : 'NEUTRAL';

    const opportunities = stockAnalysis
      .filter((s: any) => s.signal === 'STRONG_BUY' || s.nearFiftyTwoWeekLow)
      .map((s: any) => ({
        symbol: s.symbol,
        type: s.nearFiftyTwoWeekLow ? 'VALUE' : 'MOMENTUM',
        confidence: s.nearFiftyTwoWeekLow ? 85 : 70,
        rationale: s.nearFiftyTwoWeekLow
          ? `${s.symbol} is near 52-week low — potential value opportunity`
          : `${s.symbol} showing strong upward momentum (+${s.momentum.toFixed(2)}%)`,
      }));

    const risks = stockAnalysis
      .filter((s: any) => s.signal === 'STRONG_SELL' || s.nearFiftyTwoWeekHigh)
      .map((s: any) => ({
        symbol: s.symbol,
        type: s.nearFiftyTwoWeekHigh ? 'REVERSAL_RISK' : 'MOMENTUM_LOSS',
        severity: s.nearFiftyTwoWeekHigh ? 'HIGH' : 'MEDIUM',
        rationale: s.nearFiftyTwoWeekHigh
          ? `${s.symbol} near 52-week high — potential reversal`
          : `${s.symbol} showing weakness`,
      }));

    const data = {
      marketSentiment,
      stockAnalysis,
      opportunities,
      risks,
      summary: `Market is ${marketSentiment}. ${opportunities.length} opportunities and ${risks.length} risks identified.`,
    };

    const score = stockAnalysis.length >= 5 ? 88 : 72;
    return { data, score, feedback: [], strengths: ['Comprehensive analysis'], weaknesses: [], improvements: [] };
  },
};

// ─── Risk Assessment Agent ──────────────────────────────
export const riskAssessmentAgent: AgentNode = {
  id: 'risk-assessment',
  name: 'Risk Assessor',
  role: 'Chief Risk Officer',
  systemPrompt: 'Assess portfolio risk and recommend protective actions.',
  dependencies: ['market-analysis'],
  maxRetries: 3,
  qualityThreshold: 85,
  execute: async (input) => {
    const marketData = input['market-analysis'];
    const positions = input.positions || [];
    const riskProfile = input.riskProfile || { riskAppetite: 'MODERATE' };

    const positionRisks = positions.map((pos: any) => {
      const maxLoss = pos.avgPrice * pos.quantity * 0.15;
      const currentLoss = pos.pnl < 0 ? Math.abs(pos.pnl) : 0;
      const riskLevel = currentLoss > maxLoss ? 'HIGH' : currentLoss > maxLoss * 0.5 ? 'MEDIUM' : 'LOW';
      const concentrationRisk = (pos.quantity * pos.currentPrice) / (positions.reduce((s: number, p: any) => s + p.quantity * p.currentPrice, 0) || 1) * 100;

      return {
        symbol: pos.symbol,
        riskLevel,
        currentLoss,
        maxLoss,
        concentrationRisk: concentrationRisk.toFixed(1),
        recommendation: riskLevel === 'HIGH' ? 'EXIT' : riskLevel === 'MEDIUM' ? 'REDUCE' : 'HOLD',
        stopLossSuggestion: pos.avgPrice * (riskProfile.riskAppetite === 'AGGRESSIVE' ? 0.85 : riskProfile.riskAppetite === 'CONSERVATIVE' ? 0.95 : 0.90),
      };
    });

    const highRiskPositions = positionRisks.filter((r: any) => r.riskLevel === 'HIGH');
    const overallRisk = highRiskPositions.length > 0 ? 'HIGH' : positionRisks.some((r: any) => r.riskLevel === 'MEDIUM') ? 'MEDIUM' : 'LOW';

    const data = {
      overallRisk,
      positionRisks,
      alerts: highRiskPositions.map((r: any) => ({
        symbol: r.symbol,
        message: `HIGH RISK: ${r.symbol} has exceeded acceptable loss threshold`,
        action: r.recommendation,
      })),
      summary: `Portfolio risk: ${overallRisk}. ${highRiskPositions.length} positions need immediate attention.`,
    };

    const score = positions.length > 0 ? 87 : 80;
    return { data, score, feedback: [], strengths: ['Thorough risk analysis'], weaknesses: [], improvements: [] };
  },
};

// ─── Trade Review Agent ─────────────────────────────────
export const tradeReviewAgent: AgentNode = {
  id: 'trade-review',
  name: 'Trade Reviewer',
  role: 'Senior Trade Analyst',
  systemPrompt: 'Review recent trading behavior and identify patterns.',
  dependencies: [],
  maxRetries: 3,
  qualityThreshold: 82,
  execute: async (input) => {
    const trades = input.trades || [];

    if (trades.length === 0) {
      return {
        data: { patterns: [], suggestions: ['Start trading to get personalized insights'], winRate: 0, avgHoldingTime: 0 },
        score: 75,
        feedback: [],
        strengths: [],
        weaknesses: ['No trades to analyze'],
        improvements: ['Execute some trades to enable analysis'],
      };
    }

    const buyTrades = trades.filter((t: any) => t.type === 'BUY');
    const sellTrades = trades.filter((t: any) => t.type === 'SELL');
    const totalTrades = trades.length;

    // Pattern detection
    const patterns: any[] = [];
    const suggestions: string[] = [];

    // Overtrading detection
    const tradesPerDay = totalTrades / 30;
    if (tradesPerDay > 3) {
      patterns.push({ type: 'OVERTRADING', severity: 'HIGH', description: `${tradesPerDay.toFixed(1)} trades/day — excessive frequency` });
      suggestions.push('Reduce trading frequency. Focus on quality setups over quantity.');
    }

    // Holding losers
    const losingSells = sellTrades.filter((t: any) => {
      const buyPrice = buyTrades.find((b: any) => b.symbol === t.symbol)?.price;
      return buyPrice && t.price < buyPrice;
    });
    if (losingSells.length > sellTrades.length * 0.6) {
      patterns.push({ type: 'HOLDING_LOSERS', severity: 'MEDIUM', description: 'Cutting winners short, holding losers too long' });
      suggestions.push('Set stop-losses at 5-8% below entry. Don\'t let losses run.');
    }

    // Sector concentration
    const sectorTrades: Record<string, number> = {};
    trades.forEach((t: any) => { sectorTrades[t.symbol] = (sectorTrades[t.symbol] || 0) + 1; });
    const maxConcentration = Math.max(...Object.values(sectorTrades) as number[]) / totalTrades;
    if (maxConcentration > 0.4) {
      patterns.push({ type: 'CONCENTRATION', severity: 'MEDIUM', description: 'Over-concentrated in few stocks' });
      suggestions.push('Diversify across sectors. No single stock should be >30% of trades.');
    }

    const winRate = sellTrades.length > 0 ? ((sellTrades.length - losingSells.length) / sellTrades.length) * 100 : 0;

    const data = {
      patterns,
      suggestions,
      winRate: winRate.toFixed(1),
      totalTrades,
      buyCount: buyTrades.length,
      sellCount: sellTrades.length,
      summary: `Analyzed ${totalTrades} trades. ${patterns.length} patterns detected. Win rate: ${winRate.toFixed(1)}%`,
    };

    const score = patterns.length === 0 ? 90 : patterns.some((p: any) => p.severity === 'HIGH') ? 70 : 82;
    return {
      data,
      score,
      feedback: patterns.map((p: any) => p.description),
      strengths: ['Identified behavioral patterns'],
      weaknesses: patterns.map((p: any) => `${p.type}: ${p.description}`),
      improvements: suggestions,
    };
  },
};

// ─── Trade Reviewer (for review loops) ──────────────────
export const tradeReviewReviewer: AgentNode = {
  id: 'trade-review-reviewer',
  name: 'Trade Review Critic',
  role: 'Principal Trading Analyst',
  systemPrompt: 'Critically review the trade analysis for completeness and accuracy.',
  dependencies: [],
  maxRetries: 1,
  qualityThreshold: 85,
  execute: async (input) => {
    const { artifact, originalInput } = input;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const improvements: string[] = [];
    let score = 80;

    if (artifact.patterns && artifact.patterns.length > 0) {
      strengths.push('Detected actionable patterns');
      score += 5;
    } else {
      weaknesses.push('No patterns detected — may need more data');
      improvements.push('Run analysis with more historical trades');
    }

    if (artifact.suggestions && artifact.suggestions.length >= 2) {
      strengths.push('Provided actionable suggestions');
      score += 5;
    } else {
      weaknesses.push('Insufficient suggestions');
      improvements.push('Add more specific, actionable trading advice');
    }

    if (artifact.winRate !== undefined) {
      strengths.push('Included win rate calculation');
      score += 3;
    }

    return {
      data: { ...artifact, reviewScore: score },
      score: Math.min(score, 100),
      feedback: weaknesses,
      strengths,
      weaknesses,
      improvements,
    };
  },
};

// ─── Position Health Agent ──────────────────────────────
export const positionHealthAgent: AgentNode = {
  id: 'position-health',
  name: 'Position Doctor',
  role: 'Senior Portfolio Manager',
  systemPrompt: 'Diagnose position health and prescribe actions.',
  dependencies: ['market-analysis', 'risk-assessment'],
  maxRetries: 3,
  qualityThreshold: 85,
  execute: async (input) => {
    const marketData = input['market-analysis']?.data;
    const riskData = input['risk-assessment']?.data;
    const positions = input.positions || [];

    if (positions.length === 0) {
      return {
        data: { positions: [], summary: 'No open positions to analyze' },
        score: 75,
        feedback: [],
        strengths: [],
        weaknesses: ['No positions'],
        improvements: ['Add positions to your portfolio'],
      };
    }

    const diagnosed = positions.map((pos: any) => {
      const stock = marketData?.stockAnalysis?.find((s: any) => s.symbol === pos.symbol);
      const risk = riskData?.positionRisks?.find((r: any) => r.symbol === pos.symbol);

      let healthScore = 70;
      const recommendations: string[] = [];

      // P&L assessment
      if (pos.pnlPercent > 15) {
        healthScore += 15;
        recommendations.push('Consider booking partial profits — target nearly hit');
      } else if (pos.pnlPercent > 5) {
        healthScore += 8;
        recommendations.push('Trailing stop-loss recommended');
      } else if (pos.pnlPercent < -10) {
        healthScore -= 25;
        recommendations.push('Position deteriorating — review exit criteria');
      } else if (pos.pnlPercent < -5) {
        healthScore -= 12;
        recommendations.push('Monitor closely — tightening stop-loss advised');
      }

      // Market signal assessment
      if (stock?.signal === 'STRONG_SELL') {
        healthScore -= 15;
        recommendations.push('Market signals are negative — consider hedging');
      } else if (stock?.signal === 'STRONG_BUY') {
        healthScore += 10;
        recommendations.push('Market momentum supports holding');
      }

      // Risk-based recommendations
      if (risk?.riskLevel === 'HIGH') {
        healthScore -= 20;
        recommendations.push('Risk threshold breached — immediate action needed');
      }

      const status = healthScore >= 75 ? 'HEALTHY' : healthScore >= 50 ? 'WARNING' : 'CRITICAL';

      return {
        symbol: pos.symbol,
        quantity: pos.quantity,
        avgPrice: pos.avgPrice,
        currentPrice: pos.currentPrice,
        pnl: pos.pnl,
        pnlPercent: pos.pnlPercent,
        healthScore: Math.max(0, Math.min(100, healthScore)),
        status,
        recommendations,
        action: status === 'CRITICAL' ? 'EXIT' : status === 'WARNING' ? 'HEDGE' : 'HOLD',
      };
    });

    const healthy = diagnosed.filter((d: any) => d.status === 'HEALTHY').length;
    const warning = diagnosed.filter((d: any) => d.status === 'WARNING').length;
    const critical = diagnosed.filter((d: any) => d.status === 'CRITICAL').length;

    const data = {
      positions: diagnosed,
      summary: `${positions.length} positions: ${healthy} healthy, ${warning} warning, ${critical} critical`,
      dailyDigest: diagnosed.map((d: any) => ({
        symbol: d.symbol,
        health: d.status,
        action: d.action,
        topRecommendation: d.recommendations[0] || 'No action needed',
      })),
    };

    const score = critical === 0 ? 90 : warning > critical ? 82 : 72;
    return { data, score, feedback: [], strengths: ['Comprehensive diagnosis'], weaknesses: [], improvements: [] };
  },
};

// ─── Strategy Advisor Agent ─────────────────────────────
export const strategyAdvisorAgent: AgentNode = {
  id: 'strategy-advisor',
  name: 'Strategy Advisor',
  role: 'Chief Investment Officer',
  systemPrompt: 'Recommend investment strategies based on risk profile.',
  dependencies: ['market-analysis'],
  maxRetries: 3,
  qualityThreshold: 85,
  execute: async (input) => {
    const riskProfile = input.riskProfile || { riskAppetite: 'MODERATE' };
    const marketData = input['market-analysis']?.data;
    const currentPositions = input.positions || [];

    const strategyMap: Record<string, any[]> = {
      CONSERVATIVE: [
        { name: 'Blue Chip Dividend', allocation: 35, stocks: ['HDFCBANK', 'ICICIBANK', 'SBIN'], risk: 'LOW', horizon: '3-5 years' },
        { name: 'Debt + Gold', allocation: 30, category: 'DEFENSIVE', risk: 'VERY_LOW', horizon: '1-3 years' },
        { name: 'Large Cap Growth', allocation: 25, stocks: ['RELIANCE', 'TCS', 'INFY'], risk: 'LOW-MEDIUM', horizon: '2-4 years' },
        { name: 'Cash Reserve', allocation: 10, category: 'LIQUID', risk: 'NIL', horizon: 'Immediate' },
      ],
      MODERATE: [
        { name: 'Index Fund Core', allocation: 30, category: 'NIFTY_ETF', risk: 'MEDIUM', horizon: '3-5 years' },
        { name: 'Mid Cap Growth', allocation: 25, stocks: ['TATAMOTORS', 'AXISBANK'], risk: 'MEDIUM-HIGH', horizon: '3-5 years' },
        { name: 'Blue Chip Stable', allocation: 25, stocks: ['RELIANCE', 'HDFCBANK', 'TCS'], risk: 'MEDIUM', horizon: '2-4 years' },
        { name: 'Sector Rotation', allocation: 15, category: 'TACTICAL', risk: 'MEDIUM', horizon: '6-12 months' },
        { name: 'Gold Hedge', allocation: 5, category: 'GOLD_ETF', risk: 'LOW', horizon: '1-3 years' },
      ],
      AGGRESSIVE: [
        { name: 'Small Cap Momentum', allocation: 30, stocks: ['TATAMOTORS', 'AXISBANK'], risk: 'HIGH', horizon: '2-5 years' },
        { name: 'Growth Stocks', allocation: 25, stocks: ['RELIANCE', 'INFY', 'BHARTIARTL'], risk: 'HIGH', horizon: '3-5 years' },
        { name: 'F&O Strategies', allocation: 20, category: 'DERIVATIVES', risk: 'VERY_HIGH', horizon: '1-30 days' },
        { name: 'Sector Bets', allocation: 15, category: 'THEMATIC', risk: 'HIGH', horizon: '6-12 months' },
        { name: 'Momentum Alpha', allocation: 10, category: 'QUANT', risk: 'VERY_HIGH', horizon: '1-6 months' },
      ],
    };

    const strategies = strategyMap[riskProfile.riskAppetite] || strategyMap.MODERATE;

    // Add market-adjusted recommendations
    const marketAdjusted = strategies.map((s: any) => ({
      ...s,
      marketSignal: marketData?.marketSentiment || 'NEUTRAL',
      adjusted: marketData?.marketSentiment === 'BEARISH' && s.risk?.includes('HIGH'),
      adjustmentNote: marketData?.marketSentiment === 'BEARISH' ? 'Consider reducing allocation due to bearish market' : 'Market conditions favorable',
    }));

    // Exclude already-held stocks from recommendations
    const heldSymbols = currentPositions.map((p: any) => p.symbol);
    const filteredStrategies = marketAdjusted.map((s: any) => ({
      ...s,
      newStocks: s.stocks?.filter((st: string) => !heldSymbols.includes(st)) || [],
      alreadyHeld: s.stocks?.filter((st: string) => heldSymbols.includes(st)) || [],
    }));

    const data = {
      riskAppetite: riskProfile.riskAppetite,
      strategies: filteredStrategies,
      nextActions: filteredStrategies.slice(0, 3).map(s => ({
        action: `Allocate ${s.allocation}% to ${s.name}`,
        priority: s.allocation >= 25 ? 'HIGH' : 'MEDIUM',
        rationale: `Based on ${riskProfile.riskAppetite} risk profile`,
      })),
      disclaimer: 'This is algorithmic advice for educational purposes. Consult a SEBI-registered advisor.',
      summary: `Recommended ${strategies.length} strategies for ${riskProfile.riskAppetite} risk profile`,
    };

    const score = strategies.length >= 3 ? 88 : 75;
    return { data, score, feedback: [], strengths: ['Comprehensive strategy recommendations'], weaknesses: [], improvements: [] };
  },
};

// ─── Sentiment Agent ────────────────────────────────────
export const sentimentAgent: AgentNode = {
  id: 'sentiment-analysis',
  name: 'Sentiment Analyzer',
  role: 'NLP & Sentiment Expert',
  systemPrompt: 'Analyze market sentiment from news and data.',
  dependencies: [],
  maxRetries: 2,
  qualityThreshold: 80,
  execute: async (input) => {
    const news = input.news || [];

    const analyzed = news.map((item: any) => {
      // Rule-based sentiment scoring
      const positiveWords = ['gain', 'surge', 'rally', 'bull', 'profit', 'growth', 'strong', 'record', 'high', 'upgrade', 'buy', 'outperform'];
      const negativeWords = ['loss', 'drop', 'fall', 'bear', 'decline', 'weak', 'low', 'downgrade', 'sell', 'underperform', 'crash', 'slump'];

      const text = `${item.title} ${item.content || ''}`.toLowerCase();
      const posCount = positiveWords.filter(w => text.includes(w)).length;
      const negCount = negativeWords.filter(w => text.includes(w)).length;
      const total = posCount + negCount;
      const sentimentScore = total > 0 ? (posCount - negCount) / total : 0;

      return {
        ...item,
        computedSentiment: sentimentScore,
        label: sentimentScore > 0.2 ? 'POSITIVE' : sentimentScore < -0.2 ? 'NEGATIVE' : 'NEUTRAL',
        confidence: total > 0 ? Math.min(total / 5, 1) * 100 : 30,
      };
    });

    const positive = analyzed.filter((a: any) => a.label === 'POSITIVE').length;
    const negative = analyzed.filter((a: any) => a.label === 'NEGATIVE').length;
    const neutral = analyzed.filter((a: any) => a.label === 'NEUTRAL').length;
    const avgSentiment = analyzed.length > 0
      ? analyzed.reduce((s: number, a: any) => s + a.computedSentiment, 0) / analyzed.length
      : 0;

    const overallTrend = avgSentiment > 0.15 ? 'BULLISH' : avgSentiment < -0.15 ? 'BEARISH' : 'NEUTRAL';

    const data = {
      articles: analyzed,
      summary: { total: analyzed.length, positive, negative, neutral, overallTrend, avgScore: avgSentiment.toFixed(3) },
      tickerSentiment: analyzed.reduce((acc: any, a: any) => {
        (a.symbols || []).forEach((s: string) => {
          if (!acc[s]) acc[s] = { positive: 0, negative: 0, neutral: 0, articles: 0 };
          acc[s][a.label.toLowerCase()]++;
          acc[s].articles++;
        });
        return acc;
      }, {}),
    };

    const score = analyzed.length > 0 ? 85 : 70;
    return { data, score, feedback: [], strengths: ['Rule-based sentiment scoring'], weaknesses: [], improvements: [] };
  },
};

// ─── Competitor Analysis Agent ──────────────────────────
export const competitorAnalysisAgent: AgentNode = {
  id: 'competitor-analysis',
  name: 'Competitor Analyst',
  role: 'Product Strategy Analyst',
  systemPrompt: 'Analyze competitor reviews and extract actionable insights.',
  dependencies: [],
  maxRetries: 3,
  qualityThreshold: 80,
  execute: async (input) => {
    const reviews = input.reviews || [];

    // Rule-based topic clustering
    const topics: Record<string, { count: number; sentiment: number; examples: string[] }> = {};
    const topicKeywords: Record<string, string[]> = {
      'UX/Design': ['ui', 'ux', 'design', 'interface', 'layout', 'navigation', 'easy', 'intuitive'],
      'Performance': ['slow', 'fast', 'crash', 'lag', 'hang', 'speed', 'responsive', 'loading'],
      'Charges/Fees': ['charge', 'fee', 'commission', 'brokerage', 'cost', 'expensive', 'cheap', 'free'],
      'Customer Support': ['support', 'help', 'service', 'response', 'query', 'complaint', 'agent'],
      'Features': ['feature', 'chart', 'indicator', 'analysis', 'tool', 'option', 'missing'],
      'Security': ['security', 'safe', 'secure', 'password', 'otp', 'hack', 'trust'],
      'Login/Auth': ['login', 'logout', 'session', 'otp', 'password', 'auth', 'sign'],
      'Data/Accuracy': ['data', 'price', 'accurate', 'correct', 'wrong', 'delay', 'real-time'],
    };

    for (const review of reviews) {
      const text = `${review.title || ''} ${review.text || ''}`.toLowerCase();
      for (const [topic, keywords] of Object.entries(topicKeywords)) {
        if (keywords.some(kw => text.includes(kw))) {
          if (!topics[topic]) topics[topic] = { count: 0, sentiment: 0, examples: [] };
          topics[topic].count++;
          topics[topic].sentiment += review.rating ? (review.rating - 3) / 2 : 0;
          if (topics[topic].examples.length < 3) {
            topics[topic].examples.push(review.text?.slice(0, 100) || '');
          }
        }
      }
    }

    // Priority scoring
    const prioritized = Object.entries(topics)
      .map(([topic, data]) => ({
        topic,
        mentionCount: data.count,
        avgSentiment: data.count > 0 ? data.sentiment / data.count : 0,
        priority: data.count * Math.abs(data.count > 0 ? data.sentiment / data.count : 0),
        severity: data.count > 10 ? 'P0' : data.count > 5 ? 'P1' : 'P2',
        impact: Math.abs(data.sentiment / (data.count || 1)),
        examples: data.examples,
        recommendation: data.sentiment / (data.count || 1) < -0.2
          ? `High-priority: ${topic} has negative sentiment — prioritize fixes`
          : `Monitor: ${topic} sentiment is ${data.sentiment > 0 ? 'positive' : 'neutral'}`,
      }))
      .sort((a, b) => b.priority - a.priority);

    const avgRating = reviews.length > 0
      ? reviews.reduce((s: number, r: any) => s + (r.rating || 3), 0) / reviews.length
      : 0;

    const data = {
      topics: prioritized,
      totalReviews: reviews.length,
      avgRating: avgRating.toFixed(1),
      topIssues: prioritized.filter(t => t.priority > 5).slice(0, 5),
      summary: `Analyzed ${reviews.length} reviews across ${Object.keys(topics).length} topics. Top issue: ${prioritized[0]?.topic || 'None'}`,
    };

    const score = reviews.length > 0 ? 86 : 70;
    return { data, score, feedback: [], strengths: ['Topic clustering and prioritization'], weaknesses: [], improvements: [] };
  },
};

export const allAgents = [
  marketAnalysisAgent,
  riskAssessmentAgent,
  tradeReviewAgent,
  tradeReviewReviewer,
  positionHealthAgent,
  strategyAdvisorAgent,
  sentimentAgent,
  competitorAnalysisAgent,
];
