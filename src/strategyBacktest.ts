/**
 * Strategy Backtest System
 * Advanced backtesting with multiple strategies
 */

import { fetchDailyKline, toOHLCV } from './stockData';
import { 
  detectAllSignals, getBuySignalTypes, calcChipConcentration,
  calcAmplitude, isLimitUp, calcChipConcentrationSeries
} from './indicators';
import { getUserPositions } from './db';

export interface StrategyResult {
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  totalReturn: number;
  avgReturn: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  avgHoldDays: number;
  sharpeRatio: number;
  signalContributions: { signal: string; totalTrades: number; winTrades: number; winRate: number; avgProfit: number; contribution: number }[];
  weightAdjustments: { signal: string; currentWeight: number; suggestedWeight: number; reason: string }[];
}

const SIGNAL_WEIGHTS: Record<string, number> = {
  '跟庄买入(J穿)': 20,
  '出手就赢': 15,
  '红线上穿买': 15,
  '资金四线归零买': 20,
  '白线上穿红线买': 15,
  '白线上穿黄线买': 12,
  '白线在20日线下买': 10,
  '黑马信号': 10,
  'CCI上移': 10,
};

let currentWeights = { ...SIGNAL_WEIGHTS };

export function getCurrentWeights() {
  return { ...currentWeights };
}

export function updateWeightsFunc(weights: Record<string, number>) {
  currentWeights = { ...weights };
}

export async function runStrategyBacktest(
  code: string,
  startDate: string,
  endDate: string,
  scoreThreshold: number = 55
): Promise<StrategyResult> {
  const bars = await fetchDailyKline(code, 365);
  if (bars.length < 60) {
    return getEmptyStrategyResult();
  }
  
  const ohlcv = toOHLCV(bars);
  
  let startIdx = 0;
  let endIdx = bars.length - 1;
  
  for (let i = 0; i < bars.length; i++) {
    if (bars[i].date >= startDate) {
      startIdx = i;
      break;
    }
  }
  
  for (let i = 0; i < bars.length; i++) {
    if (bars[i].date >= endDate) {
      endIdx = i;
      break;
    }
  }
  
  const trades: { 
    buyDate: string; buyPrice: number; sellDate: string; 
    sellPrice: number; returnPct: number; holdDays: number; 
    signal: string 
  }[] = [];
  
  let position: { buyDate: string; buyPrice: number; buyIdx: number; score: number } | null = null;
  
  for (let i = startIdx + 10; i < endIdx; i++) {
    const subset = ohlcv.slice(0, i + 1);
    const signals = detectAllSignals(subset);
    if (!signals) continue;
    
    const buySignalTypes = getBuySignalTypes(signals);
    
    const last = subset.length - 1;
    let hasLimitUp = false;
    for (let j = Math.max(1, last - 10); j <= last; j++) {
      if (isLimitUp(ohlcv, j)) {
        hasLimitUp = true;
        break;
      }
    }
    
    let chipNarrowing = false;
    if (subset.length >= 62) {
      const chipSeries = calcChipConcentrationSeries(subset, 60);
      chipNarrowing = chipSeries.concentration90[last] < chipSeries.concentration90[last - 1];
    }
    
    const amplitude = calcAmplitude(subset);
    const marketData = {
      hasLimitUp,
      chip90Pct: signals.chip90 * 100,
      chip70Pct: signals.chip70 * 100,
      chipNarrowing,
      amplitude,
    };
    
    let score = 0;
    for (const signal of buySignalTypes) {
      score += currentWeights[signal] || 0;
    }
    
    if (!position && score >= scoreThreshold && buySignalTypes.length > 0) {
      position = {
        buyDate: bars[i].date,
        buyPrice: bars[i].close,
        buyIdx: i,
        score,
      };
    }
    
    if (position) {
      const holdDays = i - position.buyIdx;
      const returnPct = ((bars[i].close - position.buyPrice) / position.buyPrice) * 100;
      
      let shouldSell = false;
      let reason = '';
      
      const currentSignals = detectAllSignals(ohlcv.slice(0, i + 1));
      const currentBuySignals = currentSignals ? getBuySignalTypes(currentSignals) : [];
      
      if (currentBuySignals.length === 0 && holdDays >= 3) {
        shouldSell = true;
        reason = '信号消失';
      }
      
      if (returnPct < -8) {
        shouldSell = true;
        reason = '止损8%';
      }
      
      if (returnPct > 15 && currentBuySignals.length === 0) {
        shouldSell = true;
        reason = '止盈15%';
      }
      
      if (returnPct > 20) {
        shouldSell = true;
        reason = '止盈20%';
      }
      
      if (holdDays >= 20) {
        shouldSell = true;
        reason = '持有20天';
      }
      
      if (shouldSell) {
        trades.push({
          buyDate: position.buyDate,
          buyPrice: position.buyPrice,
          sellDate: bars[i].date,
          sellPrice: bars[i].close,
          returnPct,
          holdDays,
          signal: buySignalTypes[0] || 'unknown',
        });
        position = null;
      }
    }
  }
  
  if (position && endIdx < bars.length) {
    trades.push({
      buyDate: position.buyDate,
      buyPrice: position.buyPrice,
      sellDate: bars[endIdx].date,
      sellPrice: bars[endIdx].close,
      returnPct: ((bars[endIdx].close - position.buyPrice) / position.buyPrice) * 100,
      holdDays: endIdx - position.buyIdx,
      signal: '期末平仓',
    });
  }
  
  return calculateStrategyResult(trades);
}

