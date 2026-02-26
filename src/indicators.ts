/**
 * Technical Indicators Calculation Engine
 * Implements all indicators required by the stock selection system:
 * MA, EMA, SMA (weighted), KDJ, CCI, MACD, RSV, SLOPE, WINNER/COST approximation
 */

export interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
}

// ============ Basic Helpers ============

/** Lowest value in array over period ending at index i */
export function LLV(arr: number[], period: number, i: number): number {
  const start = Math.max(0, i - period + 1);
  let min = arr[start];
  for (let j = start + 1; j <= i; j++) {
    if (arr[j] < min) min = arr[j];
  }
  return min;
}

/** Highest value in array over period ending at index i */
export function HHV(arr: number[], period: number, i: number): number {
  const start = Math.max(0, i - period + 1);
  let max = arr[start];
  for (let j = start + 1; j <= i; j++) {
    if (arr[j] > max) max = arr[j];
  }
  return max;
}

/** Simple Moving Average */
export function SMA(arr: number[], period: number, i: number): number {
  const start = Math.max(0, i - period + 1);
  let sum = 0;
  for (let j = start; j <= i; j++) {
    sum += arr[j];
  }
  return sum / period;
}

/** Exponential Moving Average */
export function EMA(arr: number[], period: number, i: number): number {
  if (i === 0) return arr[0];
  const k = 2 / (period + 1);
  if (i === period - 1) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += arr[j];
    return sum / period;
  }
  const prevEMA = EMA(arr, period, i - 1);
  return arr[i] * k + prevEMA * (1 - k);
}

/** Weighted Moving Average */
export function WMA(arr: number[], period: number, i: number): number {
  const start = Math.max(0, i - period + 1);
  let sum = 0;
  let weightSum = 0;
  for (let j = start; j <= i; j++) {
    const weight = j - start + 1;
    sum += arr[j] * weight;
    weightSum += weight;
  }
  return sum / weightSum;
}

// ============ Technical Indicators ============

/** Calculate MA (Moving Average) */
export function calcMA(ohlcv: OHLCV[], period: number): number[] {
  const closes = ohlcv.map(d => d.close);
  return closes.map((_, i) => SMA(closes, period, i));
}

/** Calculate EMA */
export function calcEMA(ohlcv: OHLCV[], period: number): number[] {
  const closes = ohlcv.map(d => d.close);
  return closes.map((_, i) => EMA(closes, period, i));
}

/** Calculate KDJ indicator */
export function calcKDJ(ohlcv: OHLCV[]): { K: number[]; D: number[]; J: number[] } {
  const n = 9;
  const m1 = 3;
  const m2 = 3;
  
  const closes = ohlcv.map(d => d.close);
  const highs = ohlcv.map(d => d.high);
  const lows = ohlcv.map(d => d.low);
  
  const rsv: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const h = HHV(highs, n, i);
    const l = LLV(lows, n, i);
    if (h === l) {
      rsv.push(50);
    } else {
      rsv.push((closes[i] - l) / (h - l) * 100);
    }
  }
  
  const K: number[] = [];
  const D: number[] = [];
  const J: number[] = [];
  
  for (let i = 0; i < rsv.length; i++) {
    if (i === 0) {
      K.push(50);
      D.push(50);
    } else {
      K.push((2/3) * K[i-1] + (1/3) * rsv[i]);
      D.push((2/3) * D[i-1] + (1/3) * K[i]);
    }
    J.push(3 * K[i] - 2 * D[i]);
  }
  
  return { K, D, J };
}

/** Calculate CCI (Commodity Channel Index) */
export function calcCCI(ohlcv: OHLCV[]): number[] {
  const period = 14;
  const tp = ohlcv.map(d => (d.high + d.low + d.close) / 3);
  const cci: number[] = [];
  
  for (let i = 0; i < tp.length; i++) {
    if (i < period - 1) {
      cci.push(0);
      continue;
    }
    
    const smaTP = SMA(tp, period, i);
    const meanDev: number[] = [];
    for (let j = i - period + 1; j <= i; j++) {
      meanDev.push(Math.abs(tp[j] - smaTP));
    }
    const avgDev = meanDev.reduce((a, b) => a + b, 0) / period;
    
    if (avgDev === 0) {
      cci.push(0);
    } else {
      cci.push((tp[i] - smaTP) / (0.015 * avgDev));
    }
  }
  
  return cci;
}

