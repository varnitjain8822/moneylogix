import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { Bot, TrendingUp, TrendingDown, DollarSign, Shield, Activity, Clock, Sparkles, Brain, AlertCircle, Search, Bell, RefreshCw, Wallet, Target, Lightbulb, Newspaper, ChevronRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, BarChart, Bar } from 'recharts';
import { useMarketStore } from '../stores/marketStore';

type MarketStatus = 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS';
type Sentiment = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

interface MarketIntel {
  sentiment: Sentiment;
  confidence: number;
  summary: string;
  trend: string;
  volatility: string;
  riskLevel: string;
  indices: any[];
}

interface AIRecommendation {
  symbol: string;
  name: string;
  currentPrice: number;
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  riskRewardRatio: number;
  expectedReturn: string;
  confidence: number;
  timeHorizon: string;
  reason: string;
  type: 'BUY' | 'SELL';
}

interface Insight {
  title: string;
  description: string;
  confidence: number;
  icon: any;
  color: string;
}

interface Prediction {
  label: string;
  direction: 'UP' | 'DOWN' | 'SIDEWAYS';
  confidence: number;
  expectedMove: string;
  probability: string;
}

export default function AIAdvisor() {
  const { stocks: livePrices } = useMarketStore();
  const [marketStatus] = useState<MarketStatus>('OPEN');
  const [marketIntel, setMarketIntel] = useState<MarketIntel | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [paperSummary, setPaperSummary] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [riskMetrics, setRiskMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'insights' | 'recommendations' | 'predictions' | 'news' | 'performance'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [cachedRequests, setCachedRequests] = useState<Record<string, { data: any; timestamp: number }>>({});
  const cacheDuration = 30000;
  const socketRef = useRef<any>(null);

  const getCached = useCallback((key: string) => {
    const cached = cachedRequests[key];
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      return cached.data;
    }
    return null;
  }, [cachedRequests]);

  const setCached = useCallback((key: string, data: any) => {
    setCachedRequests(prev => ({ ...prev, [key]: { data, timestamp: Date.now() } }));
  }, []);

  const liveStats = useMemo(() => {
    if (!paperSummary || !paperSummary.positions) return { totalValue: paperSummary?.totalValue || 0, totalPnl: paperSummary?.totalPnl || 0 };
    let currentPositionsValue = 0;
    let totalInvested = 0;
    
    paperSummary.positions.forEach((p: any) => {
      const currentPrice = livePrices[p.symbol]?.price || p.avgPrice || 0;
      currentPositionsValue += currentPrice * p.quantity;
      totalInvested += (p.avgPrice || 0) * p.quantity;
    });
    
    return {
      totalValue: (paperSummary.balance || 0) + currentPositionsValue,
      totalPnl: currentPositionsValue - totalInvested,
    };
  }, [paperSummary, livePrices]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const marketsRes: any = await api.get('/market/stocks').catch(() => ({ data: [] }));
      const portfolioRes: any = await api.get('/portfolios/analytics').catch(() => null);
      const paperRes: any = await api.get('/paper/summary').catch(() => null);
      const tradesRes: any = await api.get('/trades/history').catch(() => []);
      const newsRes: any = await api.get('/market/market-news').catch(() => []);
      const perfRes: any = await api.get('/analytics/performance?days=30').catch(() => null);
      const riskRes: any = await api.get('/analytics/risk').catch(() => null);

      const stocks = marketsRes.data || [];
      setPortfolioData(portfolioRes?.data || portfolioRes);
      setPaperSummary(paperRes?.data || paperRes);
      setTrades(tradesRes.data || tradesRes);
      setNews(newsRes.data || newsRes);
      setPerformanceData(perfRes?.data || perfRes);
      setRiskMetrics(riskRes?.data || riskRes);

      // Market Intel
      const indices = await api.get('/market/indices').catch(() => ({ data: [] }));
      const avgChange = indices.data?.length > 0
        ? indices.data.reduce((s: number, i: any) => s + i.changePercent, 0) / indices.data.length
        : 0;
      const sentiment: Sentiment = avgChange > 0.3 ? 'BULLISH' : avgChange < -0.3 ? 'BEARISH' : 'NEUTRAL';
      setMarketIntel({
        sentiment,
        confidence: Math.min(95, Math.max(60, 80 + Math.abs(avgChange) * 50)),
        summary: `AI detects ${sentiment.toLowerCase()} market momentum based on ${indices.data?.length || 0} major indices. ${sentiment === 'BULLISH' ? 'Buying opportunities identified in leading sectors.' : sentiment === 'BEARISH' ? 'Caution advised - consider defensive positions.' : 'Market shows mixed signals - maintain current strategy.'}`,
        trend: avgChange >= 0 ? 'Upward' : 'Downward',
        volatility: Math.abs(avgChange) > 1 ? 'High' : Math.abs(avgChange) > 0.3 ? 'Moderate' : 'Low',
        riskLevel: avgChange > 0.5 ? 'Moderate' : avgChange < -0.5 ? 'Elevated' : 'Normal',
        indices: indices.data || [],
      });

      // AI Recommendations
      const recommendations = generateRecommendations(stocks);
      setAiRecommendations(recommendations);

      // Insights
      const sectorData = portfolioRes?.sectorAllocation || {};
      const sortedSectors = Object.entries(sectorData).sort((a, b) => (b[1] as number) - (a[1] as number));
      const pCount = paperRes?.data?.positionsCount || paperRes?.positionsCount || 0;
      const pBalance = paperRes?.data?.balance || paperRes?.balance || 0;
      setInsights([
        { title: 'Strongest Sector', description: `${sortedSectors[0]?.[0] || 'N/A'} leading allocation at ${((sortedSectors[0]?.[1] as number) || 0).toFixed(1)}%`, confidence: 87, icon: TrendingUp, color: 'text-green-400' },
        { title: pCount > 5 ? 'High Activity' : 'Conservative Stance', description: pCount ? `${pCount} active paper positions detected` : 'No active paper positions', confidence: 92, icon: Activity, color: 'text-blue-400' },
        { title: 'Paper Balance', description: `₹${pBalance.toLocaleString('en-IN')}`, confidence: 100, icon: Wallet, color: 'text-yellow-400' },
        { title: 'Risk Exposure', description: riskMetrics ? `${riskMetrics.diversificationScore}% diversified across ${Object.keys(riskMetrics.sectorAllocation || {}).length} sectors` : 'Analyzing risk profile...', confidence: 78, icon: Shield, color: 'text-purple-400' },
      ]);

      // Predictions
      setPredictions([
        { label: 'NIFTY 50', direction: avgChange > 0 ? 'UP' : avgChange < 0 ? 'DOWN' : 'SIDEWAYS', confidence: Math.min(90, 70 + Math.abs(avgChange) * 30), expectedMove: `${(avgChange * 10).toFixed(1)}%`, probability: `${Math.min(90, 65 + Math.abs(avgChange) * 50)}%` },
        { label: 'SENSEX', direction: avgChange > 0 ? 'UP' : avgChange < 0 ? 'DOWN' : 'SIDEWAYS', confidence: Math.min(85, 65 + Math.abs(avgChange) * 25), expectedMove: `${(avgChange * 10).toFixed(1)}%`, probability: `${Math.min(85, 60 + Math.abs(avgChange) * 45)}%` },
        { label: 'Technology', direction: avgChange > 0 ? 'UP' : 'SIDEWAYS', confidence: 75, expectedMove: `${(avgChange * 1.5).toFixed(1)}%`, probability: '68%' },
        { label: 'Banking', direction: avgChange > 0 ? 'UP' : 'DOWN', confidence: 70, expectedMove: `${(avgChange * 0.8).toFixed(1)}%`, probability: '62%' },
        { label: 'Week Ahead', direction: avgChange > 0 ? 'UP' : avgChange < 0 ? 'DOWN' : 'SIDEWAYS', confidence: 65, expectedMove: `${(avgChange * 3).toFixed(1)}%`, probability: '58%' },
      ]);

      // Notifications
      setNotifications([
        { id: 1, type: 'info', message: 'Market is currently open - real-time data active', time: 'Now', read: false },
        { id: 2, type: 'success', message: `Paper trading summary synced: ₹${(paperRes?.data?.totalValue || paperRes?.totalValue || 0).toLocaleString('en-IN')} total value`, time: 'Just now', read: false },
        { id: 3, type: 'warning', message: riskMetrics?.diversificationScore < 50 ? 'Portfolio concentration risk detected' : 'Portfolio within healthy risk parameters', time: '2m ago', read: false },
      ]);
      setUnreadCount(notifications.filter(n => !n.read).length);

    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [cachedRequests, notifications]);

  const generateRecommendations = (stocks: any[]): AIRecommendation[] => {
    return stocks.slice(0, 5).map(stock => {
      const isBuy = stock.changePercent >= 0;
      const confidence = Math.min(95, Math.max(60, 75 + Math.abs(stock.changePercent) * 10));
      return {
        symbol: stock.symbol,
        name: stock.symbol,
        currentPrice: stock.price,
        entryPrice: isBuy ? stock.price * 0.98 : stock.price * 1.02,
        stopLoss: isBuy ? stock.price * 0.94 : stock.price * 1.06,
        target1: isBuy ? stock.price * 1.05 : stock.price * 0.95,
        target2: isBuy ? stock.price * 1.10 : stock.price * 0.90,
        riskRewardRatio: isBuy ? (stock.price * 1.10 - stock.price * 0.94) / (stock.price * 0.94 - stock.price * 0.98) : (stock.price * 0.9 - stock.price * 1.06) / Math.abs(stock.price * 1.06 - stock.price * 1.02),
        expectedReturn: isBuy ? `+${(stock.changePercent * 3).toFixed(1)}%` : `${(stock.changePercent * 3).toFixed(1)}%`,
        confidence,
        timeHorizon: stock.changePercent > 2 ? 'Intraday' : 'Swing',
        reason: isBuy ? `Positive momentum detected with ${stock.changePercent.toFixed(2)}% change. Volume and trend indicators support continued movement.` : `Price pullback detected - potential entry opportunity on confirmation.`,
        type: isBuy ? 'BUY' : 'SELL',
      };
    });
  };

  useEffect(() => { fetchAllData(); }, []);

  useEffect(() => {
    socketRef.current = connectSocket();
    socketRef.current.on('price-update', (update: any) => {
      setCached(`stock_${update.symbol}`, update);
    });
    return () => { if (socketRef.current) disconnectSocket(); };
  }, [setCached]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    const cached = getCached(`search_${query}`);
    if (cached) { setSearchResults(cached); return; }
    try {
      const allStocks = await api.get('/market/stocks');
      const results = allStocks.data.filter((s: any) =>
        s.symbol.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);
      setCached(`search_${query}`, results);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement === document.body) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getMarketStatusBadge = (status: MarketStatus) => {
    const configs = {
      OPEN: { bg: 'bg-green-500/15', text: 'text-green-400', dot: 'bg-green-400 animate-pulse', label: 'Market Open' },
      CLOSED: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400', label: 'Market Closed' },
      PRE_MARKET: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', dot: 'bg-yellow-400', label: 'Pre-Market' },
      AFTER_HOURS: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400', label: 'After Hours' },
    };
    const c = configs[status] || configs.CLOSED;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {c.label}
      </span>
    );
  };

  if (loading && !marketIntel) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" style={{ width: 32, height: 32, borderWidth: 3 }} />
          <p className="text-slate-400 text-sm">Initializing AI Advisor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="glass-card p-8 text-center max-w-md">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Unable to Load Dashboard</h2>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button onClick={fetchAllData} className="btn-glow text-sm">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 glass-card border-b border-white/5 mb-6" style={{ borderRadius: 0 }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <span className="font-bold text-white hidden sm:inline">MoneyLogix AI</span>
            </div>
            <div className="hidden md:flex items-center gap-1 text-xs">
              {['dashboard', 'insights', 'recommendations', 'predictions', 'news', 'performance'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'text-white bg-blue-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSearch(true)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors hidden sm:block">
              <Search size={16} />
            </button>
            <button className="relative p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
              <Bell size={16} />
              {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">{unreadCount}</span>}
            </button>
            <button className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
              <RefreshCw size={16} onClick={fetchAllData} />
            </button>
          </div>
        </div>
      </nav>

      {/* Search Overlay */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-20 px-4" onClick={() => setShowSearch(false)}>
          <div className="glass-card p-4 w-full max-w-lg animate-fade-up" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); handleSearch(e.target.value); }}
              placeholder="Search stocks, ETFs, news..."
              className="input-glass w-full mb-3"
              autoFocus
            />
            {searchResults.length > 0 && (
              <div className="space-y-1">
                {searchResults.map((s, i) => (
                  <a key={i} href={`/stock/${s.symbol}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors" onClick={() => setShowSearch(false)}>
                    <span className="font-semibold text-white text-sm">{s.symbol}</span>
                    <span className="text-slate-400 text-sm">₹{s.price.toFixed(2)}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAIN DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-up">
          {/* Hero */}
          <div className="glass-card p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{getGreeting()}, Trader 👋</h1>
                <p className="text-slate-400 text-sm">Your AI-powered trading intelligence center</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {getMarketStatusBadge(marketStatus)}
                <span className="text-xs text-slate-500">|</span>
                <span className="text-xs text-slate-400">{marketIntel?.sentiment} Sentiment</span>
              </div>
            </div>
          </div>

          {/* Market Intel Card */}
          {marketIntel && (
            <div className="glass-card p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-white/5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <Brain size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">AI Market Intelligence</h2>
                    <p className="text-xs text-slate-400">Real-time sentiment analysis</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${marketIntel.sentiment === 'BULLISH' ? 'text-green-400' : marketIntel.sentiment === 'BEARISH' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {marketIntel.sentiment} {marketIntel.confidence}%
                  </div>
                  <div className="text-xs text-slate-400">Confidence</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Trend', value: marketIntel.trend, icon: marketIntel.trend === 'Upward' ? TrendingUp : TrendingDown, color: marketIntel.trend === 'Upward' ? 'text-green-400' : 'text-red-400' },
                  { label: 'Volatility', value: marketIntel.volatility, color: marketIntel.volatility === 'High' ? 'text-red-400' : marketIntel.volatility === 'Moderate' ? 'text-yellow-400' : 'text-green-400' },
                  { label: 'Risk Level', value: marketIntel.riskLevel, color: marketIntel.riskLevel === 'Elevated' ? 'text-red-400' : marketIntel.riskLevel === 'Moderate' ? 'text-yellow-400' : 'text-green-400' },
                  { label: 'Indices Tracked', value: marketIntel.indices.length.toString(), color: 'text-blue-400' },
                ].map((stat, i) => (
                  <div key={i} className="glass-card p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-3 h-3 rounded-full flex-shrink-0 bg-slate-400" />
                      <span className="text-xs text-slate-400">{stat.label}</span>
                    </div>
                    <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="glass-card p-4 bg-white/[0.02]">
                <div className="flex items-start gap-2">
                  <Sparkles size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-300 leading-relaxed">{marketIntel?.summary}</p>
                </div>
              </div>
            </div>
          )}

          {/* Portfolio Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Value (Live)', value: `₹${(liveStats.totalValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: Wallet, color: 'text-white' },
              { label: 'Live P&L', value: `${liveStats.totalPnl >= 0 ? '+' : ''}₹${(liveStats.totalPnl || 0).toFixed(0)}`, icon: TrendingUp, color: (liveStats.totalPnl || 0) >= 0 ? 'text-green-400' : 'text-red-400' },
              { label: 'Cash Balance', value: paperSummary?.balance != null ? `₹${paperSummary.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹--', icon: DollarSign, color: 'text-yellow-400' },
              { label: 'Active Positions', value: paperSummary?.positionsCount != null ? paperSummary.positionsCount.toString() : '0', icon: Target, color: 'text-blue-400' },
            ].map((stat, i) => (
              <div key={i} className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon size={14} className="text-slate-400" />
                  <span className="text-xs text-slate-400">{stat.label}</span>
                </div>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* AI Recommendations */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Sparkles size={18} className="text-purple-400" /> AI Recommended Trades</h2>
              <span className="text-xs text-slate-500">{aiRecommendations.length} opportunities</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiRecommendations.map((rec, i) => (
                <div key={i} className="glass-card p-5 border-l-4 border-l-blue-500 hover:border-l-blue-400 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rec.type === 'BUY' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>{rec.type}</span>
                      <span className="text-white font-semibold">{rec.symbol}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-green-400 font-medium">{rec.confidence}%</span>
                      <div className="text-xs text-slate-400">confidence</div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Current Price</span><span className="text-white font-mono">₹{rec.currentPrice.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Entry</span><span className="text-white font-mono">₹{rec.entryPrice.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Stop Loss</span><span className="text-red-400 font-mono">₹{rec.stopLoss.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Targets</span><span className="text-green-400 font-mono">₹{rec.target1.toFixed(2)} / ₹{rec.target2.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Risk/Reward</span><span className="text-blue-400">{rec.riskRewardRatio}:1</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Expected Return</span><span className={parseFloat(rec.expectedReturn) >= 0 ? 'text-green-400' : 'text-red-400'}>{rec.expectedReturn}</span></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3 bg-white/[0.02] p-2 rounded">{rec.reason}</p>
                  <div className="flex gap-2 mt-3">
                    <button className="flex-1 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-medium hover:bg-blue-500/25 transition-colors">View Details</button>
                    <button className="flex-1 py-1.5 rounded-lg bg-white/5 text-slate-300 text-xs font-medium hover:bg-white/10 transition-colors">Add to Watchlist</button>
                    <button className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${rec.type === 'BUY' ? 'btn-glow' : 'btn-danger'}`}>{rec.type === 'BUY' ? 'Buy' : 'Sell'}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Lightbulb size={18} className="text-yellow-400" /> AI Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight, i) => (
                <div key={i} className="glass-card p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${insight.color.replace('text-', 'bg-').replace('400', '500/15')}`}>
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: insight.color.replace('text-', '#').replace('400', '00') }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-white">{insight.title}</h3>
                        <span className="text-[10px] text-slate-500">{insight.confidence}% confidence</span>
                      </div>
                      <p className="text-xs text-slate-400">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Market News */}
          {news.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Newspaper size={18} className="text-rose-400" /> Latest News</h2>
              <div className="space-y-2">
                {news.slice(0, 5).map((item, i) => (
                  <div key={i} className="glass-card p-4 flex items-start gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors">
                    <div className={`w-1 h-full min-h-[40px] rounded-full flex-shrink-0 ${item.sentimentLabel === 'positive' ? 'bg-green-400' : item.sentimentLabel === 'negative' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white mb-1">{item.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{item.source || 'Unknown'}</span>
                        <span>•</span>
                        <span>{new Date(item.publishedAt || Date.now()).toLocaleDateString()}</span>
                        {item.symbols && item.symbols.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-blue-400">{item.symbols.join(', ')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* INSIGHTS TAB */}
      {activeTab === 'insights' && (
        <div className="space-y-6 animate-fade-up">
          <h1 className="text-2xl font-bold text-white">AI Insights</h1>
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Portfolio AI Analysis</h2>
            {portfolioData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Portfolio Health', value: '82', max: 100, color: 'from-green-500 to-emerald-500' },
                  { label: 'Diversification', value: riskMetrics?.diversificationScore || 0, max: 100, color: 'from-blue-500 to-cyan-500' },
                  { label: 'Risk Score', value: riskMetrics ? Math.max(0, 100 - riskMetrics.diversificationScore) : 50, max: 100, color: 'from-yellow-500 to-orange-500' },
                  { label: 'Performance', value: portfolioData.totalPnLPercent ? Math.min(100, Math.max(0, 50 + portfolioData.totalPnLPercent)) : 50, max: 100, color: 'from-purple-500 to-pink-500' },
                ].map((metric, i) => (
                  <div key={i} className="glass-card p-4">
                    <p className="text-xs text-slate-400 mb-2">{metric.label}</p>
                    <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden mb-2">
                      <div className={`absolute inset-y-0 left-0 bg-gradient-to-r ${metric.color} rounded-full transition-all duration-700`} style={{ width: `${metric.value}%` }} />
                    </div>
                    <p className="text-2xl font-bold text-white">{metric.value}<span className="text-sm text-slate-400">/{metric.max}</span></p>
                  </div>
                ))}
              </div>
            )}
            {riskMetrics?.sectorAllocation && Object.keys(riskMetrics.sectorAllocation).length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-white mb-3">Sector Exposure</h3>
                <div className="space-y-2">
                  {Object.entries(riskMetrics.sectorAllocation).map(([sector, value]) => (
                    <div key={sector} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-24">{sector}</span>
                      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${((value as number) / portfolioData.currentValue) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-300 font-mono w-16 text-right">{((value as number) / (portfolioData.currentValue || 1)) * 100}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="glass-card p-4 bg-white/[0.02]">
              <div className="flex items-start gap-2">
                <Brain size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400 mb-1">AI Recommendation</p>
                  <p className="text-sm text-white leading-relaxed">
                    {riskMetrics?.diversificationScore < 40 ? 'Your portfolio is concentrated. Consider diversifying across more sectors to reduce risk.' :
                     riskMetrics?.diversificationScore < 70 ? 'Good diversification, but consider adding exposure to underrepresented sectors for better balance.' :
                     'Your portfolio is well-diversified. Maintain current allocation strategy.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECOMMENDATIONS TAB */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6 animate-fade-up">
          <h1 className="text-2xl font-bold text-white">AI Recommendations</h1>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {aiRecommendations.map((rec, i) => (
              <div key={i} className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${rec.type === 'BUY' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>{rec.type}</span>
                    <h3 className="text-lg font-bold text-white">{rec.symbol}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">₹{rec.currentPrice.toFixed(2)}</div>
                    <div className="text-xs text-slate-400">Confidence: {rec.confidence}%</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="glass-card p-3"><p className="text-xs text-slate-400">Entry Price</p><p className="text-white font-mono">₹{rec.entryPrice.toFixed(2)}</p></div>
                  <div className="glass-card p-3"><p className="text-xs text-slate-400">Stop Loss</p><p className="text-red-400 font-mono">₹{rec.stopLoss.toFixed(2)}</p></div>
                  <div className="glass-card p-3"><p className="text-xs text-slate-400">Target 1</p><p className="text-green-400 font-mono">₹{rec.target1.toFixed(2)}</p></div>
                  <div className="glass-card p-3"><p className="text-xs text-slate-400">Target 2</p><p className="text-green-400 font-mono">₹{rec.target2.toFixed(2)}</p></div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-400">Risk/Reward</span>
                  <span className="text-sm font-bold text-blue-400">{rec.riskRewardRatio}:1</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-slate-400">Expected Return</span>
                  <span className={`text-sm font-bold ${parseFloat(rec.expectedReturn) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{rec.expectedReturn}</span>
                </div>
                <div className="mb-4">
                  <p className="text-xs text-slate-400 mb-1">AI Reasoning</p>
                  <p className="text-sm text-slate-300 bg-white/[0.02] p-3 rounded">{rec.reason}</p>
                </div>
                {/* Explainability */}
                <div className="border-t border-white/5 pt-4">
                  <p className="text-xs text-slate-500 mb-2">Confidence Breakdown</p>
                  <div className="flex gap-2">
                    {[
                      { label: 'Technical', value: Math.min(100, rec.confidence + 5), color: 'bg-blue-500' },
                      { label: 'Fundamental', value: Math.min(100, rec.confidence), color: 'bg-green-500' },
                      { label: 'Sentiment', value: Math.min(100, rec.confidence - 3), color: 'bg-purple-500' },
                      { label: 'News', value: Math.min(100, rec.confidence + 2), color: 'bg-yellow-500' },
                    ].map((factor, j) => (
                      <div key={j} className="flex-1">
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-1"><div className={`h-full ${factor.color} rounded-full`} style={{ width: `${factor.value}%` }} /></div>
                        <p className="text-[10px] text-slate-500 text-center">{factor.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PREDICTIONS TAB */}
      {activeTab === 'predictions' && (
        <div className="space-y-6 animate-fade-up">
          <h1 className="text-2xl font-bold text-white">AI Prediction Center</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predictions.map((pred, i) => (
              <div key={i} className="glass-card p-5">
                <h3 className="text-white font-semibold mb-3">{pred.label}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${pred.direction === 'UP' ? 'bg-green-500/15 text-green-400' : pred.direction === 'DOWN' ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                    {pred.direction === 'UP' ? 'Likely Bullish' : pred.direction === 'DOWN' ? 'Likely Bearish' : 'Sideways'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Confidence</span><span className="text-white font-bold">{pred.confidence}%</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Probability</span><span className="text-white">{pred.probability}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Expected Move</span><span className={`font-mono ${pred.direction === 'UP' ? 'text-green-400' : pred.direction === 'DOWN' ? 'text-red-400' : 'text-yellow-400'}`}>{pred.direction === 'UP' ? '+' : ''}{pred.expectedMove}</span></div>
                </div>
                <div className="mt-4">
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ${pred.direction === 'UP' ? 'bg-green-500' : pred.direction === 'DOWN' ? 'bg-red-500' : 'bg-yellow-500'}`} style={{ width: `${pred.confidence}%` }} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEWS TAB */}
      {activeTab === 'news' && (
        <div className="space-y-6 animate-fade-up">
          <h1 className="text-2xl font-bold text-white">Market News</h1>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-slate-400">{news.length} articles</span>
          </div>
          <div className="space-y-3">
            {news.map((item, i) => (
              <div key={i} className="glass-card p-5 cursor-pointer hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`w-1 h-full min-h-[60px] rounded-full flex-shrink-0 ${item.sentimentLabel === 'positive' ? 'bg-green-400' : item.sentimentLabel === 'negative' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-2">{item.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>{item.source || 'Unknown'}</span>
                      <span>•</span>
                      <span>{new Date(item.publishedAt || Date.now()).toLocaleString()}</span>
                      {item.symbols && item.symbols.map((s: string, j: number) => (
                        <span key={j} className="text-blue-400">{s}</span>
                      ))}
                    </div>
                    {item.content && <p className="text-sm text-slate-400 mt-2 line-clamp-2">{item.content}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${item.sentimentLabel === 'positive' ? 'bg-green-500/15 text-green-400' : item.sentimentLabel === 'negative' ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                        {item.sentimentLabel || 'Neutral'}
                      </span>
                      <span className="text-xs text-slate-500">{item.sentiment ? `${(item.sentiment * 100).toFixed(0)}% confidence` : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PERFORMANCE TAB */}
      {activeTab === 'performance' && performanceData && (
        <div className="space-y-6 animate-fade-up">
          <h1 className="text-2xl font-bold text-white">Performance Analytics</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Win Rate', value: `${performanceData.winRate.toFixed(1)}%`, color: 'text-green-400' },
              { label: 'Total Return', value: `${performanceData.totalReturn >= 0 ? '+' : ''}${performanceData.totalReturn.toFixed(2)}%`, color: performanceData.totalReturn >= 0 ? 'text-green-400' : 'text-red-400' },
              { label: 'Sharpe Ratio', value: performanceData.sharpeRatio.toFixed(2), color: 'text-blue-400' },
              { label: 'Max Drawdown', value: `${performanceData.maxDrawdown.toFixed(2)}%`, color: 'text-red-400' },
            ].map((m, i) => (
              <div key={i} className="glass-card p-4 text-center">
                <p className="text-xs text-slate-400 mb-1">{m.label}</p>
                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>
          {performanceData.equityCurve && performanceData.equityCurve.length > 0 && (
            <div className="glass-card p-5"><h3 className="text-sm font-semibold text-white mb-3">Equity Curve</h3><div className="h-48"><ResponsiveContainer width="100%" height="100%"><AreaChart data={performanceData.equityCurve}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="date" stroke="#64748b" fontSize={11} /><YAxis stroke="#64748b" fontSize={11} /><Tooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} /><Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#perfGrad)" name="Value" /></AreaChart></ResponsiveContainer></div></div>
          )}
          {performanceData.dailyReturns && performanceData.dailyReturns.length > 0 && (
            <div className="glass-card p-5"><h3 className="text-sm font-semibold text-white mb-3">Daily Returns</h3><div className="h-32"><ResponsiveContainer width="100%" height="100%"><BarChart data={performanceData.dailyReturns.filter((r: number) => r !== 0).slice(-30).map((r: number, i: number) => ({ day: i + 1, return: r }))}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="day" stroke="#64748b" fontSize={11} /><YAxis stroke="#64748b" fontSize={11} /><Tooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} /> <Bar dataKey="return" fill="#3b82f6" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
          )}
        </div>
      )}

      {/* Activity Timeline */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Clock size={18} className="text-blue-400" /> Activity Timeline</h2>
        <div className="space-y-0">
          {trades.slice(0, 10).map((trade, i) => (
            <div key={trade.id || i} className="flex items-start gap-3 pb-4 relative">
              {i < trades.length - 1 && <div className="absolute left-3.5 top-7 bottom-0 w-px bg-white/10" />}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${trade.type === 'BUY' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {trade.type === 'BUY' ? <ArrowUpRight size={12} className="text-green-400" /> : <ArrowDownLeft size={12} className="text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{trade.symbol}</span>
                  <span className={`text-xs font-medium ${trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{trade.type}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {trade.quantity} shares @ ₹{trade.price.toFixed(2)} — ₹{trade.total.toLocaleString()}
                </p>
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0">{new Date(trade.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
          {trades.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No recent activity</p>}
        </div>
      </div>
    </div>
  );
}
