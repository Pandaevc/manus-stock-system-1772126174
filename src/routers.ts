/**
 * API Routers
 * tRPC routers for all backend operations
 */

import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getUserPositions, addPosition, updatePosition, deletePosition,
  upsertPosition, updatePositionFull,
  getUserSignals, markSignalRead, getUnreadSignalCount,
  getSelectionResults, getSelectionDates,
  getUserAnalysisTasks, getAnalysisTask,
} from "./db";
import { runDailySelection, runStockSelection, detectAllSignals, scoreByStrategy, getCurrentWeights, updateWeights, saveSelectionResults, getStoredResults, getStoredDates } from "./selection";
import { monitorUserPositions, analyzePosition, scorePositionStock } from "./monitor";
import { createAnalysisTask, runAnalysis, runBacktest } from "./analysis";
import { runStrategyBacktest, evaluateAllPositions, evaluatePositionAction, applyWeightAdjustments } from "./strategyBacktest";
import { fetchDailyKline, toOHLCV, fetchHotSectors, fetchHotStocks } from "./stockData";
import { calcKDJ, calcCCI, calcMACD, calcBuySellLines, calcCapitalIndicators, calcCapitalBuySignals, calcRedLineSignal, calcFollowBuySignal, calcWinSignal, calcChipConcentration, calcChipConcentrationSeries, calcAmplitude, calcDarkHorse, isLimitUp, getBuySignalTypes } from "./indicators";

