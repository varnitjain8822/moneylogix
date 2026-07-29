import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { 
  RefreshCw, 
  ArrowUpRight, ArrowDownRight, Download, Filter, Search,
  ChevronLeft, ChevronRight, X, Clock, Target, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

// --- Types ---
interface Trade {
  id: string;
  symbol: string;
  direction: 'Long' | 'Short';
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  fees: number;
  tags: string[];
  strategy: string;
  notes?: string;
  slippage?: number;
}

// --- Mock Data ---
const generateMockTrades = (): Trade[] => {
  return Array.from({ length: 150 }, (_, i) => {
    const isWin = Math.random() > 0.45;
    const pnl = isWin ? Math.random() * 500 + 50 : -(Math.random() * 300 + 20);
    const entryDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
    const exitDate = new Date(entryDate.getTime() + Math.random() * 4 * 60 * 60 * 1000);
    return {
      id: `TRD-${1000 + i}`,
      symbol: ['AAPL', 'TSLA', 'BTCUSD', 'EURUSD', 'NIFTY', 'SPY'][Math.floor(Math.random() * 6)],
      direction: (Math.random() > 0.5 ? 'Long' : 'Short') as 'Long' | 'Short',
      entryTime: entryDate.toISOString(),
      exitTime: exitDate.toISOString(),
      entryPrice: Math.random() * 500 + 50,
      exitPrice: Math.random() * 500 + 50,
      size: Math.floor(Math.random() * 100) + 1,
      pnl: pnl,
      fees: Math.random() * 5 + 1,
      slippage: Math.random() * 2,
      tags: [['Breakout'], ['Scalp'], ['Swing'], ['Trend']][Math.floor(Math.random() * 4)],
      strategy: ['MACD Crossover', 'VWAP Bounce', 'ORB'][Math.floor(Math.random() * 3)],
      notes: "Trade executed according to plan. Market was volatile."
    };
  }).sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());
};




