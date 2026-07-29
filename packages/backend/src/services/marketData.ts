// Mock market data for development
const mockStocks: Record<string, { price: number; change: number; changePercent: number; high: number; low: number; volume: number; fiftyTwoWeekHigh: number; fiftyTwoWeekLow: number }> = {
  'RELIANCE.NS': { price: 2450.50, change: 25.30, changePercent: 1.04, high: 2465.00, low: 2420.00, volume: 1500000, fiftyTwoWeekHigh: 2850.00, fiftyTwoWeekLow: 2180.00 },
  'TCS.NS': { price: 3890.75, change: -15.20, changePercent: -0.39, high: 3920.00, low: 3875.00, volume: 800000, fiftyTwoWeekHigh: 4250.00, fiftyTwoWeekLow: 3200.00 },
  'HDFCBANK.NS': { price: 1675.30, change: 12.45, changePercent: 0.75, high: 1685.00, low: 1660.00, volume: 2000000, fiftyTwoWeekHigh: 1790.00, fiftyTwoWeekLow: 1450.00 },
  'INFY.NS': { price: 1520.80, change: -8.50, changePercent: -0.56, high: 1535.00, low: 1510.00, volume: 1200000, fiftyTwoWeekHigh: 1680.00, fiftyTwoWeekLow: 1250.00 },
  'ICICIBANK.NS': { price: 1125.45, change: 18.90, changePercent: 1.71, high: 1135.00, low: 1105.00, volume: 1800000, fiftyTwoWeekHigh: 1260.00, fiftyTwoWeekLow: 950.00 },
  'SBIN.NS': { price: 785.20, change: 5.60, changePercent: 0.72, high: 792.00, low: 778.00, volume: 3000000, fiftyTwoWeekHigh: 910.00, fiftyTwoWeekLow: 555.00 },
  'ITC.NS': { price: 438.90, change: -2.15, changePercent: -0.49, high: 442.00, low: 436.00, volume: 5000000, fiftyTwoWeekHigh: 500.00, fiftyTwoWeekLow: 390.00 },
  'BHARTIARTL.NS': { price: 1345.60, change: 22.80, changePercent: 1.72, high: 1355.00, low: 1320.00, volume: 900000, fiftyTwoWeekHigh: 1580.00, fiftyTwoWeekLow: 1080.00 },
  'KOTAKBANK.NS': { price: 1780.25, change: -5.30, changePercent: -0.30, high: 1795.00, low: 1770.00, volume: 700000, fiftyTwoWeekHigh: 1950.00, fiftyTwoWeekLow: 1600.00 },
  'LT.NS': { price: 3450.80, change: 35.40, changePercent: 1.04, high: 3480.00, low: 3420.00, volume: 600000, fiftyTwoWeekHigh: 3950.00, fiftyTwoWeekLow: 2900.00 },
  'WIPRO.NS': { price: 445.30, change: -3.20, changePercent: -0.71, high: 450.00, low: 442.00, volume: 1500000, fiftyTwoWeekHigh: 550.00, fiftyTwoWeekLow: 380.00 },
  'TATAMOTORS.NS': { price: 985.40, change: 12.60, changePercent: 1.30, high: 995.00, low: 970.00, volume: 2500000, fiftyTwoWeekHigh: 1180.00, fiftyTwoWeekLow: 620.00 },
  'SUNPHARMA.NS': { price: 1620.75, change: 8.90, changePercent: 0.55, high: 1635.00, low: 1608.00, volume: 800000, fiftyTwoWeekHigh: 1750.00, fiftyTwoWeekLow: 1200.00 },
  'MARUTI.NS': { price: 12450.60, change: 125.40, changePercent: 1.02, high: 12550.00, low: 12300.00, volume: 300000, fiftyTwoWeekHigh: 13600.00, fiftyTwoWeekLow: 9800.00 },
  'AXISBANK.NS': { price: 1180.90, change: 15.30, changePercent: 1.31, high: 1195.00, low: 1165.00, volume: 1100000, fiftyTwoWeekHigh: 1340.00, fiftyTwoWeekLow: 920.00 },
};

// Hydrate mockStocks with real prices initially and every 60 seconds
setTimeout(async () => {
  const { fetchAllStocks } = await import('./marketDataReal');
  const hydrate = async () => {
    try {
      const realStocks = await fetchAllStocks();
      realStocks.forEach(stock => {
        if (stock && stock.symbol && mockStocks[stock.symbol]) {
          mockStocks[stock.symbol] = {
            ...mockStocks[stock.symbol],
            price: stock.price,
            change: stock.change,
            changePercent: stock.changePercent,
            high: stock.high,
            low: stock.low,
            volume: stock.volume,
            fiftyTwoWeekHigh: stock.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: stock.fiftyTwoWeekLow
          };
        }
      });
    } catch (e) {
      console.error('Failed to hydrate real stocks', e);
    }
  };
  hydrate();
  setInterval(hydrate, 60000);
}, 1000);

