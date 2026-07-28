import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Stock } from '../types';
import {
  TrendingUp, TrendingDown, Activity, Bot, BarChart3, Gamepad2,
  Newspaper, Search, Network, ArrowUpRight, Zap, Shield,
} from 'lucide-react';

export default function Dashboard() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const { data } = await api.get('/market/stocks');
        setStocks(data);
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    fetchStocks();
    const interval = setInterval(fetchStocks, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    { title: 'Watchlist', desc: 'Track stocks in real-time', icon: Activity, path: '/watchlist', gradient: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/10' },
    { title: 'Position Doctor', desc: 'Diagnose position health', icon: Shield, path: '/position-doctor', gradient: 'from-green-500 to-emerald-500', shadow: 'shadow-green-500/10' },
    { title: 'AI Advisor', desc: 'Personalized investment advice', icon: Bot, path: '/ai-advisor', gradient: 'from-purple-500 to-pink-500', shadow: 'shadow-purple-500/10' },
    { title: 'Trade Analyzer', desc: 'Analyze your behavior', icon: BarChart3, path: '/trade-analyzer', gradient: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-500/10' },
    { title: 'Strategy Builder', desc: 'Risk-based recommendations', icon: Network, path: '/strategy-builder', gradient: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/10' },
    { title: 'Paper Trading', desc: 'Practice risk-free', icon: Gamepad2, path: '/paper-trading', gradient: 'from-yellow-500 to-orange-500', shadow: 'shadow-yellow-500/10' },
    { title: 'News Feed', desc: 'Market sentiment analysis', icon: Newspaper, path: '/news', gradient: 'from-rose-500 to-pink-500', shadow: 'shadow-rose-500/10' },
    { title: 'Research', desc: 'AI-powered stock Q&A', icon: Search, path: '/research', gradient: 'from-teal-500 to-green-500', shadow: 'shadow-teal-500/10' },
    { title: 'Backtesting', desc: 'Test strategies historically', icon: Zap, path: '/backtesting', gradient: 'from-indigo-500 to-purple-500', shadow: 'shadow-indigo-500/10' },
  ];

  const marketStats = stocks.length > 0 ? {
    advancers: stocks.filter(s => s.changePercent > 0).length,
    decliners: stocks.filter(s => s.changePercent < 0).length,
    totalVolume: stocks.reduce((s, st) => s + st.volume, 0),
    avgChange: stocks.reduce((s, st) => s + st.changePercent, 0) / stocks.length,
  } : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold text-white mb-1">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}
        </h1>
        <p className="text-slate-400">Here's your market overview</p>
      </div>

      {/* Market Stats Bar */}
      {marketStats && (
        <div className="glass-card p-4 animate-fade-up stagger-1">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm text-slate-300">Advancers</span>
                <span className="text-sm font-bold text-green-400">{marketStats.advancers}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-sm text-slate-300">Decliners</span>
                <span className="text-sm font-bold text-red-400">{marketStats.decliners}</span>
              </div>
              <div className="h-4 w-px bg-slate-700" />
              <span className="text-sm text-slate-400">Avg: <span className={marketStats.avgChange >= 0 ? 'text-green-400' : 'text-red-400'}>{marketStats.avgChange >= 0 ? '+' : ''}{marketStats.avgChange.toFixed(2)}%</span></span>
              <span className="text-sm text-slate-400">Vol: <span className="text-white">{(marketStats.totalVolume / 1000000).toFixed(0)}M</span></span>
            </div>
            <div className="text-xs text-slate-500">Auto-refreshing every 3s</div>
          </div>
        </div>
      )}

      {/* Stock Grid */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap size={18} className="text-yellow-400" />
          Live Market
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="glass-card p-4 animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-16 mb-3" />
                <div className="h-6 bg-slate-700 rounded w-24 mb-2" />
                <div className="h-3 bg-slate-700 rounded w-12" />
              </div>
            ))
          ) : (
            stocks.slice(0, 10).map((stock) => (
              <div
                key={stock.symbol}
                className={`glass-card p-4 cursor-pointer group ${
                  stock.changePercent >= 0 ? 'hover:border-green-500/30' : 'hover:border-red-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 tracking-wider">{stock.symbol}</span>
                  <span className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                    stock.changePercent >= 0 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                  }`}>
                    {stock.changePercent >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </span>
                </div>
                <div className="text-xl font-bold text-white mb-0.5">₹{stock.price.toFixed(2)}</div>
                <div className={`text-xs ${stock.change >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                  {stock.change >= 0 ? '+' : ''}₹{stock.change.toFixed(2)}
                </div>
                <div className="mt-2 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stock.changePercent >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, Math.abs(stock.changePercent) * 20)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Feature Grid */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <Link
              key={f.path}
              to={f.path}
              className={`glass-card p-5 group animate-fade-up stagger-${Math.min(i + 1, 5)}`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-lg ${f.shadow}`}>
                  <f.icon size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-slate-500 group-hover:text-blue-400 transition-colors mt-1" />
              </div>
              <h3 className="text-white font-semibold mt-4 mb-1">{f.title}</h3>
              <p className="text-sm text-slate-400">{f.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