export default function TradeAnalyzer() {
  // State
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  
  // Filters state
  const [filterStrategy, setFilterStrategy] = useState('');
  const filterSymbol = '';
  const [filterDirection, setFilterDirection] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Try to fetch real data
      const { data } = await api.get('/trades/history');
      if (data && data.length > 0) {
        // Map backend trades to the format expected by the charts
        const mappedTrades = data.map((t: any) => ({
          id: t.id,
          symbol: t.symbol,
          direction: t.type === 'BUY' ? 'Long' : 'Short',
          entryTime: t.createdAt,
          exitTime: t.createdAt, // Fallback since backend stores legs, not round-trips
          entryPrice: t.price,
          exitPrice: t.price,
          size: t.quantity,
          pnl: 0, // Placeholder until round-trip grouping is implemented
          fees: 0,
          tags: [],
          strategy: t.strategy || 'None',
          notes: t.notes || ''
        }));
        setTrades(mappedTrades);
      } else {
        setTrades(generateMockTrades());
      }
    } catch (error) {
      console.log('Using mock data due to API error');
      setTrades(generateMockTrades());
    } finally {
      setLoading(false);
    }
  };

  // --- Derived Data & Metrics ---
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      const matchSearch = t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || t.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStrategy = filterStrategy ? t.strategy === filterStrategy : true;
      const matchSymbol = filterSymbol ? t.symbol === filterSymbol : true;
      const matchDir = filterDirection ? t.direction === filterDirection : true;
      return matchSearch && matchStrategy && matchSymbol && matchDir;
    });
  }, [trades, searchTerm, filterStrategy, filterSymbol, filterDirection]);

  const metrics = useMemo(() => {
    const totalTrades = filteredTrades.length;
    const winningTrades = filteredTrades.filter(t => t.pnl > 0);
    const losingTrades = filteredTrades.filter(t => t.pnl <= 0);
    
    const totalPnl = filteredTrades.reduce((acc, t) => acc + t.pnl, 0);
    const totalFees = filteredTrades.reduce((acc, t) => acc + t.fees, 0);
    const grossProfit = winningTrades.reduce((acc, t) => acc + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.pnl, 0));
    
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : grossProfit > 0 ? 99 : 0;
    
    const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
    const riskReward = avgLoss > 0 ? avgWin / avgLoss : 0;
    
    const largestWin = Math.max(0, ...filteredTrades.map(t => t.pnl));
    const largestLoss = Math.min(0, ...filteredTrades.map(t => t.pnl));
    
    let expectancy = 0;
    if (totalTrades > 0) {
      expectancy = (winRate/100 * avgWin) - ((1 - winRate/100) * avgLoss);
    }

    return {
      totalTrades, totalPnl, realizedPnl: totalPnl - totalFees,
      winRate, profitFactor, avgWin, avgLoss, riskReward,
      largestWin, largestLoss, expectancy, totalFees
    };
  }, [filteredTrades]);

  // --- Chart Data ---
  const equityCurveData = useMemo(() => {
    let equity = 0;
    return filteredTrades.map(t => {
      equity += t.pnl;
      return { date: new Date(t.exitTime).toLocaleDateString(), equity, pnl: t.pnl };
    });
  }, [filteredTrades]);

  const winLossData = [
    { name: 'Wins', value: filteredTrades.filter(t => t.pnl > 0).length, color: '#10b981' },
    { name: 'Losses', value: filteredTrades.filter(t => t.pnl <= 0).length, color: '#ef4444' }
  ];

  // --- Handlers ---
  const handleExportCSV = () => {
    const csvRows = [];
    const headers = ['ID', 'Symbol', 'Direction', 'Entry Time', 'Exit Time', 'Size', 'PnL', 'Fees', 'Strategy'];
    csvRows.push(headers.join(','));
    
    filteredTrades.forEach(t => {
      csvRows.push([
        t.id, t.symbol, t.direction, t.entryTime, t.exitTime, t.size, t.pnl.toFixed(2), t.fees.toFixed(2), t.strategy
      ].join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades_export_${new Date().getTime()}.csv`;
    a.click();
    toast.success("Exported successfully!");
  };

  const paginatedTrades = filteredTrades.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" style={{width:32,height:32,borderWidth:3}} /></div>;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Activity size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Trade Analyzer</h1>
            <p className="text-sm text-slate-400">Deep dive into your performance and metrics</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-ghost text-sm flex items-center gap-2"><RefreshCw size={14} /> Refresh</button>
          <button onClick={handleExportCSV} className="btn-glow bg-slate-800 text-sm flex items-center gap-2 hover:bg-slate-700">
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-fade-up stagger-1">
        <MetricCard label="Total P&L" value={`$${metrics.totalPnl.toFixed(2)}`} isPositive={metrics.totalPnl >= 0} />
        <MetricCard label="Win Rate" value={`${metrics.winRate.toFixed(1)}%`} isPositive={metrics.winRate > 50} />
        <MetricCard label="Profit Factor" value={metrics.profitFactor.toFixed(2)} isPositive={metrics.profitFactor >= 1.5} />
        <MetricCard label="Risk/Reward" value={`1:${metrics.riskReward.toFixed(2)}`} neutral />
        <MetricCard label="Expectancy" value={`$${metrics.expectancy.toFixed(2)}`} isPositive={metrics.expectancy > 0} />
        <MetricCard label="Total Trades" value={metrics.totalTrades} neutral />
        
        <MetricCard label="Avg Win" value={`$${metrics.avgWin.toFixed(2)}`} isPositive={true} />
        <MetricCard label="Avg Loss" value={`-$${metrics.avgLoss.toFixed(2)}`} isPositive={false} />
        <MetricCard label="Largest Win" value={`$${metrics.largestWin.toFixed(2)}`} isPositive={true} />
        <MetricCard label="Largest Loss" value={`-$${Math.abs(metrics.largestLoss).toFixed(2)}`} isPositive={false} />
        <MetricCard label="Total Fees" value={`$${metrics.totalFees.toFixed(2)}`} neutral />
        <MetricCard label="Realized P&L" value={`$${metrics.realizedPnl.toFixed(2)}`} isPositive={metrics.realizedPnl >= 0} />
      </div>

      {/* Filters & Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up stagger-2">
        {/* Filters */}
        <div className="glass-card p-5 col-span-1 flex flex-col gap-4">
          <h2 className="font-semibold text-white flex items-center gap-2"><Filter size={16}/> Filters</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Search Symbol/ID</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
                  placeholder="e.g. AAPL, TRD-100"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Strategy</label>
              <select 
                className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                value={filterStrategy}
                onChange={(e) => setFilterStrategy(e.target.value)}
              >
                <option value="">All Strategies</option>
                <option value="MACD Crossover">MACD Crossover</option>
                <option value="VWAP Bounce">VWAP Bounce</option>
                <option value="ORB">ORB</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Direction</label>
              <select 
                className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                value={filterDirection}
                onChange={(e) => setFilterDirection(e.target.value)}
              >
                <option value="">All Directions</option>
                <option value="Long">Long</option>
                <option value="Short">Short</option>
              </select>
            </div>
          </div>
        </div>

        {/* Equity Curve Chart */}
        <div className="glass-card p-5 col-span-1 lg:col-span-2">
          <h2 className="font-semibold text-white mb-4">Cumulative Equity</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurveData}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="equity" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorEquity)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up stagger-3">
        {/* Daily PNL Bar Chart */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-4">Daily P&L</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={equityCurveData.slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {equityCurveData.slice(-20).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl > 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win/Loss Distribution */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-4">Win/Loss Distribution</h2>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={winLossData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {winLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center pointer-events-none">
              <span className="text-3xl font-bold text-white">{metrics.winRate.toFixed(0)}%</span>
              <span className="text-xs text-slate-400">Win Rate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="glass-card overflow-hidden animate-fade-up stagger-4">
        <div className="p-5 border-b border-slate-800/50 flex justify-between items-center">
          <h2 className="font-semibold text-white">Trade History</h2>
          <span className="text-xs text-slate-400">{filteredTrades.length} trades found</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/40 text-slate-400 text-xs uppercase font-medium">
              <tr>
                <th className="px-5 py-3">Symbol</th>
                <th className="px-5 py-3">Direction</th>
                <th className="px-5 py-3">Entry Time</th>
                <th className="px-5 py-3">Strategy</th>
                <th className="px-5 py-3">P&L</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {paginatedTrades.map((trade) => (
                <tr key={trade.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-5 py-3 font-medium text-white">{trade.symbol}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${trade.direction === 'Long' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {trade.direction}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-300">{new Date(trade.entryTime).toLocaleString()}</td>
                  <td className="px-5 py-3 text-slate-300">{trade.strategy}</td>
                  <td className={`px-5 py-3 font-semibold ${trade.pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trade.pnl > 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                  </td>
                  <td className="px-5 py-3">
                    <button 
                      onClick={() => setSelectedTrade(trade)}
                      className="text-indigo-400 hover:text-indigo-300 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedTrades.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    No trades match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800/50 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded-md bg-slate-800 text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded-md bg-slate-800 text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Trade Detail Modal / Panel */}
      {selectedTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-900/50">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Trade {selectedTrade.id}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${selectedTrade.direction === 'Long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {selectedTrade.direction}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">{selectedTrade.symbol} • {selectedTrade.strategy}</p>
              </div>
              <button onClick={() => setSelectedTrade(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              {/* Top Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Gross P&L</p>
                  <p className={`text-2xl font-bold ${selectedTrade.pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${selectedTrade.pnl.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Fees & Slippage</p>
                  <p className="text-lg font-semibold text-white">
                    ${((selectedTrade.fees || 0) + (selectedTrade.slippage || 0)).toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Net P&L</p>
                  <p className={`text-lg font-bold ${selectedTrade.pnl - (selectedTrade.fees || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${(selectedTrade.pnl - (selectedTrade.fees || 0)).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Execution Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Clock size={16} /> Execution Timeline
                </h4>
                <div className="relative border-l border-slate-700 ml-3 pl-6 space-y-4 py-2">
                  <div className="relative">
                    <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[1.9rem] top-1 ring-4 ring-[#0f172a]"></div>
                    <p className="text-xs text-slate-400">{new Date(selectedTrade.entryTime).toLocaleString()}</p>
                    <p className="text-sm text-white font-medium">Entry • {selectedTrade.size} shares @ ${selectedTrade.entryPrice.toFixed(2)}</p>
                  </div>
                  <div className="relative">
                    <div className="absolute w-3 h-3 bg-slate-500 rounded-full -left-[1.9rem] top-1 ring-4 ring-[#0f172a]"></div>
                    <p className="text-xs text-slate-400">{new Date(selectedTrade.exitTime).toLocaleString()}</p>
                    <p className="text-sm text-white font-medium">Exit • {selectedTrade.size} shares @ ${selectedTrade.exitPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Notes & Tags */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Target size={16} /> Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTrade.tags?.map((tag: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-slate-800 rounded-md text-xs text-slate-300 border border-slate-700">
                        {tag}
                      </span>
                    )) || <span className="text-xs text-slate-500">No tags</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-300">Notes</h4>
                  <p className="text-sm text-slate-400 bg-slate-800/30 p-3 rounded-lg italic">
                    "{selectedTrade.notes || 'No notes for this trade.'}"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Component for Metrics
function MetricCard({ label, value, isPositive, neutral = false }: { label: string, value: string | number, isPositive?: boolean, neutral?: boolean }) {
  let color = 'text-white';
  if (!neutral) {
    color = isPositive ? 'text-green-400' : 'text-red-400';
  }
  
  return (
    <div className="glass-card p-4 flex flex-col justify-center transition-all hover:bg-slate-800/50">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className={`text-xl font-bold ${color}`}>{value}</span>
        {!neutral && isPositive !== undefined && (
          isPositive ? <ArrowUpRight size={16} className="text-green-400" /> : <ArrowDownRight size={16} className="text-red-400" />
        )}
      </div>
    </div>
  );
}
