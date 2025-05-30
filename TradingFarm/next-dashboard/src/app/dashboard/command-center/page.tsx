"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { Cpu, ArrowUpRight, LineChart, Clock, Info } from "lucide-react";

import { ElizaCommandCenter } from "@/components/command/eliza-command-center";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSocket } from "@/providers/socket-provider";
import { initializeSocketSimulator } from "@/utils/socket-simulator";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TradingEvent } from "@/types/socket";

export default function CommandCenterPage() {
  const { socket, isConnected, marketData, tradeHistory, agentStatuses } = useSocket();

  // Initialize socket simulator in development environment
  useEffect(() => {
    if (socket && process.env.NODE_ENV === "development") {
      initializeSocketSimulator(socket);
    }
  }, [socket]);

  // Request initial data when connected
  useEffect(() => {
    if (socket && isConnected) {
      // Request market data
      socket.emit(TradingEvent.SUBSCRIBE_MARKET);
    }
  }, [socket, isConnected]);

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">ElizaOS Command Center</h1>
        <div className="flex items-center">
          <Badge variant={isConnected ? "default" : "destructive"} className="mr-2">
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Button variant="outline" size="sm">
            <Clock className="mr-2 h-4 w-4" />
            Real-time
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main command center - 2/3 width on larger screens */}
        <div className="md:col-span-2">
          <ElizaCommandCenter />
        </div>

        {/* Side panels - 1/3 width */}
        <div className="space-y-6">
          {/* Market data card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <LineChart className="h-5 w-5 mr-2 text-primary" />
                Market Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">24h</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketData && marketData.length > 0 ? (
                    marketData.slice(0, 5).map((coin) => (
                      <TableRow key={coin.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {coin.image && (
                              <img 
                                src={coin.image} 
                                alt={coin.name} 
                                className="h-5 w-5 mr-2"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            )}
                            {coin.symbol}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          ${coin.current_price.toLocaleString(undefined, { 
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2 
                          })}
                        </TableCell>
                        <TableCell className={`text-right ${coin.price_change_percentage_24h > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {coin.price_change_percentage_24h > 0 ? '+' : ''}
                          {coin.price_change_percentage_24h.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Loading market data...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Trading agents card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <Cpu className="h-5 w-5 mr-2 text-primary" />
                Trading Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agentStatuses && agentStatuses.length > 0 ? (
                <div className="space-y-4">
                  {agentStatuses.map((agent) => (
                    <div key={agent.id} className="flex flex-col space-y-1 border-b pb-3 last:border-0">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{agent.name}</span>
                        <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                          {agent.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {agent.asset} • {agent.strategy}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">
                          <span className={agent.performance.daily >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {agent.performance.daily >= 0 ? '+' : ''}
                            {agent.performance.daily.toFixed(2)}%
                          </span> today
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {agent.trades} trades
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                  <Cpu className="h-8 w-8 mb-2" />
                  <p>No trading agents active</p>
                  <p className="text-sm">Ask ElizaOS to create or activate agents</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent trades card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <ArrowUpRight className="h-5 w-5 mr-2 text-primary" />
                Recent Trades
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tradeHistory && tradeHistory.length > 0 ? (
                <div className="space-y-3">
                  {tradeHistory.slice(0, 5).map((trade) => (
                    <div key={trade.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <div className="flex items-center">
                        <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'} className="mr-2">
                          {trade.side === 'buy' ? 'BUY' : 'SELL'}
                        </Badge>
                        <div>
                          <div className="font-medium">{trade.symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(trade.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div>${trade.price.toLocaleString(undefined, { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2 
                        })}</div>
                        <div className="text-xs text-muted-foreground">
                          {trade.amount.toFixed(6)} {trade.symbol}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                  <Info className="h-8 w-8 mb-2" />
                  <p>No recent trades</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