export const getStockPrice = (symbol: string) => {
  return mockStocks[symbol] || { price: 0, change: 0, changePercent: 0, high: 0, low: 0, volume: 0, fiftyTwoWeekHigh: 0, fiftyTwoWeekLow: 0 };
};

export const getAllStocks = () => {
  return Object.entries(mockStocks).map(([symbol, data]) => ({ symbol, ...data }));
};

export const getMarketIndices = () => {
  return [
    { name: 'NIFTY 50', value: 24500.80, change: 125.40, changePercent: 0.51 },
    { name: 'SENSEX', value: 81200.50, change: 420.30, changePercent: 0.52 },
    { name: 'NIFTY BANK', value: 51200.25, change: -85.60, changePercent: -0.17 },
  ];
};

export const simulatePriceUpdate = (symbol: string) => {
  const stock = mockStocks[symbol];
  if (!stock) return null;

  const change = (Math.random() - 0.5) * stock.price * 0.002;
  stock.price = Math.max(1, stock.price + change);
  stock.change = stock.change + change;
  stock.changePercent = (stock.change / (stock.price - stock.change)) * 100;

  return { symbol, ...stock };
};

// ─── Historical Data Generator ───────────────────────────
export interface HistoricalBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  sma20: number[];
  sma50: number[];
  ema12: number[];
  ema26: number[];
  macd: number[];
  macdSignal: number[];
  rsi: number[];
  bollingerUpper: number[];
  bollingerLower: number[];
  atr: number[];
  obv: number[];
  stochasticK: number[];
  stochasticD: number[];
  vwap: number[];
}

export interface StockHistoryData {
  symbol: string;
  bars: HistoricalBar[];
  indicators: TechnicalIndicators;
  summary: {
    totalReturn: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    avgVolume: number;
    betaEstimate: number;
    supportLevel: number;
    resistanceLevel: number;
  };
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}

function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  let ema = data[0];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema = data[0];
    } else {
      ema = data[i] * k + ema * (1 - k);
    }
    result.push(ema);
  }
  return result;
}

function calculateRSI(closes: number[], period: number = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      result.push(50);
    } else {
      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

function calculateBollingerBands(closes: number[], period: number = 20, stdDev: number = 2): { upper: number[]; lower: number[] } {
  const sma = calculateSMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }
  return { upper, lower };
}

function calculateATR(bars: HistoricalBar[], period: number = 14): number[] {
  const trs: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) {
      trs.push(bars[i].high - bars[i].low);
    } else {
      const tr = Math.max(
        bars[i].high - bars[i].low,
        Math.abs(bars[i].high - bars[i - 1].close),
        Math.abs(bars[i].low - bars[i - 1].close)
      );
      trs.push(tr);
    }
  }
  return calculateSMA(trs, period);
}

function calculateOBV(bars: HistoricalBar[]): number[] {
  const result: number[] = [0];
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].close > bars[i - 1].close) {
      result.push(result[i - 1] + bars[i].volume);
    } else if (bars[i].close < bars[i - 1].close) {
      result.push(result[i - 1] - bars[i].volume);
    } else {
      result.push(result[i - 1]);
    }
  }
  return result;
}

function calculateStochastic(bars: HistoricalBar[], kPeriod: number = 14, dPeriod: number = 3): { k: number[]; d: number[] } {
  const kValues: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < kPeriod - 1) {
      kValues.push(50);
    } else {
      const slice = bars.slice(i - kPeriod + 1, i + 1);
      const high = Math.max(...slice.map(b => b.high));
      const low = Math.min(...slice.map(b => b.low));
      const k = high === low ? 50 : ((bars[i].close - low) / (high - low)) * 100;
      kValues.push(k);
    }
  }
  const dValues = calculateSMA(kValues, dPeriod);
  return { k: kValues, d: dValues };
}

function calculateVWAP(bars: HistoricalBar[]): number[] {
  let cumVol = 0;
  let cumTP = 0;
  return bars.map(bar => {
    const tp = (bar.high + bar.low + bar.close) / 3;
    cumVol += bar.volume;
    cumTP += tp * bar.volume;
    return cumVol > 0 ? cumTP / cumVol : tp;
  });
}

