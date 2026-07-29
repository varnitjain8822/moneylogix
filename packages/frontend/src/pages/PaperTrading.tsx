import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../services/api';
import { useMarketStore } from '../stores/marketStore';
import { DollarSign, TrendingUp, TrendingDown, Activity, Clock, Target, Search, ShoppingCart, X, RefreshCw, XCircle } from 'lucide-react';
import BuyPanel from '../components/BuyPanel';
import SellPanel from '../components/SellPanel';
import SearchPanel from '../components/SearchPanel';
import toast from 'react-hot-toast';

interface StockRow { symbol: string; price: number; change: number; changePercent: number; volume: number; high: number; low: number; isWatched: boolean }

export default function PaperTrading() {
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [marketStats, setMarketStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'trade' | 'orders' | 'history'>('trade');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ symbol: '', type: '', side: '', page: 1 });
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      const [stocksRes, ordersRes, summaryRes] = await Promise.all([
        api.get('/market/stocks'),
        api.get('/paper/orders').catch(() => ({ orders: [], total: 0 })),
        api.get('/paper/summary').catch(() => null),
      ]);

      setStocks(stocksRes.data || []);

      const ordersData = (ordersRes as any).data || ordersRes;
      setOrders(ordersData.orders || []);

      if (summaryRes && summaryRes.data) {
        setWallet({ balance: summaryRes.data.buyingPower || summaryRes.data.balance || 0 });
        setPositions(summaryRes.data.positions || []);
      } else {
        setWallet({ balance: 1000000 });
        setPositions([]);
      }



      const s = stocksRes.data || [];
      setMarketStats({
        advancers: s.filter((st: any) => st.changePercent > 0).length,
        decliners: s.filter((st: any) => st.changePercent < 0).length,
        totalVolume: s.reduce((sum: number, st: any) => sum + (st.volume || 0), 0),
      });
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  }, []);

  const { stocks: livePrices, subscribe, unsubscribe } = useMarketStore();

  const displayStocks = useMemo(() => {
    return stocks.map(s => {
      const live = livePrices[s.symbol];
      return live ? { ...s, price: live.price, change: live.change, changePercent: live.changePercent } : s;
    });
  }, [stocks, livePrices]);

  const liveStats = useMemo(() => {
    if (!wallet || positions.length === 0) return { totalValue: wallet?.balance || 0, totalPnl: 0 };
    let currentPositionsValue = 0;
    let totalInvested = 0;
    
    positions.forEach((p: any) => {
      const currentPrice = livePrices[p.symbol]?.price || p.avgPrice || 0;
      currentPositionsValue += currentPrice * p.quantity;
      totalInvested += (p.avgPrice || 0) * p.quantity;
    });
    
    return {
      totalValue: wallet.balance + currentPositionsValue,
      totalPnl: currentPositionsValue - totalInvested,
    };
  }, [wallet, positions, livePrices]);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (stocks.length > 0) {
      const symbols = stocks.map(s => s.symbol);
      subscribe(symbols);
      return () => unsubscribe(symbols);
    }
  }, [stocks.length, subscribe, unsubscribe]);

  // Update selected stock with live price
  useEffect(() => {
    if (selectedStock && livePrices[selectedStock.symbol]) {
      const live = livePrices[selectedStock.symbol];
      if (live.price !== selectedStock.price) {
        setSelectedStock((prev: any) => prev ? { ...prev, ...live } : prev);
      }
    }
  }, [livePrices, selectedStock?.symbol]);

  const handleCancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      await api.delete(`/paper/orders/${orderId}/cancel`);
      toast.success('Order cancelled');
      setOrders((prev: any[]) => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o));
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to cancel order');
    } finally {
      setCancellingId(null);
    }
  };

  const getPositionForSymbol = (symbol: string) => {
    return positions.find(p => p.symbol === symbol);
  };

  const filledOrders = orders.filter((o: any) => o.status === 'FILLED');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" style={{ width: 32, height: 32, borderWidth: 3 }} />
          <p className="text-slate-400 text-sm">Loading trading terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <SearchPanel onSelect={(stock: any) => { setSelectedStock(stock); }} />
          <div className="hidden md:flex items-center gap-4 text-xs">
            {marketStats && (
              <>
                <span className="text-slate-400">Advancers: <span className="text-green-400 font-medium">{marketStats.advancers}</span></span>
                <span className="text-slate-400">Decliners: <span className="text-red-400 font-medium">{marketStats.decliners}</span></span>
                <span className="text-slate-400">Volume: <span className="text-white font-medium">{(marketStats.totalVolume / 1000000).toFixed(0)}M</span></span>
              </>
            )}
          </div>
        </div>
        <button onClick={fetchAllData} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="glass-card p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20">
          <div className="flex items-center gap-2 mb-1"><DollarSign size={14} className="text-green-400" /><span className="text-xs text-slate-400">Total Value (Live)</span></div>
          <p className="text-xl font-bold text-green-400">₹{(liveStats.totalValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1"><Activity size={14} className={liveStats.totalPnl >= 0 ? "text-green-400" : "text-red-400"} /><span className="text-xs text-slate-400">Live P&L</span></div>
          <p className={`text-xl font-bold ${liveStats.totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
            {liveStats.totalPnl >= 0 ? '+' : ''}₹{liveStats.totalPnl.toFixed(0)}
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1"><Target size={14} className="text-purple-400" /><span className="text-xs text-slate-400">Positions</span></div>
          <p className="text-xl font-bold text-white">{positions.length}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1"><ShoppingCart size={14} className="text-yellow-400" /><span className="text-xs text-slate-400">Buying Power</span></div>
          <p className="text-xl font-bold text-white">₹{(wallet?.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 glass-card p-1">
        {[
          { key: 'trade', label: 'Trade', icon: ShoppingCart },
          { key: 'orders', label: `Orders (${orders.length})`, icon: Clock },
          { key: 'history', label: `History (${filledOrders.length})`, icon: Activity },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.key
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'trade' && (
        <div className="space-y-4">
          {selectedStock ? (
            <div className="space-y-4">
              <div className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-white font-bold text-lg">{selectedStock.symbol}</span>
                    <span className="text-slate-400 text-sm ml-2">{selectedStock.name || ''}</span>
                  </div>
                  <span className={`text-lg font-bold font-mono ${(selectedStock.changePercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ₹{(selectedStock.price || 0).toFixed(2)}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${(selectedStock.changePercent || 0) >= 0 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                    {(selectedStock.changePercent || 0) >= 0 ? '+' : ''}{(selectedStock.changePercent || 0).toFixed(2)}%
                  </span>
                </div>
                <button onClick={() => setSelectedStock(null)} className="p-1 rounded-lg hover:bg-white/10 text-slate-400"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BuyPanel symbol={selectedStock.symbol} currentPrice={selectedStock.price || 0} onOrderPlaced={fetchAllData} />
                <SellPanel symbol={selectedStock.symbol} currentPrice={selectedStock.price || 0} currentQuantity={getPositionForSymbol(selectedStock.symbol)?.quantity || 0} avgPrice={getPositionForSymbol(selectedStock.symbol)?.avgPrice || (selectedStock.price || 0) * 0.95} onOrderPlaced={fetchAllData} />
              </div>
            </div>
          ) : (
            <div className="glass-card p-6 text-center">
              <Search size={40} className="mx-auto text-slate-500 mb-3" />
              <h3 className="text-white font-semibold mb-2">Search for a stock to trade</h3>
              <p className="text-slate-400 text-sm mb-4">Use the search bar above or browse the stock list below</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {displayStocks.slice(0, 10).map((s: StockRow) => (
                  <button
                    key={s.symbol}
                    onClick={() => setSelectedStock(s)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 text-sm text-white hover:bg-white/10 transition-colors font-mono"
                  >
                    {s.symbol} <span className="text-slate-400">₹{(s.price || 0).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card overflow-hidden">
            <div className="p-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h3 className="font-semibold text-white text-sm">Market Watchlist</h3>
              <span className="text-xs text-slate-400">{displayStocks.length} stocks</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th className="p-3 text-left">Symbol</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-right">Change %</th>
                    <th className="p-3 text-right">Volume</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayStocks.map((s: StockRow) => (
                    <tr key={s.symbol} className="hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => setSelectedStock(s)}>
                      <td className="p-3 font-semibold text-white">{s.symbol}</td>
                      <td className="p-3 text-right font-mono text-white">₹{(s.price || 0).toFixed(2)}</td>
                      <td className="p-3 text-right">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${(s.changePercent || 0) >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {(s.changePercent || 0) >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {(s.changePercent || 0) >= 0 ? '+' : ''}{(s.changePercent || 0).toFixed(2)}%
                        </span>
                      </td>
                      <td className="p-3 text-right text-xs text-slate-400 font-mono">{((s.volume || 0) / 1000000).toFixed(1)}M</td>
                      <td className="p-3 text-right"><span className="text-blue-400 text-xs hover:text-blue-300">Trade</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex items-center gap-3 flex-wrap">
            <input type="text" placeholder="Filter by symbol..." value={filters.symbol} onChange={(e) => setFilters({ ...filters, symbol: e.target.value, page: 1 })} className="input-glass text-sm flex-1 min-w-[150px]" />
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })} className="input-glass text-sm">
              <option value="">All Types</option>
              <option value="MARKET">Market</option>
              <option value="LIMIT">Limit</option>
              <option value="STOP_LOSS">Stop Loss</option>
              <option value="STOP_LIMIT">Stop Limit</option>
            </select>
            <select value={filters.side} onChange={(e) => setFilters({ ...filters, side: e.target.value, page: 1 })} className="input-glass text-sm">
              <option value="">All Sides</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
            {(filters.symbol || filters.type || filters.side) && (
              <button onClick={() => setFilters({ symbol: '', type: '', side: '', page: 1 })} className="text-xs text-red-400 hover:text-red-300">Clear</button>
            )}
          </div>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th className="p-3 text-left">Time</th>
                  <th className="p-3 text-left">Symbol</th>
                  <th className="p-3 text-center">Type</th>
                  <th className="p-3 text-center">Side</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.filter((o: any) => {
                  if (filters.symbol && !o.symbol.toLowerCase().includes(filters.symbol.toLowerCase())) return false;
                  if (filters.type && o.type !== filters.type) return false;
                  if (filters.side && o.side !== filters.side) return false;
                  return true;
                }).slice(0, 20).map((o: any, i: number) => (
                  <tr key={o.id || i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 text-xs text-slate-400">{new Date(o.createdAt).toLocaleTimeString()}</td>
                    <td className="p-3 font-semibold text-white">{o.symbol}</td>
                    <td className="p-3 text-center"><span className="text-xs bg-white/5 px-2 py-0.5 rounded text-slate-300">{o.type}</span></td>
                    <td className="p-3 text-center"><span className={`text-xs font-medium px-2 py-0.5 rounded ${o.side === 'BUY' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>{o.side}</span></td>
                    <td className="p-3 text-right font-mono text-white">{o.quantity}</td>
                    <td className="p-3 text-right font-mono text-white">₹{(o.filledPrice || o.price || 0).toFixed(2)}</td>
                    <td className="p-3 text-right font-mono text-white">₹{(o.totalCost || (o.filledPrice || o.price || 0) * o.quantity || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="p-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === 'FILLED' ? 'bg-green-500/15 text-green-400' : o.status === 'PENDING' ? 'bg-yellow-500/15 text-yellow-400' : o.status === 'CANCELLED' ? 'bg-slate-500/15 text-slate-400' : 'bg-red-500/15 text-red-400'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {o.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancelOrder(o.id)}
                          disabled={cancellingId === o.id}
                          className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 mx-auto transition-colors disabled:opacity-50"
                        >
                          <XCircle size={12} />
                          {cancellingId === o.id ? '...' : 'Cancel'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && <div className="p-8 text-center text-slate-400">No orders yet</div>}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex items-center gap-3">
            <input type="text" placeholder="Search symbol..." value={filters.symbol} onChange={(e) => setFilters({ ...filters, symbol: e.target.value, page: 1 })} className="input-glass text-sm flex-1 min-w-[150px]" />
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })} className="input-glass text-sm">
              <option value="">All</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
            {filters.symbol && <button onClick={() => setFilters({ symbol: '', type: '', side: '', page: 1 })} className="text-xs text-red-400">Clear</button>}
          </div>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Symbol</th>
                  <th className="p-3 text-center">Type</th>
                  <th className="p-3 text-center">Side</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Fees</th>
                  <th className="p-3 text-right">P&L</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filledOrders.filter((o: any) => {
                  if (filters.symbol && !o.symbol.toLowerCase().includes(filters.symbol.toLowerCase())) return false;
                  if (filters.type && o.side !== filters.type) return false;
                  return true;
                }).slice(0, 30).map((o: any, i: number) => {
                  const costBasis = o.side === 'SELL' && o.filledPrice && o.totalCost
                    ? (positions.find(p => p.symbol === o.symbol)?.avgPrice || o.filledPrice) * o.quantity
                    : 0;
                  const pnl = o.side === 'SELL' && o.totalCost ? (o.totalCost - (o.fees || 0)) - costBasis : null;
                  const pnlPercent = costBasis > 0 && pnl !== null ? (pnl / costBasis) * 100 : null;
                  return (
                    <tr key={o.id || i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 font-semibold text-white">{o.symbol}</td>
                      <td className="p-3 text-center"><span className="text-xs bg-white/5 px-2 py-0.5 rounded text-slate-300">{o.type}</span></td>
                      <td className={`p-3 text-center text-xs font-medium ${o.side === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{o.side}</td>
                      <td className="p-3 text-right font-mono text-white">{o.quantity}</td>
                      <td className="p-3 text-right font-mono text-white">₹{(o.filledPrice || 0).toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-white">₹{(o.totalCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td className="p-3 text-right font-mono text-yellow-400">₹{(o.fees || 0).toFixed(2)}</td>
                      <td className={`p-3 text-right font-mono font-medium ${pnl !== null ? (pnl >= 0 ? 'text-green-400' : 'text-red-400') : 'text-slate-400'}`}>
                        {pnl !== null ? `${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(2)}${pnlPercent !== null ? ` (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(1)}%)` : ''}` : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => { setSelectedStock(displayStocks.find((s:any) => s.symbol === o.symbol) || { symbol: o.symbol, price: o.filledPrice }); setActiveTab('trade'); }} className="text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 px-2 py-1 rounded transition-colors">
                            Trade
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filledOrders.length === 0 && <div className="p-8 text-center text-slate-400">No trade history yet</div>}
          </div>
        </div>
      )}
    </div>
  );
}
