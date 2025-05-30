"use client"

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, IChartApi } from 'lightweight-charts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTheme } from 'next-themes'

interface PriceData {
  time: string
  open: number
  high: number
  close: number
  low: number
}

interface VolumeData {
  time: string
  value: number
}

interface PriceChartProps {
  symbol: string
  priceData: PriceData[]
  volumeData?: VolumeData[]
  timeframe?: string
  height?: number
  className?: string
}

export function PriceChart({
  symbol,
  priceData,
  volumeData = [],
  timeframe = '1D',
  height = 400,
  className = ''
}: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chart, setChart] = useState<IChartApi | null>(null)
  const { theme } = useTheme()
  const isDarkTheme = theme === 'dark'

  // Initialize chart on component mount
  useEffect(() => {
    if (chartContainerRef.current && !chart) {
      const chartOptions = {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: isDarkTheme ? '#E0E0E0' : '#191919',
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
        },
        grid: {
          vertLines: { color: isDarkTheme ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.07)' },
          horzLines: { color: isDarkTheme ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.07)' },
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: isDarkTheme ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
            width: 1,
            style: 0,
            labelBackgroundColor: isDarkTheme ? '#555' : '#B0B0B0',
          },
          horzLine: {
            color: isDarkTheme ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
            width: 1,
            style: 0,
            labelBackgroundColor: isDarkTheme ? '#555' : '#B0B0B0',
          },
        },
        timeScale: {
          borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          timeVisible: true,
          secondsVisible: false,
        },
        localization: {
          dateFormat: 'yyyy-MM-dd',
        },
        handleScroll: {
          vertTouchDrag: true,
        },
      }

      const newChart = createChart(chartContainerRef.current, {
        ...chartOptions,
        width: chartContainerRef.current.clientWidth,
        height: height,
      })
      
      // Add candlestick series
      const candlestickSeries = newChart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      })
      
      candlestickSeries.setData(priceData)
      
      // Add volume series if data is provided
      if (volumeData && volumeData.length > 0) {
        const volumeSeries = newChart.addHistogramSeries({
          color: '#26a69a',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '',
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
        })
        
        volumeSeries.setData(volumeData)
      }
      
      // Adjust chart size on window resize
      const handleResize = () => {
        if (chartContainerRef.current) {
          newChart.applyOptions({ 
            width: chartContainerRef.current.clientWidth 
          })
        }
      }
      
      window.addEventListener('resize', handleResize)
      
      setChart(newChart)
      
      // Clean up
      return () => {
        window.removeEventListener('resize', handleResize)
        if (newChart) {
          newChart.remove()
        }
      }
    }
  }, [chartContainerRef, chart, isDarkTheme, height, priceData, volumeData])
  
  // Update chart when theme changes
  useEffect(() => {
    if (chart) {
      chart.applyOptions({
        layout: {
          textColor: isDarkTheme ? '#E0E0E0' : '#191919',
        },
        grid: {
          vertLines: { color: isDarkTheme ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.07)' },
          horzLines: { color: isDarkTheme ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.07)' },
        },
      })
    }
  }, [chart, isDarkTheme])

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{symbol}</CardTitle>
            <CardDescription className="text-xs">
              {timeframe} Timeframe
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Last Price:</span>
            <span className="text-sm font-semibold text-primary">
              ${priceData.length > 0 ? priceData[priceData.length - 1].close.toFixed(2) : 'N/A'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={chartContainerRef} 
          className="w-full" 
          style={{ height: `${height}px` }}
        />
      </CardContent>
    </Card>
  )
}
