import { NextApiRequest, NextApiResponse } from 'next';
import { mcpBankingService } from '@/services/mcp/mcp-banking-service';
import { createServerClient } from '@/utils/supabase/server';

/**
 * API endpoint for getting market analysis from MCP servers
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Authenticate request
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { symbol, includeTechnical, includeSentiment, includePrice, timeframe } = req.query;
    
    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({ error: 'Symbol parameter is required' });
    }
    
    const options = {
      includeTechnical: includeTechnical === 'true',
      includeSentiment: includeSentiment === 'true',
      includePrice: includePrice === 'true',
      timeframe: typeof timeframe === 'string' ? timeframe : '1d'
    };
    
    const analysis = await mcpBankingService.getMarketAnalysis(symbol, options);
    return res.status(200).json(analysis);
  } catch (error: any) {
    console.error('Error in market analysis API:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
