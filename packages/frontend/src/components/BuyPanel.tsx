import { useState } from 'react';
import api from '../services/api';
import { TrendingUp, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BuyPanel({ symbol, currentPrice, onOrderPlaced }: { symbol: string; currentPrice: number; onOrderPlaced?: () => void }) {
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const totalCost = currentPrice * quantity;
  const estimatedFees = totalCost * 0.001;
  const totalWithFees = totalCost + estimatedFees;

  const handleBuy = async () => {
    setLoading(true);
    try {
      const price = orderType === 'LIMIT' ? parseFloat(limitPrice) : undefined;
      if (orderType === 'LIMIT' && !price) {
        toast.error('Limit price required for limit orders');
        return;
      }
      await api.post('/paper/order', {
        symbol,
        type: orderType,
        side: 'BUY',
        quantity,
        price,
      });
      toast.success(`✅ Buy order placed: ${quantity} ${symbol} @ ${orderType}`);
      setQuantity(1);
      setLimitPrice('');
      onOrderPlaced?.();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Buy order failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-5 border-l-4 border-l-green-500">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={18} className="text-green-400" />
        <h3 className="text-lg font-bold text-green-400">Buy {symbol}</h3>
      </div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-400 text-sm">Current Price</span>
        <span className="text-white font-mono text-lg">₹{currentPrice.toFixed(2)}</span>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Order Type</label>
          <select value={orderType} onChange={(e) => setOrderType(e.target.value as any)} className="input-glass w-full text-sm">
            <option value="MARKET">Market Order</option>
            <option value="LIMIT">Limit Order</option>
          </select>
        </div>
        {orderType === 'LIMIT' && (
          <div>
            <label className="text-xs text-slate-400 block mb-1">Limit Price (₹)</label>
            <input type="number" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} placeholder={`Current: ₹${currentPrice.toFixed(2)}`} className="input-glass w-full text-sm" step="0.01" min="0.01" />
          </div>
        )}
        <div>
          <label className="text-xs text-slate-400 block mb-1">Quantity (shares)</label>
          <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} min={1} className="input-glass w-full text-sm" />
        </div>
        <div className="glass-card p-3 bg-white/[0.02]">
          <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Price × Qty</span><span className="text-white font-mono">₹{totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
          <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Fees (0.1%)</span><span className="text-yellow-400 font-mono">₹{estimatedFees.toFixed(2)}</span></div>
          <hr className="border-white/5 my-2" />
          <div className="flex justify-between text-sm"><span className="text-slate-300 font-medium">Estimated Total</span><span className="text-white font-bold font-mono">₹{totalWithFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
        </div>
        <button onClick={handleBuy} disabled={loading} className={`w-full py-3 rounded-xl bg-green-500/20 text-green-400 font-bold text-sm hover:bg-green-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}>
          {loading ? <><DollarSign size={14} className="animate-pulse" /> Placing Order...</> : <><TrendingUp size={14} /> Buy {symbol}</>}
        </button>
      </div>
    </div>
  );
}