export function getHistoricalData(symbol: string, days: number = 90): StockHistoryData | null {
  const stock = mockStocks[symbol];
  if (!stock) return null;

  const rand = seededRandom(symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + days);
  const bars: HistoricalBar[] = [];
  const now = new Date();

  // Start from 52-week low area and work up with realistic price path
  const startPrice = stock.fiftyTwoWeekLow + (stock.price - stock.fiftyTwoWeekLow) * 0.3;
  let price = startPrice;
  const trend = (stock.price - startPrice) / days;
  const dailyVol = (stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow) / stock.fiftyTwoWeekLow * 0.015;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue; // Skip weekends

    const dailyReturn = trend / days + (rand() - 0.48) * dailyVol;
    price = Math.max(stock.fiftyTwoWeekLow * 0.95, Math.min(stock.fiftyTwoWeekHigh * 1.05, price * (1 + dailyReturn)));

    const dayHigh = price * (1 + rand() * 0.025);
    const dayLow = price * (1 - rand() * 0.025);
    const dayOpen = price * (1 + (rand() - 0.5) * 0.015);
    const volume = Math.floor(stock.volume * (0.5 + rand() * 1.5));

    bars.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(dayOpen * 100) / 100,
      high: Math.round(dayHigh * 100) / 100,
      low: Math.round(dayLow * 100) / 100,
      close: Math.round(price * 100) / 100,
      volume,
    });
  }

  const closes = bars.map(b => b.close);

  // Calculate all technical indicators
  const indicators: TechnicalIndicators = {
    sma20: calculateSMA(closes, 20),
    sma50: calculateSMA(closes, 50),
    ema12: calculateEMA(closes, 12),
    ema26: calculateEMA(closes, 26),
    macd: [],
    macdSignal: [],
    rsi: calculateRSI(closes, 14),
    bollingerUpper: [],
    bollingerLower: [],
    atr: calculateATR(bars, 14),
    obv: calculateOBV(bars),
    stochasticK: [],
    stochasticD: [],
    vwap: calculateVWAP(bars),
  };

  // MACD = EMA12 - EMA26
  indicators.macd = indicators.ema12.map((v, i) => v - indicators.ema26[i]);
  indicators.macdSignal = calculateSMA(indicators.macd, 9);

  // Bollinger Bands
  const bb = calculateBollingerBands(closes, 20, 2);
  indicators.bollingerUpper = bb.upper;
  indicators.bollingerLower = bb.lower;

  // Stochastic
  const stoch = calculateStochastic(bars, 14, 3);
  indicators.stochasticK = stoch.k;
  indicators.stochasticD = stoch.d;

  // Summary statistics
  const totalReturn = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;
  const returns = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
  const volatility = stdDev * Math.sqrt(252) * 100;
  const sharpeRatio = stdDev > 0 ? (avgReturn * 252) / (stdDev * Math.sqrt(252)) : 0;

  // Max drawdown
  let peak = closes[0];
  let maxDrawdown = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = (peak - c) / peak * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Support/Resistance
  const sortedCloses = [...closes].sort((a, b) => a - b);
  const supportLevel = sortedCloses[Math.floor(closes.length * 0.1)];
  const resistanceLevel = sortedCloses[Math.floor(closes.length * 0.9)];

  const avgVolume = bars.reduce((sum, b) => sum + b.volume, 0) / bars.length;

  return {
    symbol,
    bars,
    indicators,
    summary: {
      totalReturn: Math.round(totalReturn * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      avgVolume: Math.round(avgVolume),
      betaEstimate: Math.round((0.8 + rand() * 0.6) * 100) / 100,
      supportLevel: Math.round(supportLevel * 100) / 100,
      resistanceLevel: Math.round(resistanceLevel * 100) / 100,
    },
  };
}

// ─── Real API Integration ───────────────────────────
export async function getStockQuoteReal(symbol: string) {
  const { fetchStockFromAPI } = await import('./marketDataReal');
  return fetchStockFromAPI(symbol);
}

export async function getAllStocksReal(): Promise<any[]> {
  const { fetchAllStocks } = await import('./marketDataReal');
  return fetchAllStocks();
}

export async function searchStocks(query: string): Promise<any[]> {
  const { searchStocksReal } = await import('./marketDataReal');
  return searchStocksReal(query);
}

export async function getHistoricalCandles(symbol: string, days: number = 90): Promise<any[]> {
  const { getHistoricalDataReal } = await import('./marketDataReal');
  return getHistoricalDataReal(symbol, days);
}

export async function getNews(symbol?: string): Promise<any[]> {
  const { fetchMarketNews } = await import('./marketDataReal');
  return fetchMarketNews(symbol);
}
