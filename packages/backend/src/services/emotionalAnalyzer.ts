import OpenAI from 'openai';
import { config } from '../config';

const client = new OpenAI({
  apiKey: config.openaiApiKey,
  baseURL: config.openaiBaseUrl,
});

async function callSarvam(
  messages: OpenAI.ChatCompletionMessageParam[],
  options: { temperature?: number; maxTokens?: number; responseFormat?: string } = {}
): Promise<string> {
  const response = await client.chat.completions.create({
    model: config.aiModel,
    messages,
    temperature: options.temperature ?? 0.7,
    max_completion_tokens: options.maxTokens ?? 16384,
    response_format: options.responseFormat ? { type: options.responseFormat as any } : undefined,
  } as any);

  const msg = response.choices[0]?.message;
  // Sarvam returns content in 'content' or falls back to 'reasoning_content'
  return msg?.content || (msg as any)?.reasoning_content || '';
}

export interface EmotionalState {
  primary: string;
  secondary: string;
  intensity: number; // 0-100
  confidence: number; // 0-100
  triggers: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
}

export interface EmotionalAnalysisResult {
  emotionalState: EmotionalState;
  personalizedResponse: string;
  tradingBias: string;
  interventionNeeded: boolean;
}

const EMOTION_ANALYSIS_PROMPT = `You are a financial psychology expert analyzing a trader's emotional state.
Analyze the user's message for emotional indicators and provide a structured response.

Respond ONLY with valid JSON in this exact format:
{
  "primary": "fear|greed|panic|euphoria|anxiety|confidence|frustration|neutral",
  "secondary": "fear|greed|panic|euphoria|anxiety|confidence|frustration|neutral|none",
  "intensity": <0-100>,
  "confidence": <0-100>,
  "triggers": ["<what triggered this emotion>"],
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "tradingBias": "<description of how this emotion might affect trading decisions>",
  "recommendations": ["<specific actionable advice>"],
  "interventionNeeded": <true|false>,
  "personalizedResponse": "<empathetic, personalized response that acknowledges their emotional state and provides grounded financial guidance>"
}

Rules:
- If intensity > 80 and riskLevel is HIGH/CRITICAL, set interventionNeeded to true
- Recommendations should be specific, actionable trading psychology advice
- personalizedResponse should feel human, empathetic, and grounded
- Never give specific stock recommendations
- Always include a reminder about emotional trading risks if intensity > 60
- Keep personalizedResponse under 200 words`;

export async function analyzeEmotion(
  message: string,
  context: {
    recentTrades?: any[];
    currentPositions?: any[];
    portfolioPnL?: number;
    chatHistory?: { role: string; content: string }[];
  }
): Promise<EmotionalAnalysisResult> {
  const contextSummary = buildContextSummary(context);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: EMOTION_ANALYSIS_PROMPT },
    ...(contextSummary ? [{ role: 'user' as const, content: `Context: ${contextSummary}` }] : []),
    { role: 'user', content: message },
  ];

  const content = await callSarvam(messages, { temperature: 0.7, maxTokens: 4096 });

  try {
    const parsed = JSON.parse(content);

    return {
      emotionalState: {
        primary: parsed.primary || 'neutral',
        secondary: parsed.secondary || 'none',
        intensity: Math.min(100, Math.max(0, parsed.intensity || 50)),
        confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
        triggers: parsed.triggers || [],
        riskLevel: parsed.riskLevel || 'LOW',
        recommendations: parsed.recommendations || [],
      },
      personalizedResponse: parsed.personalizedResponse || 'I understand your concern. Let me help you think through this.',
      tradingBias: parsed.tradingBias || 'No significant trading bias detected',
      interventionNeeded: parsed.interventionNeeded || false,
    };
  } catch (e) {
    return {
      emotionalState: {
        primary: 'neutral',
        secondary: 'none',
        intensity: 50,
        confidence: 30,
        triggers: ['unable to parse'],
        riskLevel: 'LOW',
        recommendations: ['Take a moment to breathe before making any decisions.'],
      },
      personalizedResponse: 'I hear you. Let me help you think through this clearly.',
      tradingBias: 'Analysis in progress',
      interventionNeeded: false,
    };
  }
}

function buildContextSummary(context: {
  recentTrades?: any[];
  currentPositions?: any[];
  portfolioPnL?: number;
  chatHistory?: { role: string; content: string }[];
}): string {
  const parts: string[] = [];

  if (context.portfolioPnL !== undefined) {
    parts.push(`Current portfolio P&L: ₹${context.portfolioPnL.toFixed(0)} (${context.portfolioPnL >= 0 ? 'profit' : 'loss'})`);
  }

  if (context.currentPositions && context.currentPositions.length > 0) {
    const symbols = context.currentPositions.map((p: any) => p.symbol).join(', ');
    parts.push(`Holding positions in: ${symbols}`);
    const totalValue = context.currentPositions.reduce((sum: number, p: any) => sum + (p.quantity * (p.currentPrice || p.avgPrice)), 0);
    parts.push(`Portfolio value: ~₹${totalValue.toFixed(0)}`);
  }

  if (context.recentTrades && context.recentTrades.length > 0) {
    const recentBuys = context.recentTrades.filter((t: any) => t.type === 'BUY').length;
    const recentSells = context.recentTrades.filter((t: any) => t.type === 'SELL').length;
    parts.push(`Recent trading activity: ${recentBuys} buys, ${recentSells} sells`);
  }

  if (context.chatHistory && context.chatHistory.length > 0) {
    const lastFew = context.chatHistory.slice(-3);
    parts.push(`Recent conversation context: ${lastFew.map(m => m.content.slice(0, 50)).join(' | ')}`);
  }

  return parts.join('\n');
}

export async function generateEmotionallyAwareResponse(
  message: string,
  context: {
    recentTrades?: any[];
    currentPositions?: any[];
    portfolioPnL?: number;
  },
  emotionalAnalysis: EmotionalAnalysisResult
): Promise<string> {
  const systemPrompt = `You are MoneyLogix AI, a warm and intelligent financial advisor with deep emotional intelligence.
You combine market expertise with behavioral psychology to help traders make better decisions.

Your current emotional assessment of the user:
- Primary emotion: ${emotionalAnalysis.emotionalState.primary}
- Intensity: ${emotionalAnalysis.emotionalState.intensity}/100
- Risk level: ${emotionalAnalysis.emotionalState.riskLevel}
- Detected trading bias: ${emotionalAnalysis.tradingBias}

Response guidelines:
- Acknowledge their emotional state empathetically
- If intensity > 60, gently提醒 them about emotional trading
- If intensity > 80, be firm about taking a pause
- Weave in the personalized response naturally
- Include one specific, actionable tip
- End with a grounding question or reflection
- Keep response under 250 words
- Never recommend specific stocks or timing
- Always remind them this is educational, not financial advice`;

  const contextParts: string[] = [];
  if (context.portfolioPnL !== undefined) {
    contextParts.push(`Their portfolio P&L: ₹${context.portfolioPnL.toFixed(0)}`);
  }
  if (context.currentPositions && context.currentPositions.length > 0) {
    contextParts.push(`They hold: ${context.currentPositions.map((p: any) => `${p.symbol} (${p.quantity} shares)`).join(', ')}`);
  }

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...(contextParts.length > 0 ? [{ role: 'user' as const, content: `User context: ${contextParts.join('. ')}` }] : []),
    { role: 'user', content: message },
  ];

  const responseText = await callSarvam(messages, { temperature: 0.8, maxTokens: 4096 });

  return responseText || emotionalAnalysis.personalizedResponse;
}
