"use client"

import { useState } from "react"
import { AdvancedChart } from "@/components/charts/advanced-chart"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { getSampleData } from "@/components/charts/mock-chart-data"
import { ChartType, TimeFrame } from "@/components/charts/chart-toolbar"
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  TrendingDown, 
  Signal 
} from "lucide-react"

export default function ChartsDashboard() {
  const [activeSymbol, setActiveSymbol] = useState<string>("BTC/USD")
  const [activeTimeframe, setActiveTimeframe] = useState<TimeFrame>("1D")
  const [activeChartType, setActiveChartType] = useState<ChartType>("candles")
  
  // Get sample data for price cards
  const allData = getSampleData()
  const symbols = Object.keys(allData)
  
  // Calculate market data from sample data
  const marketData = symbols.map(symbol => {
    const data = allData[symbol as keyof typeof allData]
    const prices = data.dailyData
    const lastPrice = prices[prices.length - 1].close
    const prevPrice = prices[prices.length - 2].close
    const change = lastPrice - prevPrice
    const changePercent = (change / prevPrice) * 100
    
    // Calculate performance indicators
    const weekStart = prices[prices.length - 7]?.open || prices[0].open
    const weekChange = ((lastPrice - weekStart) / weekStart) * 100
    
    // Calculate volume
    const lastVolume = data.volumeData[data.volumeData.length - 1].value
    const prevVolume = data.volumeData[data.volumeData.length - 2].value
    const volumeChange = ((lastVolume - prevVolume) / prevVolume) * 100
    
    return {
      symbol,
      price: lastPrice,
      change,
      changePercent,
      weekChange,
      volume: lastVolume,
      volumeChange
    }
  })
  
  // Get selected symbol data
  const selectedMarketData = marketData.find(m => m.symbol === activeSymbol) || marketData[0]
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Market Charts</h1>
        <p className="text-muted-foreground">
          Real-time market data and technical analysis charts
        </p>
      </div>
      
      {/* Market Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {marketData.map((data) => (
          <Card 
            key={data.symbol}
            className={`hover:border-primary cursor-pointer transition-all ${
              data.symbol === activeSymbol ? "border-primary bg-muted/30" : ""
            }`}
            onClick={() => setActiveSymbol(data.symbol)}
          >
            <CardHeader className="py-4 px-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{data.symbol}</CardTitle>
                  <CardDescription>
                    Trading Volume: {data.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </CardDescription>
                </div>
                <div className={`flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${
                  data.weekChange >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                }`}>
                  {data.weekChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {data.weekChange >= 0 ? "+" : ""}{data.weekChange.toFixed(2)}%
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-2 px-4">
              <div className="flex justify-between items-center">
                <div className="text-2xl font-bold">
                  ${data.price < 1 ? data.price.toFixed(4) : data.price.toLocaleString(undefined, { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
                <div className={`flex items-center ${data.changePercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {data.changePercent >= 0 ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                  <span>{data.changePercent >= 0 ? "+" : ""}{data.changePercent.toFixed(2)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Main Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AdvancedChart 
            symbol={activeSymbol} 
            defaultTimeframe={activeTimeframe}
            defaultChartType={activeChartType}
            height={500}
            showToolbar={true}
            allowFullscreen={true}
          />
        </div>
        
        <div className="space-y-6">
          {/* Market Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Market Information</CardTitle>
              <CardDescription>
                {activeSymbol} Market Details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Market Cap</span>
                  <span className="font-medium">$178.4B</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">24h Volume</span>
                  <span className="font-medium">${(selectedMarketData.volume * selectedMarketData.price).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Circulating Supply</span>
                  <span className="font-medium">19.4M</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">24h High</span>
                  <span className="font-medium">${(selectedMarketData.price * 1.05).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">24h Low</span>
                  <span className="font-medium">${(selectedMarketData.price * 0.95).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Trading Signals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trading Signals</CardTitle>
              <CardDescription>
                Technical Analysis Indicators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Signal className="h-4 w-4 mr-2 text-green-500" />
                    <span>MACD</span>
                  </div>
                  <div className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded text-xs font-medium">BUY</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Signal className="h-4 w-4 mr-2 text-yellow-500" />
                    <span>RSI (14)</span>
                  </div>
                  <div className="bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded text-xs font-medium">NEUTRAL</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Signal className="h-4 w-4 mr-2 text-green-500" />
                    <span>Moving Avg (50)</span>
                  </div>
                  <div className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded text-xs font-medium">BUY</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Signal className="h-4 w-4 mr-2 text-red-500" />
                    <span>Bollinger Bands</span>
                  </div>
                  <div className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-xs font-medium">SELL</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Signal className="h-4 w-4 mr-2 text-green-500" />
                    <span>Overall Signal</span>
                  </div>
                  <div className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded text-xs font-medium">BUY</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Active Agents Monitoring This Asset */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trading Farm Agents</CardTitle>
              <CardDescription>
                Agents monitoring {activeSymbol}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                    <span>BTC Trend Follower</span>
                  </div>
                  <div className="text-sm text-green-500">+12.4%</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                    <span>Crypto Momentum</span>
                  </div>
                  <div className="text-sm text-green-500">+8.7%</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-red-500 mr-2"></div>
                    <span>Volatility Harvester</span>
                  </div>
                  <div className="text-sm text-red-500">-2.3%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Additional Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Tabs defaultValue="price">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="price">Price Comparison</TabsTrigger>
            <TabsTrigger value="volume">Volume Analysis</TabsTrigger>
          </TabsList>
          <TabsContent value="price">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Market Comparison</CardTitle>
                <CardDescription>
                  Price performance across major assets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <AdvancedChart 
                    symbol="ETH/USD" 
                    defaultTimeframe="1W"
                    defaultChartType="line"
                    height={300}
                    showToolbar={false}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="volume">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Volume Analysis</CardTitle>
                <CardDescription>
                  Trading volume trends over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <AdvancedChart 
                    symbol="BTC/USD" 
                    defaultTimeframe="1D"
                    defaultChartType="bar"
                    height={300}
                    showToolbar={false}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <Tabs defaultValue="correlation">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="correlation">Correlation</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          <TabsContent value="correlation">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Asset Correlation</CardTitle>
                <CardDescription>
                  How assets move in relation to each other
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <AdvancedChart 
                    symbol="SOL/USD" 
                    defaultTimeframe="1W"
                    defaultChartType="line"
                    height={300}
                    showToolbar={false}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Metrics</CardTitle>
                <CardDescription>
                  Comparative performance analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <AdvancedChart 
                    symbol="DOGE/USD" 
                    defaultTimeframe="1M"
                    defaultChartType="candles"
                    height={300}
                    showToolbar={false}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
