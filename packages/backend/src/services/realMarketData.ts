import axios from 'axios';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || 'demo';
const BASE_URL = 'https://finnhub.io/api/v1';

function getHeaders(): Record<string, string> {
  return { 'X-Finnhub-Token': FINNHUB_KEY };
}

export async function getRealStockQuote(symbol: string): Promise<any> {
  try {
    const { data } = await axios.get(`${BASE_URL}/quote`, {
      params: { symbol },
      headers: getHeaders(),
    });

    if (!data || data.c === 0 || !data.c) {
      return null;
    }

    return {
      symbol: symbol.toUpperCase(),
      price: data.c,
      change: data.c - (data.o || data.c),
      changePercent: data.o && data.o > 0 ? ((data.c - data.o) / data.o) * 100 : 0,
      high: data.h || data.c,
      low: data.l || data.c,
      open: data.o || data.c,
      volume: data.v || 0,
      previousClose: data.pc || data.c,
      fiftyTwoWeekHigh: data.h || data.c,
      fiftyTwoWeekLow: data.l || data.c,
      name: symbol,
      source: 'finnhub',
    };
  } catch (error) {
    return null;
  }
}

export async function searchStocks(query: string): Promise<any[]> {
  try {
    const { data } = await axios.get(`${BASE_URL}/search`, {
      params: { q: query, token: FINNHUB_KEY },
    });

    const suggestions = data.result || [];
    return suggestions
      .filter((s: any) => s.type === 'Common Stock' || s.type === 'ETF' || s.type === 'Index')
      .slice(0, 10)
      .map((s: any) => ({
        symbol: s.symbol || s.ticker,
        name: s.description || s.name || s.symbol,
        type: s.type || 'Stock',
        exchange: s.exchange || 'US',
      }));
  } catch (error) {
    return [];
  }
}

export async function getHistoricalCandles(symbol: string, resolution: string = 'D', days: number = 90): Promise<any[]> {
  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - (days * 24 * 60 * 60);

    const { data } = await axios.get(`${BASE_URL}/stock/candle`, {
      params: {
        symbol,
        resolution,
        from,
        to,
        token: FINNHUB_KEY,
      },
    });

    if (!data || !data.c || data.c.length === 0) {
      return [];
    }

    return data.c.map((close: number, i: number) => ({
      date: new Date(data.t[i] * 1000).toISOString().split('T')[0],
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close,
      volume: data.v[i],
    }));
  } catch (error) {
    return [];
  }
}

export async function getMultiQuotes(symbols: string[]): Promise<any[]> {
  try {
    const { data } = await axios.get(`${BASE_URL}/quote`, {
      params: { symbol: symbols.join(',') },
      headers: getHeaders(),
    });
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    return [];
  }
}

export async function getMarketNews(symbol?: string): Promise<any[]> {
  try {
    const params: any = { token: FINNHUB_KEY };
    if (symbol) params.symbol = symbol;

    const { data } = await axios.get(`${BASE_URL}/news`, { params });
    return (data || []).map((item: any) => ({
      id: String(item.id || Date.now()),
      title: item.headline || '',
      content: item.summary || '',
      source: item.source || 'Finnhub',
      url: item.url || '',
      sentiment: item.category === 'positive' ? 0.7 : item.category === 'negative' ? -0.7 : 0,
      sentimentLabel: item.category || 'neutral',
      symbols: [symbol || ''],
      publishedAt: new Date(item.datetime * 1000).toISOString(),
      createdAt: new Date(item.datetime * 1000).toISOString(),
    }));
  } catch (error) {
    return [];
  }
}
