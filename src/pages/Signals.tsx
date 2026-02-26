import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bell, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function Signals() {
  const { data: signals, isLoading, refetch } = trpc.monitor.signals.useQuery({ limit: 50 });
  
  const markRead = trpc.monitor.markRead.useMutation({
    onSuccess: () => refetch(),
  });
  
  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'clear':
      case 'reduce':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'buy':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
    }
  };
  
  const getSignalLabel = (type: string) => {
    switch (type) {
      case 'clear':
        return '清仓';
      case 'reduce':
        return '减仓';
      case 'buy':
        return '加仓';
      default:
        return '持有';
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">信号提醒</h1>
      
      {signals && signals.length > 0 ? (
        <div className="space-y-4">
          {signals.map((signal) => (
            <Card 
              key={signal.id} 
              className={signal.isRead ? 'opacity-60' : ''}
              onClick={() => !signal.isRead && markRead.mutate({ id: signal.id })}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {getSignalIcon(signal.signalType)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{signal.stockName}</span>
                      <Badge variant={
                        signal.signalType === 'clear' ? 'destructive' :
                        signal.signalType === 'reduce' ? 'destructive' :
                        signal.signalType === 'buy' ? 'default' : 'secondary'
                      }>
                        {getSignalLabel(signal.signalType)}
                      </Badge>
                      {!signal.isRead && (
                        <Badge variant="outline" className="ml-2">未读</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{signal.signalReason}</p>
                    {signal.triggerPrice && (
                      <p className="text-sm mt-1">
                        触发价格: {signal.triggerPrice}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(signal.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无信号提醒</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
