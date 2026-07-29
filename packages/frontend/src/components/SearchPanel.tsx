import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Search, X, Loader2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SearchPanel({ onSelect }: { onSelect?: (stock: any) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) { setResults([]); return; }
      setLoading(true);
      try {
        const { data } = await api.get('/market/search', { params: { q: query } });
        setResults(data || []);
      } catch { toast.error('Search failed'); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={panelRef} className="relative flex-shrink-0">
      <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10 focus-within:border-blue-500/50 transition-colors">
        <Search size={16} className="text-slate-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search stocks..."
          className="bg-transparent text-sm text-white placeholder-slate-500 outline-none flex-1 min-w-[120px]"
        />
        {loading && <Loader2 size={14} className="animate-spin text-blue-400" />}
        {query && !loading && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus(); }} className="text-slate-400 hover:text-white transition-colors">
            <X size={14} />
          </button>
        )}
      </div>
      {open && (query || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 glass-card p-2 z-50 max-h-80 overflow-y-auto animate-fade-up">
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.slice(0, 8).map((stock: any, i: number) => (
                <button
                  key={i}
                  onClick={() => {
                    if (onSelect) onSelect(stock);
                    setQuery('');
                    setResults([]);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-white text-sm">{stock.symbol}</span>
                    <span className="text-xs text-slate-400">{stock.name || ''}</span>
                    {stock.exchange && <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{stock.exchange}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{stock.type || 'Stock'}</span>
                    <ChevronRight size={12} className="text-slate-500" />
                  </div>
                </button>
              ))}
            </div>
          ) : query && !loading ? (
            <div className="p-4 text-center text-slate-400 text-sm">No stocks found for "{query}"</div>
          ) : !query ? (
            <div className="p-4 text-center text-slate-500 text-sm">Type to search stocks, ETFs, indices...</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
