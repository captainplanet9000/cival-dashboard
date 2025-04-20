/**
 * Trading Farm Multi-Chain Integration
 * SonicGatewayBridgeProvider - Bridge implementation using Sonic's native Gateway
 * Specialized for ETH/ERC20 transfers between Ethereum and Sonic
 */

import { IBridgeProvider, BridgeParams, BridgeQuote, BridgeResult } from './bridge-provider-interface';
import { BridgeTransaction, BridgeProviderConfig } from '@/types/bridge.types';
import { createServerClient } from '@/utils/supabase/server';

/**
 * Implementation of the Bridge Provider for Sonic Gateway
 * In a production environment, this would integrate with ethers.js
 * and Sonic Gateway contracts
 */
export class SonicGatewayBridgeProvider implements IBridgeProvider {
  public readonly providerType = 'sonic_gateway' as const;
  public readonly supportedSourceChains: string[] = ['evm', 'sonic'];
  public readonly supportedDestinationChains: string[] = ['evm', 'sonic'];
  
  private providerConfigs: Map<string, BridgeProviderConfig> = new Map();
  
  constructor() {
    // Load provider configurations from database
    this.loadProviderConfigs();
  }
  
  /**
   * Check if this provider supports bridging between the given chains
   */
  supportsRoute(sourceChain: string, destinationChain: string): boolean {
    // Sonic Gateway only supports EVM<->Sonic transfers
    if (
      (sourceChain === 'evm' && destinationChain === 'sonic') ||
      (sourceChain === 'sonic' && destinationChain === 'evm')
    ) {
      const configKey = `${sourceChain}-${destinationChain}`;
      return this.providerConfigs.has(configKey);
    }
    return false;
  }
  
  /**
   * Get a quote for bridging assets between chains
   * In a real implementation, this would calculate fees based on Sonic Gateway
   */
  async getQuote(params: Omit<BridgeParams, 'sourceVaultId' | 'sourceMultisigAddress' | 'destinationMultisigAddress'>): Promise<BridgeQuote> {
    console.log(`[SonicGateway] Getting quote for ${params.sourceAsset.amount} ${params.sourceAsset.assetSymbol} from ${params.sourceAsset.chainSlug} to ${params.destinationChain}`);
    
    // Check if route is supported
    if (!this.supportsRoute(params.sourceAsset.chainSlug, params.destinationChain)) {
      throw new Error(`Sonic Gateway does not support bridging from ${params.sourceAsset.chainSlug} to ${params.destinationChain}`);
    }
    
    // In a real implementation, this would calculate fees based on current gas prices
    // and Sonic Gateway contract state
    
    // Different fee structure depending on direction
    let fee: number;
    
    if (params.sourceAsset.chainSlug === 'evm' && params.destinationChain === 'sonic') {
      // L1 to L2 deposits have higher gas on Ethereum
      fee = parseFloat(params.sourceAsset.amount) * 0.0015; // 0.15%
    } else {
      // L2 to L1 withdrawals pay a fixed L2 gas fee plus a security fee
      fee = parseFloat(params.sourceAsset.amount) * 0.005; // 0.5%
    }
    
    const slippage = params.slippageTolerance || 0.1; // Sonic Gateway has minimal slippage
    const expectedOutput = (parseFloat(params.sourceAsset.amount) - fee).toString();
    const minOutput = (parseFloat(params.sourceAsset.amount) - fee - (parseFloat(params.sourceAsset.amount) * slippage / 100)).toString();
    
    return {
      sourceAsset: params.sourceAsset,
      destinationAsset: params.destinationAsset,
      expectedOutput,
      minOutput,
      fee: {
        amount: fee.toString(),
        token: params.sourceAsset.assetSymbol
      },
      exchangeRate: '1.00', // 1:1 for Sonic Gateway
      estimatedGasCost: {
        sourceChain: params.sourceAsset.chainSlug === 'evm' ? '0.01 ETH' : '0.0005 ETH',
        destinationChain: 'Included in fee'
      },
      estimatedTimeMinutes: params.sourceAsset.chainSlug === 'evm' ? 10 : 60, // L1->L2 is faster than L2->L1
      provider: 'Sonic Gateway',
      providerType: this.providerType,
      validUntil: Math.floor(Date.now() / 1000) + 300 // 5 minutes
    };
  }
  
