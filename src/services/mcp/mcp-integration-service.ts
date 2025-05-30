import { defiProtocolMcp } from './defi-protocol-mcp';
import { vaultService } from '../vaultService';
import { integrationService } from '../integrationService';
import { ProtocolType, ProtocolAction } from '../../types/defi-protocol-types';
import { TransactionType } from '@/types/vault';
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';

/**
 * MCP Integration Service
 * Connects MCP services with core platform components
 */
export class McpIntegrationService {
  private supabase;
  private isServerSide: boolean;
  private static instance: McpIntegrationService;
  
  /**
   * Private constructor for singleton pattern
   * @param isServerSide Whether this service is being used on the server side
   */
  private constructor(isServerSide = false) {
    this.isServerSide = isServerSide;
    this.supabase = isServerSide 
      ? createServerClient() 
      : createBrowserClient();
  }
  
  /**
   * Get the singleton instance
   * @param isServerSide Whether this service is being used on the server side
   * @returns McpIntegrationService instance
   */
  public static getInstance(isServerSide = false): McpIntegrationService {
    if (!McpIntegrationService.instance) {
      McpIntegrationService.instance = new McpIntegrationService(isServerSide);
    }
    return McpIntegrationService.instance;
  }
  
  /**
   * Execute a protocol action with a linked vault transaction
   * Links a DeFi protocol action with the unified banking system
   * 
   * @param action Protocol action to execute
   * @param vaultAccountId Vault account ID for the transaction
   * @param userAddress User wallet address
   * @param options Additional options
   * @returns Result containing both the protocol result and transaction
   */
  async executeProtocolActionWithVaultTransaction(
    action: ProtocolAction,
    vaultAccountId: string,
    userAddress: string,
    options?: {
      chainId?: number | string;
      description?: string;
      requireApproval?: boolean;
      gasLimit?: number;
    }
  ): Promise<{
    protocolResult: any;
    transactionId: string;
    status: string;
  }> {
    try {
      // Get the vault account details to verify sufficient balance
      const vaultAccount = await vaultService.getVaultAccount(vaultAccountId);
      
      if (!vaultAccount) {
        throw new Error(`Vault account ${vaultAccountId} not found`);
      }
      
      // Estimate gas costs and total value for the transaction
      const estimatedCost = await this.estimateProtocolActionCost(
        action, 
        userAddress,
        options?.chainId
      );
      
      const totalValue = action.params.amount 
        ? parseFloat(action.params.amount.toString()) + estimatedCost.gasCost 
        : estimatedCost.gasCost;
      
      // Check if the vault has sufficient balance
      const balance = await vaultService.getVaultAccountBalance(vaultAccountId);
      
      if (balance.availableBalance < totalValue) {
        throw new Error(
          `Insufficient funds in vault account. Required: ${totalValue} ${balance.currency}, Available: ${balance.availableBalance} ${balance.currency}`
        );
      }
      
      // Create a vault transaction record first (pending)
      const vaultTransaction = await vaultService.createTransaction({
        sourceId: vaultAccountId,
        sourceType: 'vault_account',
        destinationId: `defi_${action.protocol}`,
        destinationType: 'external',
        amount: totalValue,
        currency: balance.currency,
        type: TransactionType.EXTERNAL_TRANSFER,
        description: options?.description || `${action.actionType} operation on ${action.protocol}`,
        metadata: {
          protocolAction: action,
          estimatedGasCost: estimatedCost.gasCost,
          userAddress,
          chainId: options?.chainId
        },
        status: options?.requireApproval ? 'pending_approval' : 'pending'
      });
      
      // If approval is required, return immediately with pending status
      if (options?.requireApproval) {
        return {
          protocolResult: null,
          transactionId: vaultTransaction.id,
          status: 'pending_approval'
        };
      }
      
      // Otherwise, proceed with the protocol action execution
      const protocolResult = await defiProtocolMcp.executeProtocolAction(
        action,
        userAddress,
        options?.chainId
      );
      
      // Update the vault transaction with the result
      await vaultService.updateTransactionStatus(
        vaultTransaction.id,
        'completed',
        'system',
        `Successfully executed ${action.actionType} on ${action.protocol}`
      );
      
      // Record protocol action in activity history
      await this.recordProtocolActivity(
        action, 
        userAddress, 
        vaultAccountId, 
        vaultTransaction.id, 
        protocolResult
      );
      
      return {
        protocolResult,
        transactionId: vaultTransaction.id,
        status: 'completed'
      };
    } catch (error: any) {
      console.error('Error executing protocol action with vault transaction:', error);
      
      // If a transaction was created, update its status to failed
      if (arguments[4]?.transactionId) {
        await vaultService.updateTransactionStatus(
          arguments[4].transactionId,
          'failed',
          'system',
          `Failed to execute ${action.actionType} on ${action.protocol}: ${error.message}`
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Execute an optimized swap with vault account funds
   * @param vaultAccountId Source vault account for funds
   * @param fromToken Token to swap from
   * @param toToken Token to swap to
   * @param amount Amount to swap
   * @param userAddress User wallet address
   * @param options Additional options
   * @returns Swap result and transaction details
   */
  async executeOptimizedSwapWithVault(
    vaultAccountId: string,
    fromToken: string,
    toToken: string,
    amount: string,
    userAddress: string,
    options?: {
      slippageTolerance?: number;
      deadline?: number;
      requireApproval?: boolean;
      description?: string;
    }
  ): Promise<{
    swapResult: any;
    transactionId: string;
    status: string;
  }> {
    try {
      // Get best swap rates first
      const swapRates = await defiProtocolMcp.compareSwapRates(fromToken, toToken, amount);
      
      if (!swapRates || swapRates.length === 0) {
        throw new Error(`No swap routes available for ${fromToken} to ${toToken}`);
      }
      
      // Select the best rate
      const bestSwap = swapRates[0];
      
      // Create a protocol action for the swap
      const action: ProtocolAction = {
        protocol: bestSwap.protocol as ProtocolType,
        actionType: 'swap',
        params: {
          fromToken,
          toToken,
          amount,
          slippageTolerance: options?.slippageTolerance || 0.5,
          deadline: options?.deadline || Math.floor(Date.now() / 1000) + 20 * 60 // 20 minutes
        }
      };
      
      // Execute the action with vault transaction
      return await this.executeProtocolActionWithVaultTransaction(
        action,
        vaultAccountId,
        userAddress,
        {
          requireApproval: options?.requireApproval,
          description: options?.description || `Swap ${amount} ${fromToken} to ${toToken} via ${bestSwap.protocol}`
        }
      );
    } catch (error: any) {
      console.error('Error executing optimized swap with vault:', error);
      throw error;
    }
  }
  
  /**
   * Get user DeFi positions and sync with vault system
   * Links positions from DeFi protocols with the unified banking system
   * 
   * @param userAddress User wallet address
   * @param vaultMasterId Vault master ID
   * @param options Additional options
   * @returns Synced positions
   */
  async syncDefiPositionsWithVault(
    userAddress: string,
    vaultMasterId: string,
    options?: {
      protocolTypes?: ProtocolType[];
      createMissingAccounts?: boolean;
    }
  ): Promise<{
    positions: any[];
    vaultAccounts: any[];
    synced: boolean;
  }> {
    try {
      // Get all user positions across protocols
      const positions = await defiProtocolMcp.getUserPositions(
        userAddress, 
        options?.protocolTypes
      );
      
      // Get all vault accounts for the user
      const vaultAccounts = await vaultService.getVaultAccounts(
        vaultMasterId,
        { type: 'defi' }
      );
      
      const vaultUpdates = [];
      const missingAccounts = [];
      
      // Process each position and update vault accordingly
      for (const position of positions) {
        const protocolName = position.protocol;
        
        // Find matching vault account for this protocol
        const matchingAccount = vaultAccounts.find(
          account => account.metadata?.protocol === protocolName && 
                     account.metadata?.positionId === position.positionId
        );
        
        if (matchingAccount) {
          // Update existing account with position data
          vaultUpdates.push(
            vaultService.updateVaultAccount(matchingAccount.id, {
              balance: position.amountIn,
              metadata: {
                ...matchingAccount.metadata,
                assetIn: position.assetIn,
                assetOut: position.assetOut,
                amountIn: position.amountIn,
                amountOut: position.amountOut,
                leverage: position.leverage,
                healthFactor: position.healthFactor,
                status: position.status,
                lastUpdated: new Date().toISOString()
              }
            })
          );
        } else if (options?.createMissingAccounts) {
          // Create new account for this position
          missingAccounts.push({
            protocol: protocolName,
            position
          });
        }
      }
      
      // Create missing accounts if needed
      if (missingAccounts.length > 0 && options?.createMissingAccounts) {
        for (const item of missingAccounts) {
          const { protocol, position } = item;
          
          const newAccount = await vaultService.createVaultAccount(
            vaultMasterId,
            `${protocol} - ${position.positionId.substring(0, 8)}`,
            'defi',
            position.assetIn,
            {
              protocol,
              userAddress,
              positionId: position.positionId,
              assetIn: position.assetIn,
              assetOut: position.assetOut,
              amountIn: position.amountIn,
              amountOut: position.amountOut,
              leverage: position.leverage,
              healthFactor: position.healthFactor,
              status: position.status,
              lastUpdated: new Date().toISOString()
            }
          );
          
          vaultAccounts.push(newAccount);
        }
      }
      
      // Wait for all updates to complete
      await Promise.all(vaultUpdates);
      
      // Get updated vault accounts
      const updatedVaultAccounts = await vaultService.getVaultAccounts(
        vaultMasterId,
        { type: 'defi' }
      );
      
      return {
        positions,
        vaultAccounts: updatedVaultAccounts,
        synced: true
      };
    } catch (error: any) {
      console.error('Error syncing DeFi positions with vault:', error);
      throw error;
    }
  }
  
  /**
   * Get recommended DeFi actions based on user's vault accounts
   * @param userAddress User wallet address
   * @param vaultMasterId Vault master ID
   * @returns Recommendations with associated vault accounts
   */
  async getRecommendedActionsForVaultAccounts(
    userAddress: string,
    vaultMasterId: string
  ): Promise<{
    recommendations: any[];
    vaultAccounts: any[];
  }> {
    try {
      // Get recommendations from the DeFi MCP
      const recommendations = await defiProtocolMcp.getRecommendedActions(userAddress);
      
      // Get vault accounts to find matching ones
      const vaultAccounts = await vaultService.getVaultAccounts(vaultMasterId);
      
      // Enhance recommendations with vault account information
      const enhancedRecommendations = recommendations.map(rec => {
        // Try to find related vault accounts
        const relatedAccount = vaultAccounts.find(acct => {
          if (rec.type === 'yield_optimization' && 
              acct.metadata?.protocol === rec.currentPosition.protocol &&
              acct.metadata?.positionId === rec.currentPosition.positionId) {
            return true;
          }
          
          if (rec.type === 'swap_opportunity' && 
              acct.currency === rec.token) {
            return true;
          }
          
          return false;
        });
        
        return {
          ...rec,
          vaultAccount: relatedAccount || null,
          executionReady: !!relatedAccount
        };
      });
      
      return {
        recommendations: enhancedRecommendations,
        vaultAccounts
      };
    } catch (error: any) {
      console.error('Error getting recommended actions for vault accounts:', error);
      throw error;
    }
  }
  
  /**
   * Estimate the cost of a protocol action
   * @param action Protocol action
   * @param userAddress User wallet address
   * @param chainId Optional chain ID
   * @returns Estimated cost details
   * @private
   */
  private async estimateProtocolActionCost(
    action: ProtocolAction,
    userAddress: string,
    chainId?: number | string
  ): Promise<{
    gasCost: number;
    tokenAmount: number;
    totalCost: number;
    gasLimit?: number;
  }> {
    // In a real implementation, this would call the protocol connector
    // to get an accurate gas estimate. For now, use simplified estimates.
    
    // Default values based on action type
    let baseCost = 0;
    let gasMultiplier = 1;
    
    switch (action.actionType) {
      case 'swap':
        baseCost = 0.005; // Base cost in ETH
        gasMultiplier = 1.5; // Swaps are more gas intensive
        break;
      case 'supply':
      case 'borrow':
        baseCost = 0.003;
        gasMultiplier = 1.2;
        break;
      case 'withdraw':
      case 'repay':
        baseCost = 0.002;
        gasMultiplier = 1.0;
        break;
      default:
        baseCost = 0.004;
        gasMultiplier = 1.3;
    }
    
    // Calculate total gas cost
    const gasCost = baseCost * gasMultiplier;
    
    // Get token amount from action params
    const tokenAmount = action.params.amount 
      ? parseFloat(action.params.amount.toString()) 
      : 0;
    
    return {
      gasCost,
      tokenAmount,
      totalCost: gasCost + tokenAmount,
      gasLimit: Math.floor(300000 * gasMultiplier) // Estimated gas limit
    };
  }
  
  /**
   * Record protocol activity in the database
   * @param action Protocol action
   * @param userAddress User address
   * @param vaultAccountId Vault account ID
   * @param transactionId Vault transaction ID
   * @param result Protocol action result
   * @private
   */
  private async recordProtocolActivity(
    action: ProtocolAction,
    userAddress: string,
    vaultAccountId: string,
    transactionId: string,
    result: any
  ): Promise<void> {
    try {
      await this.supabase
        .from('defi_protocol_activities')
        .insert({
          protocol: action.protocol,
          action_type: action.actionType,
          user_address: userAddress,
          vault_account_id: vaultAccountId,
          vault_transaction_id: transactionId,
          params: action.params,
          result: result,
          status: 'completed',
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error recording protocol activity:', error);
      // Non-critical error, don't throw
    }
  }
}

// Export singleton instance
export const mcpIntegrationService = McpIntegrationService.getInstance();
