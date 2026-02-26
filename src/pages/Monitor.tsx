import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Plus, Eye, Trash2, RefreshCw, AlertTriangle,
  TrendingUp, TrendingDown, CheckCircle
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function Monitor() {
  const [addOpen, setAddOpen] = useState(false);
  const [newPos, setNewPos] = useState({ 
    code: '', stockName: '', buyPrice: '', buyDate: '', quantity: '', notes: '' 
  });
  
  const { data: positions, refetch } = trpc.position.list.useQuery();
  const { data: signals } = trpc.monitor.signals.useQuery({ limit: 20 });
  
  const addPosition = trpc.position.add.useMutation({
    onSuccess: () => {
      toast.success('添加成功');
      setAddOpen(false);
      setNewPos({ code: '', stockName: '', buyPrice: '', buyDate: '', quantity: '', notes: '' });
      refetch();
    },
    onError: (err) => toast.error('添加失败: ' + err.message),
  });
  
  const deletePosition = trpc.position.delete.useMutation({
    onSuccess: () => {
      toast.success('删除成功');
      refetch();
    },
  });
  
  const runMonitor = trpc.monitor.run.useMutation({
    onSuccess: (data) => {
      toast.success(`监控完成，发现 ${data.count} 个信号`);
      refetch();
    },
  });
  
  const handleAdd = () => {
    if (!newPos.code || !newPos.buyPrice || !newPos.quantity) {
      toast.error('请填写必要信息');
      return;
    }
    
    addPosition.mutate({
      code: newPos.code,
      stockName: newPos.stockName || newPos.code,
      buyPrice: parseFloat(newPos.buyPrice),
      buyDate: newPos.buyDate || new Date().toISOString().split('T')[0],
      quantity: parseInt(newPos.quantity),
      notes: newPos.notes,
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">持仓监控</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => runMonitor.mutate()}
            disabled={runMonitor.isPending}
          >
            {runMonitor.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            刷新监控
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                添加持仓
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加持仓</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>股票代码</Label>
                  <Input 
                    value={newPos.code}
                    onChange={(e) => setNewPos({ ...newPos, code: e.target.value })}
                    placeholder="如: 600000"
                  />
                </div>
                <div>
                  <Label>股票名称</Label>
                  <Input 
                    value={newPos.stockName}
                    onChange={(e) => setNewPos({ ...newPos, stockName: e.target.value })}
                    placeholder="如: 浦发银行"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>买入价格</Label>
                    <Input 
                      type="number"
                      value={newPos.buyPrice}
                      onChange={(e) => setNewPos({ ...newPos, buyPrice: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>买入数量</Label>
                    <Input 
                      type="number"
                      value={newPos.quantity}
                      onChange={(e) => setNewPos({ ...newPos, quantity: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>买入日期</Label>
                  <Input 
                    type="date"
                    value={newPos.buyDate}
                    onChange={(e) => setNewPos({ ...newPos, buyDate: e.target.value })}
                  />
                </div>
                <Button onClick={handleAdd} className="w-full">确认添加</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Positions List */}
      {positions && positions.length > 0 ? (
        <div className="grid gap-4">
          {positions.map((pos) => (
            <Card key={pos.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{pos.stockName}</span>
                      <Badge variant="outline">{pos.code}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      买入: {pos.buyPrice} × {pos.quantity}股
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-medium">
                        {pos.profitPct ? (
                          <>
                            {Number(pos.profitPct) >= 0 ? '+' : ''}
                            {Number(pos.profitPct).toFixed(2)}%
                          </>
                        ) : (
                          '-'
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {pos.currentPrice || '-'}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deletePosition.mutate({ id: pos.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无持仓</p>
            <p className="text-sm">点击"添加持仓"开始管理</p>
          </CardContent>
        </Card>
      )}
      
      {/* Recent Signals */}
      {signals && signals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>最近信号</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {signals.slice(0, 5).map((signal) => (
                <div 
                  key={signal.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {signal.signalType === 'clear' || signal.signalType === 'reduce' ? (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    <div>
                      <div className="font-medium">{signal.stockName}</div>
                      <div className="text-sm text-muted-foreground">{signal.signalReason}</div>
                    </div>
                  </div>
                  <Badge variant={signal.signalType === 'clear' ? 'destructive' : 'secondary'}>
                    {signal.signalType === 'clear' ? '清仓' : 
                     signal.signalType === 'reduce' ? '减仓' : 
                     signal.signalType === 'buy' ? '加仓' : '持有'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
