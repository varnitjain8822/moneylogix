import { useEffect, useState } from 'react';
import api from '../services/api';
import { Newspaper, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function News() {
  const [news, setNews] = useState<any[]>([]);
  const [sentiment, setSentiment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { Promise.all([api.get('/news'), api.get('/news/sentiment')]).then(([n, s]) => { setNews(n.data); setSentiment(s.data); }).catch(() => {}).finally(() => setLoading(false)); }, []);

  const sentimentColor = (label?: string) => label === 'positive' ? 'bg-green-500/15 text-green-400' : label === 'negative' ? 'bg-red-500/15 text-red-400' : 'bg-slate-500/15 text-slate-400';
  const sentimentIcon = (label?: string) => label === 'positive' ? <TrendingUp size={14} className="text-green-400" /> : label === 'negative' ? <TrendingDown size={14} className="text-red-400" /> : <Minus size={14} className="text-slate-400" />;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" style={{width:32,height:32,borderWidth:3}} /></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center"><Newspaper size={20} className="text-white" /></div>
        <div><h1 className="text-2xl font-bold text-white">News & Sentiment</h1><p className="text-xs text-slate-400">Multi-source market intelligence</p></div>
      </div>

      {sentiment && (
        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-3">Market Sentiment</h2>
          <div className="grid grid-cols-5 gap-4 text-center">
            <div><p className="text-2xl font-bold text-white">{sentiment.total}</p><p className="text-xs text-slate-400">Articles</p></div>
            <div><p className="text-2xl font-bold text-green-400">{sentiment.positive}</p><p className="text-xs text-slate-400">Positive</p></div>
            <div><p className="text-2xl font-bold text-red-400">{sentiment.negative}</p><p className="text-xs text-slate-400">Negative</p></div>
            <div><p className="text-2xl font-bold text-slate-400">{sentiment.neutral}</p><p className="text-xs text-slate-400">Neutral</p></div>
            <div><p className={`text-2xl font-bold ${sentiment.sentimentTrend === 'BULLISH' ? 'text-green-400' : sentiment.sentimentTrend === 'BEARISH' ? 'text-red-400' : 'text-slate-400'}`}>{sentiment.sentimentTrend}</p><p className="text-xs text-slate-400">Trend</p></div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {news.map(item => (
          <div key={item.id} className="glass-card p-4 hover:border-slate-600/50 transition-all">
            <div className="flex items-start gap-3">
              {sentimentIcon(item.sentimentLabel)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sentimentColor(item.sentimentLabel)}`}>{item.sentimentLabel || 'neutral'}</span>
                  <span className="text-[10px] text-slate-500">{item.source}</span>
                </div>
                <h3 className="text-sm font-medium text-white mb-1">{item.title}</h3>
                {item.content && <p className="text-xs text-slate-400 mb-2 line-clamp-2">{item.content}</p>}
                <div className="flex items-center gap-2">
                  {item.symbols?.map((s: string) => <span key={s} className="text-[10px] px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-300">{s}</span>)}
                  <span className="text-[10px] text-slate-500 ml-auto">{new Date(item.publishedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