function calculateStrategyResult(trades: { returnPct: number; signal: string; holdDays: number }[]): StrategyResult {
  if (trades.length === 0) {
    return getEmptyStrategyResult();
  }
  
  const wins = trades.filter(t => t.returnPct > 0);
  const losses = trades.filter(t => t.returnPct <= 0);
  
  const totalReturn = trades.reduce((sum, t) => sum + t.returnPct, 0);
  const avgReturn = totalReturn / trades.length;
  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.returnPct, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + t.returnPct, 0) / losses.length : 0;
  
  let maxDrawdown = 0;
  let peak = 0;
  let cumulative = 0;
  for (const trade of trades) {
    cumulative += trade.returnPct;
    if (cumulative > peak) peak = cumulative;
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  const avgHoldDays = trades.reduce((sum, t) => sum + t.holdDays, 0) / trades.length;
  
  const returns = trades.map(t => t.returnPct / 100);
  const avgDailyReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / returns.length);
  const sharpeRatio = stdDev > 0 ? (avgDailyReturn / stdDev) * Math.sqrt(252) : 0;
  
  const totalWin = wins.reduce((sum, t) => sum + t.returnPct, 0);
  const totalLoss = Math.abs(losses.reduce((sum, t) => sum + t.returnPct, 0));
  const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0;
  
  const signalStats: Record<string, { trades: number; wins: number; totalReturn: number }> = {};
  for (const trade of trades) {
    if (!signalStats[trade.signal]) {
      signalStats[trade.signal] = { trades: 0, wins: 0, totalReturn: 0 };
    }
    signalStats[trade.signal].trades++;
    if (trade.returnPct > 0) {
      signalStats[trade.signal].wins++;
    }
    signalStats[trade.signal].totalReturn += trade.returnPct;
  }
  
  const signalContributions = Object.entries(signalStats).map(([signal, stats]) => ({
    signal,
    totalTrades: stats.trades,
    winTrades: stats.wins,
    winRate: (stats.wins / stats.trades) * 100,
    avgProfit: stats.totalReturn / stats.trades,
    contribution: stats.totalReturn / totalReturn * 100,
  }));
  
  const weightAdjustments = signalContributions.map(sc => ({
    signal: sc.signal,
    currentWeight: currentWeights[sc.signal] || 0,
    suggestedWeight: sc.winRate > 60 ? Math.min(25, (currentWeights[sc.signal] || 0) + 5) : 
                    sc.winRate < 40 ? Math.max(5, (currentWeights[sc.signal] || 0) - 5) : 
                    currentWeights[sc.signal] || 0,
    reason: sc.winRate > 60 ? '高胜率，增加权重' : 
            sc.winRate < 40 ? '低胜率，降低权重' : '胜率稳定，保持权重',
  }));
  
  return {
    totalTrades: trades.length,
    winTrades: wins.length,
    lossTrades: losses.length,
    winRate: (wins.length / trades.length) * 100,
    totalReturn,
    avgReturn,
    avgWin,
    avgLoss,
    profitFactor: isFinite(profitFactor) ? profitFactor : 0,
    maxDrawdown,
    avgHoldDays,
    sharpeRatio,
    signalContributions,
    weightAdjustments,
  };
}

