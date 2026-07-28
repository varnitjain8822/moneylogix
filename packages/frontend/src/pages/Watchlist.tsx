import { useEffect, useState } from 'react';
import api from '../services/api';
import { Watchlist as WatchlistType } from '../types';
import { Plus, Trash2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { connectSocket, disconnectSocket } from '../services/socket';

export default function Watchlist() {
  const [watchlists, setWatchlists] = useState<WatchlistType[]>([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState<string | null>(null);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [loading, setLoading] = useState(true);
  const [livePrices, setLivePrices] = useState<Record<string, { price: number; change: number; changePercent: number }>>({});

  useEffect(() => { fetchWatchlists(); return () => disconnectSocket(); }, []);

  useEffect(() => {
    const socket = connectSocket();
    socket.on('price-update', (data: any) => {
      setLivePrices(prev => ({ ...prev, [data.symbol]: { price: data.price, change: data.change, changePercent: data.changePercent } }));
    });
    return () => { socket.off('price-update'); };
  }, [watchlists]);

  const fetchWatchlists = async () => {
    try {
      const { data } = await api.get('/watchlists');
      setWatchlists(data);
      if (data.length > 0 && !selectedWatchlist) setSelectedWatchlist(data[0].id);
    } catch (error) { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const createWatchlist = async () => {
    if (!newWatchlistName.trim()) return;
    await api.post('/watchlists', { name: newWatchlistName });
    setNewWatchlistName(''); fetchWatchlists(); toast.success('Created');
  };

  const addSymbol = async () => {
    if (!selectedWatchlist || !newSymbol.trim()) return;
    await api.post(`/watchlists/${selectedWatchlist}/symbols`, { symbol: newSymbol });
    setNewSymbol(''); fetchWatchlists(); toast.success('Added');
  };

  const removeSymbol = async (wid: string, symbol: string) => {
    await api.delete(`/watchlists/${wid}/symbols/${symbol}`);
    fetchWatchlists();
  };

  const deleteWatchlist = async (id: string) => {
    await api.delete(`/watchlists/${id}`);
    if (selectedWatchlist === id) setSelectedWatchlist(watchlists.length > 1 ? watchlists[0].id : null);
    fetchWatchlists();
  };

  const currentWatchlist = watchlists.find(w => w.id === selectedWatchlist);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" style={{width:32,height:32,borderWidth:3}} /></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"><RefreshCw size={20} className="text-white" /></div>
          <div><h1 className="text-2xl font-bold text-white">Watchlist</h1><p className="text-xs text-slate-400">Real-time price tracking with WebSocket</p></div>
        </div>
        <div className="flex gap-2">
          <input type="text" value={newWatchlistName} onChange={(e) => setNewWatchlistName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && createWatchlist()} className="input-glass w-48 text-sm" placeholder="New watchlist..." />
          <button onClick={createWatchlist} className="btn-glow text-sm px-4"><Plus size={14} /></button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-48 space-y-1.5">
          {watchlists.map(w => (
            <div key={w.id} onClick={() => setSelectedWatchlist(w.id)} className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${selectedWatchlist === w.id ? 'bg-blue-500/15 border border-blue-500/30 text-blue-400' : 'bg-slate-800/30 border border-slate-700/30 text-slate-300 hover:border-slate-600/50'}`}>
              <span className="text-sm truncate">{w.name}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteWatchlist(w.id); }} className="text-slate-500 hover:text-red-400"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>

        <div className="flex-1">
          {currentWatchlist ? (
            <>
              <div className="flex gap-2 mb-4">
                <input type="text" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addSymbol()} className="input-glass flex-1 text-sm" placeholder="Add symbol (e.g., RELIANCE)" />
                <button onClick={addSymbol} className="btn-glow text-sm px-5">Add</button>
              </div>
              <div className="glass-card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wider" style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th className="p-4">Symbol</th><th className="p-4 text-right">Price</th><th className="p-4 text-right">Change</th><th className="p-4 text-right">Volume</th><th className="p-4 text-right">52W Range</th><th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentWatchlist.symbols.map(s => {
                      const live = livePrices[s.symbol];
                      const price = live?.price || s.price;
                      const changePct = live?.changePercent || s.changePercent;
                      return (
                        <tr key={s.symbol} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td className="p-4"><span className="font-semibold text-white text-sm">{s.symbol}</span></td>
                          <td className="p-4 text-right font-mono text-white text-sm">₹{price.toFixed(2)}</td>
                          <td className="p-4 text-right">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${changePct >= 0 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                              {changePct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                            </span>
                          </td>
                          <td className="p-4 text-right text-xs text-slate-400">{(s.volume / 1000000).toFixed(1)}M</td>
                          <td className="p-4 text-right text-xs text-slate-400">₹{s.fiftyTwoWeekLow} — ₹{s.fiftyTwoWeekHigh}</td>
                          <td className="p-4 text-right"><button onClick={() => removeSymbol(currentWatchlist.id, s.symbol)} className="text-slate-500 hover:text-red-400"><Trash2 size={14} /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="glass-card p-12 text-center"><p className="text-slate-400">Create a watchlist to get started</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
