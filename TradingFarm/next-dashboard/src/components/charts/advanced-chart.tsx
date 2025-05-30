"use client"

import { useState, useEffect } from 'react'
import { PriceChart } from './price-chart'
import { ChartToolbar, ChartType, TimeFrame } from './chart-toolbar'
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import { 
  getSampleData, 
  PriceDataPoint, 
  VolumeDataPoint,
  resampleToTimeframe
} from './mock-chart-data'

interface AdvancedChartProps {
  symbol?: string
  defaultTimeframe?: TimeFrame
  defaultChartType?: ChartType
  height?: number
  showToolbar?: boolean
  allowFullscreen?: boolean
  className?: string
}

export function AdvancedChart({
  symbol = 'BTC/USD',
  defaultTimeframe = '1D',
  defaultChartType = 'candles',
  height = 500,
  showToolbar = true,
  allowFullscreen = true,
  className = ''
}: AdvancedChartProps) {
  const [timeframe, setTimeframe] = useState<TimeFrame>(defaultTimeframe)
  const [chartType, setChartType] = useState<ChartType>(defaultChartType)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [priceData, setPriceData] = useState<PriceDataPoint[]>([])
  const [volumeData, setVolumeData] = useState<VolumeDataPoint[]>([])
  
  // Load initial chart data
  useEffect(() => {
    const allData = getSampleData()
    const symbolData = allData[symbol as keyof typeof allData]
    
    if (symbolData) {
      switch (timeframe) {
        case '1h':
        case '4h':
          setPriceData(symbolData.hourlyData)
          break
        case '1W':
          setPriceData(symbolData.weeklyData)
          break
        case '1D':
        default:
          setPriceData(symbolData.dailyData)
          break
      }
      
      setVolumeData(symbolData.volumeData)
    }
  }, [symbol, timeframe])
  
  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe: TimeFrame) => {
    setTimeframe(newTimeframe)
    
    // When timeframe changes, we would normally fetch new data from API
    // For now, let's simulate this with our mock data
    const allData = getSampleData()
    const symbolData = allData[symbol as keyof typeof allData]
    
    if (symbolData) {
      let newPriceData: PriceDataPoint[] = []
      
      switch (newTimeframe) {
        case '1m':
        case '5m':
        case '15m':
        case '1h':
        case '4h':
          newPriceData = resampleToTimeframe(symbolData.dailyData, '1h')
          break
        case '1W':
          newPriceData = symbolData.weeklyData
          break
        case '1M':
          newPriceData = resampleToTimeframe(symbolData.dailyData, '1M')
          break
        case '1D':
        default:
          newPriceData = symbolData.dailyData
          break
      }
      
      setPriceData(newPriceData)
    }
  }
  
  // Handle chart type change
  const handleChartTypeChange = (newChartType: ChartType) => {
    setChartType(newChartType)
  }
  
  // Toggle fullscreen
  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }
  
  // Get last price and calculate change
  const lastPrice = priceData.length > 0 ? priceData[priceData.length - 1].close : 0
  const previousPrice = priceData.length > 1 ? priceData[priceData.length - 2].close : lastPrice
  const priceChange = lastPrice - previousPrice
  const priceChangePercent = previousPrice ? (priceChange / previousPrice) * 100 : 0
  const isPriceUp = priceChange >= 0
  
  return (
    <Card className={`${className} ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
      {showToolbar && (
        <ChartToolbar
          currentTimeframe={timeframe}
          currentChartType={chartType}
          onTimeframeChange={handleTimeframeChange}
          onChartTypeChange={handleChartTypeChange}
          onFullscreen={allowFullscreen ? handleFullscreen : undefined}
          onToggleIndicators={() => {}}
          onExport={() => {}}
        />
      )}
      
      <CardHeader className="px-4 py-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">{symbol}</CardTitle>
          <CardDescription>
            {timeframe} Chart
          </CardDescription>
        </div>
        
        <div className="flex flex-col items-end">
          <div className="text-lg font-semibold">
            ${lastPrice.toLocaleString(undefined, { 
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </div>
          <div className={`text-sm ${isPriceUp ? 'text-green-500' : 'text-red-500'}`}>
            {isPriceUp ? '+' : ''}{priceChange.toFixed(2)} ({isPriceUp ? '+' : ''}{priceChangePercent.toFixed(2)}%)
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <PriceChart
          symbol={symbol}
          priceData={priceData}
          volumeData={volumeData}
          timeframe={timeframe}
          height={isFullscreen ? window.innerHeight - 120 : height}
          className="border-0"
        />
      </CardContent>
    </Card>
  )
}
