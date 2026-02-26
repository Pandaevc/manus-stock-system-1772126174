import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function Market() {
  const [keyword, setKeyword] = useState('');
  
  const { data: stocks, isLoading } = trpc.stock.list.useQuery({ 
    page: 1, 
    pageSize: 50 
  });
  
  const { data: searchResults } = trpc.stock.search.useQuery(
    { keyword },
    { enabled: keyword.length > 0 }
  );
  
  const displayStocks = keyword ? searchResults : stocks?.items;
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">行情数据</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>股票列表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              className="pl-10"
              placeholder="搜索股票代码或名称..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : displayStocks && displayStocks.length > 0 ? (
            <div className="grid gap-2">
              {displayStocks.map((stock) => (
                <div 
                  key={stock.code}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{stock.name}</div>
                      <div className="text-sm text-muted-foreground">{stock.code}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">{stock.price?.toFixed(2)}</div>
                      <div className={`text-sm flex items-center gap-1 ${
                        (stock.changePct || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {(stock.changePct || 0) >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {(stock.changePct || 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">暂无数据</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
