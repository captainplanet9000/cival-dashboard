import { NextApiRequest, NextApiResponse } from 'next';
import { TradingService } from '../../../services/trading-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests for security
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get instance of trading service
    const tradingService = TradingService.getInstance();
    
    // Initialize with test credentials
    tradingService.initializeWithTestCredentials();
    
    // Enable agent trading if specified in the request
    const { enableAgentTrading } = req.body;
    if (enableAgentTrading === true) {
      tradingService.setAgentTradingEnabled(true);
    }
    
    // Test connections to all exchanges
    const connectionResults = await tradingService.testConnections();
    
    // Return connection status
    return res.status(200).json({
      success: true,
      message: 'Trading service initialized with test credentials',
      connections: connectionResults
    });
  } catch (error: unknown) {
    console.error('Error initializing test connectors:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
} 