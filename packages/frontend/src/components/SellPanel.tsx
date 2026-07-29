import { useState } from 'react';
import api from '../services/api';
import { TrendingDown, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  symbol: string;
  currentPrice: number;
  currentQuantity: number;
  avgPrice: number;
  onOrderPlaced?: () => void;
}

export default function SellPanel({ symbol, currentPrice, currentQuantity, avgPrice, onOrderPlaced }: Props) {
  const [quantity, setQuantity] = useState(Math.min(1, currentQuantity));
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const quantityAvailable = currentQuantity;

  const totalProceeds = currentPrice * quantity;
  const estimatedFees = totalProceeds * 0.001;
  const netProceeds = totalProceeds - estimatedFees;
  const costBasis = avgPrice * quantity;
  const estimatedPnl = netProceeds - costBasis;
  const estimatedPnlPercent = costBasis > 0 ? (estimatedPnl / costBasis) * 100 : 0;

  const handleSell = async () => {
    setLoading(true);
    try {
      const price = orderType === 'LIMIT' ? parseFloat(limitPrice) : undefined;
      if (orderType === 'LIMIT' && !price) {
        toast.error('Limit price required for limit orders');
        return;
      }
      if (quantity > quantityAvailable) {
        toast.error(`Insufficient shares. You have ${quantityAvailable}.`);
        return;
      }
      await api.post('/paper/order', {
        symbol,
        type: orderType,
        side: 'SELL',
        quantity,
        price,
      });
      toast.success(`✅ Sell order placed: ${quantity} ${symbol} @ ${orderType}`);
      setQuantity(1);
      setLimitPrice('');
      onOrderPlaced?.();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Sell order failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-5 border-l-4 border-l-red-500">
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown size={18} className="text-red-400" />
        <h3 className="text-lg font-bold text-red-400">Sell {symbol}</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass-card p-2 text-center"><p className="text-xs text-slate-400">Held</p><p className="text-white font-bold">{quantityAvailable}</p></div>
        <div className="glass-card p-2 text-center"><p className="text-xs text-slate-400">Avg Cost</p><p className="text-white font-bold font-mono">₹{avgPrice.toFixed(2)}</p></div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-sm">Current Price</span>
        <span className="text-white font-mono font-bold">₹{currentPrice.toFixed(2)}</span>
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
          <label className="text-xs text-slate-400 block mb-1">Quantity (max {quantityAvailable})</label>
          <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(quantityAvailable, parseInt(e.target.value) || 1)))} min={1} max={quantityAvailable} className="input-glass w-full text-sm" />
        </div>
        <div className="glass-card p-3 bg-white/[0.02]">
          <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Proceeds</span><span className="text-white font-mono">₹{totalProceeds.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
          <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Fees (0.1%)</span><span className="text-red-400 font-mono">-₹{estimatedFees.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Cost Basis</span><span className="text-slate-300 font-mono">₹{costBasis.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
          <hr className="border-white/5 my-2" />
          <div className="flex justify-between text-sm"><span className={`font-medium ${estimatedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>Est. P&L</span><span className={`font-bold font-mono ${estimatedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{estimatedPnl >= 0 ? '+' : ''}₹{estimatedPnl.toFixed(2)} ({estimatedPnlPercent >= 0 ? '+' : ''}{estimatedPnlPercent.toFixed(1)}%)</span></div>
        </div>
        <button onClick={handleSell} disabled={loading || quantity > quantityAvailable || quantity <= 0} className={`w-full py-3 rounded-xl bg-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}>
          {loading ? <><DollarSign size={14} className="animate-pulse" /> Placing Order...</> : <><TrendingDown size={14} /> Sell {symbol}</>}
        </button>
      </div>
    </div>
  );
}
