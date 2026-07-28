import OpenAI from 'openai';
import prisma from '../config/prisma';
import { config } from '../config';
import { getStockPrice, getAllStocks } from '../services/marketData';
import { analyzeEmotion, generateEmotionallyAwareResponse, EmotionalAnalysisResult } from './emotionalAnalyzer';

const client = new OpenAI({
  apiKey: config.openaiApiKey,
  baseURL: config.openaiBaseUrl,
});

async function callSarvam(
  messages: OpenAI.ChatCompletionMessageParam[],
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const response = await client.chat.completions.create({
    model: config.aiModel,
    messages,
    temperature: options.temperature ?? 0.7,
    max_completion_tokens: options.maxTokens ?? 16384,
  } as any);

  const msg = response.choices[0]?.message;
  return msg?.content || (msg as any)?.reasoning_content || '';
}

const SYSTEM_PROMPT = `You are MoneyLogix AI, a sophisticated Indian stock market advisor with deep emotional intelligence.

Core capabilities:
- Analyze Indian stocks (NSE/BSE) with real market data
- Detect emotional trading patterns and provide behavioral coaching
- Give personalized portfolio advice based on risk profile
- Explain market concepts in simple terms
- Use Indian financial context (₹, SIPs, NSE, BSE, SEBI)

Personality:
- Warm, empathetic, and professional
- Use occasional Hindi phrases naturally (e.g., "Let's think about this logically", "Don't worry about short-term fluctuations")
- Be direct but kind — never dismissive
- Use data to support your points
- Always include emotional intelligence in responses

Rules:
- Never recommend specific stocks to buy/sell
- Always remind this is educational, not SEBI-registered advice
- If user seems emotional, acknowledge it before giving advice
- Use the user's portfolio context to personalize responses
- Keep responses concise (under 300 words) unless asked for detail`;

// ─── Chat Session Management ─────────────────────────────
export const createChatSession = async (userId: string, type: 'AI_ADVISOR' | 'RESEARCH' | 'TRADE_COACH') => {
  return prisma.chatSession.create({
    data: { userId, type },
  });
};

