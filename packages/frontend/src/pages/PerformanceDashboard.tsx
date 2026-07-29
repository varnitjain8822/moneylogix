import { useEffect, useState } from 'react';
import api from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, Award, Activity, Clock, BarChart3 } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

export default function PerformanceDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [riskData, setRiskData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [perfRes, riskRes] = await Promise.all([
        api.get('/analytics/performance?days=30'),
        api.get('/analytics/risk'),
      ]);
      setData(perfRes.data);
      setRiskData(riskRes.data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>;
  if (!data) return <div className="space-y-6 animate-fade-up"><h1 className="text-2xl font-bold text-white">Performance Dashboard</h1><div className="glass-card p-12 text-center"><p className="text-slate-400">No performance data yet</p></div></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Performance Dashboard</h1><p className="text-xs text-slate-400">Portfolio analytics and trading statistics</p></div>
        <button onClick={fetchData} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"><TrendingUp size={16} /></button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Return', value: `${data.totalReturn >= 0 ? '+' : ''}${data.totalReturn.toFixed(2)}%`, color: data.totalReturn >= 0 ? 'text-green-400' : 'text-red-400', icon: TrendingUp },
          { label: 'Total P&L', value: `${data.totalPnl >= 0 ? '+' : ''}₹${Math.abs(data.totalPnl).toLocaleString()}`, color: data.totalPnl >= 0 ? 'text-green-400' : 'text-red-400', icon: DollarSign },
          { label: 'Win Rate', value: `${data.winRate.toFixed(1)}%`, color: 'text-blue-400', icon: Target },
          { label: 'Total Trades', value: data.totalTrades.toString(), color: 'text-white', icon: Activity },
        ].map((m, i) => (
          <div key={i} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2"><m.icon size={14} className="text-slate-400" /><span className="text-xs text-slate-400">{m.label}</span></div>
            <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Equity Curve */}
      {data.equityCurve && data.equityCurve.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><BarChart3 size={16} className="text-purple-400" /> Equity Curve</h3>
          <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.equityCurve}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} /><YAxis stroke="#64748b" fontSize={11} tickLine={false} /><Tooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} /><Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#eqGrad)" name="Portfolio Value" /></AreaChart></ResponsiveContainer></div>
        </div>
      )}

      {/* Top Trades & Best/Worst */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-green-400" /> Best Trade</h3>
          {data.bestTrade ? (
            <div className="text-sm"><p className="text-white font-semibold">{data.bestTrade.symbol}</p><p className="text-green-400">+₹{Math.abs(data.bestTrade.pnl).toFixed(0)}</p><p className="text-slate-400 text-xs">{data.bestTrade.side} {data.bestTrade.quantity} @ ₹{(data.bestTrade.buyPrice || 0).toFixed(2)} → ₹{(data.bestTrade.sellPrice || 0).toFixed(2)}</p></div>
          ) : <p className="text-slate-400 text-sm">No trades yet</p>}
        </div>
        <div className="glass-card p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><TrendingDown size={14} className="text-red-400" /> Worst Trade</h3>
          {data.worstTrade ? (
            <div className="text-sm"><p className="text-white font-semibold">{data.worstTrade.symbol}</p><p className="text-red-400">₹{data.worstTrade.pnl.toFixed(0)}</p><p className="text-slate-400 text-xs">{data.worstTrade.side} {data.worstTrade.quantity} @ ₹{(data.worstTrade.buyPrice || 0).toFixed(2)} → ₹{(data.worstTrade.sellPrice || 0).toFixed(2)}</p></div>
          ) : <p className="text-slate-400 text-sm">No trades yet</p>}
        </div>
        <div className="glass-card p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><Clock size={14} className="text-blue-400" /> Avg Hold Time</h3>
          <p className="text-xl font-bold text-white">{data.avgHoldingTime}h</p>
          <p className="text-xs text-slate-400">average holding time</p>
        </div>
      </div>

      {/* PnL by Symbol */}
      {data.pnlBySymbol && Object.keys(data.pnlBySymbol).length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-3">P&L by Symbol</h3>
          <div className="h-48 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={Object.entries(data.pnlBySymbol).map(([k, v]) => ({ symbol: k, pnl: v as number }))}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="symbol" stroke="#64748b" fontSize={11} /><YAxis stroke="#64748b" fontSize={11} /><Tooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} /><Bar dataKey="pnl" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </div>
      )}

      {/* Daily Returns */}
      {data.dailyReturns && data.dailyReturns.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-3">Daily Returns</h3>
          <div className="h-40 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.dailyReturns.filter((r: number) => r !== 0).slice(-30).map((r: number, i: number) => ({ day: i + 1, return: r }))}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} /><YAxis stroke="#64748b" fontSize={11} tickLine={false} /><Tooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} formatter={(v: number) => [`${v.toFixed(2)}%`, 'Return']} /><Bar dataKey="return" fill="#3b82f6" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </div>
      )}

      {/* Risk Metrics */}
      {riskData && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><Award size={16} className="text-yellow-400" /> Risk Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="glass-card p-3 text-center"><p className="text-xs text-slate-400">Diversification</p><p className="text-lg font-bold text-white">{riskData.diversificationScore}%</p></div>
            <div className="glass-card p-3 text-center"><p className="text-xs text-slate-400">Cash Allocation</p><p className="text-lg font-bold text-yellow-400">{riskData.cashAllocation}%</p></div>
            <div className="glass-card p-3 text-center"><p className="text-xs text-slate-400">Active Positions</p><p className="text-lg font-bold text-white">{riskData.positionsCount}</p></div>
            <div className="glass-card p-3 text-center"><p className="text-xs text-slate-400">Total Exposure</p><p className="text-lg font-bold text-white">₹{riskData.totalExposure?.toLocaleString() || '0'}</p></div>
          </div>
          {riskData.sectorAllocation && Object.keys(riskData.sectorAllocation).length > 0 && (
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-full md:w-1/2 h-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={Object.entries(riskData.sectorAllocation).map(([name, value]) => ({ name, value: value as number }))} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value"><Cell fill="#3b82f6" /><Cell fill="#8b5cf6" /><Cell fill="#06b6d4" /><Cell fill="#10b981" /><Cell fill="#f59e0b" /><Cell fill="#ef4444" /></Pie><Tooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} /></PieChart></ResponsiveContainer></div>
              <div className="space-y-2">
                {Object.entries(riskData.sectorAllocation).map(([name, value], i) => (
                  <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-sm text-white">{name}</span></div><span className="text-sm font-mono text-slate-300">{(value as number).toFixed(1)}%</span></div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
