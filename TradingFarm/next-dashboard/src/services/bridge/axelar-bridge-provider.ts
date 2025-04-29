/**
 * Trading Farm Cross-Chain Liquidity Management
 * Axelar Network Bridge Provider
 * 
 * Implementation based on Axelar Network documentation:
 * https://docs.axelar.dev/
 */

import { BridgeParams, BridgeQuote, BridgeResult, IBridgeProvider } from './bridge-provider-interface';
import { BridgeProviderType, BridgeTransaction } from '@/types/bridge.types';
import { isValidAddress } from '@/utils/validation/address-validator';
import { createServerClient } from '@/utils/supabase/server';

interface AxelarBridgeOptions {
  apiKey?: string;
  baseUrl?: string;
}

export class AxelarBridgeProvider implements IBridgeProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  public readonly providerType: BridgeProviderType = 'axelar';
  
  // Required by IBridgeProvider interface
  public readonly supportedSourceChains: string[] = [
    'ethereum', 'polygon', 'arbitrum', 'avalanche', 'binance', 'fantom',
    'optimism', 'base', 'celo', 'moonbeam', 'linea', 'kava', 'mantle'
  ];
  
  public readonly supportedDestinationChains: string[] = [
    'ethereum', 'polygon', 'arbitrum', 'avalanche', 'binance', 'fantom',
    'optimism', 'base', 'celo', 'moonbeam', 'linea', 'kava', 'mantle'
  ];

  constructor(options?: AxelarBridgeOptions) {
    this.apiKey = options?.apiKey || process.env.AXELAR_API_KEY || '';
    this.baseUrl = options?.baseUrl || 'https://api.axelar.dev/v1';
    
    if (!this.apiKey) {
      console.warn('Axelar Bridge Provider initialized without API key');
    }
  }

  /**
   * Check if this provider supports the given source and destination chains
   */
  supportsRoute(sourceChain: string, destinationChain: string): boolean {
    return this.supportedSourceChains.includes(sourceChain.toLowerCase()) && 
           this.supportedDestinationChains.includes(destinationChain.toLowerCase()) &&
           sourceChain.toLowerCase() !== destinationChain.toLowerCase();
  }

  /**
   * Get quote for bridging assets via Axelar
   */
  async getQuote(params: BridgeParams): Promise<BridgeQuote> {
    try {
      // Validate addresses
      if (!isValidAddress(params.sourceAddress, params.sourceChain)) {
        throw new Error(`Invalid source address for chain ${params.sourceChain}`);
      }
      
      if (!isValidAddress(params.destinationAddress, params.destinationChain)) {
        throw new Error(`Invalid destination address for chain ${params.destinationChain}`);
      }

      // Get exchange rate and fee information from Axelar API
      const response = await fetch(`${this.baseUrl}/v1/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          sourceChain: params.sourceChain,
          destinationChain: params.destinationChain,
          sourceAsset: params.sourceAsset,
          destinationAsset: params.destinationAsset,
          amount: params.amount
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Axelar API Error: ${errorData.message || response.statusText}`);
      }

      const quoteData = await response.json();
      
      // Calculate amounts including fees
      const amountReceived = quoteData.amountReceived || 
        (parseFloat(params.amount) * (1 - (quoteData.fee?.percentage || 0))).toString();
      
      return {
        sourceChain: params.sourceChain,
        destinationChain: params.destinationChain,
        sourceAsset: params.sourceAsset,
        destinationAsset: params.destinationAsset,
        amount: params.amount,
        amountReceived,
        fee: {
          amount: quoteData.fee?.amount || '0',
          asset: quoteData.fee?.token || params.sourceAsset,
        },
        exchangeRate: quoteData.exchangeRate || '1',
        estimatedTimeMinutes: quoteData.estimatedTime || 20,
        providerType: this.providerType
      };
    } catch (error) {
      console.error('Error getting Axelar bridge quote:', error);
      throw error;
    }
  }

  /**
   * Execute bridge transaction
   */
  async executeBridge(params: BridgeParams): Promise<BridgeResult> {
    try {
      // First get a quote to validate and get exact amounts
      const quote = await this.getQuote({
        sourceChain: params.sourceChain,
        destinationChain: params.destinationChain,
        sourceAsset: params.sourceAsset,
        destinationAsset: params.destinationAsset,
        sourceAddress: params.sourceAddress,
        destinationAddress: params.destinationAddress,
        amount: params.amount,
        slippage: params.slippage
      });
      
      // Prepare transaction request to Axelar API
      const response = await fetch(`${this.baseUrl}/v1/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          sourceChain: params.sourceChain,
          destinationChain: params.destinationChain,
          sourceAsset: params.sourceAsset,
          destinationAsset: params.destinationAsset,
          sourceAddress: params.sourceAddress,
          destinationAddress: params.destinationAddress,
          amount: params.amount,
          slippage: params.slippage || 0.5, // Default 0.5% slippage if not provided
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Axelar API Error: ${errorData.message || response.statusText}`);
      }

      const txData = await response.json();
      
      // Store transaction in database
      const supabase = await createServerClient();
      
      const transaction: Omit<BridgeTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
        vaultId: params.sourceVaultId,
        sourceChain: params.sourceChain,
        destinationChain: params.destinationChain,
        sourceAsset: params.sourceAsset,
        destinationAsset: params.destinationAsset,
        amount: params.amount,
        amountReceived: quote.amountReceived,
        feeAmount: quote.fee.amount,
        feeToken: quote.fee.asset,
        sourceTxHash: txData.sourceTxHash,
        status: 'initiated',
        providerType: this.providerType,
        metadata: {
          axelarTxId: txData.id,
          estimatedTimeMinutes: quote.estimatedTimeMinutes,
          exchangeRate: quote.exchangeRate,
          sourceAddress: params.sourceAddress,
          destinationAddress: params.destinationAddress,
          slippage: params.slippage
        }
      };
      
      const { data, error } = await supabase
        .from('bridge_transactions')
        .insert(transaction)
        .select()
        .single();
        
      if (error) {
        console.error('Error storing Axelar bridge transaction:', error);
        throw new Error(`Failed to store transaction: ${error.message}`);
      }
      
      return {
        success: true,
        transactionId: data.id,
        sourceTxHash: txData.sourceTxHash,
        status: 'initiated',
        message: 'Bridge transaction initiated successfully'
      };
    } catch (error) {
      console.error('Error executing Axelar bridge transaction:', error);
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to execute bridge transaction'
      };
    }
  }

  /**
   * Check transaction status
   */
  async checkBridgeStatus(transactionId: string): Promise<{
    status: BridgeTransaction['status'];
    destinationTxHash?: string;
    details?: Record<string, any>;
  }> {
    try {
      // First get the transaction from our database
      const supabase = await createServerClient();
      const { data: transaction, error } = await supabase
        .from('bridge_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();
      
      if (error || !transaction) {
        throw new Error(`Transaction not found: ${error?.message || 'Unknown error'}`);
      }
      
      if (!transaction.metadata?.axelarTxId) {
        throw new Error('Missing Axelar transaction ID in metadata');
      }
      
      // Get status from Axelar API
      const response = await fetch(`${this.baseUrl}/v1/transfer/${transaction.metadata.axelarTxId}`, {
        headers: {
          'X-API-Key': this.apiKey
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Axelar API Error: ${errorData.message || response.statusText}`);
      }
      
      const statusData = await response.json();
      
      // Map Axelar status to our status
      let status: BridgeTransaction['status'] = transaction.status;
      
      switch(statusData.status) {
        case 'TRANSFER_COMPLETED':
          status = 'completed';
          break;
        case 'TRANSFER_PENDING':
        case 'TRANSFER_INITIATED':
          status = 'pending';
          break;
        case 'TRANSFER_FAILED':
          status = 'failed';
          break;
        default:
          // Keep existing status if unknown
          break;
      }
      
      // Update transaction in our database if status changed
      if (status !== transaction.status || 
         (statusData.destinationTxHash && statusData.destinationTxHash !== transaction.destinationTxHash)) {
        await supabase
          .from('bridge_transactions')
          .update({
            status,
            destinationTxHash: statusData.destinationTxHash || transaction.destinationTxHash,
            errorMessage: statusData.error || transaction.errorMessage,
            updatedAt: new Date().toISOString()
          })
          .eq('id', transactionId);
      }
      
      return {
        status,
        destinationTxHash: statusData.destinationTxHash,
        details: statusData
      };
    } catch (error) {
      console.error('Error checking Axelar transaction status:', error);
      throw error;
    }
  }
}
