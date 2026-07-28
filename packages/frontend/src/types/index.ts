export interface Stock {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

export interface Watchlist {
  id: string;
  name: string;
  symbols: (WatchlistSymbol & Stock)[];
}

export interface WatchlistSymbol {
  id: string;
  symbol: string;
  addedAt: string;
}

export interface Portfolio {
  id: string;
  name: string;
  holdings: Holding[];
}

export interface Holding {
  id: string;
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  sector?: string;
  assetClass?: string;
}

export interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  status: string;
  createdAt: string;
}

export interface PositionHealth {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  healthScore: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  recommendations: string[];
}

export interface Strategy {
  id: string;
  name: string;
  description?: string;
  rules: any;
  riskAppetite: string;
  status: string;
}

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content?: string;
  source: string;
  url: string;
  sentiment?: number;
  sentimentLabel?: string;
  symbols: string[];
  publishedAt: string;
}
