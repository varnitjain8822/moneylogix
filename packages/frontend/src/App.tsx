import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Watchlist from './pages/Watchlist';
import Portfolio from './pages/Portfolio';
import PositionDoctor from './pages/PositionDoctor';
import TradeAnalyzer from './pages/TradeAnalyzer';
import StrategyBuilder from './pages/StrategyBuilder';
import AIAdvisor from './pages/AIAdvisor';
import Research from './pages/Research';
import News from './pages/News';
import PaperTrading from './pages/PaperTrading';
import Backtesting from './pages/Backtesting';
import StockDetail from './pages/StockDetail';
import PerformanceDashboard from './pages/PerformanceDashboard';
import TradeHistory from './pages/TradeHistory';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="watchlist" element={<Watchlist />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="position-doctor" element={<PositionDoctor />} />
          <Route path="trade-analyzer" element={<TradeAnalyzer />} />
          <Route path="strategy-builder" element={<StrategyBuilder />} />
          <Route path="ai-advisor" element={<AIAdvisor />} />
          <Route path="research" element={<Research />} />
          <Route path="news" element={<News />} />
          <Route path="paper-trading" element={<PaperTrading />} />
          <Route path="stock/:symbol" element={<StockDetail />} />
          <Route path="performance" element={<PerformanceDashboard />} />
          <Route path="trade-history" element={<TradeHistory />} />
          <Route path="backtesting" element={<Backtesting />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
