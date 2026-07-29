import { useEffect, useState } from 'react';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { PieChart as PieIcon, TrendingUp, TrendingDown, ChevronRight, BarChart3, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [livePrices, setLivePrices] = useState<Record<string, any>>({});
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchPortfolio = async () => {
    try {
      const { data } = await api.get('/portfolios/analytics');
      setPortfolio(data);
      if (data.holdings && data.holdings.length > 0 && !selectedStock) {
        setSelectedStock(data.holdings[0].symbol);
        fetchStockHistory(data.holdings[0].symbol);
      }
    } catch {
      toast.error('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockHistory = async (symbol: string) => {
    try {
      setLoadingHistory(true);
      const { data } = await api.get(`/position-doctor/history/${symbol}?days=30`);
      setStockHistory(data.bars || []);
    } catch {
      setStockHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    const socket = connectSocket();
    socket.on('price_update', (update: any) => {
      setLivePrices(prev => ({
        ...prev,
        [update.symbol]: update
      }));
    });
    return () => {
      disconnectSocket();
    };
  }, []);

  const handleSelectStock = (symbol: string) => {
    setSelectedStock(symbol);
    fetchStockHistory(symbol);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" style={{width:32,height:32,borderWidth:3}} /></div>;
  if (!portfolio) return <div className="space-y-6 animate-fade-up"><h1 className="text-2xl font-bold text-white">Portfolio</h1><div className="glass-card p-12 text-center"><PieIcon size={48} className="mx-auto text-slate-500 mb-4" /><p className="text-slate-400">No portfolio data yet</p></div></div>;

  const sectorData = Object.entries(portfolio.sectorAllocation || {}).map(([name, value]) => ({ name, value: value as number }));
  const holdings = portfolio.holdings || [];

  // Calculate live totals
  let liveCurrentValue = portfolio.currentValue;
  let liveTotalPnL = portfolio.totalPnL;
  let liveTotalPnLPercent = portfolio.totalPnLPercent;

  if (Object.keys(livePrices).length > 0) {
    liveCurrentValue = holdings.reduce((acc: number, h: any) => {
      const live = livePrices[h.symbol];
      const price = live?.price || h.currentPrice;
      return acc + (h.quantity * price);
    }, 0);
    liveTotalPnL = liveCurrentValue - portfolio.totalInvested;
    liveTotalPnLPercent = portfolio.totalInvested > 0 ? (liveTotalPnL / portfolio.totalInvested) * 100 : 0;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"><PieIcon size={20} className="text-white" /></div>
          <div><h1 className="text-2xl font-bold text-white">Portfolio Analytics</h1><p className="text-xs text-slate-400">Real-time tracking, P&L attribution & stock charts</p></div>
        </div>
        <button onClick={fetchPortfolio} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors flex items-center gap-2 text-xs">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Invested', value: `₹${portfolio.totalInvested.toLocaleString()}`, color: 'text-white' },
          { label: 'Current Value', value: `₹${liveCurrentValue.toLocaleString()}`, color: 'text-white' },
          { label: 'Total P&L', value: `${liveTotalPnL >= 0 ? '+' : ''}₹${liveTotalPnL.toLocaleString()}`, color: liveTotalPnL >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: 'Total Return', value: `${liveTotalPnLPercent >= 0 ? '+' : ''}${liveTotalPnLPercent.toFixed(2)}%`, color: liveTotalPnLPercent >= 0 ? 'text-green-400' : 'text-red-400' },
          ...(portfolio.paperBalance != null ? [{ label: 'Paper Balance', value: `₹${portfolio.paperBalance.toLocaleString()}`, color: 'text-yellow-400' }] : []),
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Holdings List with Real-time Up/Down */}
      <div className="glass-card p-5">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-blue-400" /> Portfolio Holdings ({holdings.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-white/5">
                <th className="pb-3 font-medium">Symbol</th>
                <th className="pb-3 font-medium text-right">Qty</th>
                <th className="pb-3 font-medium text-right">Avg Price</th>
                <th className="pb-3 font-medium text-right">LTP (Live)</th>
                <th className="pb-3 font-medium text-right">Change</th>
                <th className="pb-3 font-medium text-right">Current Val</th>
                <th className="pb-3 font-medium text-right">P&L</th>
            <th className="pb-3 font-medium text-center">Source</th>
              <th className="pb-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {holdings.map((h: any) => {
                const live = livePrices[h.symbol];
                 const price = live?.price || h.currentPrice;
                 const changePct = live?.changePercent !== undefined ? live.changePercent : (h.changePercent || 0);
                const currentVal = h.quantity * price;
                const pnl = currentVal - (h.quantity * h.avgPrice);
                const pnlPct = h.quantity * h.avgPrice > 0 ? (pnl / (h.quantity * h.avgPrice)) * 100 : 0;
                const isSelected = selectedStock === h.symbol;

                return (
                  <tr 
                    key={h.id || h.symbol} 
                    onClick={() => handleSelectStock(h.symbol)}
                    className={`hover:bg-white/[0.04] transition-colors cursor-pointer ${isSelected ? 'bg-blue-500/10 border-l-2 border-blue-500' : ''}`}
                  >
                    <td className="py-3 font-semibold text-white flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${changePct >= 0 ? 'bg-green-400 animate-pulse' : 'bg-red-400 animate-pulse'}`} />
                      {h.symbol}
                      {h.sector && <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-white/5">{h.sector}</span>}
                      {h.isPaperTrade && (
                        <span className="text-[10px] text-yellow-400 px-1.5 py-0.5 rounded bg-yellow-500/10 ml-1">Paper Trade</span>
                      )}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-300">{h.quantity}</td>
                    <td className="py-3 text-right font-mono text-slate-300">₹{h.avgPrice.toFixed(2)}</td>
                    <td className="py-3 text-right font-mono text-white font-semibold">₹{price.toFixed(2)}</td>
                    <td className="py-3 text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${changePct >= 0 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                        {changePct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-white">₹{currentVal.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                    <td className="py-3 text-right font-mono">
                      <span className={pnl >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                        {pnl >= 0 ? '+' : ''}₹{pnl.toLocaleString(undefined, {maximumFractionDigits:0})} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      {h.isPaperTrade ? (
                        <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">Paper</span>
                      ) : (
                        <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">Portfolio</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      <button className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Click Chart & Details */}
      {selectedStock && (
        <div className="glass-card p-5 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-white text-lg flex items-center gap-2">
                📈 Price Trend: <span className="text-blue-400">{selectedStock}</span>
              </h2>
              <p className="text-xs text-slate-400">Click any row in the holdings table above to switch stock chart</p>
            </div>
            <div className="text-right font-mono">
              <span className="text-white text-lg font-bold">₹{(livePrices[selectedStock]?.price || holdings.find((h:any)=>h.symbol===selectedStock)?.currentPrice || 0).toFixed(2)}</span>
              <div className={`text-xs ${(livePrices[selectedStock]?.changePercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(livePrices[selectedStock]?.changePercent || 0) >= 0 ? '+' : ''}{(livePrices[selectedStock]?.changePercent || 0).toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            {loadingHistory ? (
              <div className="flex items-center justify-center h-full"><div className="spinner" style={{width:24,height:24}} /></div>
            ) : stockHistory.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400">No history data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stockHistory}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                  <Area type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" name="Close Price" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Sector Allocation */}
      {sectorData.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-4">Sector Allocation</h2>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-full md:w-1/2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sectorData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {sectorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1a1f35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-2">
              {sectorData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-white">{item.name}</span>
                  </div>
                  <span className="text-sm font-mono text-slate-300">{item.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