/** Calculate MACD */
export function calcMACD(closes: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): { DIF: number[]; DEA: number[]; MACD: number[] } {
  const emaFast = closes.map((_, i) => EMA(closes, fastPeriod, i));
  const emaSlow = closes.map((_, i) => EMA(closes, slowPeriod, i));
  
  const DIF = emaFast.map((f, i) => f - emaSlow[i]);
  
  const DEA = DIF.map((_, i) => EMA(DIF, signalPeriod, i));
  
  const MACD = DIF.map((d, i) => 2 * (d - DEA[i]));
  
  return { DIF, DEA, MACD };
}

/** Calculate RSI */
export function calcRSI(closes: number[], period = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      gains.push(0);
      losses.push(0);
      rsi.push(50);
      continue;
    }
    
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
    
    if (i < period) {
      rsi.push(50);
      continue;
    }
    
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

/** Calculate BOLL (Bollinger Bands) */
export function calcBOLL(ohlcv: OHLCV[], period = 20): { upper: number[]; middle: number[]; lower: number[] } {
  const closes = ohlcv.map(d => d.close);
  const middle = closes.map((_, i) => SMA(closes, period, i));
  
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(0);
      lower.push(0);
      continue;
    }
    
    const start = i - period + 1;
    const sma = middle[i];
    let sumSq = 0;
    for (let j = start; j <= i; j++) {
      sumSq += Math.pow(closes[j] - sma, 2);
    }
    const std = Math.sqrt(sumSq / period);
    
    upper.push(sma + 2 * std);
    lower.push(sma - 2 * std);
  }
  
  return { upper, middle, lower };
}

// ============ Buy/Sell Signal Detection ============

/** Calculate Buy/Sell Lines (custom indicator) */
export function calcBuySellLines(ohlcv: OHLCV[]): { buyLine: number[]; sellLine: number[] } {
  const closes = ohlcv.map(d => d.close);
  const volumes = ohlcv.map(d => d.volume);
  
  const buyLine: number[] = [];
  const sellLine: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    // Buy line: price * (1 + volume ratio)
    const volSMA = SMA(volumes, 5, i);
    const volRatio = volumes[i] / (volSMA || 1);
    buyLine.push(closes[i] * (1 - volRatio * 0.1));
    
    // Sell line: price * (1 - volume ratio)
    sellLine.push(closes[i] * (1 + volRatio * 0.1));
  }
  
  return { buyLine, sellLine };
}

/** Calculate Capital Indicators (4-line system) */
export function calcCapitalIndicators(ohlcv: OHLCV[]): {
  shortTerm: number[];
  midTerm: number[];
  midLongTerm: number[];
  longTerm: number[];
} {
  const closes = ohlcv.map(d => d.close);
  const amounts = ohlcv.map(d => d.amount);
  
  // Short term: 5-day SMA
  const shortTerm = closes.map((_, i) => SMA(closes, 5, i));
  
  // Mid term: 10-day SMA
  const midTerm = closes.map((_, i) => SMA(closes, 10, i));
  
  // Mid-long term: 20-day SMA
  const midLongTerm = closes.map((_, i) => SMA(closes, 20, i));
  
  // Long term: 30-day SMA
  const longTerm = closes.map((_, i) => SMA(closes, 30, i));
  
  return { shortTerm, midTerm, midLongTerm, longTerm };
}

