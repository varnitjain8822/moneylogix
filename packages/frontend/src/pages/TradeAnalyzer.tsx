import { useEffect, useState } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TradeAnalyzer() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [agentResult, setAgentResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agentLoading, setAgentLoading] = useState(false);

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try {
      const { data } = await api.get('/trades/analytics?days=30');
      setAnalytics(data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const runAgentAnalysis = async () => {
    setAgentLoading(true);
    try {
      const { data } = await api.post('/agents/run/tradeAnalyzer');
      setAgentResult(data);
      toast.success(`Agent analysis complete — Score: ${data.overallScore?.toFixed(0)}/100`);
    } catch (error) { toast.error('Agent analysis failed'); }
    finally { setAgentLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" style={{width:32,height:32,borderWidth:3}} /></div>;

  const agentData = agentResult?.agentOutputs?.['trade-analyzer']?.data;
  const tradesBySymbol = Object.entries(analytics?.tradesBySymbol || {}).map(([symbol, data]: [string, any]) => ({ symbol, ...data }));
  const biases = agentData?.biases || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Trade Analyzer</h1>
            <p className="text-xs text-slate-400">Behavioral analysis & coaching</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAnalytics} className="btn-ghost text-sm flex items-center gap-2"><RefreshCw size={14} /> Refresh</button>
          <button onClick={runAgentAnalysis} disabled={agentLoading} className="btn-glow text-sm flex items-center gap-2">
            {agentLoading ? <div className="spinner" /> : <Sparkles size={14} />}
            Run AI Analysis
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-up stagger-1">
        {[
          { label: 'Total Trades', value: analytics?.totalTrades || 0, color: 'text-white' },
          { label: 'Buy / Sell', value: `${analytics?.buyCount || 0} / ${analytics?.sellCount || 0}`, color: 'text-blue-400' },
          { label: 'Total Volume', value: `₹${((analytics?.totalVolume || 0) / 1000).toFixed(0)}K`, color: 'text-purple-400' },
          { label: 'Avg Trade', value: `₹${((analytics?.avgTradeSize || 0) / 1000).toFixed(1)}K`, color: 'text-cyan-400' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Agent Analysis Results */}
      {agentResult && (
        <div className="glass-card p-5 border border-orange-500/20 animate-fade-up">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-orange-400" />
            <h2 className="font-semibold text-white">Agent Graph Analysis</h2>
            <span className="ml-auto text-xs text-slate-400">
              Score: <span className="text-orange-400 font-bold">{agentResult.overallScore?.toFixed(0)}/100</span>
              {' • '}{agentResult.passed ? <span className="text-green-400">PASSED</span> : <span className="text-yellow-400">REVIEW NEEDED</span>}
              {' • '}{agentResult.totalDuration}ms
            </span>
          </div>
          <div className="space-y-1 mb-3">
            {(agentResult.logs || []).map((log: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span>{log.status === 'PASS' ? '✅' : log.status === 'FAIL' ? '🔄' : '❌'}</span>
                <span className="text-slate-300 font-medium">{log.agentName}</span>
                <span className={log.score >= 80 ? 'text-green-400' : log.score >= 60 ? 'text-yellow-400' : 'text-red-400'}>{log.score}/100</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Behavioral Biases */}
      {biases.length > 0 && (
        <div className="glass-card p-5 animate-fade-up">
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-yellow-400" />
            Detected Behavioral Patterns
          </h2>
          <div className="space-y-3">
            {biases.map((bias: any, i: number) => (
              <div key={i} className={`p-3 rounded-xl border ${
                bias.severity === 'CRITICAL' ? 'border-red-500/30 bg-red-500/5' :
                bias.severity === 'HIGH' ? 'border-yellow-500/30 bg-yellow-500/5' :
                'border-blue-500/30 bg-blue-500/5'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    bias.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                    bias.severity === 'HIGH' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>{bias.severity}</span>
                  <span className="text-sm font-medium text-white">{bias.type}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1">{bias.description}</p>
                <p className="text-xs text-blue-400 mt-1">→ {bias.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="glass-card p-5 animate-fade-up stagger-2">
        <h2 className="font-semibold text-white mb-4">Performance by Symbol</h2>
        {tradesBySymbol.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tradesBySymbol}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="symbol" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1f35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }} labelStyle={{ color: '#fff' }} />
                <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No trade data yet</p>
        )}
      </div>
    </div>
  );
}
