import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Loader2, Search, TrendingUp, Filter, 
  RefreshCw, Zap, DollarSign, Target
} from 'lucide-react';
import { toast } from 'sonner';

export default function Selection() {
  const [scoreThreshold, setScoreThreshold] = useState(55);
  const [maxResults, setMaxResults] = useState(5);
  
  const { data: dates, refetch: refetchDates } = trpc.selection.dates.useQuery();
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  
  const { data: historyResults, isLoading: historyLoading } = trpc.selection.results.useQuery({
    date: selectedDate,
    limit: 50,
  });
  
  const runSelection = trpc.selection.run.useMutation({
    onSuccess: (data) => {
      toast.success(`选股完成！找到 ${data.count} 只符合条件的股票`);
      refetchDates();
    },
    onError: (error) => {
      toast.error('选股失败: ' + error.message);
    },
  });
  
  const handleRunSelection = () => {
    runSelection.mutate({ scoreThreshold, maxResults });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">智能选股</h1>
      </div>
      
      {/* Selection Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            选股参数
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>评分门槛: {scoreThreshold}</Label>
              <Slider 
                value={[scoreThreshold]} 
                onValueChange={([v]) => setScoreThreshold(v)}
                min={30} max={90} step={5}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label>推荐数量: {maxResults}</Label>
              <Slider 
                value={[maxResults]} 
                onValueChange={([v]) => setMaxResults(v)}
                min={3} max={20} step={1}
                className="mt-2"
              />
            </div>
            
            <Button 
              onClick={handleRunSelection}
              disabled={runSelection.isPending}
              className="w-full"
            >
              {runSelection.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              开始选股
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Results */}
      {historyLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : historyResults && historyResults.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">选股结果</h2>
            <div className="flex gap-2">
              {dates?.slice(0, 5).map((date) => (
                <Button
                  key={date}
                  variant={selectedDate === date ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDate(date)}
                >
                  {date}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="grid gap-4">
            {historyResults.map((result, index) => (
              <Card key={result.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{result.stockName}</span>
                        <Badge variant="outline">{result.code}</Badge>
                        <Badge variant={index < 3 ? 'default' : 'secondary'}>
                          #{index + 1}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>评分: <span className="font-medium text-foreground">{Number(result.score).toFixed(0)}</span></span>
                        <span>90%筹码: <span className="font-medium">{(Number(result.chipConcentration90) * 100).toFixed(1)}%</span></span>
                        <span>70%筹码: <span className="font-medium">{(Number(result.chipConcentration70) * 100).toFixed(1)}%</span></span>
                      </div>
                      
                      {/* Signals */}
                      {(result.followSignal || result.capitalSignal) && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {result.followSignal && result.followSignal.split('/').map((s: string, i: number) => (
                            <Badge key={`f-${i}`} variant="outline" className="text-xs">
                              <Zap className="h-3 w-3 mr-1" />{s}
                            </Badge>
                          ))}
                          {result.capitalSignal && result.capitalSignal.split('/').map((s: string, i: number) => (
                            <Badge key={`c-${i}`} variant="outline" className="text-xs">
                              <DollarSign className="h-3 w-3 mr-1" />{s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <Button variant="outline" size="sm">
                      <Target className="h-4 w-4 mr-1" />
                      查看详情
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无选股结果</p>
            <p className="text-sm">点击"开始选股"获取推荐股票</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