export const sendMessage = async (sessionId: string, content: string) => {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { messages: true, user: true },
  });

  if (!session) throw new Error('Session not found');

  // Save user message
  await prisma.chatMessage.create({
    data: { sessionId, role: 'USER', content },
  });

  // Build context
  const context: any = {};
  try {
    const wallet = await prisma.paperWallet.findUnique({
      where: { userId: session.userId },
      include: { positions: true },
    });
    if (wallet?.positions) {
      context.currentPositions = wallet.positions.map(p => {
        const stock = getStockPrice(p.symbol);
        return { ...p, currentPrice: stock.price, pnl: (stock.price - p.avgPrice) * p.quantity };
      });
      context.portfolioPnL = context.currentPositions.reduce((sum: number, p: any) => sum + p.pnl, 0);
    }
    context.riskProfile = await prisma.riskProfile.findUnique({ where: { userId: session.userId } });
    context.recentTrades = await prisma.trade.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  } catch (e) {
    // Context is optional
  }

  // Build chat history for emotional analysis
  const chatHistory = session.messages.slice(-6).map(m => ({
    role: m.role === 'USER' ? 'user' as const : 'assistant' as const,
    content: m.content,
  }));

  let response = '';

  switch (session.type) {
    case 'AI_ADVISOR': {
      // Real emotional analysis + LLM response
      const emotionalAnalysis = await analyzeEmotion(content, {
        recentTrades: context.recentTrades,
        currentPositions: context.currentPositions,
        portfolioPnL: context.portfolioPnL,
        chatHistory,
      });

      response = await generateEmotionallyAwareResponse(content, {
        recentTrades: context.recentTrades,
        currentPositions: context.currentPositions,
        portfolioPnL: context.portfolioPnL,
      }, emotionalAnalysis);

      // If emotional intervention is needed, prepend the emotional guidance
      if (emotionalAnalysis.interventionNeeded) {
        response = `🚨 **Emotional Trading Alert** — I'm noticing some strong emotions in your message.\n\n` +
          `**Detected:** ${emotionalAnalysis.emotionalState.primary} (${emotionalAnalysis.emotionalState.intensity}/100 intensity)\n` +
          `**Risk Level:** ${emotionalAnalysis.emotionalState.riskLevel}\n\n` +
          `Before making any trading decisions, take a 5-minute break. Emotional trades are statistically likely to underperform.\n\n---\n\n` +
          response;
      }

      // Append emotional analysis metadata as a footer
      response += `\n\n---\n*Emotional Analysis: ${emotionalAnalysis.emotionalState.primary} (${emotionalAnalysis.emotionalState.intensity}/100) | Trading Bias: ${emotionalAnalysis.tradingBias}*`;
      break;
    }

    case 'RESEARCH': {
      // Research uses LLM with market data
      const stocks = getAllStocks();
      const mentioned = stocks.filter(s => content.toUpperCase().includes(s.symbol));

      const marketContext = mentioned.length > 0
        ? `\n\nCurrent market data for mentioned stocks:\n${mentioned.map(s =>
          `${s.symbol}: ₹${s.price.toFixed(2)} (${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%) | 52wk: ₹${s.fiftyTwoWeekLow}-₹${s.fiftyTwoWeekHigh} | Vol: ${(s.volume / 1000000).toFixed(1)}M`
        ).join('\n')}`
        : '';

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT + '\n\nYou are in RESEARCH mode. Provide data-driven analysis of Indian stocks. Use the market data provided to give specific, actionable insights.' },
        ...chatHistory.slice(-4),
        ...(marketContext ? [{ role: 'user' as const, content: `[Market Data Context]${marketContext}` }] : []),
        { role: 'user', content },
      ];

      const responseText = await callSarvam(messages, { temperature: 0.7, maxTokens: 8192 });

      response = responseText ||
        (mentioned.length > 0
          ? mentioned.map(s =>
            `**${s.symbol}**: ₹${s.price.toFixed(2)} (${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%)\n52-week range: ₹${s.fiftyTwoWeekLow} — ₹${s.fiftyTwoWeekHigh}\nVolume: ${(s.volume / 1000000).toFixed(2)}M`
          ).join('\n\n') + '\n\n*Data is simulated for demonstration.*'
          : 'I can help you research Indian stocks. Try mentioning a stock symbol like RELIANCE, TCS, or INFY.');
      break;
    }

    case 'TRADE_COACH': {
      // Trade coach uses emotional analysis + trade data
      const emotionalAnalysis = await analyzeEmotion(content, {
        recentTrades: context.recentTrades,
        currentPositions: context.currentPositions,
        portfolioPnL: context.portfolioPnL,
        chatHistory,
      });

      const trades = context.recentTrades || [];
      const buyCount = trades.filter((t: any) => t.type === 'BUY').length;
      const sellCount = trades.filter((t: any) => t.type === 'SELL').length;

      const tradeContext = trades.length > 0
        ? `User's recent trading: ${buyCount} buys, ${sellCount} sells in last 20 trades. Sell/Buy ratio: ${(sellCount / Math.max(1, buyCount) * 100).toFixed(0)}%.`
        : 'User has no recent trades.';

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT + `\n\nYou are in TRADE COACH mode. Combine emotional intelligence with trading behavior analysis.\n\nEmotional state: ${emotionalAnalysis.emotionalState.primary} (${emotionalAnalysis.emotionalState.intensity}/100)\nTrading bias: ${emotionalAnalysis.tradingBias}` },
        { role: 'user', content: `${tradeContext}\n\nUser message: ${content}` },
      ];

      const responseText = await callSarvam(messages, { temperature: 0.7, maxTokens: 4096 });

      response = responseText || 'I can help coach your trading behavior. Share your thoughts or ask about trading psychology.';
      break;
    }
  }

  // Save assistant message
  await prisma.chatMessage.create({
    data: { sessionId, role: 'ASSISTANT', content: response },
  });

  return response;
};

export const getChatHistory = async (sessionId: string) => {
  return prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
};
