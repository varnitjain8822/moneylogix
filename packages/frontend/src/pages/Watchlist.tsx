import { useEffect, useState, useMemo, useRef } from 'react';
import api from '../services/api';
import { Watchlist as WatchlistType } from '../types';
import { Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, GripVertical, Search, MoreVertical, LayoutList, LayoutGrid, Star, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMarketStore } from '../stores/marketStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';

function usePriceFlash(price: number) {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef(price);

  useEffect(() => {
    if (price > prevPriceRef.current) {
      setFlash('up');
      const timer = setTimeout(() => setFlash(null), 500);
      return () => clearTimeout(timer);
    } else if (price < prevPriceRef.current) {
      setFlash('down');
      const timer = setTimeout(() => setFlash(null), 500);
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = price;
  }, [price]);

  return flash;
}

const SortableRow = ({ symbol, style, s, live, isCompact, removeSymbol, currentWatchlistId }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: symbol });
  const navigate = useNavigate();
  const price = live?.price || s.price;
  const changePct = live?.changePercent || s.changePercent;
  const flash = usePriceFlash(price);
  const [showMenu, setShowMenu] = useState(false);

  const styleObj = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const flashClass = flash === 'up' ? 'bg-green-500/20' : flash === 'down' ? 'bg-red-500/20' : 'hover:bg-white/[0.05]';

  return (
    <div
      ref={setNodeRef}
      style={styleObj}
      className={`absolute top-0 left-0 w-full flex items-center justify-between px-4 border-b border-white/[0.05] transition-colors duration-300 ${flashClass} ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-3 flex-1 h-full cursor-pointer" onClick={() => navigate(`/stock/${symbol}`)}>
        <button {...attributes} {...listeners} className="text-slate-500 hover:text-white cursor-grab active:cursor-grabbing p-1" onClick={e => e.stopPropagation()}>
          <GripVertical size={16} />
        </button>
        <div className="flex flex-col justify-center">
          <span className="font-semibold text-white text-sm">{symbol}</span>
          {!isCompact && <span className="text-xs text-slate-400">NSE</span>}
        </div>
      </div>

      <div className="flex items-center justify-end gap-6 h-full flex-1 cursor-pointer" onClick={() => navigate(`/stock/${symbol}`)}>
        <div className="text-right flex flex-col justify-center">
          <span className={`font-mono font-medium ${flash === 'up' ? 'text-green-400' : flash === 'down' ? 'text-red-400' : 'text-white'}`}>
            ₹{price.toFixed(2)}
          </span>
          {!isCompact && <span className="text-xs text-slate-400">Vol: {(s.volume / 1000000).toFixed(1)}M</span>}
        </div>

        <div className="text-right w-20 flex flex-col items-end justify-center">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${changePct >= 0 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
            {changePct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(changePct).toFixed(2)}%
          </span>
        </div>

        <div className="relative flex items-center h-full">
          <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors">
            <MoreVertical size={16} />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-10 mt-1 w-40 rounded-xl bg-slate-800 border border-slate-700 shadow-xl py-1 z-50 animate-fade-up">
              <button onClick={(e) => { e.stopPropagation(); navigate(`/stock/${symbol}`); }} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white flex items-center gap-2"><Activity size={14} /> Open Chart</button>
              <button onClick={(e) => { e.stopPropagation(); toast('Buy functionality coming soon!'); }} className="w-full text-left px-4 py-2 text-sm text-green-400 hover:bg-white/10 flex items-center gap-2"><ArrowUpRight size={14} /> Buy</button>
              <button onClick={(e) => { e.stopPropagation(); toast('Sell functionality coming soon!'); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"><ArrowDownRight size={14} /> Sell</button>
              <div className="h-px bg-slate-700 my-1"></div>
              <button onClick={(e) => { e.stopPropagation(); removeSymbol(currentWatchlistId, symbol); }} className="w-full text-left px-4 py-2 text-sm text-slate-400 hover:bg-red-500/20 hover:text-red-400 flex items-center gap-2"><Trash2 size={14} /> Remove</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Watchlist() {
  const [watchlists, setWatchlists] = useState<WatchlistType[]>([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState<string | null>(null);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCompact, setIsCompact] = useState(() => localStorage.getItem('watchlistCompact') === 'true');
  
  const { stocks: livePrices, subscribe, unsubscribe } = useMarketStore();
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchWatchlists(); }, []);

  useEffect(() => {
    localStorage.setItem('watchlistCompact', isCompact.toString());
  }, [isCompact]);

  useEffect(() => {
    if (watchlists.length > 0) {
      const allSymbols = Array.from(new Set(watchlists.flatMap(w => w.symbols.map(s => s.symbol))));
      if (allSymbols.length > 0) subscribe(allSymbols);
      return () => { if (allSymbols.length > 0) unsubscribe(allSymbols); };
    }
  }, [watchlists, subscribe, unsubscribe]);

  const fetchWatchlists = async () => {
    try {
      const { data } = await api.get('/watchlists');
      setWatchlists(data);
      if (data.length > 0 && !selectedWatchlist) setSelectedWatchlist(data[0].id);
    } catch (error) { toast.error('Failed to fetch watchlists'); }
    finally { setLoading(false); }
  };

  const createWatchlist = async () => {
    if (!newWatchlistName.trim()) return;
    try {
      await api.post('/watchlists', { name: newWatchlistName });
      setNewWatchlistName(''); fetchWatchlists(); toast.success('Watchlist created');
    } catch (error) { toast.error('Failed to create watchlist'); }
  };

  const addSymbol = async () => {
    if (!selectedWatchlist || !newSymbol.trim()) return;
    try {
      await api.post(`/watchlists/${selectedWatchlist}/symbols`, { symbol: newSymbol.toUpperCase() });
      setNewSymbol(''); fetchWatchlists(); toast.success('Symbol added');
    } catch (error) { toast.error('Failed to add symbol'); }
  };

  const removeSymbol = async (wid: string, symbol: string) => {
    try {
      await api.delete(`/watchlists/${wid}/symbols/${symbol}`);
      setWatchlists(prev => prev.map(w => w.id === wid ? { ...w, symbols: w.symbols.filter(s => s.symbol !== symbol) } : w));
      toast.success('Symbol removed');
    } catch (error) { toast.error('Failed to remove symbol'); }
  };

  const deleteWatchlist = async (id: string) => {
    try {
      await api.delete(`/watchlists/${id}`);
      if (selectedWatchlist === id) setSelectedWatchlist(watchlists.length > 1 ? watchlists[0].id : null);
      fetchWatchlists();
      toast.success('Watchlist deleted');
    } catch (error) { toast.error('Failed to delete watchlist'); }
  };

  const currentWatchlist = watchlists.find(w => w.id === selectedWatchlist);
  const filteredSymbols = useMemo(() => {
    if (!currentWatchlist) return [];
    return currentWatchlist.symbols.filter(s => s.symbol.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [currentWatchlist, searchQuery]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id && currentWatchlist) {
      const oldIndex = currentWatchlist.symbols.findIndex(s => s.symbol === active.id);
      const newIndex = currentWatchlist.symbols.findIndex(s => s.symbol === over?.id);
      const newSymbols = arrayMove(currentWatchlist.symbols, oldIndex, newIndex);
      
      setWatchlists(prev => prev.map(w => w.id === currentWatchlist.id ? { ...w, symbols: newSymbols } : w));
      // In a real app, you would sync this order to the backend here
    }
  };

  const rowVirtualizer = useVirtualizer({
    count: filteredSymbols.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => isCompact ? 48 : 64,
    overscan: 10,
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" /></div>;

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-up max-w-6xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <RefreshCw size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Market Watch</h1>
            <p className="text-sm text-slate-400">Real-time WebSocket streaming</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input type="text" value={newWatchlistName} onChange={(e) => setNewWatchlistName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && createWatchlist()} className="pl-4 pr-10 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-56 backdrop-blur-sm transition-all" placeholder="New watchlist name..." />
            <button onClick={createWatchlist} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white transition-colors"><Plus size={14} /></button>
          </div>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-160px)]">
        {/* Sidebar */}
        <div className="w-64 flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Your Lists</h3>
          <div className="space-y-1 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {watchlists.map(w => (
              <div key={w.id} onClick={() => setSelectedWatchlist(w.id)} className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${selectedWatchlist === w.id ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-slate-800/30 border border-transparent text-slate-300 hover:bg-slate-800/50 hover:border-slate-700/50'}`}>
                <div className="flex items-center gap-3">
                  <Star size={14} className={selectedWatchlist === w.id ? 'text-indigo-400' : 'text-slate-500'} />
                  <span className="text-sm font-medium truncate">{w.name}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteWatchlist(w.id); }} className="text-slate-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-900/50 rounded-3xl border border-slate-800/50 backdrop-blur-xl overflow-hidden shadow-2xl">
          {currentWatchlist ? (
            <>
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-800/50 flex items-center justify-between gap-4 bg-slate-800/20">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" placeholder="Search instruments..." />
                  </div>
                  <div className="h-6 w-px bg-slate-700/50"></div>
                  <div className="flex items-center gap-2">
                    <input type="text" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addSymbol()} className="pl-4 pr-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-48 transition-all" placeholder="e.g., RELIANCE" />
                    <button onClick={addSymbol} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/20">Add</button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                  <button onClick={() => setIsCompact(false)} className={`p-2 rounded-lg transition-colors ${!isCompact ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`} title="Comfortable View"><LayoutList size={16} /></button>
                  <button onClick={() => setIsCompact(true)} className={`p-2 rounded-lg transition-colors ${isCompact ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`} title="Compact View"><LayoutGrid size={16} /></button>
                </div>
              </div>

              {/* List Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50 bg-slate-800/10 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <div className="flex-1 pl-8">Instrument</div>
                <div className="flex-1 flex justify-end gap-6 pr-10">
                  <div className="text-right w-24">Price</div>
                  <div className="text-right w-20">Change</div>
                </div>
              </div>

              {/* Virtualized List Container */}
              <div ref={parentRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
                {filteredSymbols.length > 0 ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                      <SortableContext items={filteredSymbols.map(s => s.symbol)} strategy={verticalListSortingStrategy}>
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                          const s = filteredSymbols[virtualRow.index];
                          const live = livePrices[s.symbol];
                          return (
                            <SortableRow
                              key={s.symbol}
                              symbol={s.symbol}
                              index={virtualRow.index}
                              style={{
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`
                              }}
                              s={s}
                              live={live}
                              isCompact={isCompact}
                              removeSymbol={removeSymbol}
                              currentWatchlistId={currentWatchlist.id}
                            />
                          );
                        })}
                      </SortableContext>
                    </div>
                  </DndContext>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <Search size={48} className="mb-4 text-slate-600" />
                    <p>No instruments found in this watchlist.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                <Activity size={32} className="text-indigo-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">No Watchlist Selected</h2>
              <p className="text-slate-400 max-w-md">Create a new watchlist or select one from the sidebar to start tracking your favorite instruments in real-time.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
