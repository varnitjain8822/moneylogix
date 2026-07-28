import { useEffect, useState } from 'react';
import api from '../services/api';
import { DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaperTrading() {
  const [wallet, setWallet] = useState<any>(null);
  const [stocks, setStocks] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderForm, setOrderForm] = useState({ symbol: '', type: 'BUY' as 'BUY' | 'SELL', quantity: 1 });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [tradesRes, stocksRes] = await Promise.all([api.get('/trades/history'), api.get('/market/stocks')]);
      setTrades(tradesRes.data);
      setStocks(stocksRes.data);
      let bal = 1000000;
      for (const t of tradesRes.data) bal += t.type === 'SELL' ? t.total : -t.total;
      setWallet({ balance: Math.max(0, bal) });
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const executeOrder = async () => {
    if (!orderForm.symbol) return toast.error('Select a stock');
    const stock = stocks.find(s => s.symbol === orderForm.symbol);
    if (!stock) return toast.error('Stock not found');
    try {
      await api.post('/trades/execute', { symbol: orderForm.symbol, type: orderForm.type, quantity: orderForm.quantity, price: stock.price });
      toast.success(`${orderForm.type} order executed!`);
      fetchData();
      setOrderForm({ symbol: '', type: 'BUY', quantity: 1 });
    } catch (error: any) { toast.error(error.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" style={{width:32,height:32,borderWidth:3}} /></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center"><DollarSign size={20} className="text-white" /></div>
        <div><h1 className="text-2xl font-bold text-white">Paper Trading</h1><p className="text-xs text-slate-400">Risk-free virtual trading with real-time prices</p></div>
      </div>

      <div className="glass-card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center"><DollarSign size={24} className="text-white" /></div>
        <div><p className="text-xs text-slate-400">Virtual Balance</p><p className="text-2xl font-bold text-white">₹{wallet?.balance.toLocaleString() || '1,000,000'}</p></div>
      </div>

      <div className="glass-card p-5">
        <h2 className="font-semibold text-white mb-3">Place Order</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select value={orderForm.symbol} onChange={(e) => setOrderForm({ ...orderForm, symbol: e.target.value })} className="input-glass">
            <option value="">Select stock</option>
            {stocks.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} — ₹{s.price.toFixed(2)}</option>)}
          </select>
          <select value={orderForm.type} onChange={(e) => setOrderForm({ ...orderForm, type: e.target.value as any })} className="input-glass">
            <option value="BUY">Buy</option><option value="SELL">Sell</option>
          </select>
          <input type="number" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) || 1 })} min={1} className="input-glass" />
          <div className="text-sm text-slate-400 flex items-center">Total: <span className="text-white font-medium ml-1">₹{((stocks.find(s => s.symbol === orderForm.symbol)?.price || 0) * orderForm.quantity).toLocaleString()}</span></div>
          <button onClick={executeOrder} className={orderForm.type === 'BUY' ? 'btn-glow' : 'btn-danger'}>{orderForm.type === 'BUY' ? 'Buy' : 'Sell'}</button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="font-semibold text-white">Available Stocks</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-xs text-slate-500 uppercase" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th className="p-3 text-left">Symbol</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Change</th><th className="p-3 text-right">Volume</th><th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map(s => (
              <tr key={s.symbol} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td className="p-3 font-semibold text-white text-sm">{s.symbol}</td>
                <td className="p-3 text-right font-mono text-white text-sm">₹{s.price.toFixed(2)}</td>
                <td className="p-3 text-right"><span className={`text-xs font-medium ${s.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>{s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%</span></td>
                <td className="p-3 text-right text-xs text-slate-400">{(s.volume / 1000000).toFixed(1)}M</td>
                <td className="p-3 text-right"><button onClick={() => setOrderForm({ ...orderForm, symbol: s.symbol })} className="text-blue-400 hover:text-blue-300 text-xs">Select</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {trades.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-3">Recent Trades</h2>
          <div className="space-y-1.5">
            {trades.slice(0, 10).map(t => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${t.type === 'BUY' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="font-medium text-white">{t.symbol}</span>
                  <span className={t.type === 'BUY' ? 'text-green-400' : 'text-red-400'}>{t.type}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-300">{t.quantity} × ₹{t.price.toFixed(2)}</span>
                  <span className="text-slate-500 ml-2">₹{t.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
