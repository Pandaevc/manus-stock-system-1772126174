/**
 * Position Monitoring System
 * Monitor positions and detect buy/sell signals
 */

import { getUserPositions, updatePosition } from './db';
import { fetchRealTimeQuote, fetchDailyKline, toOHLCV } from './stockData';
import { 
  detectAllSignals, getBuySignalTypes, scoreByStrategy, 
  calcChipConcentration, calcAmplitude, isLimitUp, calcChipConcentrationSeries
} from './indicators';

// In-memory signals store (simplified)
const signals: Array<{
  id: number;
  positionId: number;
  code: string;
  stockName: string;
  signalType: string;
  signalReason: string;
  currentPrice: number;
  profitPct: number;
  peakProfit: number;
  indicators: any;
}> = [];

let nextSignalId = 1;

export interface PositionSignal {
  positionId: number;
  code: string;
  stockName: string;
  signalType: 'clear' | 'reduce' | 'buy' | 'hold';
  signalReason: string;
  currentPrice: number;
  profitPct: number;
  peakProfit: number;
  indicators: Record<string, any>;
}

/** Monitor all user positions */
export async function monitorUserPositions(userId: number = 1): Promise<PositionSignal[]> {
  const userPositions = await getUserPositions(userId);
  const signals: PositionSignal[] = [];
  
  for (const pos of userPositions) {
    try {
      const signal = await analyzePosition({
        id: pos.id,
        code: pos.code,
        stockName: pos.stockName,
        buyPrice: pos.buyPrice,
        buyDate: pos.buyDate,
        quantity: pos.quantity,
      });
      if (signal) {
        signals.push(signal);
      }
    } catch (err) {
      console.error(`[Monitor] Error analyzing ${pos.code}:`, err);
    }
  }
  
  return signals;
}

/** Analyze a single position */
export async function analyzePosition(pos: {
  id: number;
  code: string;
  stockName: string;
  buyPrice: number;
  buyDate: string;
  quantity: number;
}): Promise<PositionSignal | null> {
  const quote = await fetchRealTimeQuote(pos.code);
  if (!quote) return null;
  
  const bars = await fetchDailyKline(pos.code, 120);
  if (bars.length < 60) return null;
  
  const ohlcv = toOHLCV(bars);
  const last = ohlcv.length - 1;
  
  const currentPrice = quote.price;
  const profitPct = ((currentPrice - pos.buyPrice) / pos.buyPrice) * 100;
  
  let peakProfit = profitPct;
  const buyDateIndex = bars.findIndex(b => b.date >= pos.buyDate);
  if (buyDateIndex > 0) {
    const highAfterBuy = Math.max(...ohlcv.slice(buyDateIndex).map(o => o.high));
    peakProfit = ((highAfterBuy - pos.buyPrice) / pos.buyPrice) * 100;
  }
  
  const signals = detectAllSignals(ohlcv);
  if (!signals) return null;
  
  const buySignalTypes = getBuySignalTypes(signals);
  
  let signalType: 'clear' | 'reduce' | 'buy' | 'hold' = 'hold';
  let signalReason = '';
  
  const { K, D, J } = signals.kdj;
  
  const jCrossDown = J[last] < D[last] && J[last-1] >= D[last-1];
  const jFromOverbought = J[last-1] > 120 && J[last] < J[last-1];
  
  let hasLimitUp = false;
  for (let i = Math.max(1, last - 5); i <= last; i++) {
    if (isLimitUp(ohlcv, i)) {
      hasLimitUp = true;
      break;
    }
  }
  const limitUpWeakness = hasLimitUp && profitPct > 5 && signals.macd.MACD[last] < signals.macd.MACD[last-1];
  
  const stopLoss = profitPct < -8;
  const buySignals = buySignalTypes.length > 0;
  
  if (stopLoss) {
    signalType = 'clear';
    signalReason = '触发止损线，亏损8%';
  } else if (jCrossDown || jFromOverbought) {
    signalType = 'reduce';
    signalReason = 'KDJ指标显示卖点信号';
  } else if (limitUpWeakness) {
    signalType = 'clear';
    signalReason = '涨停后走弱，获利了结';
  } else if (buySignals && profitPct < 0) {
    signalType = 'buy';
    signalReason = '出现买入信号，可考虑加仓';
  } else if (buySignals && profitPct > 0 && profitPct < 3) {
    signalType = 'hold';
    signalReason = '持有，有买入信号但涨幅不大';
  } else if (profitPct > 10 && signals.macd.MACD[last] < 0) {
    signalType = 'reduce';
    signalReason = 'MACD转弱，可考虑部分止盈';
  } else if (profitPct > 15 && jCrossDown) {
    signalType = 'reduce';
    signalReason = 'KDJ死叉，触发移动止盈';
  } else {
    signalType = 'hold';
    signalReason = '正常持有';
  }
  
  // Update position with current price
  await updatePosition(pos.id, {
    currentPrice,
    profitPct,
  });
  
  return {
    positionId: pos.id,
    code: pos.code,
    stockName: pos.stockName,
    signalType,
    signalReason,
    currentPrice,
    profitPct,
    peakProfit,
    indicators: {
      kdj: { K: K[last], D: D[last], J: J[last] },
      macd: signals.macd.MACD[last],
      buySignals: buySignalTypes,
    },
  };
}

/** Score a position stock */
export async function scorePositionStock(pos: {
  id?: number;
  code: string;
  stockName: string;
  buyPrice: number;
}): Promise<{
  score: number;
  buySignalTypes: string[];
  advice: string;
  scoreBreakdown: { item: string; points: number }[];
} | null> {
  const bars = await fetchDailyKline(pos.code, 120);
  if (bars.length < 60) return null;
  
  const ohlcv = toOHLCV(bars);
  const last = ohlcv.length - 1;
  
  const signals = detectAllSignals(ohlcv);
  if (!signals) return null;
  
  let hasLimitUp = false;
  for (let i = Math.max(1, last - 10); i <= last; i++) {
    if (isLimitUp(ohlcv, i)) {
      hasLimitUp = true;
      break;
    }
  }
  
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
  
  let advice = '';
  if (scoreResult.score >= 80) {
    advice = '强烈买入 - 多信号共振，建议加仓';
  } else if (scoreResult.score >= 65) {
    advice = '建议买入 - 信号积极，可继续持有';
  } else if (scoreResult.score >= 55) {
    advice = '谨慎关注 - 存在一定风险';
  } else {
    advice = '建议观望 - 信号较弱';
  }
  
  return {
    score: scoreResult.score,
    buySignalTypes,
    advice,
    scoreBreakdown: scoreResult.breakdown,
  };
}
