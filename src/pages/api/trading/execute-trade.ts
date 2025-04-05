import { NextApiRequest, NextApiResponse } from 'next';
import { TradingService } from '../../../services/trading-service';
import { ExchangeType, OrderSide, OrderType, TimeInForce } from '../../../types/exchange-types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests for security
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const {
      exchange,
      symbol,
      side,
      quantity,
      type,
      price,
      timeInForce,
      agentId,
      useBestPrice = false
    } = req.body;
    
    // Validate required parameters
    if (!symbol || !side || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: symbol, side, and quantity are required'
      });
    }
    
    // Validate exchange unless using best price routing
    if (!useBestPrice && !exchange) {
      return res.status(400).json({
        success: false,
        error: 'Exchange parameter is required unless useBestPrice is true'
      });
    }
    
    // Validate order side
    if (side !== OrderSide.BUY && side !== OrderSide.SELL) {
      return res.status(400).json({
        success: false,
        error: 'Invalid side parameter: must be "buy" or "sell"'
      });
    }
    
    // Get trading service instance
    const tradingService = TradingService.getInstance();
    
    // Check if agent trading is enabled when agent ID is provided
    if (agentId && !tradingService.isAgentTradingEnabled()) {
      return res.status(403).json({
        success: false,
        error: 'Agent trading is currently disabled'
      });
    }
    
    let result;
    
    // Execute trade using smart routing or on specific exchange
    if (useBestPrice) {
      result = await tradingService.executeSmartTrade({
        symbol,
        side: side as OrderSide,
        quantity: parseFloat(quantity),
        type: type as OrderType,
        price: price ? parseFloat(price) : undefined,
        timeInForce: timeInForce as TimeInForce,
        agentId
      });
    } else {
      result = await tradingService.executeTrade({
        exchange: exchange as ExchangeType,
        symbol,
        side: side as OrderSide,
        quantity: parseFloat(quantity),
        type: type as OrderType,
        price: price ? parseFloat(price) : undefined,
        timeInForce: timeInForce as TimeInForce,
        agentId
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Trade executed successfully',
      trade: result
    });
  } catch (error: unknown) {
    console.error('Error executing trade:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
} 