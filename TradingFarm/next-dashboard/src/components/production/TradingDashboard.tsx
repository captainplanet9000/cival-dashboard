"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity,
  BarChart2, 
  Clock, 
  ArrowUpDown,
  ChevronsUpDown,
  Check, 
  X, 
  RefreshCw,
  AlertTriangle,
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Layers,
  AlertCircle
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TradingDashboardProps {
  onExecuteTrade?: (tradeData: any) => void;
  onCancelTrade?: (tradeId: string) => void;
}

export function TradingDashboard({
  onExecuteTrade,
  onCancelTrade
}: TradingDashboardProps) {
  // Trading state
  const [activeTab, setActiveTab] = useState("positions");
  const [marketData, setMarketData] = useState(generateMarketData());
  const [selectedMarket, setSelectedMarket] = useState("BTC/USD");
  const [timeframe, setTimeframe] = useState("1h");
  const [refreshing, setRefreshing] = useState(false);
  
  // Mock trade data
  const [positions, setPositions] = useState([
    {
      id: "pos-1",
      symbol: "BTC/USD",
      exchange: "Binance",
      type: "long",
      status: "open",
      openPrice: 67850.42,
      currentPrice: 68243.15,
      size: 0.75,
      value: 51187.36,
      pnl: 294.55,
      pnlPercent: 0.58,
      openTime: "2025-04-12T09:24:15Z",
      agentId: "momentum-trader",
      stopLoss: 66500.00,
      takeProfit: 71500.00
    },
    {
      id: "pos-2",
      symbol: "ETH/USD",
      exchange: "Coinbase",
      type: "long",
      status: "open",
      openPrice: 3245.78,
      currentPrice: 3310.42,
      size: 5.2,
      value: 17214.18,
      pnl: 336.74,
      pnlPercent: 1.99,
      openTime: "2025-04-11T14:38:22Z",
      agentId: "mean-reversion",
      stopLoss: 3100.00,
      takeProfit: 3500.00
    },
    {
      id: "pos-3",
      symbol: "SOL/USD",
      exchange: "Binance",
      type: "short",
      status: "open",
      openPrice: 172.45,
      currentPrice: 168.19,
      size: 35,
      value: 5886.65,
      pnl: 149.10,
      pnlPercent: 2.47,
      openTime: "2025-04-12T11:05:41Z",
      agentId: "volatility-trader",
      stopLoss: 178.50,
      takeProfit: 155.00
    }
  ]);
  
  const [pendingOrders, setPendingOrders] = useState([
    {
      id: "order-1",
      symbol: "BTC/USD",
      exchange: "Binance",
      type: "buy",
      orderType: "limit",
      price: 66500.00,
      size: 0.5,
      value: 33250.00,
      status: "pending",
      createdAt: "2025-04-12T15:22:18Z",
      agentId: "mean-reversion"
    },
    {
      id: "order-2",
      symbol: "ETH/USD",
      exchange: "Coinbase",
      type: "sell",
      orderType: "stop",
      price: 3100.00,
      size: 2.5,
      value: 7750.00,
      status: "pending",
      createdAt: "2025-04-12T14:51:03Z",
      agentId: "momentum-trader"
    }
  ]);
  
  const [tradeHistory, setTradeHistory] = useState([
    {
      id: "trade-1",
      symbol: "BTC/USD",
      exchange: "Binance",
      type: "sell",
      price: 68125.45,
      size: 0.25,
      value: 17031.36,
      pnl: 214.22,
      pnlPercent: 1.27,
      executedAt: "2025-04-12T13:14:32Z",
      agentId: "momentum-trader"
    },
    {
      id: "trade-2",
      symbol: "ETH/USD",
      exchange: "Coinbase",
      type: "buy",
      price: 3245.78,
      size: 1.5,
      value: 4868.67,
      pnl: 0,
      pnlPercent: 0,
      executedAt: "2025-04-12T10:44:15Z",
      agentId: "mean-reversion"
    },
    {
      id: "trade-3",
      symbol: "SOL/USD",
      exchange: "Binance",
      type: "sell",
      price: 175.32,
      size: 25,
      value: 4383.00,
      pnl: -83.25,
      pnlPercent: -1.87,
      executedAt: "2025-04-11T16:22:05Z",
      agentId: "volatility-trader"
    }
  ]);
  
  // Generate market data for the chart
  function generateMarketData() {
    const data = [];
    const prices = [
      67850, 67925, 67890, 68020, 68145, 68035, 68110, 
      68210, 68175, 68243, 68310, 68275, 68340, 68410,
      68350, 68420, 68380, 68450, 68520, 68480, 68550
    ];
    
    const now = new Date();
    for (let i = 0; i < prices.length; i++) {
      const timestamp = new Date(now.getTime() - (prices.length - i) * 60 * 60 * 1000);
      data.push({
        time: timestamp.toISOString(),
        price: prices[i],
        volume: Math.floor(Math.random() * 150) + 50
      });
    }
    
    return data;
  }
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Refresh market data
  const refreshMarketData = () => {
    setRefreshing(true);
    setTimeout(() => {
      setMarketData(generateMarketData());
      setRefreshing(false);
    }, 1000);
  };
  
  // Close position
  const closePosition = (positionId: string) => {
    const position = positions.find(p => p.id === positionId);
    if (position) {
      // Add to trade history
      setTradeHistory(prev => [
        {
          id: `trade-${Date.now()}`,
          symbol: position.symbol,
          exchange: position.exchange,
          type: position.type === "long" ? "sell" : "buy",
          price: position.currentPrice,
          size: position.size,
          value: position.value,
          pnl: position.pnl,
          pnlPercent: position.pnlPercent,
          executedAt: new Date().toISOString(),
          agentId: position.agentId
        },
        ...prev
      ]);
      
      // Remove from positions
      setPositions(prev => prev.filter(p => p.id !== positionId));
    }
  };
  
  // Cancel order
  const cancelOrder = (orderId: string) => {
    setPendingOrders(prev => prev.filter(order => order.id !== orderId));
    
    if (onCancelTrade) {
      onCancelTrade(orderId);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Trading Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor and manage your live trading operations
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Select
            value={selectedMarket}
            onValueChange={setSelectedMarket}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select market" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTC/USD">BTC/USD</SelectItem>
              <SelectItem value="ETH/USD">ETH/USD</SelectItem>
              <SelectItem value="SOL/USD">SOL/USD</SelectItem>
              <SelectItem value="ADA/USD">ADA/USD</SelectItem>
              <SelectItem value="XRP/USD">XRP/USD</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={timeframe}
            onValueChange={setTimeframe}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5m">5m</SelectItem>
              <SelectItem value="15m">15m</SelectItem>
              <SelectItem value="1h">1h</SelectItem>
              <SelectItem value="4h">4h</SelectItem>
              <SelectItem value="1d">1d</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={refreshMarketData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Portfolio Value</CardTitle>
            <CardDescription>Total value across all exchanges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$248,542.68</div>
            <div className="flex items-center text-green-500 text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>+1.8% ($4,412.35)</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Open Positions</CardTitle>
            <CardDescription>Currently active trades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions.length}</div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Layers className="h-4 w-4 mr-1" />
              <span>{pendingOrders.length} pending orders</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Today's P&L</CardTitle>
            <CardDescription>Realized profit and loss</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">+$4,285.43</div>
            <div className="flex items-center text-green-500 text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>+1.72% today</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Active Agents</CardTitle>
            <CardDescription>AI agents with trading authority</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <div className="flex items-center text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span>All systems operational</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Price Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{selectedMarket} {timeframe} Chart</CardTitle>
              <CardDescription>
                Last price: {formatCurrency(marketData[marketData.length - 1]?.price || 0)}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">
              <TrendingUp className="h-4 w-4 mr-1" />
              +0.31%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={marketData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={(time) => {
                    const date = new Date(time);
                    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                  }} 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={['dataMin - 100', 'dataMax + 100']} 
                  tickFormatter={(value) => value.toLocaleString()} 
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(value), "Price"]}
                  labelFormatter={(label) => {
                    const date = new Date(label);
                    return date.toLocaleString();
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.1} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Trading Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="positions">Open Positions</TabsTrigger>
          <TabsTrigger value="orders">Pending Orders</TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="positions" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Active Trading Positions</CardTitle>
              <CardDescription>
                Currently open positions across all exchanges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Entry Price</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Risk Management</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.length > 0 ? positions.map((position) => (
                    <TableRow key={position.id}>
                      <TableCell>
                        <div className="font-medium">{position.symbol}</div>
                        <div className="text-xs text-muted-foreground">{position.exchange}</div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={position.type === "long" ? 
                            "bg-green-500/10 text-green-500 border-green-500/20" : 
                            "bg-red-500/10 text-red-500 border-red-500/20"
                          }
                        >
                          {position.type === "long" ? "Long" : "Short"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {position.size} {position.symbol.split('/')[0]}
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(position.value)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(position.openPrice)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(position.currentPrice)}
                      </TableCell>
                      <TableCell>
                        <div className={position.pnl >= 0 ? "text-green-500" : "text-red-500"}>
                          {position.pnl >= 0 ? "+" : ""}{formatCurrency(position.pnl)}
                          <div className="text-xs">
                            {position.pnl >= 0 ? "+" : ""}{position.pnlPercent.toFixed(2)}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          <div>SL: {formatCurrency(position.stopLoss)}</div>
                          <div>TP: {formatCurrency(position.takeProfit)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => closePosition(position.id)}
                          >
                            Close
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                          >
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Layers className="h-8 w-8 mb-2 opacity-40" />
                          <p>No open positions</p>
                          <p className="text-sm">Trading agents will open positions based on market conditions</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Pending Orders</CardTitle>
              <CardDescription>
                Orders waiting to be filled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Order Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders.length > 0 ? pendingOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-medium">{order.symbol}</div>
                        <div className="text-xs text-muted-foreground">{order.exchange}</div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={order.type === "buy" ? 
                            "bg-green-500/10 text-green-500 border-green-500/20" : 
                            "bg-red-500/10 text-red-500 border-red-500/20"
                          }
                        >
                          {order.type === "buy" ? "Buy" : "Sell"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="capitalize">{order.orderType}</div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(order.price)}
                      </TableCell>
                      <TableCell>
                        {order.size} {order.symbol.split('/')[0]}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(order.value)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-secondary/50">
                          {order.agentId}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelOrder(order.id)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                          >
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Clock className="h-8 w-8 mb-2 opacity-40" />
                          <p>No pending orders</p>
                          <p className="text-sm">Trading agents will create orders based on market conditions</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Trade History</CardTitle>
              <CardDescription>
                Recent executed trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tradeHistory.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>
                        <div className="font-medium">{trade.symbol}</div>
                        <div className="text-xs text-muted-foreground">{trade.exchange}</div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={trade.type === "buy" ? 
                            "bg-green-500/10 text-green-500 border-green-500/20" : 
                            "bg-red-500/10 text-red-500 border-red-500/20"
                          }
                        >
                          {trade.type === "buy" ? "Buy" : "Sell"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(trade.price)}
                      </TableCell>
                      <TableCell>
                        {trade.size} {trade.symbol.split('/')[0]}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(trade.value)}
                      </TableCell>
                      <TableCell>
                        {trade.pnl !== 0 && (
                          <div className={trade.pnl >= 0 ? "text-green-500" : "text-red-500"}>
                            {trade.pnl >= 0 ? "+" : ""}{formatCurrency(trade.pnl)}
                            <div className="text-xs">
                              {trade.pnl >= 0 ? "+" : ""}{trade.pnlPercent.toFixed(2)}%
                            </div>
                          </div>
                        )}
                        {trade.pnl === 0 && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDate(trade.executedAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-secondary/50">
                          {trade.agentId}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