/** Detect capital buy signals */
export function calcCapitalBuySignals(ohlcv: OHLCV[]): {
  fourLineZeroBuy: boolean[];
  whiteBelowTwentyBuy: boolean[];
  whiteCrossRedBuy: boolean[];
  whiteCrossYellowBuy: boolean[];
} {
  const { shortTerm, midTerm, midLongTerm, longTerm } = calcCapitalIndicators(ohlcv);
  
  const fourLineZeroBuy: boolean[] = [];
  const whiteBelowTwentyBuy: boolean[] = [];
  const whiteCrossRedBuy: boolean[] = [];
  const whiteCrossYellowBuy: boolean[] = [];
  
  for (let i = 1; i < ohlcv.length; i++) {
    // Four lines归零买: all four lines are close to each other
    const diff1 = Math.abs(shortTerm[i] - midTerm[i]);
    const diff2 = Math.abs(midTerm[i] - midLongTerm[i]);
    const diff3 = Math.abs(midLongTerm[i] - longTerm[i]);
    const avgPrice = (shortTerm[i] + midTerm[i] + midLongTerm[i] + longTerm[i]) / 4;
    const maxDiff = Math.max(diff1, diff2, diff3);
    fourLineZeroBuy.push(maxDiff / avgPrice < 0.02); // Within 2%
    
    // 白线在20日线下方买
    whiteBelowTwentyBuy.push(shortTerm[i] < midLongTerm[i] && shortTerm[i-1] >= midLongTerm[i-1]);
    
    // 白线上穿红线买
    whiteCrossRedBuy.push(shortTerm[i] > midTerm[i] && shortTerm[i-1] <= midTerm[i-1]);
    
    // 白线上穿黄线买
    whiteCrossYellowBuy.push(shortTerm[i] > midLongTerm[i] && shortTerm[i-1] <= midLongTerm[i-1]);
  }
  
  // First element is false
  fourLineZeroBuy.unshift(false);
  whiteBelowTwentyBuy.unshift(false);
  whiteCrossRedBuy.unshift(false);
  whiteCrossYellowBuy.unshift(false);
  
  return { fourLineZeroBuy, whiteBelowTwentyBuy, whiteCrossRedBuy, whiteCrossYellowBuy };
}

/** Calculate Red Line Signal */
export function calcRedLineSignal(ohlcv: OHLCV[]): { buyLine: number[]; sellLine: number[] } {
  const closes = ohlcv.map(d => d.close);
  const volumes = ohlcv.map(d => d.volume);
  
  const buyLine: number[] = [];
  const sellLine: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    // Red line: 5-day weighted average
    const volWma = WMA(volumes, 5, i);
    const closeWma = WMA(closes, 5, i);
    
    // Buy when volume > average * 1.5
    buyLine.push(volumes[i] > volWma * 1.5 ? closes[i] : 0);
    
    // Sell when volume < average * 0.5
    sellLine.push(volumes[i] < volWma * 0.5 ? closes[i] : 0);
  }
  
  return { buyLine, sellLine };
}

/** Follow庄买入信号 (KDJ J-value crossing) */
export function calcFollowBuySignal(ohlcv: OHLCV[]): boolean[] {
  const { K, D, J } = calcKDJ(ohlcv);
  const signals: boolean[] = [];
  
  for (let i = 1; i < J.length; i++) {
    // J值穿越0轴向上
    const crossUp = J[i] > 0 && J[i-1] <= 0;
    // J值从低位向上穿越D值
    const jCrossD = J[i] > D[i] && J[i-1] <= D[i-1];
    // J值从超卖区域向上
    const fromOversold = J[i-1] < 20 && J[i] > J[i-1];
    
    signals.push(crossUp || jCrossD || fromOversold);
  }
  
  signals.unshift(false);
  return signals;
}

/** 出手就赢信号 (Win signal) */
export function calcWinSignal(ohlcv: OHLCV[]): boolean[] {
  const closes = ohlcv.map(d => d.close);
  const signals: boolean[] = [];
  
  for (let i = 1; i < closes.length; i++) {
    // 连续上涨且放量
    const up3 = closes[i] > closes[i-1] && closes[i-1] > closes[i-2];
    const volumeUp = ohlcv[i].volume > ohlcv[i-1].volume;
    const priceRise = (closes[i] - closes[i-2]) / closes[i-2] > 0.03; // 3%+ rise
    
    signals.push(up3 && volumeUp && priceRise);
  }
  
  signals.unshift(false);
  return signals;
}

/** 黑马信号 (Dark horse signal) */
export function calcDarkHorse(ohlcv: OHLCV[]): boolean[] {
  const closes = ohlcv.map(d => d.close);
  const signals: boolean[] = [];
  
  for (let i = 5; i < closes.length; i++) {
    // 底部反转信号
    const recentLow = LLV(closes, 5, i-1);
    const bounce = closes[i] > closes[i-1] && closes[i-1] < recentLow;
    
    // 成交量放大
    const volUp = ohlcv[i].volume > ohlcv[i-1].volume * 1.3;
    
    // 涨幅适中
    const moderateRise = (closes[i] - closes[i-1]) / closes[i-1] < 0.09;
    
    signals.push(bounce && volUp && moderateRise);
  }
  
  // Pad with false
  for (let i = 0; i < 5; i++) {
    signals.unshift(false);
  }
  
  return signals;
}

