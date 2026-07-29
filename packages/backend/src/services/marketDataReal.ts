import prisma from '../config/prisma';
import { getRealStockQuote, searchStocks, getHistoricalCandles, getMultiQuotes, getMarketNews } from './realMarketData';

const FALLBACK_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking' },
  { symbol: 'INFY', name: 'Infosys', sector: 'IT' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking' },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking' },
  { symbol: 'ITC', name: 'ITC Limited', sector: 'Consumer' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Banking' },
  { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Infrastructure' },
  { symbol: 'WIPRO', name: 'Wipro Limited', sector: 'IT' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', sector: 'Automotive' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharma', sector: 'Healthcare' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Automotive' },
  { symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Banking' },
];

export async function fetchStockFromAPI(symbol: string): Promise<any> {
  try {
    const quote = await getRealStockQuote(symbol);
    if (quote) {
      return quote;
    }
  } catch {
    // Fall through to mock
  }
  return null;
}

export async function fetchAllStocks(): Promise<any[]> {
  const results = await Promise.allSettled(
    FALLBACK_STOCKS.map(s => getRealStockQuote(s.symbol))
  );

  const stocks: any[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const fallback = FALLBACK_STOCKS[i];

    if (result.status === 'fulfilled' && result.value) {
      stocks.push(result.value);
    } else {
      stocks.push({
        symbol: fallback.symbol,
        name: fallback.name,
        sector: fallback.sector,
        price: 100 + Math.random() * 100,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        high: 110 + Math.random() * 10,
        low: 90 + Math.random() * 10,
        volume: Math.floor(Math.random() * 10000000),
        fiftyTwoWeekHigh: 120 + Math.random() * 200,
        fiftyTwoWeekLow: 80 + Math.random() * 100,
        source: 'mock-fallback',
      });
    }
  }

  return stocks;
}

export async function searchStocksReal(query: string): Promise<any[]> {
  const results = await searchStocks(query);
  if (results.length > 0) {
    return results;
  }
  // Fallback: search in our known stocks
  return FALLBACK_STOCKS.filter(s =>
    s.symbol.toLowerCase().includes(query.toLowerCase()) ||
    s.name.toLowerCase().includes(query.toLowerCase())
  ).map(s => ({ symbol: s.symbol, name: s.name, type: 'Common Stock', exchange: 'BSE/NSE' }));
}

export async function getHistoricalDataReal(symbol: string, days: number = 90): Promise<any[]> {
  const candles = await getHistoricalCandles(symbol, 'D', days);
  if (candles.length > 0) return candles;
  return [];
}

export async function fetchMarketNews(symbol?: string): Promise<any[]> {
  const news = await getMarketNews(symbol);
  if (news.length > 0) return news;
  return [];
}
