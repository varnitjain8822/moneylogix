import { useEffect, useState } from 'react';
import api from '../services/api';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, ReferenceLine, Cell,
} from 'recharts';
import {
  Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw, Sparkles,
  TrendingUp, BarChart3, Layers, Zap, Shield, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1117]/95 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3 text-xs shadow-2xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-medium" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && !isNaN(p.value) ? p.value.toFixed(2) : '—'}
        </p>
      ))}
    </div>
  );
};

export default function PositionDoctor() {
  const [summary, setSummary] = useState<any>(null);
  const [agentResult, setAgentResult] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentLoading, setAgentLoading] = useState(false);
  const [expandedStock, setExpandedStock] = useState<string | null>(null);
  const [chartDays, setChartDays] = useState(90);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, historyRes] = await Promise.all([
        api.get('/position-doctor/summary'),
        api.get(`/position-doctor/all-history?days=${chartDays}`),
      ]);
      setSummary(summaryRes.data);
      setHistoryData(historyRes.data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const runAgentAnalysis = async () => {
    setAgentLoading(true);
    try {
      const { data } = await api.post('/agents/run/positionDoctor');
      setAgentResult(data);
      toast.success(`Agent analysis complete — Score: ${data.overallScore?.toFixed(0)}/100`);
    } catch (error) { toast.error('Agent analysis failed'); }
    finally { setAgentLoading(false); }
  };

  const positions = summary?.positions || [];
  const agentPositions = agentResult?.agentOutputs?.['position-doctor']?.data?.positions || [];
  const displayPositions = agentPositions.length > 0 ? agentPositions : positions;

  const healthRing = (score: number, size: number = 64) => {
    const r = (size - 8) / 2;
    const c = 2 * Math.PI * r;
    const offset = c - (score / 100) * c;
    const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
    return (
      <div className="health-ring relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle className="track" cx={size/2} cy={size/2} r={r} />
          <circle className="progress" cx={size/2} cy={size/2} r={r} stroke={color} strokeDasharray={c} strokeDashoffset={offset} style={{ filter: `drop-shadow(0 0 6px ${color}50)` }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{score}</span>
        </div>
      </div>
    );
  };

  const rsiGauge = (value: number) => {
    const color = value > 70 ? '#ef4444' : value < 30 ? '#10b981' : '#3b82f6';
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }} />
        </div>
        <span className="text-xs font-mono" style={{ color }}>{value.toFixed(1)}</span>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="spinner" style={{width:32,height:32,borderWidth:3}} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Position Doctor</h1>
            <p className="text-xs text-slate-400">Health diagnostics with historical charts & technical analysis</p>
          </div>
        </div>
        <div className="flex gap-2">
          <select value={chartDays} onChange={e => { setChartDays(Number(e.target.value)); fetchData(); }} className="input-glass text-xs py-1.5">
            <option value={30}>30D</option>
            <option value={60}>60D</option>
            <option value={90}>90D</option>
          </select>
          <button onClick={fetchData} className="btn-ghost text-sm flex items-center gap-2"><RefreshCw size={14} /> Refresh</button>
          <button onClick={runAgentAnalysis} disabled={agentLoading} className="btn-glow text-sm flex items-center gap-2">
            {agentLoading ? <div className="spinner" /> : <Sparkles size={14} />}
            Run AI Analysis
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-fade-up stagger-1">
        {[
          { label: 'Positions', value: summary?.totalPositions || 0, color: 'text-white', icon: Layers },
          { label: 'Healthy', value: summary?.healthy || 0, color: 'text-green-400', icon: CheckCircle },
          { label: 'Warning', value: summary?.warning || 0, color: 'text-yellow-400', icon: AlertTriangle },
          { label: 'Critical', value: summary?.critical || 0, color: 'text-red-400', icon: XCircle },
          { label: 'Avg Health', value: `${(summary?.avgHealth || 0).toFixed(0)}`, color: 'text-blue-400', suffix: '/100', icon: Activity },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 text-center">
            <stat.icon size={16} className={`mx-auto mb-1 ${stat.color} opacity-60`} />
            <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}{stat.suffix || ''}</p>
          </div>
        ))}
      </div>

      {/* Agent Analysis */}
      {agentResult && (
        <div className="glass-card p-5 border border-blue-500/20 animate-fade-up">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-blue-400" />
            <h2 className="font-semibold text-white">Agent Graph Analysis</h2>
            <span className="ml-auto text-xs text-slate-400">
              Score: <span className="text-blue-400 font-bold">{agentResult.overallScore?.toFixed(0)}/100</span>
              {' • '}
              {agentResult.passed ? <span className="text-green-400">PASSED</span> : <span className="text-yellow-400">REVIEW NEEDED</span>}
              {' • '}{agentResult.totalDuration}ms
            </span>
          </div>
          <div className="space-y-1">
            {(agentResult.logs || []).map((log: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span>{log.status === 'PASS' ? '✅' : log.status === 'FAIL' ? '🔄' : '❌'}</span>
                <span className="text-slate-300 font-medium">{log.agentName}</span>
                <span className="text-slate-500">—</span>
                <span className={log.score >= 80 ? 'text-green-400' : log.score >= 60 ? 'text-yellow-400' : 'text-red-400'}>{log.score}/100</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Position Cards */}
      <div className="space-y-4">
        {displayPositions.map((pos: any) => {
          const history = historyData.find((h: any) => h.symbol === pos.symbol);
          const bars = history?.bars || [];
          const ind = history?.indicators || {};
          const sm = history?.summary || {};
          const isExpanded = expandedStock === pos.symbol;

          const sparkData = bars.slice(-30).map((b: any) => ({ v: b.close }));
          const currentRSI = ind.rsi?.[ind.rsi.length - 1] || 50;
          const currentMACD = ind.macd?.[ind.macd.length - 1] || 0;
          const currentSignal = ind.macdSignal?.[ind.macdSignal.length - 1] || 0;

          const chartData = bars.map((b: any, idx: number) => ({
            date: b.date.slice(5),
            close: b.close,
            sma20: ind.sma20?.[idx],
            sma50: ind.sma50?.[idx],
            bbUpper: ind.bollingerUpper?.[idx],
            bbLower: ind.bollingerLower?.[idx],
            vwap: ind.vwap?.[idx],
          }));

          const rsiData = bars.slice(-30).map((b: any, i: number) => ({
            date: b.date.slice(5),
            rsi: ind.rsi?.[ind.rsi.length - 30 + i] || 50,
          }));

          const macdData = bars.slice(-30).map((b: any, i: number) => {
            const idx = ind.macd.length - 30 + i;
            const m = ind.macd?.[idx] || 0;
            const s = ind.macdSignal?.[idx] || 0;
            return { date: b.date.slice(5), macd: m, signal: s, histogram: m - s };
          });

          const volData = bars.slice(-30).map((b: any) => ({
            date: b.date.slice(5),
            volume: b.volume,
            up: b.close >= b.open,
          }));

          return (
            <div key={pos.symbol} className={`glass-card overflow-hidden animate-fade-up transition-all ${
              pos.status === 'HEALTHY' ? 'border-green-500/20' :
              pos.status === 'WARNING' ? 'border-yellow-500/20' : 'border-red-500/20'
            }`}>
              {/* Collapsed Row */}
              <div className="p-5 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setExpandedStock(isExpanded ? null : pos.symbol)}>
                <div className="flex items-center gap-4">
                  {healthRing(pos.healthScore)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {pos.status === 'HEALTHY' ? <CheckCircle size={14} className="text-green-400" /> :
                       pos.status === 'WARNING' ? <AlertTriangle size={14} className="text-yellow-400" /> :
                       <XCircle size={14} className="text-red-400" />}
                      <h3 className="font-bold text-white text-lg">{pos.symbol}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        pos.status === 'HEALTHY' ? 'bg-green-500/15 text-green-400' :
                        pos.status === 'WARNING' ? 'bg-yellow-500/15 text-yellow-400' :
                        'bg-red-500/15 text-red-400'
                      }`}>{pos.status}</span>
                      <span className="text-xs text-slate-500">Qty: {pos.quantity}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-2 text-sm">
                      <div>
                        <p className="text-slate-400 text-xs">Avg Price</p>
                        <p className="text-white font-medium">₹{pos.avgPrice?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Current</p>
                        <p className="text-white font-medium">₹{pos.currentPrice?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">P&L</p>
                        <p className={`font-medium ${pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pos.pnl >= 0 ? '+' : ''}₹{pos.pnl?.toFixed(0)} ({pos.pnlPercent?.toFixed(1)}%)
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">RSI</p>
                        <p className={`font-medium ${currentRSI > 70 ? 'text-red-400' : currentRSI < 30 ? 'text-green-400' : 'text-blue-400'}`}>
                          {currentRSI.toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Volatility</p>
                        <p className="text-white font-medium">{sm.volatility?.toFixed(1) || '—'}%</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Return</p>
                        <p className={`font-medium ${(sm.totalReturn || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {sm.totalReturn?.toFixed(1) || '—'}%
                        </p>
                      </div>
                    </div>
                  </div>
                  {sparkData.length > 0 && (
                    <div className="w-24 h-12 flex-shrink-0 hidden md:block">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkData}>
                          <defs>
                            <linearGradient id={`sp-${pos.symbol}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={pos.pnl >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                              <stop offset="100%" stopColor={pos.pnl >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="v" stroke={pos.pnl >= 0 ? '#10b981' : '#ef4444'} fill={`url(#sp-${pos.symbol})`} strokeWidth={1.5} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="flex-shrink-0">
                    {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                  </div>
                </div>
                {pos.recommendations?.length > 0 && !isExpanded && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pos.recommendations.slice(0, 2).map((rec: string, j: number) => (
                      <span key={j} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full">→ {rec}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Expanded Panel */}
              {isExpanded && history && (
                <div className="border-t border-slate-700/50 p-5 space-y-5 bg-slate-900/30">
                  {/* Recommendations */}
                  {pos.recommendations?.length > 0 && (
                    <div className="space-y-1">
                      {pos.recommendations.map((rec: string, j: number) => (
                        <div key={j} className="flex items-start gap-2 text-xs">
                          <span className="text-blue-400 mt-0.5">→</span>
                          <span className="text-slate-300">{rec}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Price Chart */}
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <TrendingUp size={14} className="text-blue-400" />
                      Price Action & Technical Overlays ({chartDays} Days)
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id={`pg-${pos.symbol}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="date" stroke="#475569" fontSize={10} tickFormatter={v => v.slice(0,5)} interval="preserveStartEnd" />
                          <YAxis stroke="#475569" fontSize={10} domain={['auto', 'auto']} tickFormatter={v => `₹${(v/1000).toFixed(1)}k`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="close" stroke="#3b82f6" fill={`url(#pg-${pos.symbol})`} strokeWidth={2} dot={false} name="Close" />
                          <Line type="monotone" dataKey="sma20" stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="4 4" name="SMA 20" connectNulls />
                          <Line type="monotone" dataKey="sma50" stroke="#8b5cf6" strokeWidth={1} dot={false} strokeDasharray="6 3" name="SMA 50" connectNulls />
                          <Line type="monotone" dataKey="bbUpper" stroke="#06b6d4" strokeWidth={1} dot={false} strokeDasharray="2 2" name="BB Upper" connectNulls />
                          <Line type="monotone" dataKey="bbLower" stroke="#06b6d4" strokeWidth={1} dot={false} strokeDasharray="2 2" name="BB Lower" connectNulls />
                          <Line type="monotone" dataKey="vwap" stroke="#10b981" strokeWidth={1.5} dot={false} name="VWAP" connectNulls />
                          <ReferenceLine y={pos.avgPrice} stroke="#f43f5e" strokeDasharray="8 4" strokeWidth={1.5} label={{ value: 'Entry', fill: '#f43f5e', fontSize: 10 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded" /> Close</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-yellow-500 inline-block" style={{borderTop:'1px dashed'}} /> SMA 20</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-purple-500 inline-block" style={{borderTop:'1px dashed'}} /> SMA 50</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-cyan-500 inline-block" style={{borderTop:'1px dashed'}} /> Bollinger</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 inline-block rounded" /> VWAP</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-rose-500 inline-block" style={{borderTop:'1px dashed'}} /> Entry ₹{pos.avgPrice?.toFixed(0)}</span>
                    </div>
                  </div>

                  {/* RSI + MACD */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <Zap size={14} className="text-yellow-400" />
                        RSI (14)
                      </h3>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={rsiData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id={`rg-${pos.symbol}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="date" stroke="#475569" fontSize={9} />
                            <YAxis stroke="#475569" fontSize={9} domain={[0, 100]} />
                            <Tooltip content={<CustomTooltip />} />
                            <ReferenceLine y={70} stroke="#ef444460" strokeDasharray="4 4" />
                            <ReferenceLine y={30} stroke="#10b98160" strokeDasharray="4 4" />
                            <Area type="monotone" dataKey="rsi" stroke="#f59e0b" fill={`url(#rg-${pos.symbol})`} strokeWidth={1.5} dot={false} name="RSI" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-1">{rsiGauge(currentRSI)}</div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {currentRSI > 70 ? 'Overbought — consider taking profits' : currentRSI < 30 ? 'Oversold — potential buying opportunity' : 'Neutral zone'}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <BarChart3 size={14} className="text-purple-400" />
                        MACD (12, 26, 9)
                      </h3>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={macdData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="date" stroke="#475569" fontSize={9} />
                            <YAxis stroke="#475569" fontSize={9} />
                            <Tooltip content={<CustomTooltip />} />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                            <Bar dataKey="histogram" name="Histogram" radius={[2, 2, 0, 0]}>
                              {macdData.map((entry: any, i: number) => (
                                <Cell key={i} fill={entry.histogram >= 0 ? '#10b98180' : '#ef444480'} />
                              ))}
                            </Bar>
                            <Line type="monotone" dataKey="macd" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="MACD" />
                            <Line type="monotone" dataKey="signal" stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="4 4" name="Signal" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {currentMACD > currentSignal ? 'Bullish crossover — momentum building' : 'Bearish crossover — momentum weakening'}
                      </p>
                    </div>
                  </div>

                  {/* Volume */}
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Layers size={14} className="text-cyan-400" />
                      Volume (Last 30 Days)
                    </h3>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={volData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="date" stroke="#475569" fontSize={9} />
                          <YAxis stroke="#475569" fontSize={9} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="volume" name="Volume" radius={[2, 2, 0, 0]}>
                            {volData.map((entry: any, i: number) => (
                              <Cell key={i} fill={entry.up ? '#10b98160' : '#ef444460'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Shield size={14} className="text-green-400" />
                      Technical Metrics
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Support', value: `₹${sm.supportLevel?.toFixed(0)}`, color: 'text-green-400' },
                        { label: 'Resistance', value: `₹${sm.resistanceLevel?.toFixed(0)}`, color: 'text-red-400' },
                        { label: 'Beta', value: sm.betaEstimate?.toFixed(2), color: 'text-blue-400' },
                        { label: 'Sharpe Ratio', value: sm.sharpeRatio?.toFixed(2), color: 'text-purple-400' },
                        { label: 'Max Drawdown', value: `${sm.maxDrawdown?.toFixed(1)}%`, color: 'text-red-400' },
                        { label: 'Avg Volume', value: `${(sm.avgVolume / 1000000).toFixed(1)}M`, color: 'text-cyan-400' },
                        { label: 'Stochastic K', value: ind.stochasticK?.[ind.stochasticK.length - 1]?.toFixed(1), color: 'text-yellow-400' },
                        { label: 'ATR (14)', value: ind.atr?.[ind.atr.length - 1]?.toFixed(1), color: 'text-orange-400' },
                      ].map(m => (
                        <div key={m.label} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
                          <p className="text-[10px] text-slate-400 mb-0.5">{m.label}</p>
                          <p className={`text-sm font-bold ${m.color}`}>{m.value || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {displayPositions.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Activity size={48} className="mx-auto text-slate-500 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Open Positions</h3>
          <p className="text-sm text-slate-400">Start paper trading to see position health diagnostics</p>
        </div>
      )}
    </div>
  );
}