// ============ Chip Concentration ============

/** Approximate WINNER/COST using price distribution */
export function calcWinner(ohlcv: OHLCV[], percent: number): number {
  const closes = ohlcv.map(d => d.close);
  if (closes.length === 0) return 0;
  
  const currentPrice = closes[closes.length - 1];
  const minPrice = Math.min(...closes);
  const maxPrice = Math.max(...closes);
  const range = maxPrice - minPrice;
  
  if (range === 0) return 1 - percent / 100;
  
  // Estimate chip distribution using normal distribution approximation
  const z = (currentPrice - minPrice) / range;
  const chipBelow = Math.min(1, Math.max(0, z + 0.5));
  
  return chipBelow;
}

/** Approximate COST using volume distribution */
export function calcCost(ohlcv: OHLCV[], percent: number): number {
  const volumes = ohlcv.map(d => d.volume);
  const closes = ohlcv.map(d => d.close);
  if (volumes.length === 0) return 0;
  
  const totalVolume = volumes.reduce((a, b) => a + b, 0);
  let cumVolume = 0;
  const targetVolume = totalVolume * (percent / 100);
  
  for (let i = 0; i < volumes.length; i++) {
    cumVolume += volumes[i];
    if (cumVolume >= targetVolume) {
      return closes[i];
    }
  }
  
  return closes[closes.length - 1];
}

/** Calculate chip concentration (90% and 70%) */
export function calcChipConcentration(ohlcv: OHLCV[]): { concentration90: number; concentration70: number } {
  if (ohlcv.length < 60) {
    return { concentration90: 0, concentration70: 0 };
  }
  
  const closes = ohlcv.map(d => d.close);
  const volumes = ohlcv.map(d => d.volume);
  
  // Sort prices and calculate cumulative volume
  const priceVol: { price: number; volume: number }[] = closes.map((price, i) => ({
    price,
    volume: volumes[i],
  }));
  
  priceVol.sort((a, b) => a.price - b.price);
  
  const totalVolume = volumes.reduce((a, b) => a + b, 0);
  
  // 90% concentration
  let cumVolume90 = 0;
  let price90 = 0;
  for (const pv of priceVol) {
    cumVolume90 += pv.volume;
    if (cumVolume90 >= totalVolume * 0.9) {
      price90 = pv.price;
      break;
    }
  }
  
  // 70% concentration
  let cumVolume70 = 0;
  let price70 = 0;
  for (const pv of priceVol) {
    cumVolume70 += pv.volume;
    if (cumVolume70 >= totalVolume * 0.7) {
      price70 = pv.price;
      break;
    }
  }
  
  const currentPrice = closes[closes.length - 1];
  const concentration90 = price90 / currentPrice;
  const concentration70 = price70 / currentPrice;
  
  return {
    concentration90: Math.min(1, concentration90),
    concentration70: Math.min(1, concentration70),
  };
}

/** Calculate chip concentration series over time */
export function calcChipConcentrationSeries(ohlcv: OHLCV[], lookback: number): {
  concentration90: number[];
  concentration70: number[];
} {
  const concentration90: number[] = [];
  const concentration70: number[] = [];
  
  for (let i = lookback - 1; i < ohlcv.length; i++) {
    const subset = ohlcv.slice(i - lookback + 1, i + 1);
    const chip = calcChipConcentration(subset);
    concentration90.push(chip.concentration90);
    concentration70.push(chip.concentration70);
  }
  
  // Pad with zeros
  for (let i = 0; i < lookback - 1; i++) {
    concentration90.unshift(0);
    concentration70.unshift(0);
  }
  
  return { concentration90, concentration70 };
}

// ============ Amplitude ============