function getEmptyStrategyResult(): StrategyResult {
  return {
    totalTrades: 0,
    winTrades: 0,
    lossTrades: 0,
    winRate: 0,
    totalReturn: 0,
    avgReturn: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    maxDrawdown: 0,
    avgHoldDays: 0,
    sharpeRatio: 0,
    signalContributions: [],
    weightAdjustments: [],
  };
}

export async function evaluateAllPositions(userId: number = 1): Promise<{
  positionId: number;
  code: string;
  stockName: string;
  winRate: number;
  avgReturn: number;
  action: string;
  confidence: number;
}[]> {
  const userPositions = await getUserPositions(userId);
  const results = [];
  
  for (const pos of userPositions) {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const result = await runStrategyBacktest(pos.code, startDate, endDate);
      
      let action = '持仓';
      let confidence = 50;
      
      if (result.winRate >= 60 && result.avgReturn > 0) {
        action = '加仓';
        confidence = Math.min(95, result.winRate + 20);
      } else if (result.winRate < 40 || result.avgReturn < -2) {
        action = '减仓';
        confidence = Math.min(95, 70 - result.winRate);
      } else if (result.totalTrades === 0) {
        action = '观察';
        confidence = 30;
      }
      
      results.push({
        positionId: pos.id,
        code: pos.code,
        stockName: pos.stockName,
        winRate: result.winRate,
        avgReturn: result.avgReturn,
        action,
        confidence,
      });
    } catch (err) {
      console.error(`[Evaluate] Error for ${pos.code}:`, err);
    }
  }
  
  return results;
}

export async function evaluatePositionAction(pos: {
  code: string;
  stockName: string;
  buyPrice: number;
  quantity: number;
}): Promise<{
  action: string;
  urgency: string;
  confidence: number;
  reasons: string[];
  backtestWinRate?: number;
  backtestAvgReturn?: number;
}> {
  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const result = await runStrategyBacktest(pos.code, startDate, endDate);
    
    let action = '持仓';
    let urgency = '观望';
    let confidence = 50;
    const reasons: string[] = [];
    
    if (result.totalTrades > 0) {
      reasons.push(`历史交易 ${result.totalTrades} 次`);
      reasons.push(`胜率 ${result.winRate.toFixed(1)}%`);
      reasons.push(`平均收益 ${result.avgReturn.toFixed(2)}%`);
      
      if (result.winRate >= 60) {
        action = '加仓';
        urgency = '择机';
        confidence = Math.min(90, result.winRate);
        reasons.push('高胜率信号');
      } else if (result.winRate < 40) {
        action = '减仓';
        urgency = '择机';
        confidence = Math.min(90, 80 - result.winRate);
        reasons.push('低胜率信号');
      } else if (result.avgReturn < -3) {
        action = '清仓';
        urgency = '立即';
        reasons.push('历史回测亏损较大');
      }
    } else {
      reasons.push('暂无历史回测数据');
      reasons.push('建议保持当前仓位');
    }
    
    return {
      action,
      urgency,
      confidence,
      reasons,
      backtestWinRate: result.winRate,
      backtestAvgReturn: result.avgReturn,
    };
  } catch (err) {
    return {
      action: '持仓',
      urgency: '观望',
      confidence: 30,
      reasons: ['数据获取失败，建议保持观察'],
    };
  }
}

export function applyWeightAdjustments(adjustments: { signal: string; weight: number }[]): void {
  for (const adj of adjustments) {
    currentWeights[adj.signal] = adj.weight;
  }
}
