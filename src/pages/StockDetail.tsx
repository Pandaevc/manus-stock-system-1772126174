import { useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function StockDetail() {
  const params = useParams<{ code: string }>();
  const code = params?.code || '';
  
  const { data: detail, isLoading } = trpc.stock.detail.useQuery(
    { code },
    { enabled: !!code }
  );
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!detail) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">未找到股票数据</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{code}</h1>
        <p className="text-muted-foreground">股票详情</p>
      </div>
      
      {/* Score */}
      <Card>
        <CardHeader>
          <CardTitle>综合评分</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-center mb-4">
            {detail.score}
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {detail.buySignalTypes?.map((signal, i) => (
              <Badge key={i} variant="default">{signal}</Badge>
            ))}
          </div>
          {detail.scoreBreakdown && detail.scoreBreakdown.length > 0 && (
            <div className="mt-4 space-y-2">
              {detail.scoreBreakdown.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.item}</span>
                  <span>+{item.points}分</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Technical Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>技术指标</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">KDJ</div>
              <div className="font-medium">
                K: {detail.indicators?.kdjK?.[detail.indicators.kdjK.length - 1]?.toFixed(1)}
                D: {detail.indicators?.kdjD?.[detail.indicators.kdjD.length - 1]?.toFixed(1)}
                J: {detail.indicators?.kdjJ?.[detail.indicators.kdjJ.length - 1]?.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">CCI</div>
              <div className="font-medium">
                {detail.indicators?.cci?.[detail.indicators.cci.length - 1]?.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">MACD</div>
              <div className="font-medium">
                DIF: {detail.indicators?.macdDIF?.[detail.indicators.macdDIF.length - 1]?.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">筹码集中度</div>
              <div className="font-medium">
                90%: {(detail.chip?.concentration90 * 100).toFixed(1)}%
                70%: {(detail.chip?.concentration70 * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
