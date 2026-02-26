/**
 * Stock Analysis System
 * Backtest and analyze stock strategies
 */

import { fetchDailyKline, toOHLCV } from './stockData';
import { 
  detectAllSignals, getBuySignalTypes, calcChipConcentration, 
  calcAmplitude, isLimitUp, calcChipConcentrationSeries
} from './indicators';
// Analysis task storage
const analysisTasks: Array<{
  id: number;
  userId: number;
  code: string;
  stockName: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}> = [];

let nextTaskId = 1;

export async function createAnalysisTask(
  userId: number,
  code: string,
  stockName: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const task = {
    id: nextTaskId++,
    userId,
    code,
    stockName,
    startDate,
    endDate,
    status: 'pending' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  analysisTasks.push(task);
  return task.id;
}

export async function getAnalysisTask(id: number) {
  return analysisTasks.find(t => t.id === id) || null;
}

export async function getUserAnalysisTasks(userId: number) {
  return analysisTasks
    .filter(t => t.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function updateAnalysisTask(id: number, updates: any) {
  const task = analysisTasks.find(t => t.id === id);
  if (task) {
    Object.assign(task, updates, { updatedAt: new Date() });
  }
}

export interface BacktestResult {
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
}

export interface BacktestTrade {
  buyDate: string;
  buyPrice: number;
  sellDate: string;
  sellPrice: number;
  returnPct: number;
  holdDays: number;
  reason: string;
}

/** Run backtest for a single stock */
export async function runBacktest(
  code: string,
  startDate: string,
  endDate: string,
  strategy: 'signal' | 'fixed' = 'signal'
): Promise<{
  trades: BacktestTrade[];
  summary: BacktestResult;
}> {
  const bars = await fetchDailyKline(code, 365);
  if (bars.length < 60) {
    return { trades: [], summary: getEmptyBacktestResult() };
  }
  
  const ohlcv = toOHLCV(bars);
  const trades: BacktestTrade[] = [];
  
  // Find start and end indices
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
  
  // Simulate trading
  let position: { buyDate: string; buyPrice: number; buyIdx: number } | null = null;
  
  for (let i = startIdx + 10; i < endIdx; i++) {
    const signals = detectAllSignals(ohlcv.slice(0, i + 1));
    if (!signals) continue;
    
    const buySignals = getBuySignalTypes(signals);
    
    // Buy signal
    if (!position && buySignals.length > 0) {
      position = {
        buyDate: bars[i].date,
        buyPrice: bars[i].close,
        buyIdx: i,
      };
    }
    
    // Sell signal
    if (position) {
      const holdDays = i - position.buyIdx;
      const returnPct = ((bars[i].close - position.buyPrice) / position.buyPrice) * 100;
      
      let shouldSell = false;
      let reason = '';
      
      if (strategy === 'signal') {
        const currentSignals = detectAllSignals(ohlcv.slice(0, i + 1));
        if (currentSignals) {
          const currentBuySignals = getBuySignalTypes(currentSignals);
          if (currentBuySignals.length === 0 && holdDays >= 3) {
            shouldSell = true;
            reason = '买入信号消失';
          }
        }
        
        if (returnPct < -5) {
          shouldSell = true;
          reason = '止损';
        }
        
        if (returnPct > 10) {
          shouldSell = true;
          reason = '止盈';
        }
      } else {
        if (holdDays >= 5) {
          shouldSell = true;
          reason = '持有5天';
        }
      }
      
      if (shouldSell) {
        trades.push({
          buyDate: position.buyDate,
          buyPrice: position.buyPrice,
          sellDate: bars[i].date,
          sellPrice: bars[i].close,
          returnPct,
          holdDays,
          reason,
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
      reason: '期末平仓',
    });
  }
  
  return {
    trades,
    summary: calculateBacktestSummary(trades),
  };
}

function calculateBacktestSummary(trades: BacktestTrade[]): BacktestResult {
  if (trades.length === 0) {
    return getEmptyBacktestResult();
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
  };
}

function getEmptyBacktestResult(): BacktestResult {
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
  };
}

export async function runAnalysis(taskId: number): Promise<void> {
  const task = await getAnalysisTask(taskId);
  if (!task) return;
  
  await updateAnalysisTask(taskId, { status: 'running' });
  
  try {
    const { trades, summary } = await runBacktest(
      task.code,
      task.startDate,
      task.endDate
    );
    
    const summaryText = `交易次数: ${summary.totalTrades}\n胜率: ${summary.winRate.toFixed(1)}%\n总收益: ${summary.totalReturn.toFixed(2)}%\n平均收益: ${summary.avgReturn.toFixed(2)}%\n盈亏比: ${summary.profitFactor.toFixed(2)}`;
    
    await updateAnalysisTask(taskId, {
      status: 'completed',
      result: { trades, summary },
      summary: summaryText,
    });
  } catch (err) {
    console.error('[Analysis] Error:', err);
    await updateAnalysisTask(taskId, { status: 'failed' });
  }
}
