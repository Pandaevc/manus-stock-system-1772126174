/**
 * Stock Selection System
 * Multi-signal based intelligent stock selection
 */

import { fetchHotStocks, fetchDailyKline, fetchRealTimeQuote, toOHLCV } from "./stockData";
import { 
  calcChipConcentration, 
  calcChipConcentrationSeries, calcAmplitude, isLimitUp,
  detectAllSignals, getBuySignalTypes, scoreByStrategy 
} from "./indicators";
import { notifyOwner } from "./notification";

// Selection candidate type
export interface SelectionCandidate {
  code: string;
  name: string;
  price: number;
  changePct: number;
  score: number;
  chipConcentration90: number;
  chipConcentration70: number;
  amplitude: number;
  buySignalTypes: string[];
  signals: any;
  scoreBreakdown: { item: string; points: number }[];
  filterStatus: {
    isST: boolean;
    marketCapTooLarge: boolean;
    hasLimitUp: boolean;
    chip90Pct: boolean;
    chipNarrowing: boolean;
    amplitude: boolean;
  };
  advice: string;
}

// In-memory selection results
const selectionResults: SelectionCandidate[] = [];

/** Main stock selection function */
export async function runStockSelection(scoreThreshold: number = 55, maxResults: number = 5): Promise<SelectionCandidate[]> {
  console.log('[Selection] Starting stock selection...');
  
  try {
    const hotStocks = await fetchHotStocks(200);
    console.log(`[Selection] Fetched ${hotStocks.length} hot stocks`);
    
    const candidates: SelectionCandidate[] = [];
    
    for (const stock of hotStocks) {
      try {
        if (stock.name?.includes('ST') || stock.name?.includes('*ST')) {
          continue;
        }
        
        if (stock.marketCap && stock.marketCap > 50000000000) {
          continue;
        }
        
        const bars = await fetchDailyKline(stock.code, 120);
        if (bars.length < 60) continue;
        
        const ohlcv = toOHLCV(bars);
        const closes = ohlcv.map(d => d.close);
        const last = ohlcv.length - 1;
        
        let hasLimitUp = false;
        for (let i = Math.max(1, last - 10); i <= last; i++) {
          if (isLimitUp(ohlcv, i)) {
            hasLimitUp = true;
            break;
          }
        }
        
        if (isLimitUp(ohlcv, last)) {
          continue;
        }
        
        const chip = calcChipConcentration(ohlcv);
        
        let chipNarrowing = false;
        if (ohlcv.length >= 62) {
          const chipSeries = calcChipConcentrationSeries(ohlcv, 60);
          chipNarrowing = chipSeries.concentration90[last] < chipSeries.concentration90[last - 1];
        }
        
        if (!chipNarrowing) {
          continue;
        }
        
        const amplitude = calcAmplitude(ohlcv);
        
        if (amplitude < 3) {
          continue;
        }
        
        const signals = detectAllSignals(ohlcv);
        if (!signals) continue;
        
        const buySignalTypes = getBuySignalTypes(signals);
        
        if (buySignalTypes.length === 0) continue;
        
        const marketData = {
          hasLimitUp,
          chip90Pct: chip.concentration90 * 100,
          chip70Pct: chip.concentration70 * 100,
          chipNarrowing,
          amplitude,
        };
        const scoreResult = scoreByStrategy(signals, marketData);
        
        if (scoreResult.score < scoreThreshold) {
          continue;
        }
        
        const quote = await fetchRealTimeQuote(stock.code);
        
        candidates.push({
          code: stock.code,
          name: stock.name || stock.code,
          price: quote?.price || stock.price || 0,
          changePct: quote?.changePct || stock.changePct || 0,
          score: scoreResult.score,
          chipConcentration90: chip.concentration90,
          chipConcentration70: chip.concentration70,
          amplitude,
          buySignalTypes,
          signals,
          scoreBreakdown: scoreResult.breakdown,
          filterStatus: {
            isST: false,
            marketCapTooLarge: false,
            hasLimitUp,
            chip90Pct: chip.concentration90 > 0,
            chipNarrowing,
            amplitude: amplitude > 3,
          },
          advice: generateAdvice(scoreResult.score, buySignalTypes),
        });
        
      } catch (err) {
        console.error(`[Selection] Error processing ${stock.code}:`, err);
      }
    }
    
    candidates.sort((a, b) => b.score - a.score);
    const topCandidates = candidates.slice(0, maxResults);
    
    console.log(`[Selection] Found ${topCandidates.length} candidates`);
    return topCandidates;
    
  } catch (error) {
    console.error('[Selection] Error:', error);
    return [];
  }
}

