import { NextApiRequest, NextApiResponse } from 'next';
import { mcpBankingService } from '@/services/mcp/mcp-banking-service';
import { createServerClient } from '@/utils/supabase/server';

/**
 * API endpoint for executing swaps with vault account funding
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Authenticate request
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { vaultAccountId, fromToken, toToken, amount, walletAddress, slippageTolerance, requireApproval, chainId } = req.body;
    
    // Validate required parameters
    if (!vaultAccountId || !fromToken || !toToken || !amount || !walletAddress) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['vaultAccountId', 'fromToken', 'toToken', 'amount', 'walletAddress']
      });
    }
    
    const result = await mcpBankingService.executeSwapWithVault(
      vaultAccountId,
      fromToken,
      toToken,
      amount,
      walletAddress,
      {
        slippageTolerance: parseFloat(slippageTolerance) || 0.5,
        requireApproval: !!requireApproval,
        chainId: parseInt(chainId as string) || 1
      }
    );
    
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error executing swap:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
