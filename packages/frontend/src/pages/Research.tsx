import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { Send, Search, User, Newspaper, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message { id: string; role: 'USER' | 'ASSISTANT'; content: string; timestamp?: string; }

export default function Research() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { createSession(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const createSession = async () => {
    try {
      const { data } = await api.post('/ai/sessions', { type: 'RESEARCH' });
      setSessionId(data.id);
      setMessages([{
        id: 'welcome', role: 'ASSISTANT',
        content: "Welcome to AI Research Assistant! I can answer questions about Indian stocks using market data. Try asking:\n\n• \"Show me RELIANCE data\"\n• \"What's TCS trading at?\"\n• \"Compare INFY and TCS\"\n\nOr use the quick queries below.",
        timestamp: new Date().toISOString(),
      }]);
    } catch (error) { toast.error('Failed to initialize'); }
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'USER', content: input }]);
    setInput('');
    setLoading(true);
    try {
      const { data } = await api.post(`/ai/sessions/${sessionId}/messages`, { content: input });
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ASSISTANT', content: data.response }]);
    } catch (error) { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const quickQueries = ['Show RELIANCE data', 'Compare TCS vs INFY', 'Market overview', 'Top gainers today'];

  const renderMarkdown = (text: string) => text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\n/g, '<br/>');

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
            <Search size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Research Assistant</h1>
            <p className="text-xs text-slate-400">Stock data and market intelligence</p>
          </div>
        </div>
        <button onClick={createSession} className="btn-ghost text-sm flex items-center gap-2">
          <RotateCcw size={14} /> New
        </button>
      </div>

      <div className="flex-1 glass-card p-4 overflow-y-auto mb-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ASSISTANT' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                  <Newspaper size={14} className="text-white" />
                </div>
              )}
              <div className={msg.role === 'USER' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} className="text-sm leading-relaxed" />
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                <div className="spinner" />
              </div>
              <div className="chat-bubble-ai"><div className="typing-dots"><span /><span /><span /></div></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {messages.length <= 2 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {quickQueries.map((q) => (
            <button key={q} onClick={() => { setInput(q); }} className="px-3 py-2 glass-card text-sm text-slate-300 hover:text-white hover:border-green-500/30 transition-all">
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Ask about any stock..." className="input-glass flex-1" disabled={loading} />
        <button onClick={sendMessage} disabled={loading || !input.trim()} className="btn-glow px-6"><Send size={16} /></button>
      </div>
    </div>
  );
}