/** Calculate amplitude (日内振幅) */
export function calcAmplitude(ohlcv: OHLCV[]): number {
  if (ohlcv.length === 0) return 0;
  
  const last = ohlcv[ohlcv.length - 1];
  const amplitude = ((last.high - last.low) / last.low) * 100;
  
  return amplitude;
}

// ============ Limit Up/Down Detection ============

/** Check if stock hit limit up */
export function isLimitUp(ohlcv: OHLCV[], i: number): boolean {
  if (i <= 0 || i >= ohlcv.length) return false;
  
  const prevClose = ohlcv[i - 1].close;
  const currentClose = ohlcv[i].close;
  const limitUp = prevClose * 1.095; // 9.5% limit for most stocks
  
  return currentClose >= limitUp;
}

/** Check if stock hit limit down */
export function isLimitDown(ohlcv: OHLCV[], i: number): boolean {
  if (i <= 0 || i >= ohlcv.length) return false;
  
  const prevClose = ohlcv[i - 1].close;
  const currentClose = ohlcv[i].close;
  const limitDown = prevClose * 0.905; // 9.5% limit down
  
  return currentClose <= limitDown;
}

// ============ Signal Detection Summary ============

/** All signals detected for a stock */
export interface AllSignals {
  kdj: { K: number[]; D: number[]; J: number[] };
  cci: number[];
  macd: { DIF: number[]; DEA: number[]; MACD: number[] };
  buyLine: number[];
  sellLine: number[];
  capital: {
    shortTerm: number[];
    midTerm: number[];
    midLongTerm: number[];
    longTerm: number[];
  };
  capitalSignals: ReturnType<typeof calcCapitalBuySignals>;
  followBuy: boolean[];
  winSignal: boolean[];
  darkHorse: boolean[];
  chip90: number;
  chip70: number;
  amplitude: number;
  buyAboveSell: boolean;
  cciUp: boolean;
}

/** Detect all signals for a stock */
export function detectAllSignals(ohlcv: OHLCV[]): AllSignals | null {
  if (ohlcv.length < 60) return null;
  
  const closes = ohlcv.map(d => d.close);
  const last = ohlcv.length - 1;
  
  const kdj = calcKDJ(ohlcv);
  const cci = calcCCI(ohlcv);
  const macd = calcMACD(closes);
  const { buyLine, sellLine } = calcBuySellLines(ohlcv);
  const capital = calcCapitalIndicators(ohlcv);
  const capitalSignals = calcCapitalBuySignals(ohlcv);
  const followBuy = calcFollowBuySignal(ohlcv);
  const winSignal = calcWinSignal(ohlcv);
  const darkHorse = calcDarkHorse(ohlcv);
  const chip = calcChipConcentration(ohlcv);
  const amplitude = calcAmplitude(ohlcv);
  
  // Buy above sell line
  const buyAboveSell = buyLine[last] > sellLine[last] && buyLine[last-1] <= sellLine[last-1];
  
  // CCI is going up
  const cciUp = cci[last] > cci[last-5] && cci[last-5] > cci[last-10];
  
  return {
    kdj,
    cci,
    macd,
    buyLine,
    sellLine,
    capital,
    capitalSignals,
    followBuy,
    winSignal,
    darkHorse,
    chip90: chip.concentration90,
    chip70: chip.concentration70,
    amplitude,
    buyAboveSell,
    cciUp,
  };
}

/** Get buy signal types */
export function getBuySignalTypes(signals: AllSignals): string[] {
  const types: string[] = [];
  const last = signals.kdj.J.length - 1;
  
  // KDJ J穿越
  if (signals.followBuy[last]) {
    types.push("跟庄买入(J穿)");
  }
  
  // 出手就赢
  if (signals.winSignal[last]) {
    types.push("出手就赢");
  }
  
  // 红线上穿买
  if (signals.buyAboveSell) {
    types.push("红线上穿买");
  }
  
  // 资金四线归零买
  if (signals.capitalSignals.fourLineZeroBuy[last]) {
    types.push("资金四线归零买");
  }
  
  // 白线上穿相关
  if (signals.capitalSignals.whiteCrossRedBuy[last]) {
    types.push("白线上穿红线买");
  }
  if (signals.capitalSignals.whiteCrossYellowBuy[last]) {
    types.push("白线上穿黄线买");
  }
  if (signals.capitalSignals.whiteBelowTwentyBuy[last]) {
    types.push("白线在20日线下买");
  }
  
  // 黑马信号
  if (signals.darkHorse[last]) {
    types.push("黑马信号");
  }
  
  return types;
}

