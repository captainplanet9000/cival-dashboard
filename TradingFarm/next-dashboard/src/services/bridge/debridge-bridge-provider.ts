/**
 * Trading Farm Multi-Chain Integration
 * DeBridgeBridgeProvider - Implementation of IBridgeProvider for deBridge
 */

import { 
  IBridgeProvider, 
  BridgeParams, 
  BridgeQuote, 
  BridgeResult, 
  BridgeAsset 
} from './bridge-provider-interface';
import { BridgeTransaction } from '@/types/bridge.types';
import { createServerClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * DeBridgeBridgeProvider
 * Implements IBridgeProvider interface for deBridge cross-chain transfers
 * 
 * deBridge documentation: https://docs.debridge.finance/
 * SDK Reference: https://docs.debridge.finance/developer-documentation/sdk
 */
export class DeBridgeBridgeProvider implements IBridgeProvider {
  readonly providerType: 'debridge' = 'debridge';
  
  // Supported chains based on deBridge documentation
  readonly supportedSourceChains: string[] = [
    'ethereum',      // Ethereum Mainnet
    'bsc',           // Binance Smart Chain
    'arbitrum',      // Arbitrum
    'optimism',      // Optimism
    'avalanche',     // Avalanche
    'polygon',       // Polygon
    'base',          // Base
    'solana',        // Solana
    'linea',         // Linea
    'zksync_era',    // zkSync Era
    'sui',           // Sui
    'near',          // NEAR
    'manta',         // Manta
    'blast'          // Blast
  ];
  
  readonly supportedDestinationChains: string[] = [
    'ethereum',      // Ethereum Mainnet
    'bsc',           // Binance Smart Chain
    'arbitrum',      // Arbitrum
    'optimism',      // Optimism
    'avalanche',     // Avalanche
    'polygon',       // Polygon
    'base',          // Base
    'solana',        // Solana
    'linea',         // Linea
    'zksync_era',    // zkSync Era
    'sui',           // Sui
    'near',          // NEAR
    'manta',         // Manta
    'blast'          // Blast
  ];
  
  // Chain IDs for deBridge API
  private readonly chainIds: Record<string, number> = {
    'ethereum': 1,
    'bsc': 56,
    'arbitrum': 42161,
    'optimism': 10,
    'avalanche': 43114,
    'polygon': 137,
    'base': 8453,
    'solana': 0, // Solana uses a different format
    'linea': 59144,
    'zksync_era': 324,
    'manta': 169,
    'blast': 81457
  };
  
  // Base API URL for deBridge services
  private readonly apiBaseUrl = 'https://api.debridge.finance/v1';
  
  /**
   * Check if this provider supports bridging between given chains
   */
  supportsRoute(sourceChain: string, destinationChain: string): boolean {
    return (
      this.supportedSourceChains.includes(sourceChain) && 
      this.supportedDestinationChains.includes(destinationChain)
    );
  }
  
  /**
   * Get quote for bridging assets between chains
   */
  async getQuote(params: Omit<BridgeParams, 'sourceVaultId' | 'sourceMultisigAddress' | 'destinationMultisigAddress'>): Promise<BridgeQuote> {
    try {
      const { sourceAsset, destinationAsset, destinationChain } = params;
      const slippageTolerance = params.slippageTolerance || 0.5; // Default to 0.5%
      
      // Convert chain identifiers to deBridge format
      const sourceChainId = this.chainIds[sourceAsset.chainSlug];
      const destinationChainId = this.chainIds[destinationChain];
      
      // Access token (in production, this would be fetched from environment variables)
      const deBridgeApiKey = process.env.DEBRIDGE_API_KEY || 'demo-api-key';
      
      // Call deBridge Quote API
      const response = await fetch(`${this.apiBaseUrl}/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deBridgeApiKey}`
        },
        body: JSON.stringify({
          srcChainId: sourceChainId,
          srcTokenAddress: sourceAsset.assetAddress,
          dstChainId: destinationChainId,
          dstTokenAddress: destinationAsset.assetAddress,
          amount: sourceAsset.amount,
          slippage: slippageTolerance
        })
      });
      
      if (!response.ok) {
        throw new Error(`deBridge API error: ${response.status} ${response.statusText}`);
      }
      
      const quoteData = await response.json();
      
      // Formulate the response in Trading Farm's format
      const expectedOutput = quoteData.dstAmount;
      const minOutput = quoteData.minDstAmount;
      const feeAmount = quoteData.fee.total;
      const feeToken = sourceAsset.assetSymbol;
      
      return {
        sourceAsset: params.sourceAsset,
        destinationAsset: params.destinationAsset,
        expectedOutput,
        minOutput,
        fee: {
          amount: feeAmount,
          token: feeToken
        },
        exchangeRate: (Number(expectedOutput) / Number(sourceAsset.amount)).toString(),
        estimatedGasCost: {
          sourceChain: quoteData.fee.srcChainGasFee,
          destinationChain: quoteData.fee.dstChainGasFee
        },
        estimatedTimeMinutes: 15, // Average time for deBridge transfers
        provider: 'deBridge',
        providerType: 'debridge',
        validUntil: Math.floor(Date.now() / 1000) + 300 // 5 minutes from now
      };
    } catch (error) {
      console.error('Error in deBridge getQuote:', error);
      throw error;
    }
  }
  
  /**
   * Execute bridge transaction
   */
  async executeBridge(params: BridgeParams): Promise<BridgeResult> {
    try {
      const { 
        sourceVaultId, 
        sourceMultisigAddress, 
        sourceAsset, 
        destinationChain, 
        destinationAsset, 
        destinationMultisigAddress,
        slippageTolerance = 0.5
      } = params;
      
      // In production, this would interface with the actual deBridge SDK
      // Here we're simulating the API call
      
      // Generate a unique transaction ID
      const transactionId = uuidv4();
      
      // In a real implementation, we'd now use the deBridge SDK to execute the bridge
      // This would involve preparing the transaction, signing it, and submitting it
      
      // Simulate a successful transaction
      const sourceTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      
      // Store the transaction in the database
      const supabase = createServerClient();
      
      const { data, error } = await supabase
        .from('bridge_transactions')
        .insert({
          id: transactionId,
          vault_id: sourceVaultId,
          source_chain: sourceAsset.chainSlug,
          destination_chain: destinationChain,
          source_asset: sourceAsset.assetAddress,
          destination_asset: destinationAsset.assetAddress,
          amount: sourceAsset.amount,
          source_tx_hash: sourceTxHash,
          provider_type: 'debridge',
          status: 'initiated',
          source_multisig_id: sourceMultisigAddress,
          destination_multisig_id: destinationMultisigAddress,
          metadata: {
            slippageTolerance,
            sourceAssetSymbol: sourceAsset.assetSymbol,
            destinationAssetSymbol: destinationAsset.assetSymbol
          }
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to store bridge transaction: ${error.message}`);
      }
      
      // Format the response
      const bridgeTransaction: BridgeTransaction = {
        id: data.id,
        vaultId: data.vault_id,
        sourceChain: data.source_chain,
        destinationChain: data.destination_chain,
        sourceAsset: data.source_asset,
        destinationAsset: data.destination_asset,
        amount: data.amount,
        sourceTxHash: data.source_tx_hash,
        providerType: 'debridge',
        status: 'initiated',
        sourceMultisigId: data.source_multisig_id,
        destinationMultisigId: data.destination_multisig_id,
        metadata: data.metadata,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      return {
        success: true,
        transactionId: data.id,
        sourceTxHash: sourceTxHash,
        bridgeTransaction
      };
    } catch (error) {
      console.error('Error in deBridge executeBridge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in deBridge bridge execution'
      };
    }
  }
  
  /**
   * Check bridge transaction status
   */
  async checkBridgeStatus(transactionId: string): Promise<BridgeTransaction> {
    try {
      const supabase = createServerClient();
      
      // Get transaction from database
      const { data, error } = await supabase
        .from('bridge_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();
      
      if (error || !data) {
        throw new Error(`Transaction not found: ${error?.message}`);
      }
      
      const transaction = data;
      
      // If the transaction is already completed or failed, return it as is
      if (transaction.status === 'completed' || transaction.status === 'failed') {
        return {
          id: transaction.id,
          vaultId: transaction.vault_id,
          sourceChain: transaction.source_chain,
          destinationChain: transaction.destination_chain,
          sourceAsset: transaction.source_asset,
          destinationAsset: transaction.destination_asset,
          amount: transaction.amount,
          amountReceived: transaction.amount_received,
          sourceTxHash: transaction.source_tx_hash,
          destinationTxHash: transaction.destination_tx_hash,
          providerType: 'debridge',
          status: transaction.status as BridgeTransaction['status'],
          sourceMultisigId: transaction.source_multisig_id,
          destinationMultisigId: transaction.destination_multisig_id,
          metadata: transaction.metadata,
          errorMessage: transaction.error_message,
          createdAt: transaction.created_at,
          updatedAt: transaction.updated_at
        };
      }
      
      // In a real implementation, we'd query the deBridge API for the status
      // For this implementation, we'll simulate a status check
      
      // Get the source transaction hash
      const sourceTxHash = transaction.source_tx_hash;
      if (!sourceTxHash) {
        throw new Error('Source transaction hash not found');
      }
      
      // Simulate checking transaction status based on creation time
      // In reality, this would query the deBridge API
      const createdAt = new Date(transaction.created_at);
      const now = new Date();
      const minutesElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60);
      
      let newStatus: BridgeTransaction['status'] = 'pending';
      let destinationTxHash: string | undefined = undefined;
      let amountReceived: string | undefined = undefined;
      let errorMessage: string | undefined = undefined;
      
      // Simulate status progression based on time elapsed
      if (minutesElapsed > 15) {
        // Simulate a 95% success rate
        const isSuccess = Math.random() < 0.95;
        
        if (isSuccess) {
          newStatus = 'completed';
          destinationTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
          
          // Simulate a small slippage
          const amount = parseFloat(transaction.amount);
          const slippage = 1 - (Math.random() * 0.01); // 0-1% slippage
          amountReceived = (amount * slippage).toFixed(6);
        } else {
          newStatus = 'failed';
          errorMessage = 'Transaction failed on destination chain';
        }
        
        // Update the transaction in the database
        await supabase
          .from('bridge_transactions')
          .update({
            status: newStatus,
            destination_tx_hash: destinationTxHash,
            amount_received: amountReceived,
            error_message: errorMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', transactionId);
      }
      
      // Return the updated transaction
      return {
        id: transaction.id,
        vaultId: transaction.vault_id,
        sourceChain: transaction.source_chain,
        destinationChain: transaction.destination_chain,
        sourceAsset: transaction.source_asset,
        destinationAsset: transaction.destination_asset,
        amount: transaction.amount,
        amountReceived: amountReceived || transaction.amount_received,
        sourceTxHash: transaction.source_tx_hash,
        destinationTxHash: destinationTxHash || transaction.destination_tx_hash,
        providerType: 'debridge',
        status: newStatus,
        sourceMultisigId: transaction.source_multisig_id,
        destinationMultisigId: transaction.destination_multisig_id,
        metadata: transaction.metadata,
        errorMessage: errorMessage || transaction.error_message,
        createdAt: transaction.created_at,
        updatedAt: transaction.updated_at
      };
    } catch (error) {
      console.error('Error in deBridge checkBridgeStatus:', error);
      throw error;
    }
  }
}
