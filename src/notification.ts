/**
 * Notification Service
 * Send notifications to users via various channels
 */

interface NotificationPayload {
  title: string;
  content: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

/** Send notification to owner */
export async function notifyOwner(payload: NotificationPayload): Promise<void> {
  console.log('[Notification]', payload.title, payload.content);
  
  // In production, this would integrate with:
  // - WhatsApp API
  // - Telegram Bot
  // - Email
  // - SMS
  
  // For now, just log
}

/** Send selection notification */
export async function notifySelection(candidates: {
  code: string;
  name: string;
  score: number;
  advice: string;
}[], dateStr: string): Promise<void> {
  if (candidates.length === 0) {
    await notifyOwner({
      title: `每日选股推送 - ${dateStr}`,
      content: '今日无符合条件的股票。行情不佳时空仓也是策略。',
      type: 'info',
    });
    return;
  }
  
  const top3 = candidates.slice(0, 3);
  const content = `今日选股结果(共${candidates.length}只):\n\n最强三只预测:\n` +
    top3.map((c, i) => 
      `${i + 1}. ${c.name}(${c.code}) - 评分:${c.score}\n建议: ${c.advice}`
    ).join('\n\n');
  
  await notifyOwner({
    title: `每日选股推送 - ${dateStr}`,
    content,
    type: 'success',
  });
}

/** Send signal notification */
export async function notifySignal(
  code: string,
  stockName: string,
  signalType: 'clear' | 'reduce' | 'buy' | 'hold',
  signalReason: string,
  currentPrice: number,
  profitPct: number
): Promise<void> {
  const typeLabel = {
    clear: '清仓',
    reduce: '减仓',
    buy: '加仓',
    hold: '持有',
  }[signalType];
  
  await notifyOwner({
    title: `持仓信号提醒 - ${stockName}(${code})`,
    content: `信号类型: ${typeLabel}\n原因: ${signalReason}\n现价: ${currentPrice.toFixed(2)}\n盈亏: ${profitPct.toFixed(2)}%`,
    type: signalType === 'clear' || signalType === 'reduce' ? 'warning' : 'info',
  });
}

/** Send backtest result notification */
export async function notifyBacktest(
  code: string,
  stockName: string,
  winRate: number,
  avgReturn: number,
  action: string
): Promise<void> {
  await notifyOwner({
    title: `回测分析完成 - ${stockName}(${code})`,
    content: `胜率: ${winRate.toFixed(1)}%\n平均收益: ${avgReturn.toFixed(2)}%\n建议操作: ${action}`,
    type: winRate >= 60 ? 'success' : winRate < 40 ? 'error' : 'info',
  });
}