/** Score by strategy */
export interface ScoreResult {
  score: number;
  breakdown: { item: string; points: number }[];
}

export function scoreByStrategy(signals: AllSignals, marketData: {
  hasLimitUp: boolean;
  chip90Pct: number;
  chip70Pct: number;
  chipNarrowing: boolean;
  amplitude: number;
}): ScoreResult {
  const breakdown: { item: string; points: number }[] = [];
  let score = 0;
  
  const last = signals.kdj.J.length - 1;
  
  // KDJ信号 (20分)
  if (signals.followBuy[last]) {
    score += 20;
    breakdown.push({ item: "跟庄买入信号", points: 20 });
  }
  
  // 出手就赢 (15分)
  if (signals.winSignal[last]) {
    score += 15;
    breakdown.push({ item: "出手就赢信号", points: 15 });
  }
  
  // 买卖线 (15分)
  if (signals.buyAboveSell) {
    score += 15;
    breakdown.push({ item: "红线上穿买", points: 15 });
  }
  
  // 资金信号 (20分)
  if (signals.capitalSignals.fourLineZeroBuy[last]) {
    score += 20;
    breakdown.push({ item: "资金四线归零买", points: 20 });
  } else if (signals.capitalSignals.whiteCrossRedBuy[last]) {
    score += 15;
    breakdown.push({ item: "白上穿红", points: 15 });
  } else if (signals.capitalSignals.whiteCrossYellowBuy[last]) {
    score += 12;
    breakdown.push({ item: "白上穿黄", points: 12 });
  }
  
  // 黑马信号 (10分)
  if (signals.darkHorse[last]) {
    score += 10;
    breakdown.push({ item: "黑马信号", points: 10 });
  }
  
  // CCI上移 (10分)
  if (signals.cciUp) {
    score += 10;
    breakdown.push({ item: "CCI上移", points: 10 });
  }
  
  // 筹码集中度加分 (10分)
  if (marketData.chip90Pct > 0) {
    score += 5;
    breakdown.push({ item: "90%筹码集中", points: 5 });
  }
  if (marketData.chip70Pct > 0) {
    score += 5;
    breakdown.push({ item: "70%筹码集中", points: 5 });
  }
  
  return { score, breakdown };
}

/** Evaluate stock for selection */
export function evaluateStock(ohlcv: OHLCV[]): {
  score: number;
  signals: AllSignals;
  buySignalTypes: string[];
  advice: string;
} | null {
  if (ohlcv.length < 60) return null;
  
  const signals = detectAllSignals(ohlcv);
  if (!signals) return null;
  
  const closes = ohlcv.map(d => d.close);
  const last = ohlcv.length - 1;
  
  // Check limit up in last 10 days
  let hasLimitUp = false;
  for (let i = Math.max(1, last - 10); i <= last; i++) {
    if (isLimitUp(ohlcv, i)) {
      hasLimitUp = true;
      break;
    }
  }
  
  // Chip concentration
  let chipNarrowing = false;
  if (ohlcv.length >= 62) {
    const chipSeries = calcChipConcentrationSeries(ohlcv, 60);
    chipNarrowing = chipSeries.concentration90[last] < chipSeries.concentration90[last - 1];
  }
  
  const amplitude = calcAmplitude(ohlcv);
  
  const marketData = {
    hasLimitUp,
    chip90Pct: signals.chip90 * 100,
    chip70Pct: signals.chip70 * 100,
    chipNarrowing,
    amplitude,
  };
  
  const scoreResult = scoreByStrategy(signals, marketData);
  const buySignalTypes = getBuySignalTypes(signals);
  
  let advice = "";
  if (scoreResult.score >= 80) {
    advice = "强烈买入";
  } else if (scoreResult.score >= 65) {
    advice = "建议买入";
  } else if (scoreResult.score >= 55) {
    advice = "谨慎关注";
  } else {
    advice = "建议观望";
  }
  
  return {
    score: scoreResult.score,
    signals,
    buySignalTypes,
    advice,
  };
}
