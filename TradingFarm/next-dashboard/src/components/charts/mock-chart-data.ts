// Mock Chart Data Generator for Trading Farm Dashboard

export interface PriceDataPoint {
  time: string
  open: number
  high: number
  close: number
  low: number
}

export interface VolumeDataPoint {
  time: string
  value: number
}

// Generate random walk price data
export function generateMockPriceData(
  days: number = 60,
  basePrice: number = 50000,
  volatility: number = 0.02,
  startDate: Date = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
): PriceDataPoint[] {
  const data: PriceDataPoint[] = []
  let currentPrice = basePrice
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = formatDate(date)
    
    // Random price movement with volatility
    const changePercent = (Math.random() - 0.5) * volatility * 2
    const priceChange = currentPrice * changePercent
    const open = currentPrice
    const close = currentPrice + priceChange
    
    // High and low are random values between open and close, with some extra range
    const extraRange = Math.abs(priceChange) * 0.5
    const high = Math.max(open, close) + (Math.random() * extraRange)
    const low = Math.min(open, close) - (Math.random() * extraRange)
    
    data.push({
      time: dateStr,
      open,
      high,
      close,
      low
    })
    
    currentPrice = close
  }
  
  return data
}

// Generate matching volume data
export function generateMockVolumeData(
  priceData: PriceDataPoint[],
  baseVolume: number = 1000
): VolumeDataPoint[] {
  return priceData.map(price => {
    const priceChange = Math.abs(price.close - price.open)
    const volumeMultiplier = 1 + (priceChange / price.open) * 10
    
    return {
      time: price.time,
      value: baseVolume * volumeMultiplier * (0.5 + Math.random())
    }
  })
}

// Generate different timeframe data from daily data
export function resampleToTimeframe(
  dailyData: PriceDataPoint[],
  timeframe: '1h' | '4h' | '1D' | '1W' | '1M' = '1D'
): PriceDataPoint[] {
  if (timeframe === '1D') return dailyData
  
  if (timeframe === '1W') {
    const weeklyData: PriceDataPoint[] = []
    let currentWeekData: PriceDataPoint[] = []
    
    for (let i = 0; i < dailyData.length; i++) {
      const date = new Date(dailyData[i].time)
      currentWeekData.push(dailyData[i])
      
      if (date.getDay() === 0 || i === dailyData.length - 1) {
        if (currentWeekData.length > 0) {
          const weekOpen = currentWeekData[0].open
          const weekClose = currentWeekData[currentWeekData.length - 1].close
          const weekHigh = Math.max(...currentWeekData.map(d => d.high))
          const weekLow = Math.min(...currentWeekData.map(d => d.low))
          
          weeklyData.push({
            time: currentWeekData[0].time,
            open: weekOpen,
            high: weekHigh,
            close: weekClose,
            low: weekLow
          })
          
          currentWeekData = []
        }
      }
    }
    
    return weeklyData
  }
  
  if (timeframe === '1M') {
    const monthlyData: PriceDataPoint[] = []
    let currentMonthData: PriceDataPoint[] = []
    let currentMonth = -1
    
    for (const day of dailyData) {
      const date = new Date(day.time)
      const month = date.getMonth()
      
      if (currentMonth !== month) {
        if (currentMonthData.length > 0) {
          const monthOpen = currentMonthData[0].open
          const monthClose = currentMonthData[currentMonthData.length - 1].close
          const monthHigh = Math.max(...currentMonthData.map(d => d.high))
          const monthLow = Math.min(...currentMonthData.map(d => d.low))
          
          monthlyData.push({
            time: currentMonthData[0].time,
            open: monthOpen,
            high: monthHigh,
            close: monthClose,
            low: monthLow
          })
        }
        
        currentMonthData = [day]
        currentMonth = month
      } else {
        currentMonthData.push(day)
      }
    }
    
    // Add the last month
    if (currentMonthData.length > 0) {
      const monthOpen = currentMonthData[0].open
      const monthClose = currentMonthData[currentMonthData.length - 1].close
      const monthHigh = Math.max(...currentMonthData.map(d => d.high))
      const monthLow = Math.min(...currentMonthData.map(d => d.low))
      
      monthlyData.push({
        time: currentMonthData[0].time,
        open: monthOpen,
        high: monthHigh,
        close: monthClose,
        low: monthLow
      })
    }
    
    return monthlyData
  }
  
  // For intraday timeframes, generate from daily data (simplified)
  if (timeframe === '1h' || timeframe === '4h') {
    const hoursPerDay = 24
    const interval = timeframe === '1h' ? 1 : 4
    const pointsPerDay = hoursPerDay / interval
    
    const intradayData: PriceDataPoint[] = []
    
    for (const day of dailyData) {
      const date = new Date(day.time)
      const dayOpen = day.open
      const dayClose = day.close
      const dayHigh = day.high
      const dayLow = day.low
      
      // Generate intraday movement
      for (let i = 0; i < pointsPerDay; i++) {
        const progress = i / pointsPerDay
        // Base price with some random variation
        const basePrice = dayOpen + (dayClose - dayOpen) * progress
        const randomVariation = (Math.random() - 0.5) * (dayHigh - dayLow) * 0.2
        
        const hourDate = new Date(date)
        hourDate.setHours(Math.floor(i * interval))
        hourDate.setMinutes(0)
        hourDate.setSeconds(0)
        
        let open = basePrice
        let close = basePrice + randomVariation
        let high = Math.max(open, close) + Math.random() * (dayHigh - dayLow) * 0.1
        let low = Math.min(open, close) - Math.random() * (dayHigh - dayLow) * 0.1
        
        // Make sure high/low stay within day range
        high = Math.min(high, dayHigh)
        low = Math.max(low, dayLow)
        
        intradayData.push({
          time: formatDate(hourDate, true),
          open,
          high,
          close,
          low
        })
      }
    }
    
    return intradayData
  }
  
  return dailyData
}

// Format date as YYYY-MM-DD or YYYY-MM-DD HH:MM for intraday
function formatDate(date: Date, includeTime: boolean = false): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  if (includeTime) {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }
  
  return `${year}-${month}-${day}`
}

// Helper function to get sample data for various assets
export function getSampleData() {
  const btcData = generateMockPriceData(90, 50000, 0.03)
  const ethData = generateMockPriceData(90, 3000, 0.04)
  const solData = generateMockPriceData(90, 100, 0.06)
  const dogeData = generateMockPriceData(90, 0.1, 0.08)
  
  return {
    'BTC/USD': {
      dailyData: btcData,
      hourlyData: resampleToTimeframe(btcData, '1h'),
      weeklyData: resampleToTimeframe(btcData, '1W'),
      volumeData: generateMockVolumeData(btcData, 3000)
    },
    'ETH/USD': {
      dailyData: ethData,
      hourlyData: resampleToTimeframe(ethData, '1h'),
      weeklyData: resampleToTimeframe(ethData, '1W'),
      volumeData: generateMockVolumeData(ethData, 5000)
    },
    'SOL/USD': {
      dailyData: solData,
      hourlyData: resampleToTimeframe(solData, '1h'),
      weeklyData: resampleToTimeframe(solData, '1W'),
      volumeData: generateMockVolumeData(solData, 10000)
    },
    'DOGE/USD': {
      dailyData: dogeData,
      hourlyData: resampleToTimeframe(dogeData, '1h'),
      weeklyData: resampleToTimeframe(dogeData, '1W'),
      volumeData: generateMockVolumeData(dogeData, 20000)
    }
  }
}
