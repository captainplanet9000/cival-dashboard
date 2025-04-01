import express, { Request, Response } from 'express';
import { ServiceRegistry } from '../services/service-registry';
import { ExchangeType, OrderSide, OrderType } from '../types/exchange-types';
import { initializeServices } from '../scripts/init-services';

// Initialize services
initializeServices().catch(error => {
  console.error('Error initializing services:', error);
  process.exit(1);
});

const router = express.Router();
const serviceRegistry = ServiceRegistry.getInstance();

/**
 * Get market data for a symbol
 */
router.get('/market-data/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    
    const marketData = await serviceRegistry.marketStackService.getEndOfDay(symbol);
    
    res.json({ success: true, data: marketData });
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get AI analysis of a market
 */
router.get('/market-analysis/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    
    // Get market data
    const marketData = await serviceRegistry.marketStackService.getEndOfDay(symbol);
    
    // Get AI analysis
    const analysis = await serviceRegistry.openAIService.analyzeMarket(symbol, marketData);
    
    // Store analysis in vector database for later reference
    await serviceRegistry.neonPgVectorService.storeMarketCondition(
      symbol,
      marketData,
      analysis.technicalFactors.reduce((acc, factor) => {
        acc[factor.indicator] = factor.value;
        return acc;
      }, {}),
      analysis.fundamentalFactors?.reduce((acc, factor) => {
        acc[factor.factor] = factor.impact;
        return acc;
      }, {}),
      analysis.newsImpact
    );
    
    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('Error analyzing market:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate a trading strategy
 */
router.post('/generate-strategy', async (req: Request, res: Response) => {
  try {
    const { marketContext, riskTolerance } = req.body;
    
    if (!marketContext) {
      return res.status(400).json({ 
        success: false, 
        error: 'Market context is required' 
      });
    }
    
    // Generate strategy
    const strategy = await serviceRegistry.openAIService.generateStrategy(
      marketContext,
      riskTolerance || 'moderate'
    );
    
    // Store strategy in vector database
    const strategyId = await serviceRegistry.neonPgVectorService.storeStrategy(
      `Strategy ${new Date().toISOString()}`,
      'AI generated strategy based on market context',
      strategy,
      { riskTolerance, generatedAt: new Date().toISOString() }
    );
    
    res.json({ 
      success: true, 
      data: { 
        strategyId,
        strategy 
      } 
    });
  } catch (error) {
    console.error('Error generating strategy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Find similar market conditions
 */
router.post('/similar-markets', async (req: Request, res: Response) => {
  try {
    const { description, limit } = req.body;
    
    if (!description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Market description is required' 
      });
    }
    
    const similarMarkets = await serviceRegistry.neonPgVectorService
      .findSimilarMarketConditions(description, limit || 5);
    
    res.json({ success: true, data: similarMarkets });
  } catch (error) {
    console.error('Error finding similar markets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get account balances across all exchanges
 */
router.get('/balances', async (req: Request, res: Response) => {
  try {
    const balances = await serviceRegistry.exchangeConnector.getAllBalances();
    
    res.json({ success: true, data: balances });
  } catch (error) {
    console.error('Error fetching balances:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Place an order using Smart Order Routing
 */
router.post('/place-order', async (req: Request, res: Response) => {
  try {
    const { symbol, side, quantity, type, price } = req.body;
    
    if (!symbol || !side || !quantity) {
      return res.status(400).json({ 
        success: false, 
        error: 'Symbol, side, and quantity are required' 
      });
    }
    
    // Validate side
    if (!Object.values(OrderSide).includes(side)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid order side. Must be buy or sell.' 
      });
    }
    
    // Validate type
    const orderType = type || OrderType.MARKET;
    if (!Object.values(OrderType).includes(orderType)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid order type. Must be market, limit, stop, or stop_limit.' 
      });
    }
    
    // Place order using Smart Order Routing
    const order = await serviceRegistry.exchangeConnector.smartOrderRouting(
      symbol,
      side as OrderSide,
      parseFloat(quantity),
      orderType as OrderType,
      price ? parseFloat(price) : undefined
    );
    
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get gas price estimates for Ethereum
 */
router.get('/gas-prices', async (req: Request, res: Response) => {
  try {
    const gasPrices = await serviceRegistry.alchemyService.getGasPrices();
    
    res.json({ success: true, data: gasPrices });
  } catch (error) {
    console.error('Error fetching gas prices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Simulate an Ethereum transaction
 */
router.post('/simulate-transaction', async (req: Request, res: Response) => {
  try {
    const { fromAddress, toAddress, amountInEth, data } = req.body;
    
    if (!fromAddress || !toAddress || !amountInEth) {
      return res.status(400).json({ 
        success: false, 
        error: 'From address, to address, and amount are required' 
      });
    }
    
    const simulation = await serviceRegistry.alchemyService.simulateTransaction(
      fromAddress,
      toAddress,
      amountInEth,
      data
    );
    
    res.json({ success: true, data: simulation });
  } catch (error) {
    console.error('Error simulating transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router; 