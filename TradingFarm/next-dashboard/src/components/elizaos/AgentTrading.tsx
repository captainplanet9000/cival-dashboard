import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { createBrowserClient } from '@/utils/supabase/client';

interface AgentTradingProps {
  agentId: string;
}

interface Trade {
  id: string;
  market: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  price?: number;
  status: string;
  executed_at: string;
}

export default function AgentTrading({ agentId }: AgentTradingProps) {
  const [market, setMarket] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop' | 'stop_limit'>('market');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [riskCheck, setRiskCheck] = useState(true);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createBrowserClient();

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 5000);
    return () => clearInterval(interval);
  }, [agentId]);

  const fetchTrades = async () => {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('agent_id', agentId)
      .order('executed_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setTrades(data);
    }
  };

  const executeTrade = async () => {
    setIsLoading(true);
    try {
      const tradeRequest = {
        agent_id: agentId,
        market,
        side,
        type: orderType,
        quantity: parseFloat(quantity),
        price: price ? parseFloat(price) : undefined,
        stop_price: stopPrice ? parseFloat(stopPrice) : undefined,
        risk_check: riskCheck,
      };

      const response = await fetch('/api/elizaos/agents/trading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tradeRequest),
      });

      const data = await response.json();
      if (data.success) {
        fetchTrades();
        // Reset form
        setQuantity('');
        setPrice('');
        setStopPrice('');
      }
    } catch (error) {
      console.error('Error executing trade:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      filled: 'bg-green-500',
      pending: 'bg-yellow-500',
      cancelled: 'bg-red-500',
      rejected: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Trade Entry */}
      <Card>
        <CardHeader>
          <CardTitle>New Trade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Market</label>
            <Input
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              placeholder="BTC-USD"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Side</label>
              <Select value={side} onValueChange={(value: 'buy' | 'sell') => setSide(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Order Type</label>
              <Select
                value={orderType}
                onValueChange={(value: 'market' | 'limit' | 'stop' | 'stop_limit') => setOrderType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="limit">Limit</SelectItem>
                  <SelectItem value="stop">Stop</SelectItem>
                  <SelectItem value="stop_limit">Stop Limit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Quantity</label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {(orderType === 'limit' || orderType === 'stop_limit') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Limit Price</label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}

          {(orderType === 'stop' || orderType === 'stop_limit') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Stop Price</label>
              <Input
                type="number"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Risk Check</label>
            <Switch
              checked={riskCheck}
              onCheckedChange={setRiskCheck}
            />
          </div>

          <Button
            onClick={executeTrade}
            disabled={isLoading || !market || !quantity}
            className="w-full"
          >
            {isLoading ? 'Executing...' : 'Execute Trade'}
          </Button>
        </CardContent>
      </Card>

      {/* Trade History */}
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-2">
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  className="p-3 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{trade.market}</span>
                    <Badge className={getStatusColor(trade.status)}>
                      {trade.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Side: </span>
                      <span className={trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}>
                        {trade.side.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type: </span>
                      {trade.type}
                    </div>
                    <div>
                      <span className="text-gray-500">Quantity: </span>
                      {trade.quantity}
                    </div>
                    <div>
                      <span className="text-gray-500">Price: </span>
                      {trade.price || 'Market'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(trade.executed_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