function generateAdvice(score: number, buySignalTypes: string[]): string {
  if (score >= 80) {
    return '强烈买入 - 多信号共振，强势特征明显';
  } else if (score >= 65) {
    return '建议买入 - 信号积极，可适当建仓';
  } else if (score >= 55) {
    return '谨慎关注 - 存在一定机会，建议观察';
  } else {
    return '建议观望 - 信号较弱，等待更好的机会';
  }
}

/** Save selection results to in-memory store */
export async function saveSelectionResults(candidates: SelectionCandidate[]): Promise<void> {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  // Store in memory
  for (const c of candidates) {
    selectionResults.push({
      ...c,
    } as any);
  }
  
  // Keep only last 30 days
  while (selectionResults.length > 300) {
    selectionResults.shift();
  }
}

/** Get saved selection results */
export function getStoredResults(date?: string, limit: number = 50): SelectionCandidate[] {
  let results = [...selectionResults];
  if (date) {
    // For now, just return all (date filtering would need timestamp)
  }
  return results.slice(0, limit);
}

/** Get available dates */
export function getStoredDates(): string[] {
  return [new Date().toISOString().split("T")[0]];
}

/** Run daily selection and notify */
export async function runDailySelection(): Promise<SelectionCandidate[]> {
  const candidates = await runStockSelection(30, 10);
  await saveSelectionResults(candidates);

  const dateStr = new Date().toLocaleDateString("zh-CN");
  if (candidates.length > 0) {
    const top3 = candidates.slice(0, 3);
    const content = "今日选股结果(共" + candidates.length + "只，评分排名前10):\n\n" +
      "最强三只预测:\n" +
      top3.map((c, i) =>
        (i + 1) + ". " + c.name + "(" + c.code + ") - 评分:" + c.score + "\n" +
        "   信号: " + (c.buySignalTypes.join("/") || "无") + "\n" +
        "   价格: " + c.price.toFixed(2) + " | 涨跌: " + c.changePct.toFixed(2) + "%\n" +
        "   90%筹码: " + (c.chipConcentration90 * 100).toFixed(1) + "% | 70%筹码: " + (c.chipConcentration70 * 100).toFixed(1) + "%\n" +
        "   建议: " + c.advice
      ).join("\n\n") +
      "\n\n---\n其他候选:\n" +
      candidates.slice(3).map((c, i) =>
        (i + 4) + ". " + c.name + "(" + c.code + ") 评分:" + c.score + " " + c.advice
      ).join("\n");

    await notifyOwner({
      title: "每日选股推送 - " + dateStr,
      content,
    }).catch(e => console.error("[Selection] Notification failed:", e));
  } else {
    await notifyOwner({
      title: "每日选股推送 - " + dateStr,
      content: "今日无符合条件的股票。行情不佳时空仓也是策略。",
    }).catch(e => console.error("[Selection] Notification failed:", e));
  }

  return candidates;
}

// Re-export signal detection functions
export { detectAllSignals, getBuySignalTypes, scoreByStrategy };

// Signal weights
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

export function updateWeights(weights: Record<string, number>) {
  currentWeights = { ...weights };
}
