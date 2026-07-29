import { useEffect, useState } from 'react';
import api from '../services/api';
import { Download, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TradeHistory() {
  const [trades, setTrades] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    symbol: '',
    side: '',
    days: 30,
  });

  useEffect(() => { fetchData(); }, [filters]);

  const fetchData = async () => {
    try {
      const [histRes, ordersRes] = await Promise.all([
        api.get('/trades/history', { params: { days: filters.days } }),
        api.get('/paper/orders', { params: filters }),
      ]);
      setTrades(histRes.data);
      setOrders(ordersRes.data.orders || []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const allEntries = [
    ...trades.map(t => ({ ...t, type: 'trade', date: t.createdAt })),
    ...orders.map(o => ({ ...o, type: 'order', date: o.createdAt })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered = allEntries.filter(e => {
    if (filters.symbol && !e.symbol?.toLowerCase().includes(filters.symbol.toLowerCase())) return false;
    if (filters.status && e.status !== filters.status && e.side !== filters.side) return false;
    return true;
  });

  const exportCSV = () => {
    const rows = allEntries.map(e =>
      `${e.date},${e.symbol},${e.type === 'trade' ? e.type?.toUpperCase() : e.side},${e.quantity},${e.price || e.filledPrice || ''},${(e.total || e.totalCost || 0).toFixed(2)},${e.status || 'EXECUTED'}`
    );
    const csv = `Date,Symbol,Type,Quantity,Price,Total,Status\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'trade-history.csv'; a.click();
    toast.success('Exporting trades...');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Trade History</h1><p className="text-xs text-slate-400">All trades, orders, and executions</p></div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm transition-colors"><Download size={14} /> Export CSV</button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <input type="text" value={filters.symbol} onChange={(e) => setFilters({ ...filters, symbol: e.target.value })} placeholder="Filter by symbol..." className="input-glass text-sm" />
        <select value={filters.days} onChange={(e) => setFilters({ ...filters, days: parseInt(e.target.value) })} className="input-glass text-sm">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
        <select value={filters.side} onChange={(e) => setFilters({ ...filters, side: e.target.value })} className="input-glass text-sm">
          <option value="">All Sides</option>
          <option value="BUY">Buy Orders</option>
          <option value="SELL">Sell Orders</option>
        </select>
        {(filters.symbol || filters.side) && (
          <button onClick={() => setFilters({ status: '', symbol: '', side: '', days: 30 })} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"><X size={12} /> Clear filters</button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 text-center"><p className="text-xs text-slate-400">Total Entries</p><p className="text-xl font-bold text-white">{allEntries.length}</p></div>
        <div className="glass-card p-4 text-center"><p className="text-xs text-slate-400">Buy Orders</p><p className="text-xl font-bold text-green-400">{orders.filter(o => o.side === 'BUY').length}</p></div>
        <div className="glass-card p-4 text-center"><p className="text-xs text-slate-400">Sell Orders</p><p className="text-xl font-bold text-red-400">{orders.filter(o => o.side === 'SELL').length}</p></div>
      </div>

      {/* All Entries Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Symbol</th>
                <th className="p-3 text-center">Type</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Price</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.slice(0, 50).map((e, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-3 text-slate-400 text-xs">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="p-3 font-semibold text-white text-sm">{e.symbol}</td>
                  <td className="p-3 text-center">
                    {e.type === 'trade' ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${e.type?.toUpperCase() === 'BUY' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                        {e.type?.toUpperCase() === 'BUY' ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                        {e.type?.toUpperCase()}
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${e.side === 'BUY' ? 'bg-blue-500/15 text-blue-400' : 'bg-orange-500/15 text-orange-400'}`}>
                        {e.side}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-300">{e.quantity}</td>
                  <td className="p-3 text-right font-mono text-white">₹{(e.price || e.filledPrice || 0).toFixed(2)}</td>
                  <td className="p-3 text-right font-mono text-white">₹{(e.total || e.totalCost || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="p-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${e.status === 'FILLED' || e.status === 'EXECUTED' ? 'bg-green-500/15 text-green-400' : e.status === 'PENDING' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-red-500/15 text-red-400'}`}>{e.status || 'EXECUTED'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-slate-400">No trades or orders found</div>
        )}
      </div>
    </div>
  );
}
