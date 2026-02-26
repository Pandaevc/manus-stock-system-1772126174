/**
 * Stock Data Service
 * Mock data service for demo (can be replaced with real APIs)
 */

export interface DailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount?: number;
}

export interface StockQuote {
  code: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
  marketCap: number;
  turnover: number;
}

export interface HotStock {
  code: string;
  name: string;
  price: number;
  changePct: number;
  marketCap: number;
}

export interface HotSector {
  name: string;
  changePct: number;
  limitUpCount: number;
  limitDownCount: number;
}

// Simple cache
const priceCache = new Map<string, { data: StockQuote; expiry: number }>();
const klineCache = new Map<string, { data: DailyBar[]; expiry: number }>();

const CACHE_TTL = 60 * 1000;

function setCache(key: string, data: any) {
  priceCache.set(key, { data, expiry: Date.now() + CACHE_TTL });
  klineCache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

function getCache(key: string): any | null {
  const cached = priceCache.get(key) || klineCache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  return null;
}

// Mock data for demo
const MOCK_STOCKS: HotStock[] = [
  { code: '600000', name: '浦发银行', price: 10.5, changePct: 1.2, marketCap: 300000000000 },
  { code: '600519', name: '贵州茅台', price: 1850, changePct: -0.5, marketCap: 2300000000000 },
  { code: '000001', name: '平安银行', price: 15.2, changePct: 0.8, marketCap: 280000000000 },
  { code: '000858', name: '五粮液', price: 168, changePct: 2.1, marketCap: 650000000000 },
  { code: '300750', name: '宁德时代', price: 520, changePct: 3.5, marketCap: 1200000000000 },
  { code: '002594', name: '比亚迪', price: 268, changePct: 1.8, marketCap: 780000000000 },
  { code: '601318', name: '中国平安', price: 52, changePct: -0.3, marketCap: 950000000000 },
  { code: '600036', name: '招商银行', price: 42.5, changePct: 0.5, marketCap: 1100000000000 },
  { code: '000333', name: '美的集团', price: 72, changePct: 1.2, marketCap: 510000000000 },
  { code: '600900', name: '长江电力', price: 23.5, changePct: 0.2, marketCap: 540000000000 },
  { code: '601888', name: '中国中免', price: 215, changePct: -1.2, marketCap: 420000000000 },
  { code: '002475', name: '立讯精密', price: 38, changePct: 2.8, marketCap: 270000000000 },
  { code: '300059', name: '东方财富', price: 28.5, changePct: 1.5, marketCap: 300000000000 },
  { code: '600276', name: '恒瑞医药', price: 52.8, changePct: -0.8, marketCap: 340000000000 },
  { code: '000002', name: '万科A', price: 11.2, changePct: 0.9, marketCap: 130000000000 },
];

// Generate mock K-line data
function generateMockKline(code: string, days: number): DailyBar[] {
  const basePrice = MOCK_STOCKS.find(s => s.code === code)?.price || 10;
  const bars: DailyBar[] = [];
  
  let price = basePrice * 0.8;
  const today = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    // Random walk
    const change = (Math.random() - 0.48) * 0.05;
    price = price * (1 + change);
    
    const high = price * (1 + Math.random() * 0.03);
    const low = price * (1 - Math.random() * 0.03);
    const open = low + Math.random() * (high - low);
    const volume = Math.floor(10000000 + Math.random() * 50000000);
    
    bars.push({
      date: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close: price,
      volume,
      amount: volume * price,
    });
  }
  
  return bars;
}

/** Fetch real-time quote for a stock */
export async function fetchRealTimeQuote(code: string): Promise<StockQuote | null> {
  const cacheKey = `quote_${code}`;
  const cached = priceCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  
  // Use mock data
  const stock = MOCK_STOCKS.find(s => s.code === code);
  if (stock) {
    const quote: StockQuote = {
      code: stock.code,
      name: stock.name,
      price: stock.price,
      change: stock.price * (stock.changePct / 100),
      changePct: stock.changePct,
      open: stock.price * 0.99,
      high: stock.price * 1.02,
      low: stock.price * 0.98,
      close: stock.price,
      volume: 10000000,
      amount: 10000000 * stock.price,
      marketCap: stock.marketCap,
      turnover: 2.5,
    };
    setCache(cacheKey, quote);
    return quote;
  }
  
  // Generate random quote
  const price = 10 + Math.random() * 100;
  const changePct = (Math.random() - 0.5) * 10;
  const quote: StockQuote = {
    code,
    name: code,
    price,
    change: price * (changePct / 100),
    changePct,
    open: price * 0.99,
    high: price * 1.02,
    low: price * 0.98,
    close: price,
    volume: Math.floor(10000000 + Math.random() * 50000000),
    amount: 0,
    marketCap: 0,
    turnover: 0,
  };
  
  setCache(cacheKey, quote);
  return quote;
}

/** Fetch daily K-line data */
export async function fetchDailyKline(code: string, days: number = 120): Promise<DailyBar[]> {
  const cacheKey = `kline_${code}_${days}`;
  const cached = klineCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  
  // Generate mock data
  const bars = generateMockKline(code, days);
  klineCache.set(cacheKey, { data: bars, expiry: Date.now() + CACHE_TTL });
  return bars;
}

/** Convert DailyBar[] to OHLCV[] for indicator calculations */
export function toOHLCV(bars: DailyBar[]) {
  return bars.map(b => ({
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume,
    amount: b.amount || b.volume * b.close,
  }));
}

/** Fetch hot stocks from East Money (or mock) */
export async function fetchHotStocks(count: number = 200): Promise<HotStock[]> {
  // Return mock data
  return MOCK_STOCKS.slice(0, count);
}

/** Fetch hot sectors from East Money (or mock) */
export async function fetchHotSectors(count: number = 20): Promise<HotSector[]> {
  // Return mock data
  return [
    { name: '新能源车', changePct: 2.5, limitUpCount: 8, limitDownCount: 0 },
    { name: '半导体', changePct: 1.8, limitUpCount: 5, limitDownCount: 1 },
    { name: '医药生物', changePct: -0.5, limitUpCount: 2, limitDownCount: 3 },
    { name: '白酒', changePct: 1.2, limitUpCount: 3, limitDownCount: 0 },
    { name: '银行', changePct: 0.8, limitUpCount: 4, limitDownCount: 1 },
  ].slice(0, count);
}

/** Fetch selection pool (stocks for selection) */
export async function fetchSelectionPool(count: number = 200): Promise<HotStock[]> {
  return fetchHotStocks(count);
}
