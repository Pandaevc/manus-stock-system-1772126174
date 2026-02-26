import { mysqlTable, int, varchar, text, timestamp, decimal, mysqlEnum, json, date, bigint } from 'drizzle-orm/mysql-core';

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Stock basic info cache
 */
export const stocks = mysqlTable("stocks", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  name: varchar("name", { length: 64 }).notNull(),
  market: varchar("market", { length: 8 }).notNull(), // SH, SZ
  industry: varchar("industry", { length: 64 }),
  marketCap: decimal("marketCap", { precision: 20, scale: 2 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Stock = typeof stocks.$inferSelect;
export type InsertStock = typeof stocks.$inferInsert;

/**
 * Stock daily price data
 */
export const stockDaily = mysqlTable("stock_daily", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 16 }).notNull(),
  tradeDate: date("tradeDate").notNull(),
  open: decimal("open", { precision: 12, scale: 4 }).notNull(),
  high: decimal("high", { precision: 12, scale: 4 }).notNull(),
  low: decimal("low", { precision: 12, scale: 4 }).notNull(),
  close: decimal("close", { precision: 12, scale: 4 }).notNull(),
  volume: bigint("volume", { mode: "number" }).notNull(),
  amount: decimal("amount", { precision: 20, scale: 2 }).notNull(),
  turnover: decimal("turnover", { precision: 10, scale: 4 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StockDaily = typeof stockDaily.$inferSelect;
export type InsertStockDaily = typeof stockDaily.$inferInsert;

/**
 * User positions (holdings)
 */
export const positions = mysqlTable("positions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  code: varchar("code", { length: 16 }).notNull(),
  stockName: varchar("stockName", { length: 64 }).notNull(),
  buyPrice: decimal("buyPrice", { precision: 12, scale: 4 }).notNull(),
  buyDate: date("buyDate").notNull(),
  quantity: int("quantity").notNull(),
  currentPrice: decimal("currentPrice", { precision: 12, scale: 4 }),
  profitPct: decimal("profitPct", { precision: 8, scale: 2 }),
  status: mysqlEnum("status", ["holding", "closed"]).default("holding").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

/**
 * Selection results
 */
export const selectionResults = mysqlTable("selection_results", {
  id: int("id").autoincrement().primaryKey(),
  batchDate: date("batchDate").notNull(),
  code: varchar("code", { length: 16 }).notNull(),
  stockName: varchar("stockName", { length: 64 }).notNull(),
  score: decimal("score", { precision: 8, scale: 2 }),
  chipConcentration90: decimal("chipConcentration90", { precision: 8, scale: 4 }),
  chipConcentration70: decimal("chipConcentration70", { precision: 8, scale: 4 }),
  blockHighCount: int("blockHighCount"),
  cciValue: decimal("cciValue", { precision: 10, scale: 4 }),
  followSignal: varchar("followSignal", { length: 32 }),
  buySignal: int("buySignal").default(0),
  capitalSignal: varchar("capitalSignal", { length: 64 }),
  details: json("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SelectionResult = typeof selectionResults.$inferSelect;
export type InsertSelectionResult = typeof selectionResults.$inferInsert;

/**
 * Monitor signals
 */
export const monitorSignals = mysqlTable("monitor_signals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  positionId: int("positionId").notNull(),
  code: varchar("code", { length: 16 }).notNull(),
  stockName: varchar("stockName", { length: 64 }).notNull(),
  signalType: mysqlEnum("signalType", ["clear", "reduce", "buy", "hold"]).notNull(),
  signalReason: text("signalReason").notNull(),
  triggerPrice: decimal("triggerPrice", { precision: 12, scale: 4 }),
  indicators: json("indicators"),
  isRead: int("isRead").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MonitorSignal = typeof monitorSignals.$inferSelect;
export type InsertMonitorSignal = typeof monitorSignals.$inferInsert;

/**
 * Analysis tasks
 */
export const analysisTasks = mysqlTable("analysis_tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  code: varchar("code", { length: 16 }).notNull(),
  stockName: varchar("stockName", { length: 64 }).notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  result: json("result"),
  summary: text("summary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AnalysisTask = typeof analysisTasks.$inferSelect;
export type InsertAnalysisTask = typeof analysisTasks.$inferInsert;
