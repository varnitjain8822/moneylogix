import { useEffect, useState } from 'react';
import api from '../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/portfolios/analytics').then(r => setPortfolio(r.data)).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" style={{width:32,height:32,borderWidth:3}} /></div>;
  if (!portfolio) return <div className="space-y-6 animate-fade-up"><h1 className="text-2xl font-bold text-white">Portfolio</h1><div className="glass-card p-12 text-center"><PieIcon size={48} className="mx-auto text-slate-500 mb-4" /><p className="text-slate-400">No portfolio data yet</p></div></div>;

  const sectorData = Object.entries(portfolio.sectorAllocation || {}).map(([name, value]) => ({ name, value: value as number }));

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"><PieIcon size={20} className="text-white" /></div>
        <div><h1 className="text-2xl font-bold text-white">Portfolio Analytics</h1><p className="text-xs text-slate-400">P&L attribution and allocation insights</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Invested', value: `₹${portfolio.totalInvested.toLocaleString()}`, color: 'text-white' },
          { label: 'Current', value: `₹${portfolio.currentValue.toLocaleString()}`, color: 'text-white' },
          { label: 'P&L', value: `${portfolio.totalPnL >= 0 ? '+' : ''}₹${portfolio.totalPnL.toLocaleString()}`, color: portfolio.totalPnL >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: 'Return', value: `${portfolio.totalPnLPercent >= 0 ? '+' : ''}${portfolio.totalPnLPercent.toFixed(2)}%`, color: portfolio.totalPnLPercent >= 0 ? 'text-green-400' : 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {sectorData.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-4">Sector Allocation</h2>
          <div className="flex items-center">
            <div className="w-1/2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sectorData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {sectorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1a1f35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-2">
              {sectorData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-white">{item.name}</span>
                  </div>
                  <span className="text-sm text-slate-400">{item.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
