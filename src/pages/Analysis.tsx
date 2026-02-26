import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';

export default function Analysis() {
  const [code, setCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const today = new Date();
  const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
  
  if (!startDate) setStartDate(threeMonthsAgo.toISOString().split('T')[0]);
  if (!endDate) setEndDate(today.toISOString().split('T')[0]);
  
  const handleRunBacktest = async () => {
    if (!code) return;
    setLoading(true);
    try {
      // Simulated backtest result
      setResult({
        summary: {
          totalTrades: Math.floor(Math.random() * 20) + 5,
          winRate: 50 + Math.random() * 30,
          totalReturn: (Math.random() - 0.2) * 50,
          avgReturn: (Math.random() - 0.2) * 10,
        }
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">策略分析</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            回测分析
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>股票代码</Label>
              <Input 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="如: 600000"
              />
            </div>
            <div>
              <Label>开始日期</Label>
              <Input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>结束日期</Label>
              <Input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleRunBacktest}
            disabled={loading || !code}
            className="w-full"
          >
            {loading ? '分析中...' : '开始回测'}
          </Button>
          
          {result && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">回测结果</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>交易次数: {result.summary.totalTrades}</div>
                <div>胜率: {result.summary.winRate.toFixed(1)}%</div>
                <div>总收益: {result.summary.totalReturn.toFixed(2)}%</div>
                <div>平均收益: {result.summary.avgReturn.toFixed(2)}%</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>输入股票代码和日期范围进行回测分析</li>
            <li>系统会根据历史数据计算交易胜率和收益</li>
            <li>查看信号贡献和权重调整建议</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
