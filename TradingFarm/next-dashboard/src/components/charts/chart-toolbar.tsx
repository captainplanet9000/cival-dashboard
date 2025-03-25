"use client"

import { Button } from '@/components/ui/button'
import { 
  CandlestickChart, 
  LineChart, 
  BarChart, 
  Download,
  Maximize2,
  PanelTop
} from 'lucide-react'

export type ChartType = 'candles' | 'line' | 'bar'
export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W' | '1M'

interface ChartToolbarProps {
  onTimeframeChange: (timeframe: TimeFrame) => void
  onChartTypeChange: (type: ChartType) => void
  onFullscreen?: () => void
  onExport?: () => void
  onToggleIndicators?: () => void
  currentTimeframe: TimeFrame
  currentChartType: ChartType
  className?: string
}

export function ChartToolbar({
  onTimeframeChange,
  onChartTypeChange,
  onFullscreen,
  onExport,
  onToggleIndicators,
  currentTimeframe,
  currentChartType,
  className = ''
}: ChartToolbarProps) {
  // Timeframe options
  const timeframes: TimeFrame[] = ['1m', '5m', '15m', '1h', '4h', '1D', '1W', '1M']
  
  return (
    <div className={`flex items-center justify-between border-b p-2 bg-card ${className}`}>
      {/* Left side - Chart type selector */}
      <div className="flex items-center space-x-1">
        <Button
          variant={currentChartType === 'candles' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChartTypeChange('candles')}
          className="h-8 w-8 p-0"
          title="Candlestick Chart"
        >
          <CandlestickChart className="h-4 w-4" />
        </Button>
        
        <Button
          variant={currentChartType === 'line' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChartTypeChange('line')}
          className="h-8 w-8 p-0"
          title="Line Chart"
        >
          <LineChart className="h-4 w-4" />
        </Button>
        
        <Button
          variant={currentChartType === 'bar' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChartTypeChange('bar')}
          className="h-8 w-8 p-0"
          title="Bar Chart"
        >
          <BarChart className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Center - Timeframe selector */}
      <div className="flex items-center space-x-1">
        {timeframes.map((tf) => (
          <Button
            key={tf}
            variant={currentTimeframe === tf ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onTimeframeChange(tf)}
            className="text-xs h-7 px-2"
          >
            {tf}
          </Button>
        ))}
      </div>
      
      {/* Right side - Actions */}
      <div className="flex items-center space-x-1">
        {onToggleIndicators && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleIndicators}
            className="h-8 w-8 p-0"
            title="Technical Indicators"
          >
            <PanelTop className="h-4 w-4" />
          </Button>
        )}
        
        {onExport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            className="h-8 w-8 p-0"
            title="Export Chart"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
        
        {onFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onFullscreen}
            className="h-8 w-8 p-0"
            title="Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
