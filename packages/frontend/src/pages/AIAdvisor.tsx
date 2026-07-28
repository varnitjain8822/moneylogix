import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { Send, Bot, User, Sparkles, RotateCcw, TrendingUp, Shield, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message { id: string; role: 'USER' | 'ASSISTANT'; content: string; timestamp: string; type?: string; }

const quickActions = [
  { label: 'Analyze my portfolio health', icon: Shield, graphId: 'positionDoctor' },
  { label: 'Review my trading behavior', icon: BarChart3, graphId: 'tradeAnalyzer' },
  { label: 'Get strategy recommendations', icon: TrendingUp, graphId: 'strategyAdvisor' },
];

export default function AIAdvisor() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentRunning, setAgentRunning] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { createSession(); }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const createSession = async () => {
    try {
      const { data } = await api.post('/ai/sessions', { type: 'AI_ADVISOR' });
      setSessionId(data.id);
      setMessages([{
        id: 'welcome', role: 'ASSISTANT',
        content: "Hello! I'm your AI Investment Advisor powered by our multi-agent system. I can help with:\n\n• **Portfolio health analysis** — diagnose your positions\n• **Trading behavior review** — detect biases and improve\n• **Strategy recommendations** — personalized to your risk profile\n• **General investment guidance** — answer your questions\n\nTry the quick actions below or just ask me anything!",
        timestamp: new Date().toISOString(),
      }]);
    } catch (error) { toast.error('Failed to initialize'); }
  };

  const sendChatMessage = async () => {
    if (!input.trim() || !sessionId) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'USER', content: input, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const { data } = await api.post(`/ai/sessions/${sessionId}/messages`, { content: input });
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'ASSISTANT',
        content: data.response, timestamp: new Date().toISOString(),
      }]);
    } catch (error) { toast.error('Failed to get response'); }
    finally { setLoading(false); }
  };

  const runAgentGraph = async (graphId: string, label: string) => {
    setAgentRunning(graphId);
    const userMsg: Message = {
      id: Date.now().toString(), role: 'USER',
      content: `Run ${label}`, timestamp: new Date().toISOString(), type: 'agent',
    };
    setMessages(prev => [...prev, userMsg]);
    try {
      const { data } = await api.post(`/agents/run/${graphId}`);
      const agentMsg: Message = {
        id: (Date.now() + 1).toString(), role: 'ASSISTANT',
        content: formatAgentResult(graphId, data),
        timestamp: new Date().toISOString(), type: 'agent',
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch (error) { toast.error('Agent graph failed'); }
    finally { setAgentRunning(null); }
  };

  const formatAgentResult = (graphId: string, result: any): string => {
    const logs = result.logs || [];
    const agentOutputs = result.agentOutputs || {};
    const overallScore = result.overallScore || 0;
    const totalDuration = result.totalDuration || 0;

    let response = `## Agent Graph Results\n\n`;
    response += `**Overall Score:** ${overallScore.toFixed(0)}/100\n`;
    response += `**Execution Time:** ${totalDuration}ms\n`;
    response += `**Status:** ${result.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}\n\n`;

    // Execution log
    if (logs.length > 0) {
      response += `### Execution Log\n`;
      for (const log of logs) {
        const icon = log.status === 'PASS' ? '✅' : log.status === 'FAIL' ? '🔄' : '❌';
        response += `${icon} **${log.agentName}** — Score: ${log.score}/100 (${log.status})\n`;
        if (log.feedback.length > 0) {
          response += `   ${log.feedback.join(', ')}\n`;
        }
        if (log.status === 'FAIL') {
          response += `   → Re-running with improvements (attempt ${log.attempt})\n`;
        }
      }
      response += `\n`;
    }

    // Agent-specific output
    if (graphId === 'position-doctor') {
      const posData = agentOutputs['position-doctor']?.data;
      if (posData?.summary) {
        const s = posData.summary;
        response += `### Position Health\n`;
        response += `**${s.totalPositions}** positions: ${s.healthy} healthy, ${s.warning} warning, ${s.critical} critical\n`;
        response += `**Average Health:** ${s.avgHealth?.toFixed(0) || 0}/100\n`;
        response += `**Total P&L:** ₹${s.totalPnL?.toFixed(0) || 0}\n\n`;
        for (const pos of (posData.positions || []).slice(0, 5)) {
          const statusIcon = pos.status === 'HEALTHY' ? '🟢' : pos.status === 'WARNING' ? '🟡' : '🔴';
          response += `${statusIcon} **${pos.symbol}** — ₹${pos.currentPrice?.toFixed(2)} (${pos.pnlPercent?.toFixed(1)}%) Health: ${pos.healthScore}/100\n`;
          for (const rec of (pos.recommendations || []).slice(0, 2)) {
            response += `   → ${rec}\n`;
          }
          response += `\n`;
        }
      }
    } else if (graphId === 'trade-analyzer') {
      const tradeData = agentOutputs['trade-analyzer']?.data;
      if (tradeData) {
        response += `### Trading Behavior\n`;
        response += `**Total Trades:** ${tradeData.summary?.totalTrades || 0}\n`;
        response += `**Win Rate:** ${tradeData.summary?.winRate || 'N/A'}\n\n`;
        if (tradeData.biases?.length > 0) {
          response += `**Detected Patterns:**\n`;
          for (const bias of tradeData.biases) {
            const sev = bias.severity === 'CRITICAL' ? '🔴' : bias.severity === 'HIGH' ? '🟡' : '🔵';
            response += `${sev} **${bias.type}**: ${bias.description}\n`;
            response += `   → ${bias.suggestion}\n\n`;
          }
        }
      }
    } else if (graphId === 'strategy-advisor') {
      const stratData = agentOutputs['strategy-advisor']?.data;
      if (stratData) {
        response += `### Strategy Recommendations (${stratData.riskProfile})\n\n`;
        for (const rec of (stratData.recommendations || [])) {
          response += `**${rec.name}** — ${rec.allocation}% allocation\n`;
          response += `Risk: ${rec.risk} | Horizon: ${rec.horizon} | Return: ${rec.expectedReturn}\n`;
          response += `${rec.rationale}\n\n`;
        }
        if (stratData.nextActions) {
          response += `**Next Actions:**\n`;
          for (const act of stratData.nextActions) {
            response += `• ${act.action} (${act.priority})\n`;
          }
        }
        response += `\n${stratData.disclaimer || ''}`;
      }
    } else {
      response += JSON.stringify(result, null, 2).slice(0, 2000);
    }

    return response;
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/## (.*)/g, '<h2 class="text-lg font-bold text-white mt-4 mb-2">$1</h2>')
      .replace(/### (.*)/g, '<h3 class="text-base font-semibold text-white mt-3 mb-1">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/→ /g, '<span class="text-blue-400">→</span> ')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Investment Advisor</h1>
            <p className="text-xs text-slate-400">Powered by multi-agent review loops</p>
          </div>
        </div>
        <button onClick={createSession} className="btn-ghost text-sm flex items-center gap-2">
          <RotateCcw size={14} /> New Session
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 glass-card p-4 overflow-y-auto mb-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ASSISTANT' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  {msg.type === 'agent' ? <BarChart3 size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
                </div>
              )}
              <div className={msg.role === 'USER' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                {msg.type === 'agent' ? (
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} className="text-sm leading-relaxed" />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} className="text-sm leading-relaxed" />
                )}
              </div>
              {msg.role === 'USER' && (
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-white" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-white" />
              </div>
              <div className="chat-bubble-ai">
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          {agentRunning && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                <div className="spinner" />
              </div>
              <div className="chat-bubble-ai text-sm text-blue-300">
                Running agent graph: {agentRunning}... (review loop in progress)
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {quickActions.map((qa) => (
            <button
              key={qa.graphId}
              onClick={() => runAgentGraph(qa.graphId, qa.label)}
              disabled={!!agentRunning}
              className="flex items-center gap-2 px-3 py-2 glass-card text-sm text-slate-300 hover:text-white hover:border-blue-500/30 transition-all disabled:opacity-50"
            >
              <qa.icon size={14} />
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
          placeholder="Ask about investments, risk, or your portfolio..."
          className="input-glass flex-1"
          disabled={loading || !!agentRunning}
        />
        <button onClick={sendChatMessage} disabled={loading || !input.trim() || !!agentRunning} className="btn-glow px-6">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
