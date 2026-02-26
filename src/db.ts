/**
 * Database Operations
 * Simplified in-memory storage for demo (can be replaced with MySQL)
 */

// In-memory storage
interface Position {
  id: number;
  userId: number;
  code: string;
  stockName: string;
  buyPrice: number;
  buyDate: string;
  quantity: number;
  currentPrice?: number;
  profitPct?: number;
  status: 'holding' | 'closed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MonitorSignal {
  id: number;
  userId: number;
  positionId: number;
  code: string;
  stockName: string;
  signalType: 'clear' | 'reduce' | 'buy' | 'hold';
  signalReason: string;
  triggerPrice?: number;
  indicators?: any;
  isRead: number;
  createdAt: Date;
}

interface SelectionResult {
  id: number;
  batchDate: string;
  code: string;
  stockName: string;
  score: number;
  chipConcentration90: number;
  chipConcentration70: number;
  blockHighCount: number;
  cciValue: number;
  followSignal: string;
  buySignal: number;
  capitalSignal: string;
  details?: any;
  createdAt: Date;
}

interface AnalysisTask {
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
}

// In-memory stores
let positions: Position[] = [];
let monitorSignals: MonitorSignal[] = [];
let selectionResults: SelectionResult[] = [];
let analysisTasks: AnalysisTask[] = [];

let nextPositionId = 1;
let nextSignalId = 1;
let nextSelectionId = 1;
let nextTaskId = 1;

// Helper to get current date string
function getDateStr(date?: Date): string {
  return (date || new Date()).toISOString().split('T')[0];
}

// ============ Position Operations ============

export async function getUserPositions(userId: number = 1): Promise<Position[]> {
  return positions.filter(p => p.userId === userId && p.status === 'holding');
}

export async function addPosition(position: {
  userId: number;
  code: string;
  stockName: string;
  buyPrice: number;
  buyDate: string;
  quantity: number;
  notes?: string;
}): Promise<number> {
  const newPos: Position = {
    id: nextPositionId++,
    userId: position.userId,
    code: position.code,
    stockName: position.stockName,
    buyPrice: position.buyPrice,
    buyDate: position.buyDate,
    quantity: position.quantity,
    notes: position.notes,
    status: 'holding',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  positions.push(newPos);
  return newPos.id;
}

export async function updatePosition(id: number, updates: {
  currentPrice?: number;
  profitPct?: number;
}): Promise<void> {
  const pos = positions.find(p => p.id === id);
  if (pos) {
    if (updates.currentPrice !== undefined) pos.currentPrice = updates.currentPrice;
    if (updates.profitPct !== undefined) pos.profitPct = updates.profitPct;
    pos.updatedAt = new Date();
  }
}

export async function deletePosition(id: number): Promise<void> {
  positions = positions.filter(p => p.id !== id);
}

export async function upsertPosition(position: {
  userId: number;
  code: string;
  stockName: string;
  buyPrice: number;
  buyDate: string;
  quantity: number;
  notes?: string;
}): Promise<number> {
  const existing = positions.find(p => 
    p.userId === position.userId && 
    p.code === position.code && 
    p.status === 'holding'
  );
  
  if (existing) {
    existing.buyPrice = position.buyPrice;
    existing.buyDate = position.buyDate;
    existing.quantity = position.quantity;
    existing.notes = position.notes;
    existing.updatedAt = new Date();
    return existing.id;
  }
  
  return addPosition(position);
}

export async function updatePositionFull(id: number, updates: {
  stockName?: string;
  buyPrice?: number;
  buyDate?: string;
  quantity?: number;
  currentPrice?: number;
  profitPct?: number;
  status?: 'holding' | 'closed';
  notes?: string;
}): Promise<void> {
  const pos = positions.find(p => p.id === id);
  if (pos) {
    Object.assign(pos, updates);
    pos.updatedAt = new Date();
  }
}

// ============ Signal Operations ============

export async function getUserSignals(userId: number, limit: number = 50): Promise<MonitorSignal[]> {
  return monitorSignals
    .filter(s => s.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

export async function markSignalRead(id: number): Promise<void> {
  const signal = monitorSignals.find(s => s.id === id);
  if (signal) signal.isRead = 1;
}

export async function getUnreadSignalCount(userId: number): Promise<number> {
  return monitorSignals.filter(s => s.userId === userId && s.isRead === 0).length;
}

// ============ Selection Operations ============

export async function getSelectionResults(date?: string, limit: number = 50): Promise<SelectionResult[]> {
  let results = [...selectionResults];
  if (date) {
    results = results.filter(r => r.batchDate === date);
  }
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function getSelectionDates(): Promise<string[]> {
  const dates = [...new Set(selectionResults.map(r => r.batchDate))];
  return dates.sort().reverse().slice(0, 30);
}

// ============ Analysis Operations ============

export async function getUserAnalysisTasks(userId: number): Promise<AnalysisTask[]> {
  return analysisTasks
    .filter(t => t.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getAnalysisTask(id: number): Promise<AnalysisTask | null> {
  return analysisTasks.find(t => t.id === id) || null;
}

export async function createAnalysisTask(
  userId: number,
  code: string,
  stockName: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const task: AnalysisTask = {
    id: nextTaskId++,
    userId,
    code,
    stockName,
    startDate,
    endDate,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  analysisTasks.push(task);
  return task.id;
}

export async function updateAnalysisTask(id: number, updates: Partial<AnalysisTask>): Promise<void> {
  const task = analysisTasks.find(t => t.id === id);
  if (task) {
    Object.assign(task, updates);
    task.updatedAt = new Date();
  }
}

// ============ User Operations (Placeholder) ============

export async function getUserByOpenId(openId: string) {
  return null;
}

export async function upsertUser(user: {
  openId: string;
  name?: string;
  email?: string;
  loginMethod?: string;
}): Promise<void> {
  // No-op for demo
}

// Export for router
export const getDb = async () => null;
