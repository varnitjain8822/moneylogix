import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  LayoutDashboard,
  ListChecks,
  PieChart,
  Activity,
  BarChart3,
  Network,
  Bot,
  Search,
  Newspaper,
  Gamepad2,
  TrendingUp,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Award,
  History,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useMarketStore } from '../../stores/marketStore';

function GlobalPnlWidget() {
  const [paperSummary, setPaperSummary] = useState<any>(null);
  const { stocks: livePrices } = useMarketStore();

  useEffect(() => {
    api.get('/paper/summary').then(res => {
      setPaperSummary(res.data);
    }).catch(() => {});
  }, []);

  const liveStats = useMemo(() => {
    if (!paperSummary || !paperSummary.positions) return { totalPnl: 0, percent: 0 };
    let currentPositionsValue = 0;
    let totalInvested = 0;
    
    paperSummary.positions.forEach((p: any) => {
      const currentPrice = livePrices[p.symbol]?.price || p.avgPrice || 0;
      currentPositionsValue += currentPrice * p.quantity;
      totalInvested += (p.avgPrice || 0) * p.quantity;
    });
    
    const totalPnl = currentPositionsValue - totalInvested;
    const percent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    return { totalPnl, percent };
  }, [paperSummary, livePrices]);

  if (!paperSummary || paperSummary.positions?.length === 0) return null;

  return (
    <div className="glass-card p-3 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-white/5">
      <div className="flex items-center gap-2 mb-1">
        <Activity size={12} className={liveStats.totalPnl >= 0 ? "text-green-400" : "text-red-400"} />
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Global P&L</span>
      </div>
      <div className="flex items-end justify-between">
        <p className={`text-sm font-bold font-mono ${liveStats.totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
          {liveStats.totalPnl >= 0 ? '+' : ''}₹{liveStats.totalPnl.toFixed(0)}
        </p>
        <p className={`text-[10px] font-medium ${liveStats.totalPnl >= 0 ? "text-green-400/70" : "text-red-400/70"}`}>
          {liveStats.totalPnl >= 0 ? '+' : ''}{liveStats.percent.toFixed(2)}%
        </p>
      </div>
    </div>
  );
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/watchlist', label: 'Watchlist', icon: ListChecks },
  { path: '/portfolio', label: 'Portfolio', icon: PieChart },
  { path: '/position-doctor', label: 'Position Doctor', icon: Activity },
  { path: '/trade-analyzer', label: 'Trade Analyzer', icon: BarChart3 },
  { path: '/strategy-builder', label: 'Strategy Builder', icon: Network },
  { path: '/ai-advisor', label: 'AI Advisor', icon: Bot },
  { path: '/research', label: 'Research', icon: Search },
  { path: '/news', label: 'News & Sentiment', icon: Newspaper },
  { path: '/paper-trading', label: 'Paper Trading', icon: Gamepad2 },
  { path: '/performance', label: 'Performance', icon: TrendingUp },
  { path: '/trade-history', label: 'Trade History', icon: History },
  { path: '/backtesting', label: 'Backtesting', icon: Award },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-grid noise-overlay">
      {/* Sidebar */}
      <aside
        className={`relative flex flex-col border-r transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
        style={{
          background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,14,26,0.98) 100%)',
          borderColor: 'var(--border-color)',
        }}
      >
        {/* Logo */}
        <div className={`p-5 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                MoneyLogix
              </h1>
              <p className="text-[10px] text-slate-500 -mt-0.5">AI Trading Platform</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/15 to-purple-500/10 text-blue-400 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={19} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-10"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* User */}
        <div className={`p-4 border-t ${collapsed ? 'px-3' : ''}`} style={{ borderColor: 'var(--border-color)' }}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>

        {/* Global Live P&L */}
        {!collapsed && (
          <div className="px-4 pb-4 mt-auto">
            <GlobalPnlWidget />
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-glow">
        <div className="relative z-10 p-6 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
