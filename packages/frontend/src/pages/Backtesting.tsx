import { useEffect, useState } from 'react';
import api from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Backtesting() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/strategies').then(r => setStrategies(r.data)).catch(() => {}); }, []);

  const run = async () => {
    if (!selected || !start || !end) return toast.error('Fill all fields');
    setLoading(true);
    try {
      const { data } = await api.post('/backtest/run', { strategyId: selected, startDate: new Date(start).toISOString(), endDate: new Date(end).toISOString() });
      setResults(data);
    } catch (error: any) { toast.error(error.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center"><Zap size={20} className="text-white" /></div>
        <div><h1 className="text-2xl font-bold text-white">Backtesting</h1><p className="text-xs text-slate-400">Test strategies against historical data</p></div>
      </div>

      <div className="glass-card p-5">
        <h2 className="font-semibold text-white mb-3">Run Backtest</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={selected} onChange={e => setSelected(e.target.value)} className="input-glass">
            <option value="">Select strategy</option>
            {strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="input-glass" />
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="input-glass" />
          <button onClick={run} disabled={loading} className="btn-glow flex items-center justify-center gap-2">
            {loading ? <div className="spinner" /> : <><Play size={14} /> Run</>}
          </button>
        </div>
      </div>

      {results && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total Return', value: results.summary.totalReturn, color: results.summary.totalReturn.startsWith('-') ? 'text-red-400' : 'text-green-400' },
              { label: 'Sharpe Ratio', value: results.summary.sharpeRatio, color: 'text-white' },
              { label: 'Max Drawdown', value: results.summary.maxDrawdown, color: 'text-red-400' },
              { label: 'Win Rate', value: results.summary.winRate, color: 'text-white' },
              { label: 'Trades', value: results.summary.totalTrades, color: 'text-white' },
            ].map(s => (
              <div key={s.label} className="glass-card p-4 text-center">
                <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="glass-card p-5">
            <h2 className="font-semibold text-white mb-4">Equity Curve</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={results.equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickFormatter={v => new Date(v).toLocaleDateString()} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1f35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }} formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Value']} labelFormatter={l => new Date(l).toLocaleDateString()} />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {!results && !loading && (
        <div className="glass-card p-12 text-center">
          <Zap size={48} className="mx-auto text-slate-500 mb-4" />
          <p className="text-slate-400">Select a strategy and date range to run backtest</p>
        </div>
      )}
    </div>
  );
}
