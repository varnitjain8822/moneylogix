import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
export async function getRealStockQuote(symbol: string): Promise<any> {
  try {
    let quote;
    try {
      quote = await yahooFinance.quote(symbol);
    } catch (err: any) {
      if (err.name === 'FailedYahooValidationError' && err.result) {
        quote = err.result;
      } else {
        throw err;
      }
    }
    
    if (!quote) return null;

    return {
      symbol: symbol.toUpperCase(),
      price: quote.regularMarketPrice || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      high: quote.regularMarketDayHigh || quote.regularMarketPrice,
      low: quote.regularMarketDayLow || quote.regularMarketPrice,
      open: quote.regularMarketOpen || quote.regularMarketPrice,
      volume: quote.regularMarketVolume || 0,
      previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || quote.regularMarketPrice,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow || quote.regularMarketPrice,
      name: quote.longName || quote.shortName || symbol,
      source: 'yahoo-finance',
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

export async function searchStocks(query: string): Promise<any[]> {
  try {
    const results = await yahooFinance.search(query);
    return results.quotes
      .filter((q: any) => q.isYahooFinance)
      .slice(0, 10)
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        type: q.quoteType || 'Stock',
        exchange: q.exchange || 'US',
      }));
  } catch (error) {
    console.error(`Error searching stocks for ${query}:`, error);
    return [];
  }
}

export async function getHistoricalCandles(symbol: string, resolution: string = 'D', days: number = 90): Promise<any[]> {
  try {
    const queryOptions: any = {
      period1: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      interval: '1d',
    };
    
    const result = await yahooFinance.historical(symbol, queryOptions);
    return result.map((item: any) => ({
      date: item.date.toISOString().split('T')[0],
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }));
  } catch (error) {
    console.error(`Error fetching historical for ${symbol}:`, error);
    return [];
  }
}

export async function getMultiQuotes(symbols: string[]): Promise<any[]> {
  try {
    const processQuotes = (rawQuotes: any) => {
      const quotesArray = Array.isArray(rawQuotes) ? rawQuotes : [rawQuotes];
      return quotesArray.map((quote: any) => {
        if (!quote) return null;
        return {
          symbol: quote.symbol,
          price: quote.regularMarketPrice || 0,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          high: quote.regularMarketDayHigh || quote.regularMarketPrice,
          low: quote.regularMarketDayLow || quote.regularMarketPrice,
          open: quote.regularMarketOpen || quote.regularMarketPrice,
          volume: quote.regularMarketVolume || 0,
          previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
          fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || quote.regularMarketPrice,
          fiftyTwoWeekLow: quote.fiftyTwoWeekLow || quote.regularMarketPrice,
          name: quote.longName || quote.shortName || quote.symbol,
          source: 'yahoo-finance',
        };
      }).filter((q: any) => q !== null);
    };

    let quotes;
    try {
      quotes = await yahooFinance.quote(symbols, {}, { validateResult: false } as any);
    } catch (error: any) {
      if (error.name === 'FailedYahooValidationError' && error.result) {
        quotes = error.result;
      } else if (error.name === 'FailedYahooValidationError') {
        console.warn('Validation error but no result provided. Proceeding with empty quotes.');
        quotes = [];
      } else {
        throw error;
      }
    }
    return processQuotes(quotes);
  } catch (error) {
    console.error('Error fetching multiquotes:', error);
    return [];
  }
}

export async function getMarketNews(symbol?: string): Promise<any[]> {
  try {
    const query = symbol || 'market';
    const result = await yahooFinance.search(query);
    return (result.news || []).map((item: any) => ({
      id: item.uuid || String(Date.now()),
      title: item.title || '',
      content: item.publisher || '',
      source: item.publisher || 'Yahoo Finance',
      url: item.link || '',
      sentiment: 0,
      sentimentLabel: 'neutral',
      symbols: [symbol || ''],
      publishedAt: new Date(item.providerPublishTime * 1000).toISOString(),
      createdAt: new Date(item.providerPublishTime * 1000).toISOString(),
    }));
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
    return [];
  }
}