  /**
   * Execute a bridge transaction using Sonic Gateway
   * In a real implementation, this would use ethers.js to interact with Sonic Gateway contracts
   */
  async executeBridge(params: BridgeParams): Promise<BridgeResult> {
    console.log(`[SonicGateway] Executing bridge for ${params.sourceAsset.amount} ${params.sourceAsset.assetSymbol} from ${params.sourceAsset.chainSlug} to ${params.destinationChain}`);
    
    try {
      // Check if route is supported
      if (!this.supportsRoute(params.sourceAsset.chainSlug, params.destinationChain)) {
        throw new Error(`Sonic Gateway does not support bridging from ${params.sourceAsset.chainSlug} to ${params.destinationChain}`);
      }
      
      // Get the configuration for this route
      const configKey = `${params.sourceAsset.chainSlug}-${params.destinationChain}`;
      const config = this.providerConfigs.get(configKey);
      
      if (!config) {
        throw new Error(`No configuration found for ${params.sourceAsset.chainSlug} to ${params.destinationChain}`);
      }
      
      // In a real implementation, this would:
      // 1. Create a transaction to the appropriate Sonic Gateway contract
      // 2. Execute the transaction via the Safe multisig
      // 3. For L1->L2: Monitor for deposit finalization on L2
      // 4. For L2->L1: Monitor for withdrawal proposal and finalization
      
      // For now, we'll simulate a successful bridge transaction
      const sourceTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      
      // Store additional metadata based on direction
      const metadata: Record<string, any> = {};
      
      if (params.sourceAsset.chainSlug === 'evm' && params.destinationChain === 'sonic') {
        metadata.depositType = 'standard'; // or 'retryable'
      } else {
        metadata.challengePeriod = '7 days';
        metadata.withdrawalId = Math.floor(Math.random() * 10000000);
      }
      
      // Store the transaction in the database
      const bridgeTransaction = await this.storeBridgeTransaction({
        vaultId: params.sourceVaultId,
        sourceChain: params.sourceAsset.chainSlug,
        destinationChain: params.destinationChain,
        sourceAsset: params.sourceAsset.assetAddress,
        destinationAsset: params.destinationAsset.assetAddress,
        amount: params.sourceAsset.amount,
        providerType: this.providerType,
        sourceTxHash,
        status: 'initiated',
        metadata
      });
      
      if (!bridgeTransaction) {
        throw new Error('Failed to store bridge transaction');
      }
      
      // In a real implementation, we would start monitoring the transaction here
      return {
        success: true,
        transactionId: bridgeTransaction.id,
        sourceTxHash,
        bridgeTransaction
      };
    } catch (error) {
      console.error('Error in SonicGateway executeBridge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Check the status of a bridge transaction
   * In a real implementation, this would check the on-chain status of the transaction
   */
  async checkBridgeStatus(transactionId: string): Promise<BridgeTransaction> {
    console.log(`[SonicGateway] Checking status for transaction ${transactionId}`);
    
    try {
      const supabase = createServerClient();
      
      // Get the transaction from the database
      const { data, error } = await supabase
        .from('bridge_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();
      
      if (error || !data) {
        throw new Error(`Failed to get transaction: ${error?.message || 'Transaction not found'}`);
      }
      
      const bridgeTransaction = data as unknown as BridgeTransaction;
      
      // In a real implementation, this would check the on-chain status
      // with different logic depending on direction:
      // - L1->L2: Check for receipt on L1 and then sequencer inclusion on L2
      // - L2->L1: Check for withdrawal initiation on L2, waiting period, and finalization on L1
      
      // For demonstration, simulate status updates based on time and direction
      const timeSinceCreation = Date.now() - new Date(bridgeTransaction.createdAt).getTime();
      
      let newStatus = bridgeTransaction.status;
      let destinationTxHash = bridgeTransaction.destinationTxHash;
      let amountReceived = bridgeTransaction.amountReceived;
      
      const isL1ToL2 = bridgeTransaction.sourceChain === 'evm' && bridgeTransaction.destinationChain === 'sonic';
      
      // L1->L2 is faster than L2->L1 due to Sonic's withdrawal security model
      if (isL1ToL2) {
        if (bridgeTransaction.status === 'initiated' && timeSinceCreation > 20000) {
          // Source transaction confirmed
          newStatus = 'pending';
        } else if (bridgeTransaction.status === 'pending' && timeSinceCreation > 50000) {
          // Deposit finalized on L2
          newStatus = 'completed';
          destinationTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;
          amountReceived = bridgeTransaction.amount; // 1:1 mapping for Sonic
        }
      } else {
        // L2->L1 withdrawal
        if (bridgeTransaction.status === 'initiated' && timeSinceCreation > 15000) {
          // Withdrawal initiated on L2
          newStatus = 'pending';
        } else if (bridgeTransaction.status === 'pending' && timeSinceCreation > 90000) {
          // After challenge period, withdrawal finalized on L1
          newStatus = 'completed';
          destinationTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;
          
          // Small fee for L2->L1
          const amount = parseFloat(bridgeTransaction.amount);
          amountReceived = (amount - (amount * 0.005)).toString(); // 0.5% fee
        }
      }
      
      // If status changed, update the database
      if (newStatus !== bridgeTransaction.status || destinationTxHash !== bridgeTransaction.destinationTxHash) {
        await supabase
          .from('bridge_transactions')
          .update({
            status: newStatus,
            destination_tx_hash: destinationTxHash,
            amount_received: amountReceived,
            updated_at: new Date().toISOString()
          })
          .eq('id', transactionId);
          
        return {
          ...bridgeTransaction,
          status: newStatus,
          destinationTxHash,
          amountReceived,
          updatedAt: new Date().toISOString()
        };
      }
      
      return bridgeTransaction;
    } catch (error) {
      console.error('Error in SonicGateway checkBridgeStatus:', error);
      throw error;
    }
  }
  
  /**
   * Load provider configurations from the database
   */
  private async loadProviderConfigs(): Promise<void> {
    try {
      const supabase = createServerClient();
      
      const { data, error } = await supabase
        .from('bridge_provider_configs')
        .select('*')
        .eq('provider_type', this.providerType)
        .eq('is_active', true);
      
      if (error) {
        console.error('Error loading provider configs:', error);
        return;
      }
      
      if (!data || data.length === 0) {
        console.warn('No active provider configs found for Sonic Gateway');
        return;
      }
      
      // Store configs in map for quick lookup
      for (const config of data) {
        const configKey = `${config.source_chain}-${config.destination_chain}`;
        this.providerConfigs.set(configKey, {
          id: config.id,
          providerType: config.provider_type,
          sourceChain: config.source_chain,
          destinationChain: config.destination_chain,
          priority: config.priority,
          config: config.config,
          isActive: config.is_active,
          createdAt: config.created_at,
          updatedAt: config.updated_at
        });
      }
      
      console.log(`Loaded ${data.length} Sonic Gateway provider configs`);
    } catch (error) {
      console.error('Error in loadProviderConfigs:', error);
    }
  }
  
  /**
   * Store a new bridge transaction in the database
   */
  private async storeBridgeTransaction(
    params: {
      vaultId: string;
      sourceChain: string;
      destinationChain: string;
      sourceAsset: string;
      destinationAsset: string;
      amount: string;
      providerType: 'layerzero' | 'wormhole' | 'sonic_gateway' | 'custom';
      sourceTxHash?: string;
      status: 'initiated' | 'pending' | 'completed' | 'failed' | 'cancelled';
      metadata?: Record<string, any>;
    }
  ): Promise<BridgeTransaction | null> {
    try {
      const supabase = createServerClient();
      
      // Get the multisig IDs for source and destination chains
      const { data: sourceMultisig, error: sourceError } = await supabase
        .from('farm_vault_multisigs')
        .select('id')
        .eq('vault_id', params.vaultId)
        .eq('chain_slug', params.sourceChain)
        .eq('status', 'active')
        .single();
      
      if (sourceError) {
        console.error('Error getting source multisig:', sourceError);
        return null;
      }
      
      const { data: destMultisig, error: destError } = await supabase
        .from('farm_vault_multisigs')
        .select('id')
        .eq('vault_id', params.vaultId)
        .eq('chain_slug', params.destinationChain)
        .eq('status', 'active')
        .single();
      
      // Destination multisig is optional (might not exist yet)
      const sourceMultisigId = sourceMultisig?.id;
      const destMultisigId = destMultisig?.id;
      
      // Insert the transaction into the database
      const { data, error } = await supabase
        .from('bridge_transactions')
        .insert({
          vault_id: params.vaultId,
          source_chain: params.sourceChain,
          destination_chain: params.destinationChain,
          source_asset: params.sourceAsset,
          destination_asset: params.destinationAsset,
          amount: params.amount,
          provider_type: params.providerType,
          source_tx_hash: params.sourceTxHash,
          status: params.status,
          source_multisig_id: sourceMultisigId,
          destination_multisig_id: destMultisigId,
          metadata: params.metadata
        })
        .select('*')
        .single();
      
      if (error) {
        console.error('Error storing bridge transaction:', error);
        return null;
      }
      
      // Convert database column names to camelCase for the return value
      return {
        id: data.id,
        vaultId: data.vault_id,
        sourceChain: data.source_chain,
        destinationChain: data.destination_chain,
        sourceAsset: data.source_asset,
        destinationAsset: data.destination_asset,
        amount: data.amount,
        amountReceived: data.amount_received,
        feeAmount: data.fee_amount,
        feeToken: data.fee_token,
        sourceTxHash: data.source_tx_hash,
        destinationTxHash: data.destination_tx_hash,
        providerType: data.provider_type,
        status: data.status,
        sourceMultisigId: data.source_multisig_id,
        destinationMultisigId: data.destination_multisig_id,
        metadata: data.metadata,
        errorMessage: data.error_message,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error in storeBridgeTransaction:', error);
      return null;
    }
  }
}
