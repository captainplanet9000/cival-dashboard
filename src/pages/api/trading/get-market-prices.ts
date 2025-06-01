import { NextApiRequest, NextApiResponse } from 'next';
import { TradingService } from '../../../services/trading-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Accept only GET or POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get the symbol from query parameters or request body
    const symbol = req.method === 'GET' 
      ? req.query.symbol as string 
      : req.body.symbol as string;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol parameter is required'
      });
    }
    
    // Get trading service instance
    const tradingService = TradingService.getInstance();
    
    // Get market prices for the symbol across all exchanges
    const prices = await tradingService.getMarketPrices(symbol);
    
    // Calculate average price and find min/max prices
    const nonEmptyPrices = Object.values(prices).filter(price => price !== undefined);
    
    let stats = {};
    if (nonEmptyPrices.length > 0) {
      const sum = nonEmptyPrices.reduce((total, price) => total + price, 0);
      const avg = sum / nonEmptyPrices.length;
      const min = Math.min(...nonEmptyPrices);
      const max = Math.max(...nonEmptyPrices);
      
      stats = {
        average: avg,
        minimum: min,
        maximum: max,
        spread: max - min,
        spreadPercentage: ((max - min) / min) * 100
      };
    }
    
    return res.status(200).json({
      success: true,
      symbol,
      timestamp: Date.now(),
      prices,
      stats
    });
  } catch (error: unknown) {
    console.error('Error getting market prices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
} 