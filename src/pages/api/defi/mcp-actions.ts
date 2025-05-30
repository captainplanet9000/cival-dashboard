import { NextApiRequest, NextApiResponse } from 'next';
import { mcpIntegrationService } from '@/services/mcp/mcp-integration-service';
import { ProtocolAction, ProtocolType } from '@/types/defi-protocol-types';
import { createServerClient } from '@/utils/supabase/server';

/**
 * API route for DeFi Protocol MCP actions
 * Provides an interface for the frontend to interact with the MCP integration service
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Create server-side Supabase client for auth
  const supabase = createServerClient();
  
  // Get the current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { action, vaultAccountId, userAddress, chainId, requireApproval, actionType } = req.body;
    
    // Handle different action types
    switch (actionType) {
      case 'execute-protocol-action':
        if (!action || !vaultAccountId || !userAddress) {
          return res.status(400).json({ 
            error: 'Missing required parameters. Required: action, vaultAccountId, userAddress' 
          });
        }
        
        // Validate protocol action
        if (!action.protocol || !action.actionType || !action.params) {
          return res.status(400).json({
            error: 'Invalid protocol action. Must include protocol, actionType, and params.'
          });
        }
        
        const result = await mcpIntegrationService.executeProtocolActionWithVaultTransaction(
          action as ProtocolAction,
          vaultAccountId,
          userAddress,
          {
            chainId,
            requireApproval: !!requireApproval,
            description: `${action.actionType} on ${action.protocol}`
          }
        );
        
        return res.status(200).json(result);
        
      case 'optimized-swap':
        const { fromToken, toToken, amount, slippageTolerance, deadline } = req.body;
        
        if (!fromToken || !toToken || !amount || !vaultAccountId || !userAddress) {
          return res.status(400).json({
            error: 'Missing required parameters for swap. Required: fromToken, toToken, amount, vaultAccountId, userAddress'
          });
        }
        
        const swapResult = await mcpIntegrationService.executeOptimizedSwapWithVault(
          vaultAccountId,
          fromToken,
          toToken,
          amount,
          userAddress,
          {
            slippageTolerance,
            deadline,
            requireApproval: !!requireApproval
          }
        );
        
        return res.status(200).json(swapResult);
        
      case 'sync-positions':
        const { vaultMasterId, createMissingAccounts, protocolTypes } = req.body;
        
        if (!userAddress || !vaultMasterId) {
          return res.status(400).json({
            error: 'Missing required parameters. Required: userAddress, vaultMasterId'
          });
        }
        
        const syncResult = await mcpIntegrationService.syncDefiPositionsWithVault(
          userAddress,
          vaultMasterId,
          {
            protocolTypes: protocolTypes as ProtocolType[],
            createMissingAccounts: !!createMissingAccounts
          }
        );
        
        return res.status(200).json(syncResult);
        
      case 'recommendations':
        const { vaultMasterId: masterIdForRecs } = req.body;
        
        if (!userAddress || !masterIdForRecs) {
          return res.status(400).json({
            error: 'Missing required parameters. Required: userAddress, vaultMasterId'
          });
        }
        
        const recommendations = await mcpIntegrationService.getRecommendedActionsForVaultAccounts(
          userAddress,
          masterIdForRecs
        );
        
        return res.status(200).json(recommendations);
        
      default:
        return res.status(400).json({
          error: 'Invalid actionType. Must be one of: execute-protocol-action, optimized-swap, sync-positions, recommendations'
        });
    }
  } catch (error: any) {
    console.error('Error in DeFi MCP Actions API:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
}
