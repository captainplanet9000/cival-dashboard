'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { TrendingUp, TrendingDown, Loader2, RefreshCw, AlertCircle, CheckCircle2, Ban } from 'lucide-react';

interface AgentTestnetTraderProps {
  agentId: string;
  farmId: string;
}

export function AgentTestnetTrader({ agentId, farmId }: AgentTestnetTraderProps) {
  // State for available exchanges
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [selectedExchangeId, setSelectedExchangeId] = useState<string>('');
  const [loadingExchanges, setLoadingExchanges] = useState(false);
  
  // State for trade execution
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState<'Buy' | 'Sell'>('Buy');
  const [orderType, setOrderType] = useState<'Market' | 'Limit'>('Market');
  const [quantity, setQuantity] = useState('0.001');
  const [price, setPrice] = useState('');
  const [executingTrade, setExecutingTrade] = useState(false);
  const [tradeResult, setTradeResult] = useState<any>(null);
  const [tradeError, setTradeError] = useState<string | null>(null);
  
  // State for risk management
  const [useStopLoss, setUseStopLoss] = useState(false);
  const [stopLossPercent, setStopLossPercent] = useState('5');
  const [useTakeProfit, setUseTakeProfit] = useState(false);
  const [takeProfitPercent, setTakeProfitPercent] = useState('10');
  
  // State for account information
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [loadingAccount, setLoadingAccount] = useState(false);
  
  // Fetch available exchanges for this agent
  useEffect(() => {
    const fetchExchanges = async () => {
      setLoadingExchanges(true);
      try {
        const response = await fetch(`/api/exchange/agent-exchanges?agentId=${agentId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch exchanges');
        }
        
        const data = await response.json();
        
        // Filter only testnet exchanges
        const testnetExchanges = data.exchanges.filter((e: any) => e.testnet === true);
        
        setExchanges(testnetExchanges);
        
        // Auto-select first testnet exchange if available
        if (testnetExchanges.length > 0) {
          setSelectedExchangeId(testnetExchanges[0].id);
          // Fetch account info for selected exchange
          fetchAccountInfo(testnetExchanges[0].id);
        }
      } catch (error) {
        console.error('Error fetching exchanges:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch exchanges',
          variant: 'destructive',
        });
      } finally {
        setLoadingExchanges(false);
      }
    };
    
    fetchExchanges();
  }, [agentId]);
  
  // Fetch account info when exchange is selected
  const fetchAccountInfo = async (exchangeId: string) => {
    if (!exchangeId) return;
    
    setLoadingAccount(true);
    try {
      const response = await fetch(`/api/agents/${agentId}/trading/account?exchangeId=${exchangeId}&marketType=linear`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch account info');
      }
      
      const data = await response.json();
      
      setAccountInfo(data.account);
      setPositions(data.positions || []);
    } catch (error) {
      console.error('Error fetching account info:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch account information',
        variant: 'destructive',
      });
    } finally {
      setLoadingAccount(false);
    }
  };
  
  // Execute a test trade
  const executeTrade = async () => {
    if (!selectedExchangeId) {
      toast({
        title: 'Error',
        description: 'Please select an exchange',
        variant: 'destructive',
      });
      return;
    }
    
    // Clear previous results
    setTradeResult(null);
    setTradeError(null);
    
    // Basic validation
    if (!symbol) {
      toast({
        title: 'Error',
        description: 'Please enter a symbol',
        variant: 'destructive',
      });
      return;
    }
    
    if (parseFloat(quantity) <= 0) {
      toast({
        title: 'Error',
        description: 'Quantity must be greater than 0',
        variant: 'destructive',
      });
      return;
    }
    
    if (orderType === 'Limit' && (!price || parseFloat(price) <= 0)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid price for limit orders',
        variant: 'destructive',
      });
      return;
    }
    
    setExecutingTrade(true);
    
    try {
      // Prepare trade request
      const tradeRequest: any = {
        symbol,
        side,
        orderType,
        quantity: parseFloat(quantity),
        marketType: 'linear',
      };
      
      // Add price for limit orders
      if (orderType === 'Limit') {
        tradeRequest.price = parseFloat(price);
      }
      
      // Risk management
      const riskManagement: any = {};
      
      if (useStopLoss) {
        riskManagement.use_stop_loss = true;
        riskManagement.stop_loss_percent = stopLossPercent;
      }
      
      if (useTakeProfit) {
        riskManagement.use_take_profit = true;
        riskManagement.take_profit_percent = takeProfitPercent;
      }
      
      // Send trade request
      const response = await fetch(`/api/agents/${agentId}/trading/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exchangeId: selectedExchangeId,
          tradeRequest,
          risk_management: riskManagement
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute trade');
      }
      
      // Trade successful
      setTradeResult(data.trade);
      
      toast({
        title: 'Trade Executed',
        description: `Successfully placed ${side} order for ${quantity} ${symbol}`,
      });
      
      // Refresh account info after trade
      fetchAccountInfo(selectedExchangeId);
    } catch (error) {
      console.error('Error executing trade:', error);
      setTradeError(error instanceof Error ? error.message : 'Failed to execute trade');
      
      toast({
        title: 'Trade Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setExecutingTrade(false);
    }
  };
  
  // Format USD amount
  const formatUsd = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge variant="outline" className={side === 'Buy' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
            {side === 'Buy' ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-1" />
            )}
            Bybit Testnet
          </Badge>
          Agent Trading Console
        </CardTitle>
        <CardDescription>
          Execute test trades on the Bybit testnet to validate agent trading capabilities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trade" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trade">Trade</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
          </TabsList>
          
          {/* Trade Tab */}
          <TabsContent value="trade" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Exchange Selection */}
              <div className="space-y-3">
                <Label htmlFor="exchange">Exchange</Label>
                <Select
                  value={selectedExchangeId}
                  onValueChange={(value) => {
                    setSelectedExchangeId(value);
                    fetchAccountInfo(value);
                  }}
                  disabled={loadingExchanges}
                >
                  <SelectTrigger id="exchange">
                    <SelectValue placeholder="Select testnet exchange" />
                  </SelectTrigger>
                  <SelectContent>
                    {exchanges.length === 0 ? (
                      <SelectItem value="no-exchanges" disabled>
                        No testnet exchanges available
                      </SelectItem>
                    ) : (
                      exchanges.map((exchange) => (
                        <SelectItem key={exchange.id} value={exchange.id}>
                          {exchange.name} (Testnet)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {exchanges.length === 0 && !loadingExchanges && (
                  <Alert variant="warning">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Testnet Exchanges</AlertTitle>
                    <AlertDescription>
                      You need to add a Bybit testnet exchange to execute test trades.
                      Go to the Bybit Test page to add one.
                    </AlertDescription>
                    <Button className="mt-2" size="sm" variant="outline" asChild>
                      <a href="/dashboard/bybit-test" target="_blank" rel="noopener">
                        Add Testnet Exchange
                      </a>
                    </Button>
                  </Alert>
                )}
              </div>
              
              {/* Symbol & Side */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol</Label>
                    <Input
                      id="symbol"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      placeholder="BTCUSDT"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="side">Side</Label>
                    <RadioGroup
                      value={side}
                      onValueChange={(value) => setSide(value as 'Buy' | 'Sell')}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Buy" id="buy" className="text-green-600" />
                        <Label htmlFor="buy" className="text-green-600 font-medium">Buy</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Sell" id="sell" className="text-red-600" />
                        <Label htmlFor="sell" className="text-red-600 font-medium">Sell</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
              
              {/* Order Type & Quantity */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orderType">Order Type</Label>
                    <RadioGroup
                      value={orderType}
                      onValueChange={(value) => setOrderType(value as 'Market' | 'Limit')}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Market" id="market" />
                        <Label htmlFor="market">Market</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Limit" id="limit" />
                        <Label htmlFor="limit">Limit</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0.001"
                      type="number"
                      step="0.001"
                      min="0.001"
                    />
                  </div>
                </div>
                
                {orderType === 'Limit' && (
                  <div className="space-y-2">
                    <Label htmlFor="price">Limit Price</Label>
                    <Input
                      id="price"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Enter limit price"
                      type="number"
                      step="0.1"
                      min="0.1"
                    />
                  </div>
                )}
              </div>
              
              {/* Risk Management */}
              <div className="space-y-3">
                <Label>Risk Management</Label>
                <div className="space-y-3 rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="use-stop-loss"
                        checked={useStopLoss}
                        onCheckedChange={setUseStopLoss}
                      />
                      <Label htmlFor="use-stop-loss">Use Stop Loss</Label>
                    </div>
                    {useStopLoss && (
                      <div className="flex items-center space-x-2">
                        <Input
                          className="w-16"
                          value={stopLossPercent}
                          onChange={(e) => setStopLossPercent(e.target.value)}
                          type="number"
                          min="0.1"
                          step="0.1"
                        />
                        <span>%</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="use-take-profit"
                        checked={useTakeProfit}
                        onCheckedChange={setUseTakeProfit}
                      />
                      <Label htmlFor="use-take-profit">Use Take Profit</Label>
                    </div>
                    {useTakeProfit && (
                      <div className="flex items-center space-x-2">
                        <Input
                          className="w-16"
                          value={takeProfitPercent}
                          onChange={(e) => setTakeProfitPercent(e.target.value)}
                          type="number"
                          min="0.1"
                          step="0.1"
                        />
                        <span>%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={executeTrade} 
                disabled={executingTrade || !selectedExchangeId || exchanges.length === 0}
                className={side === 'Buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {executingTrade && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {side === 'Buy' ? 'Buy' : 'Sell'} {symbol}
              </Button>
            </div>
            
            {/* Trade Result */}
            {tradeResult && (
              <Alert variant="success" className="mt-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Trade Executed Successfully</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Order ID:</span>
                      <span>{tradeResult.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Status:</span>
                      <span>{tradeResult.orderStatus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Symbol:</span>
                      <span>{tradeResult.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Side:</span>
                      <span className={tradeResult.side === 'Buy' ? 'text-green-600' : 'text-red-600'}>
                        {tradeResult.side}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Quantity:</span>
                      <span>{tradeResult.qty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Price:</span>
                      <span>{tradeResult.price || 'Market'}</span>
                    </div>
                    {tradeResult.stopLossPrice && parseFloat(tradeResult.stopLossPrice) > 0 && (
                      <div className="flex justify-between">
                        <span className="font-medium">Stop Loss:</span>
                        <span>{tradeResult.stopLossPrice}</span>
                      </div>
                    )}
                    {tradeResult.takeProfitPrice && parseFloat(tradeResult.takeProfitPrice) > 0 && (
                      <div className="flex justify-between">
                        <span className="font-medium">Take Profit:</span>
                        <span>{tradeResult.takeProfitPrice}</span>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Trade Error */}
            {tradeError && (
              <Alert variant="destructive" className="mt-4">
                <Ban className="h-4 w-4" />
                <AlertTitle>Trade Failed</AlertTitle>
                <AlertDescription>{tradeError}</AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          {/* Account Tab */}
          <TabsContent value="account" className="space-y-4">
            {loadingAccount ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : accountInfo ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Account Summary</h3>
                  <Button variant="outline" size="sm" onClick={() => fetchAccountInfo(selectedExchangeId)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-muted-foreground text-sm">Total Equity</div>
                        <div className="text-2xl font-bold">
                          {accountInfo.totalEquity ? formatUsd(accountInfo.totalEquity) : 'N/A'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-muted-foreground text-sm">Available Balance</div>
                        <div className="text-2xl font-bold">
                          {accountInfo.totalAvailableBalance ? formatUsd(accountInfo.totalAvailableBalance) : 'N/A'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-muted-foreground text-sm">Unrealized PnL</div>
                        <div className="text-2xl font-bold">
                          {accountInfo.totalPerpUPL ? formatUsd(accountInfo.totalPerpUPL) : 'N/A'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <h4 className="text-sm font-medium mb-2">Asset Breakdown</h4>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-2 px-4 text-left font-medium">Asset</th>
                        <th className="py-2 px-4 text-right font-medium">Equity</th>
                        <th className="py-2 px-4 text-right font-medium">USD Value</th>
                        <th className="py-2 px-4 text-right font-medium">Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountInfo.coin?.map((coin: any, index: number) => (
                        <tr key={coin.coin} className={index < accountInfo.coin.length - 1 ? 'border-b' : ''}>
                          <td className="py-2 px-4 font-medium">{coin.coin}</td>
                          <td className="py-2 px-4 text-right">{parseFloat(coin.equity).toFixed(6)}</td>
                          <td className="py-2 px-4 text-right">{formatUsd(coin.usdValue)}</td>
                          <td className="py-2 px-4 text-right">{parseFloat(coin.availableToWithdraw).toFixed(6)}</td>
                        </tr>
                      ))}
                      
                      {(!accountInfo.coin || accountInfo.coin.length === 0) && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-muted-foreground">
                            No assets found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Account Data</AlertTitle>
                <AlertDescription>
                  Select an exchange to view account information
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          {/* Positions Tab */}
          <TabsContent value="positions" className="space-y-4">
            {loadingAccount ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : positions && positions.length > 0 ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Open Positions</h3>
                  <Button variant="outline" size="sm" onClick={() => fetchAccountInfo(selectedExchangeId)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-2 px-4 text-left font-medium">Symbol</th>
                        <th className="py-2 px-4 text-left font-medium">Side</th>
                        <th className="py-2 px-4 text-right font-medium">Size</th>
                        <th className="py-2 px-4 text-right font-medium">Entry Price</th>
                        <th className="py-2 px-4 text-right font-medium">Mark Price</th>
                        <th className="py-2 px-4 text-right font-medium">PnL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((position: any, index: number) => {
                        // Only show positions with non-zero size
                        if (parseFloat(position.size) === 0) return null;
                        
                        const pnl = parseFloat(position.unrealisedPnl);
                        const pnlColor = pnl > 0 ? 'text-green-600' : pnl < 0 ? 'text-red-600' : '';
                        
                        return (
                          <tr key={`${position.symbol}-${position.side}`} className={index < positions.length - 1 ? 'border-b' : ''}>
                            <td className="py-2 px-4 font-medium">{position.symbol}</td>
                            <td className="py-2 px-4">
                              <Badge 
                                variant="outline" 
                                className={position.side === 'Buy' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}
                              >
                                {position.side}
                              </Badge>
                            </td>
                            <td className="py-2 px-4 text-right">{parseFloat(position.size).toFixed(4)}</td>
                            <td className="py-2 px-4 text-right">{parseFloat(position.entryPrice).toFixed(2)}</td>
                            <td className="py-2 px-4 text-right">{parseFloat(position.markPrice).toFixed(2)}</td>
                            <td className={`py-2 px-4 text-right font-medium ${pnlColor}`}>
                              {pnl > 0 ? '+' : ''}{parseFloat(position.unrealisedPnl).toFixed(4)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Open Positions</AlertTitle>
                <AlertDescription>
                  You don't have any open positions on this exchange
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground">
          Trading on testnet with paper funds. No real assets are at risk.
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="https://testnet.bybit.com/" target="_blank" rel="noopener noreferrer">
            Open Bybit Testnet
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
