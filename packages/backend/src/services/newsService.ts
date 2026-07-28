import prisma from '../config/prisma';

// Mock news data for development
const mockNews = [
  {
    id: '1',
    title: 'Reliance Industries reports strong Q4 results, revenue up 15%',
    content: 'Reliance Industries Limited reported a 15% increase in revenue for Q4 FY24, driven by strong performance in retail and digital segments.',
    source: 'Economic Times',
    url: 'https://economictimes.indiatimes.com',
    sentiment: 0.8,
    sentimentLabel: 'positive',
    symbols: ['RELIANCE'],
    publishedAt: new Date(),
  },
  {
    id: '2',
    title: 'TCS bags $2.5 billion deal from European client',
    content: 'Tata Consultancy Services has secured a $2.5 billion deal with a major European banking group for digital transformation.',
    source: 'Moneycontrol',
    url: 'https://moneycontrol.com',
    sentiment: 0.9,
    sentimentLabel: 'positive',
    symbols: ['TCS'],
    publishedAt: new Date(Date.now() - 3600000),
  },
  {
    id: '3',
    title: 'HDFC Bank faces regulatory scrutiny over digital lending',
    content: 'RBI has raised concerns about HDFC Bank\'s digital lending practices, potentially impacting future growth.',
    source: 'LiveMint',
    url: 'https://livemint.com',
    sentiment: -0.6,
    sentimentLabel: 'negative',
    symbols: ['HDFCBANK'],
    publishedAt: new Date(Date.now() - 7200000),
  },
  {
    id: '4',
    title: 'Nifty hits new all-time high, market sentiment bullish',
    content: 'Indian benchmark indices reached new all-time highs driven by positive global cues and strong domestic macros.',
    source: 'Business Standard',
    url: 'https://business-standard.com',
    sentiment: 0.85,
    sentimentLabel: 'positive',
    symbols: [],
    publishedAt: new Date(Date.now() - 10800000),
  },
  {
    id: '5',
    title: 'IT sector faces headwinds as global tech spending slows',
    content: 'Indian IT companies may face challenges as global technology spending shows signs of slowing down.',
    source: 'CNBC TV18',
    url: 'https://cnbctv18.com',
    sentiment: -0.4,
    sentimentLabel: 'negative',
    symbols: ['TCS', 'INFY', 'WIPRO'],
    publishedAt: new Date(Date.now() - 14400000),
  },
];

export const getNews = async (symbol?: string, limit: number = 20) => {
  let news = mockNews;
  
  if (symbol) {
    news = news.filter(n => n.symbols.includes(symbol.toUpperCase()));
  }
  
  return news.slice(0, limit);
};

export const getSentimentSummary = async (symbol?: string) => {
  const news = await getNews(symbol);
  
  const positive = news.filter(n => n.sentimentLabel === 'positive').length;
  const negative = news.filter(n => n.sentimentLabel === 'negative').length;
  const neutral = news.filter(n => n.sentimentLabel === 'neutral').length;
  
  const avgSentiment = news.length > 0
    ? news.reduce((sum, n) => sum + (n.sentiment || 0), 0) / news.length
    : 0;

  return {
    total: news.length,
    positive,
    negative,
    neutral,
    avgSentiment,
    sentimentTrend: avgSentiment > 0.3 ? 'BULLISH' : avgSentiment < -0.3 ? 'BEARISH' : 'NEUTRAL',
  };
};
