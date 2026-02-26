import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { 
  LayoutDashboard, Search, Eye, BarChart3, TrendingUp, 
  TrendingDown, Activity, Bell, RefreshCw, Loader2 
} from 'lucide-react';
import { useLocation } from 'wouter';

export default function Home() {
  const [, setLocation] = useLocation();
  
  const { data: positions } = trpc.position.list.useQuery();
  const { data: unreadSignals } = trpc.monitor.unreadCount.useQuery();
  const { data: selectionDates } = trpc.selection.dates.useQuery();
  
  const latestDate = selectionDates?.[0];
  const { data: latestSelections } = trpc.selection.results.useQuery({
    date: latestDate,
    limit: 5,
  });
  
  const stats = {
    totalPositions: positions?.length || 0,
    unreadSignals: unreadSignals || 0,
    todaySelections: latestSelections?.length || 0,
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">仪表盘</h1>
        <p className="text-muted-foreground">欢迎回来，这是您的股票管理系统</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">持仓数量</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPositions}</div>
            <p className="text-xs text-muted-foreground">当前持有的股票</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未读信号</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unreadSignals}</div>
            <p className="text-xs text-muted-foreground">待处理的监控信号</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日选股</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaySelections}</div>
            <p className="text-xs text-muted-foreground">今日推荐的股票</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Button 
          variant="outline" 
          className="h-24 flex flex-col gap-2"
          onClick={() => setLocation('/selection')}
        >
          <Search className="h-6 w-6" />
          <span>智能选股</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="h-24 flex flex-col gap-2"
          onClick={() => setLocation('/monitor')}
        >
          <Eye className="h-6 w-6" />
          <span>持仓监控</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="h-24 flex flex-col gap-2"
          onClick={() => setLocation('/analysis')}
        >
          <BarChart3 className="h-6 w-6" />
          <span>策略分析</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="h-24 flex flex-col gap-2"
          onClick={() => setLocation('/market')}
        >
          <TrendingUp className="h-6 w-6" />
          <span>行情数据</span>
        </Button>
      </div>
      
      {/* Recent Selections */}
      {latestSelections && latestSelections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>今日推荐</span>
              <span className="text-sm font-normal text-muted-foreground">{latestDate}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {latestSelections.map((stock, index) => (
                <div 
                  key={stock.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{stock.stockName}</div>
                      <div className="text-sm text-muted-foreground">{stock.code}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">评分: {Number(stock.score).toFixed(0)}</div>
                    <div className="text-sm text-muted-foreground">
                      {(Number(stock.chipConcentration90) * 100).toFixed(1)}% 筹码
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