export const appRouter = router({
  // ===== Stock Data =====
  stock: router({
    list: publicProcedure
      .input(z.object({ page: z.number().default(1), pageSize: z.number().default(50) }).optional())
      .query(async ({ input }) => {
        const { page = 1, pageSize = 50 } = input || {};
        const hotStocks = await fetchHotStocks(200);
        const allStocks = hotStocks.map(s => ({ code: s.code, name: s.name, price: s.price, changePct: s.changePct, marketCap: s.marketCap }));
        const start = (page - 1) * pageSize;
        return {
          items: allStocks.slice(start, start + pageSize),
          total: allStocks.length,
        };
      }),

    quote: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        const { fetchRealTimeQuote } = await import('./stockData');
        return fetchRealTimeQuote(input.code);
      }),

    kline: publicProcedure
      .input(z.object({ code: z.string(), days: z.number().default(120) }))
      .query(async ({ input }) => {
        const bars = await fetchDailyKline(input.code, input.days);
        return bars;
      }),

    detail: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        const bars = await fetchDailyKline(input.code, 120);
        if (bars.length < 30) return null;

        const ohlcv = toOHLCV(bars);
        const closes = ohlcv.map(d => d.close);
        const last = ohlcv.length - 1;

        const { K, D, J } = calcKDJ(ohlcv);
        const cci = calcCCI(ohlcv);
        const macd = calcMACD(closes);
        const { buyLine, sellLine } = calcBuySellLines(ohlcv);
        const cap = calcCapitalIndicators(ohlcv);
        const capSignals = calcCapitalBuySignals(ohlcv);
        const redLine = calcRedLineSignal(ohlcv);
        const followBuy = calcFollowBuySignal(ohlcv);
        const winSignal = calcWinSignal(ohlcv);
        const chip = calcChipConcentration(ohlcv);
        const darkHorse = calcDarkHorse(ohlcv);

        const signals = detectAllSignals(ohlcv);
        const buySignalTypes = signals ? getBuySignalTypes(signals) : [];
        
        let hasLimitUp = false;
        for (let i = Math.max(1, last - 10); i <= last; i++) {
          if (isLimitUp(ohlcv, i)) { hasLimitUp = true; break; }
        }
        const amplitude = calcAmplitude(ohlcv);
        let chipNarrowing = false;
        if (ohlcv.length >= 62) {
          const chipSeries = calcChipConcentrationSeries(ohlcv, 60);
          chipNarrowing = chipSeries.concentration90[last] < chipSeries.concentration90[last - 1];
        }
        const marketData = {
          hasLimitUp,
          chip90Pct: chip.concentration90 * 100,
          chip70Pct: chip.concentration70 * 100,
          chipNarrowing,
          amplitude,
        };
        const scoreResult = signals ? scoreByStrategy(signals, marketData) : { score: 0, breakdown: [] };

        return {
          bars,
          indicators: {
            dates: bars.map(b => b.date),
            closes,
            kdjK: K,
            kdjD: D,
            kdjJ: J,
            cci,
            macdDIF: macd.DIF,
            macdDEA: macd.DEA,
            macdHist: macd.MACD,
            buyLine,
            sellLine,
            capitalShort: cap.shortTerm,
            capitalMid: cap.midTerm,
            capitalMidLong: cap.midLongTerm,
            capitalLong: cap.longTerm,
            redLineBuy: redLine.buyLine,
            redLineSell: redLine.sellLine,
            darkHorse,
          },
          signals: {
            followBuy: followBuy.map((v, i) => v ? bars[i]?.date : null).filter(Boolean),
            winSignal: winSignal.map((v, i) => v ? bars[i]?.date : null).filter(Boolean),
            capitalBuy: {
              fourLineZero: capSignals.fourLineZeroBuy.map((v, i) => v ? bars[i]?.date : null).filter(Boolean),
              whiteBelowTwenty: capSignals.whiteBelowTwentyBuy.map((v, i) => v ? bars[i]?.date : null).filter(Boolean),
              whiteCrossRed: capSignals.whiteCrossRedBuy.map((v, i) => v ? bars[i]?.date : null).filter(Boolean),
              whiteCrossYellow: capSignals.whiteCrossYellowBuy.map((v, i) => v ? bars[i]?.date : null).filter(Boolean),
            },
          },
          chip,
          currentSignals: signals,
          buySignalTypes,
          score: scoreResult.score,
          scoreBreakdown: scoreResult.breakdown,
        };
      }),

    search: publicProcedure
      .input(z.object({ keyword: z.string() }))
      .query(async ({ input }) => {
        const hotStocks = await fetchHotStocks(200);
        const allStocks = hotStocks.map(s => ({ code: s.code, name: s.name, price: s.price, changePct: s.changePct, marketCap: s.marketCap }));
        const kw = input.keyword.toLowerCase();
        return allStocks
          .filter(s => s.code.includes(kw) || s.name.toLowerCase().includes(kw))
          .slice(0, 20);
      }),
  }),

  // ===== Selection System =====
  selection: router({
    run: protectedProcedure
      .input(z.object({ scoreThreshold: z.number().default(55), maxResults: z.number().default(5) }).optional())
      .mutation(async ({ input }) => {
        const threshold = input?.scoreThreshold || 55;
        const maxResults = input?.maxResults || 5;
        const candidates = await runStockSelection(threshold, maxResults);
        
        try {
          await saveSelectionResults(candidates);
        } catch (err) {
          console.error('[Selection] Failed to save results:', err);
        }
        
        let hotSectors: any[] = [];
        try {
          const sectors = await fetchHotSectors(1);
          hotSectors = sectors.slice(0, 20).map(s => ({
            name: s.name,
            changePct: s.changePct,
            limitUpCount: s.limitUpCount,
            limitDownCount: s.limitDownCount,
          }));
        } catch {}
        
        return { count: candidates.length, candidates, hotSectors };
      }),

    runDaily: protectedProcedure.mutation(async () => {
      const candidates = await runDailySelection();
      return { count: candidates.length, candidates };
    }),

    results: publicProcedure
      .input(z.object({ date: z.string().optional(), limit: z.number().default(50) }).optional())
      .query(async ({ input }) => {
        const { date, limit = 50 } = input || {};
        // Return stored results
        const results = getStoredResults(date, limit);
        return results.map(r => ({
          id: 1,
          batchDate: new Date().toISOString().split('T')[0],
          code: r.code,
          stockName: r.name,
          score: r.score,
          chipConcentration90: r.chipConcentration90,
          chipConcentration70: r.chipConcentration70,
          blockHighCount: 0,
          cciValue: 0,
          followSignal: r.buySignalTypes.filter((t: string) => t.includes("跟庄") || t.includes("出手就赢") || t.includes("红线上穿")).join("/") || "",
          buySignal: r.signals?.buyAboveSell ? 1 : 0,
          capitalSignal: r.buySignalTypes.filter((t: string) => t.includes("四线") || t.includes("白线") || t.includes("白穿") || t.includes("资金")).join("/") || "",
          details: r,
          createdAt: new Date(),
        }));
      }),

    dates: publicProcedure.query(async () => {
      return getStoredDates();
    }),

    weights: publicProcedure.query(() => {
      return getCurrentWeights();
    }),

    updateWeights: protectedProcedure
      .input(z.record(z.string(), z.number()))
      .mutation(({ input }) => {
        updateWeights(input);
        return { success: true };
      }),
  }),

  // ===== Position Management =====
  position: router({
    list: protectedProcedure.query(async () => {
      return getUserPositions(1);
    }),

    add: protectedProcedure
      .input(z.object({
        code: z.string(),
        stockName: z.string(),
        buyPrice: z.number(),
        buyDate: z.string(),
        quantity: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await addPosition({ ...input, userId: 1 });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        currentPrice: z.number().optional(),
        profitPct: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await updatePosition(input.id, {
          currentPrice: input.currentPrice,
          profitPct: input.profitPct,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deletePosition(input.id);
        return { success: true };
      }),

    upsert: protectedProcedure
      .input(z.object({
        code: z.string(),
        stockName: z.string(),
        buyPrice: z.number(),
        buyDate: z.string(),
        quantity: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await upsertPosition({ ...input, userId: 1 });
        return { id };
      }),

    updateFull: protectedProcedure
      .input(z.object({
        id: z.number(),
        stockName: z.string().optional(),
        buyPrice: z.number().optional(),
        buyDate: z.string().optional(),
        quantity: z.number().optional(),
        currentPrice: z.number().optional(),
        profitPct: z.number().optional(),
        status: z.enum(['holding', 'closed']).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await updatePositionFull(id, updates);
        return { success: true };
      }),
  }),

  // ===== Monitoring =====
  monitor: router({
    run: protectedProcedure.mutation(async () => {
      const signals = await monitorUserPositions(1);
      return { count: signals.length, signals };
    }),

    analyze: protectedProcedure
      .input(z.object({
        code: z.string(),
        stockName: z.string(),
        buyPrice: z.number(),
        buyDate: z.string(),
        quantity: z.number(),
      }))
      .query(async ({ input }) => {
        return analyzePosition({
          id: 0,
          ...input,
        });
      }),

    score: protectedProcedure
      .input(z.object({
        code: z.string(),
        stockName: z.string(),
        buyPrice: z.number(),
      }))
      .query(async ({ input }) => {
        return scorePositionStock(input);
      }),

    signals: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }).optional())
      .query(async ({ input }) => {
        return getUserSignals(1, input?.limit || 50);
      }),

    unreadCount: protectedProcedure.query(async () => {
      return getUnreadSignalCount(1);
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await markSignalRead(input.id);
        return { success: true };
      }),
  }),

  // ===== Analysis =====
  analysis: router({
    tasks: protectedProcedure.query(async () => {
      return getUserAnalysisTasks(1);
    }),

    task: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getAnalysisTask(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        code: z.string(),
        stockName: z.string(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .mutation(async ({ input }) => {
        const id = await createAnalysisTask(1, input.code, input.stockName, input.startDate, input.endDate);
        runAnalysis(id).catch(console.error);
        return { id };
      }),

    backtest: protectedProcedure
      .input(z.object({
        code: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        strategy: z.enum(['signal', 'fixed']).default('signal'),
      }))
      .query(async ({ input }) => {
        const result = await runBacktest(input.code, input.startDate, input.endDate, input.strategy);
        return result;
      }),

    evaluatePositions: protectedProcedure.query(async () => {
      return evaluateAllPositions(1);
    }),

    evaluateAction: protectedProcedure
      .input(z.object({
        code: z.string(),
        stockName: z.string(),
        buyPrice: z.number(),
        quantity: z.number(),
      }))
      .query(async ({ input }) => {
        return evaluatePositionAction(input);
      }),

    strategyBacktest: protectedProcedure
      .input(z.object({
        code: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        scoreThreshold: z.number().default(55),
      }))
      .query(async ({ input }) => {
        return runStrategyBacktest(input.code, input.startDate, input.endDate, input.scoreThreshold);
      }),

    applyWeights: protectedProcedure
      .input(z.array(z.object({
        signal: z.string(),
        weight: z.number(),
      })))
      .mutation(async ({ input }) => {
        applyWeightAdjustments(input);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
