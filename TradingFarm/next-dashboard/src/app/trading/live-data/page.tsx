"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CredentialManager } from '@/components/credential-manager'
import { OrderPlacement } from '@/components/order-placement'
import { useExchangeWebSocket, useExchangeSymbols, useMarketData } from '@/hooks/use-exchange'
import { useWebSocketReconnect, useSystemWebSocket } from '@/hooks/use-websocket'
import { ExchangeType } from '@/services/exchange-service'
import { ExchangeDataType } from '@/services/exchange-websocket-service'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertCircle, Check, RefreshCw, Plug, PlugOff, Siren, LineChart, ArrowBigUp, ArrowBigDown } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default function LiveDataPage() {
  const [exchange, setExchange] = useState<ExchangeType>('bybit')
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [interval, setInterval] = useState('1m')
  const [chartData, setChartData] = useState<any>(null)
  const [recentTrades, setRecentTrades] = useState<any[]>([])
  
  // Get WebSocket connection status
  const { status: wsStatus, reconnect, reconnectAttempts } = useWebSocketReconnect()
  
  // Get symbols for the selected exchange
  const { symbols, isLoading: isLoadingSymbols } = useExchangeSymbols(exchange)
  
  // Get market data for the selected symbol
  const { data: ohlcvData, isLoading: isLoadingMarketData } = useMarketData(symbol, {
    exchange,
    interval,
    limit: 50,
  })
  
  // Subscribe to WebSocket data for the selected symbol
  const { 
    data: wsData, 
    isConnected, 
    subscribe, 
    unsubscribe 
  } = useExchangeWebSocket(exchange, symbol, ExchangeDataType.TRADES)
  
  // Initialize chart data when OHLCV data is loaded
  useEffect(() => {
    if (ohlcvData?.length) {
      const labels = ohlcvData.map(candle => 
        new Date(candle.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      ).reverse()
      
      const prices = ohlcvData.map(candle => candle.close).reverse()
      
      setChartData({
        labels,
        datasets: [
          {
            label: symbol,
            data: prices,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            tension: 0.2,
          },
        ],
      })
    }
  }, [ohlcvData, symbol])
  
  // Handle incoming WebSocket trades data
  useEffect(() => {
    if (wsData && wsData.length > 0) {
      // Format and add new trades to the list
      const formattedTrades = wsData.slice(0, 10).map(trade => ({
        id: trade.id || `${trade.timestamp}-${trade.price}`,
        price: trade.price,
        amount: trade.amount || trade.quantity || trade.size,
        side: trade.side || (trade.direction === 'buy' ? 'Buy' : 'Sell'),
        timestamp: trade.timestamp || Date.now(),
      }))
      
      setRecentTrades(prev => {
        // Combine new trades with existing ones, remove duplicates, and limit to 20
        const combined = [...formattedTrades, ...prev]
        const uniqueTrades = combined.filter((trade, index, self) => 
          index === self.findIndex(t => t.id === trade.id)
        )
        return uniqueTrades.slice(0, 20)
      })
    }
  }, [wsData])
  
  // Reconnect to WebSocket if connection is lost
  useEffect(() => {
    if (wsStatus === 'disconnected' && reconnectAttempts < 3) {
      const timer = setTimeout(() => {
        reconnect()
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [wsStatus, reconnectAttempts, reconnect])
  
  // Subscribe/unsubscribe to WebSocket data when symbol or exchange changes
  useEffect(() => {
    if (symbol && exchange) {
      subscribe({
        symbol,
        type: ExchangeDataType.TRADES
      })
      
      return () => {
        unsubscribe({
          symbol,
          type: ExchangeDataType.TRADES
        })
      }
    }
  }, [symbol, exchange, subscribe, unsubscribe])
  
  // Format connection status badge
  const getConnectionStatusBadge = () => {
    switch (wsStatus) {
      case 'connected':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Plug className="w-3 h-3 mr-1" /> Connected
          </Badge>
        )
      case 'connecting':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Connecting
          </Badge>
        )
      case 'disconnected':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <PlugOff className="w-3 h-3 mr-1" /> Disconnected
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" /> Error
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
            <Siren className="w-3 h-3 mr-1" /> Unknown
          </Badge>
        )
    }
  }
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
    },
  }
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Live Trading Data</h1>
        <div className="flex items-center space-x-2">
          {getConnectionStatusBadge()}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => reconnect()}
            disabled={wsStatus === 'connected' || wsStatus === 'connecting'}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reconnect
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-12 gap-6">
        {/* Exchange & Credential Management */}
        <div className="col-span-12 lg:col-span-4">
          <Tabs defaultValue="credentials">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="credentials">Credentials</TabsTrigger>
              <TabsTrigger value="order">Place Order</TabsTrigger>
            </TabsList>
            
            <TabsContent value="credentials" className="space-y-4">
              <CredentialManager
                defaultExchange={exchange}
                onCredentialsChange={() => {
                  // Force reconnect when credentials change
                  reconnect()
                }}
              />
            </TabsContent>
            
            <TabsContent value="order">
              <OrderPlacement
                exchange={exchange}
                symbols={symbols}
                defaultSymbol={symbol}
                onOrderPlaced={(order) => {
                  console.log('Order placed:', order)
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Market Data & Charts */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{symbol} Chart</CardTitle>
                  <CardDescription>
                    {interval} interval on {exchange}
                  </CardDescription>
                </div>
                
                <div className="flex items-center space-x-2">
                  <select
                    value={exchange}
                    onChange={(e) => setExchange(e.target.value as ExchangeType)}
                    className="text-sm border rounded-md p-1"
                  >
                    <option value="bybit">Bybit</option>
                    <option value="coinbase">Coinbase</option>
                    <option value="hyperliquid">Hyperliquid</option>
                  </select>
                  
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="text-sm border rounded-md p-1"
                    disabled={isLoadingSymbols}
                  >
                    {symbols.map((sym) => (
                      <option key={sym} value={sym}>
                        {sym}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    className="text-sm border rounded-md p-1"
                  >
                    <option value="1m">1m</option>
                    <option value="5m">5m</option>
                    <option value="15m">15m</option>
                    <option value="1h">1h</option>
                    <option value="4h">4h</option>
                    <option value="1d">1D</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="h-[400px] w-full">
                {chartData ? (
                  <Line options={chartOptions} data={chartData} height={400} />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
              <CardDescription>
                Live trades for {symbol} on {exchange}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  <AnimatePresence>
                    {recentTrades.map((trade) => (
                      <motion.div
                        key={trade.id}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex items-center justify-between p-2 rounded-md border">
                          <div className="flex items-center space-x-2">
                            {trade.side === 'Buy' ? (
                              <ArrowBigUp className="h-5 w-5 text-green-500" />
                            ) : (
                              <ArrowBigDown className="h-5 w-5 text-red-500" />
                            )}
                            <span className={trade.side === 'Buy' ? 'text-green-600' : 'text-red-600'}>
                              {trade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-muted-foreground">
                              {trade.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                            </span>
                            
                            <span className="text-xs text-muted-foreground">
                              {new Date(trade.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {recentTrades.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      No trades yet. Waiting for WebSocket data...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
