import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, AlertTriangle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const [stock, setStock] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [liveData, setLiveData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const [orderForm, setOrderForm] = useState<{ type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LIMIT'; price: string; stopPrice: string }>({ type: 'MARKET', price: '', stopPrice: '' });

  useEffect(() => {
    fetchData();
    const socket = connectSocket();
    socket.on('price_update', (update: any) => {
      if (update.symbol === symbol?.toUpperCase()) {
        setLiveData(update);
      }
    });
    return () => disconnectSocket();
  }, [symbol]);

  const fetchData = async () => {
    try {
      const { data } = await api.get(`/market/stocks/${symbol}`);
      setStock(data);
      const histRes = await api.get(`/position-doctor/history/${symbol}?days=90`);
      setHistory(histRes.data.bars || []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const currentPrice = liveData?.price || stock?.price || 0;
  const change = liveData?.change ?? stock?.change ?? 0;
  const changePercent = liveData?.changePercent ?? stock?.changePercent ?? 0;
  const isUp = changePercent >= 0;

  const totalCost = currentPrice * quantity;
  const estimatedFees = totalCost * 0.001;
  const totalWithFees = orderType === 'BUY' ? totalCost + estimatedFees : totalCost - estimatedFees;
  const handlePlaceOrder = async () => {
    try {
      let orderPrice: number | undefined;
      let stopPrice: number | undefined;

      if (orderForm.type === 'LIMIT' || orderForm.type === 'STOP_LIMIT') {
        orderPrice = parseFloat(orderForm.price);
        if (!orderPrice) return toast.error('Limit price required');
      }
      if (orderForm.type === 'STOP_LOSS' || orderForm.type === 'STOP_LIMIT') {
        stopPrice = parseFloat(orderForm.stopPrice);
        if (!stopPrice) return toast.error('Stop price required');
      }
      await api.post('/paper/order', {
        symbol: symbol,
        type: orderForm.type,
        side: orderType,
        quantity,
        price: orderPrice,
        stopPrice,
      });
      toast.success(`${orderType} order placed: ${quantity} ${symbol} @ ${orderForm.type}`);
      setShowConfirm(false);
      setOrderForm({ type: 'MARKET', price: '', stopPrice: '' });
      setQuantity(1);
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Order failed');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>;
  }

  if (!stock) {
    return <div className="space-y-6 animate-fade-up"><h1 className="text-2xl font-bold text-white">Stock Not Found</h1></div>;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/paper-trading" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">{symbol}</h1>
          <span className={`text-lg font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            ₹{currentPrice.toFixed(2)}
          </span>
          <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${isUp ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
            {isUp ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Price Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Open', value: `₹${(currentPrice * 0.998).toFixed(2)}`, color: 'text-slate-300' },
          { label: 'High', value: `₹${(currentPrice * 1.005).toFixed(2)}`, color: 'text-green-400' },
          { label: 'Low', value: `₹${(currentPrice * 0.995).toFixed(2)}`, color: 'text-red-400' },
          { label: 'Volume', value: `${((stock.volume || 1000000) / 1000000).toFixed(1)}M`, color: 'text-slate-300' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
            <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Price Chart</h3>
        <div className="h-72 w-full">
          {history.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isUp ? '#22c55e' : '#ef4444'} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={isUp ? '#22c55e' : '#ef4444'} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                <Area type="monotone" dataKey="close" stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth={2} fillOpacity={1} fill="url(#priceGrad)" name="Close Price" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">No chart data available</div>
          )}
        </div>
      </div>

      {/* Order Panel */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-4">Place Order</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <button
            onClick={() => setOrderType('BUY')}
            className={`py-2 rounded-lg font-semibold text-sm transition-colors ${orderType === 'BUY' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-slate-400 border border-white/5'}`}
          >
            Buy
          </button>
          <button
            onClick={() => setOrderType('SELL')}
            className={`py-2 rounded-lg font-semibold text-sm transition-colors ${orderType === 'SELL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-slate-400 border border-white/5'}`}
          >
            Sell
          </button>
          <select value={orderForm.type} onChange={(e) => setOrderForm({ ...orderForm, type: e.target.value as 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LIMIT' })} className="input-glass">
            <option value="MARKET">Market</option>
            <option value="LIMIT">Limit</option>
            <option value="STOP_LOSS">Stop Loss</option>
            <option value="STOP_LIMIT">Stop Limit</option>
          </select>
          <input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} min={1} className="input-glass" placeholder="Quantity" />
          <div className="text-sm text-slate-400 flex items-center">
            Est: <span className="text-white font-medium ml-1">₹{totalWithFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
        {(orderForm.type === 'LIMIT' || orderForm.type === 'STOP_LIMIT') && (
          <div className="mt-3">
            <input type="number" value={orderForm.price} onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })} placeholder="Limit Price" className="input-glass w-full" />
          </div>
        )}
        {(orderForm.type === 'STOP_LOSS' || orderForm.type === 'STOP_LIMIT') && (
          <div className="mt-3">
            <input type="number" value={orderForm.stopPrice} onChange={(e) => setOrderForm({ ...orderForm, stopPrice: e.target.value })} placeholder="Stop Price" className="input-glass w-full" />
          </div>
        )}
        {orderForm.type !== 'MARKET' && (
          <p className="text-xs text-yellow-400 mt-2"><AlertTriangle size={12} className="inline mr-1" /> {orderForm.type} orders execute when price conditions are met</p>
        )}
        <button onClick={() => setShowConfirm(true)} className={`mt-3 w-full py-2 rounded-lg font-semibold text-sm ${orderType === 'BUY' ? 'btn-glow' : 'btn-danger'}`}>
          {orderType === 'BUY' ? 'Buy' : 'Sell'} {symbol}
        </button>
      </div>

      {/* Market Info */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><Info size={16} className="text-blue-400" /> Market Information</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">52-Week High</span><span className="text-white">₹{(stock.fiftyTwoWeekHigh || currentPrice * 1.1).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">52-Week Low</span><span className="text-white">₹{(stock.fiftyTwoWeekLow || currentPrice * 0.9).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Volume</span><span className="text-white">{(stock.volume / 1000000).toFixed(1)}M</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Change</span><span className={isUp ? 'text-green-400' : 'text-red-400'}>{isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePercent.toFixed(2)}%)</span></div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowConfirm(false)}>
          <div className="glass-card p-6 w-full max-w-md animate-fade-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Confirm Order</h3>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-slate-400">Type</span><span className="text-white">{orderForm.type}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Side</span><span className={orderType === 'BUY' ? 'text-green-400' : 'text-red-400'}>{orderType}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Symbol</span><span className="text-white">{symbol}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Quantity</span><span className="text-white">{quantity}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Price</span><span className="text-white">₹{currentPrice.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Fees</span><span className="text-white">₹{estimatedFees.toFixed(2)}</span></div>
              <hr className="border-white/10" />
              <div className="flex justify-between"><span className="text-slate-400">Total</span><span className="text-white font-bold">₹{totalWithFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 transition-colors text-sm">Cancel</button>
              <button onClick={handlePlaceOrder} className={`flex-1 py-2 rounded-lg font-semibold text-sm ${orderType === 'BUY' ? 'btn-glow' : 'btn-danger'}`}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
