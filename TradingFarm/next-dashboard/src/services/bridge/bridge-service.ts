/**
 * Trading Farm Multi-Chain Integration
 * BridgeService - Unified service for bridging assets across different chains
 */

import { createServerClient } from '@/utils/supabase/server';
import { IBridgeProvider, BridgeParams, BridgeQuote, BridgeResult, BridgeAsset } from './bridge-provider-interface';
import { BridgeTransaction, ChainAssetMapping } from '@/types/bridge.types';
import { LayerZeroBridgeProvider } from './layerzero-bridge-provider';
import { WormholeBridgeProvider } from './wormhole-bridge-provider';
import { SonicGatewayBridgeProvider } from './sonic-gateway-bridge-provider';
import { DeBridgeBridgeProvider } from './debridge-bridge-provider';
import { AxelarBridgeProvider } from './axelar-bridge-provider';

interface BridgeRouteOptions {
  sourceChain: string;
  destinationChain: string;
  sourceAsset?: string; // Asset address or symbol
  destinationAsset?: string; // Asset address or symbol
  onlyProviders?: string[]; // Limit to specific providers
}

interface GetQuoteParams {
  vaultId: string;
  sourceChain: string;
  destinationChain: string;
  sourceAsset: string; // Asset address or symbol
  amount: string;
  destinationAsset?: string; // Optional destination asset, will be determined if not provided
  slippageTolerance?: number;
}

/**
 * BridgeService - Provides a unified interface for bridging operations across all supported providers
 * Selects the appropriate provider based on the route and handles the bridging operations
 */
export class BridgeService {
  private providers: IBridgeProvider[] = [];
  private assetMappings: Map<string, ChainAssetMapping[]> = new Map();
  
  constructor() {
    // Register default providers
    this.registerProvider(new DeBridgeBridgeProvider());
    this.registerProvider(new AxelarBridgeProvider());
    
    // Load other providers from configuration
    this.loadProviderConfigurations();
  }
  
  /**
   * Register a bridge provider
   */
  registerProvider(provider: IBridgeProvider): void {
    this.providers.push(provider);
  }
  
  /**
   * Get available bridge routes for a vault
   */
  async getAvailableRoutes(vaultId: string): Promise<{ 
    success: boolean; 
    routes?: { 
      sourceChain: string; 
      destinationChain: string; 
      providers: string[];
      assets: { sourceAsset: string; destinationAsset: string }[];
    }[];
    error?: string;
  }> {
    try {
      // Get multisig wallets for the vault
      const multisigs = await this.getVaultMultisigs(vaultId);
      
      if (!multisigs || multisigs.length === 0) {
        return { 
          success: false, 
          error: `No multisig wallets found for vault ${vaultId}` 
        };
      }
      
      const routes: { 
        sourceChain: string; 
        destinationChain: string; 
        providers: string[];
        assets: { sourceAsset: string; destinationAsset: string }[];
      }[] = [];
      
      // Generate all possible routes between chains that have multisigs
      for (const sourceMultisig of multisigs) {
        for (const destMultisig of multisigs) {
          // Skip same-chain transfers
          if (sourceMultisig.chainSlug === destMultisig.chainSlug) continue;
          
          // Find providers that support this route
          const supportedProviders = this.providers
            .filter(provider => provider.supportsRoute(sourceMultisig.chainSlug, destMultisig.chainSlug))
            .map(provider => provider.providerType);
            
          if (supportedProviders.length > 0) {
            // Find assets that can be bridged between these chains
            const assets = await this.getBridgeableAssets(sourceMultisig.chainSlug, destMultisig.chainSlug);
            
            routes.push({
              sourceChain: sourceMultisig.chainSlug,
              destinationChain: destMultisig.chainSlug,
              providers: supportedProviders,
              assets
            });
          }
        }
      }
      
      return { success: true, routes };
    } catch (error) {
      console.error('Error in getAvailableRoutes:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Get quotes from all available providers for a specific route
   */
  async getQuotes(params: GetQuoteParams): Promise<{
    success: boolean;
    quotes?: BridgeQuote[];
    error?: string;
  }> {
    try {
      // Validate input parameters
      if (!params.sourceChain || !params.destinationChain || !params.sourceAsset || !params.amount) {
        return { success: false, error: 'Missing required parameters' };
      }
      
      // Convert asset identifier (address or symbol) to full asset details
      const sourceAssetMapping = await this.resolveAsset(params.sourceChain, params.sourceAsset);
      if (!sourceAssetMapping) {
        return { success: false, error: `Source asset ${params.sourceAsset} not found on chain ${params.sourceChain}` };
      }
      
      // Determine destination asset if not specified
      let destinationAssetMapping: ChainAssetMapping | null = null;
      if (params.destinationAsset) {
        destinationAssetMapping = await this.resolveAsset(params.destinationChain, params.destinationAsset);
        if (!destinationAssetMapping) {
          return { success: false, error: `Destination asset ${params.destinationAsset} not found on chain ${params.destinationChain}` };
        }
      } else {
        // Try to find a matching asset by canonical name
        destinationAssetMapping = await this.findMatchingAsset(sourceAssetMapping.canonicalName, params.destinationChain);
        if (!destinationAssetMapping) {
          return { success: false, error: `Could not find a matching asset for ${sourceAssetMapping.assetSymbol} on chain ${params.destinationChain}` };
        }
      }
      
      // Prepare asset objects for quoting
      const sourceAsset: BridgeAsset = {
        chainSlug: params.sourceChain,
        assetAddress: sourceAssetMapping.assetAddress,
        assetSymbol: sourceAssetMapping.assetSymbol,
        amount: params.amount,
        decimals: sourceAssetMapping.assetDecimals
      };
      
      const destinationAsset: BridgeAsset = {
        chainSlug: params.destinationChain,
        assetAddress: destinationAssetMapping.assetAddress,
        assetSymbol: destinationAssetMapping.assetSymbol,
        amount: '0', // Will be determined by the quote
        decimals: destinationAssetMapping.assetDecimals
      };
      
      // Get quotes from all providers that support this route
      const quotePromises = this.providers
        .filter(provider => provider.supportsRoute(params.sourceChain, params.destinationChain))
        .map(async provider => {
          try {
            return await provider.getQuote({
              sourceAsset,
              destinationAsset,
              destinationChain: params.destinationChain,
              slippageTolerance: params.slippageTolerance
            });
          } catch (error) {
            console.warn(`Failed to get quote from ${provider.providerType}:`, error);
            return null;
          }
        });
      
      const quotes = (await Promise.all(quotePromises)).filter(Boolean) as BridgeQuote[];
      
      if (quotes.length === 0) {
        return { success: false, error: `No quotes available for ${params.sourceChain} to ${params.destinationChain}` };
      }
      
      // Sort quotes by expectedOutput (highest first)
      quotes.sort((a, b) => parseFloat(b.expectedOutput) - parseFloat(a.expectedOutput));
      
      return { success: true, quotes };
    } catch (error) {
      console.error('Error in getQuotes:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Execute a bridge transaction using the specified provider
   */
  async executeBridge(
    vaultId: string,
    quoteId: string, // A generated ID for a specific quote
    providerType: 'layerzero' | 'wormhole' | 'sonic_gateway' | 'custom'
  ): Promise<BridgeResult> {
    try {
      // In a real implementation, we would:
      // 1. Retrieve the stored quote from cache or database using quoteId
      // 2. Verify that the quote is still valid (not expired)
      // 3. Get the multisig addresses for source and destination chains
      // 4. Execute the bridge transaction using the specified provider
      
      // For now, we'll simulate a successful bridge transaction
      
      // Select the provider based on type
      const provider = this.providers.find(p => p.providerType === providerType);
      
      if (!provider) {
        throw new Error(`Provider ${providerType} not found`);
      }
      
      // Get multisig wallets for the vault
      const multisigs = await this.getVaultMultisigs(vaultId);
      
      if (!multisigs || multisigs.length === 0) {
        throw new Error(`No multisig wallets found for vault ${vaultId}`);
      }
      
      // Mock parameters for demonstration - in a real implementation, these would come from the stored quote
      const sourceChain = 'evm';
      const destinationChain = 'sonic';
      
      const sourceMultisig = multisigs.find(m => m.chainSlug === sourceChain);
      const destMultisig = multisigs.find(m => m.chainSlug === destinationChain);
      
      if (!sourceMultisig) {
        throw new Error(`No multisig wallet found for vault ${vaultId} on chain ${sourceChain}`);
      }
      
      if (!destMultisig) {
        throw new Error(`No multisig wallet found for vault ${vaultId} on chain ${destinationChain}`);
      }
      
      // Resolve mock assets - in a real implementation, these would come from the stored quote
      const sourceAssetMapping = await this.resolveAsset(sourceChain, 'USDC');
      const destAssetMapping = await this.resolveAsset(destinationChain, 'USDC');
      
      if (!sourceAssetMapping || !destAssetMapping) {
        throw new Error('Could not resolve assets');
      }
      
      // Prepare the bridge parameters
      const bridgeParams: BridgeParams = {
        sourceVaultId: vaultId,
        sourceMultisigAddress: sourceMultisig.multisigAddress,
        sourceAsset: {
          chainSlug: sourceChain,
          assetAddress: sourceAssetMapping.assetAddress,
          assetSymbol: sourceAssetMapping.assetSymbol,
          amount: '1000', // Mock amount
          decimals: sourceAssetMapping.assetDecimals
        },
        destinationChain,
        destinationMultisigAddress: destMultisig.multisigAddress,
        destinationAsset: {
          chainSlug: destinationChain,
          assetAddress: destAssetMapping.assetAddress,
          assetSymbol: destAssetMapping.assetSymbol,
          amount: '0', // Will be determined by bridge
          decimals: destAssetMapping.assetDecimals
        },
        slippageTolerance: 0.5
      };
      
      // Execute the bridge transaction
      return await provider.executeBridge(bridgeParams);
    } catch (error) {
      console.error('Error in executeBridge:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Get the status of a bridge transaction
   */
  async getBridgeStatus(transactionId: string): Promise<{
    success: boolean;
    transaction?: BridgeTransaction;
    error?: string;
  }> {
    try {
      const supabase = createServerClient();
      
      // Get the transaction from the database
      const { data, error } = await supabase
        .from('bridge_transactions')
        .select('*, source_multisig:source_multisig_id(*), destination_multisig:destination_multisig_id(*)')
        .eq('id', transactionId)
        .single();
      
      if (error || !data) {
        throw new Error(`Failed to get transaction: ${error?.message || 'Transaction not found'}`);
      }
      
      // Find the provider for this transaction
      const provider = this.providers.find(p => p.providerType === data.provider_type);
      
      if (!provider) {
        throw new Error(`Provider ${data.provider_type} not found for transaction ${transactionId}`);
      }
      
      // Check the status using the provider
      const transaction = await provider.checkBridgeStatus(transactionId);
      
      return { success: true, transaction };
    } catch (error) {
      console.error('Error in getBridgeStatus:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Get all bridge transactions for a vault
   */
  async getVaultBridgeTransactions(vaultId: string): Promise<{
    success: boolean;
    transactions?: BridgeTransaction[];
    error?: string;
  }> {
    try {
      const supabase = createServerClient();
      
      // Get all transactions for the vault
      const { data, error } = await supabase
        .from('bridge_transactions')
        .select('*')
        .eq('vault_id', vaultId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Failed to get transactions: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        return { success: true, transactions: [] };
      }
      
      // Convert database column names to camelCase for the return value
      const transactions: BridgeTransaction[] = data.map(tx => ({
        id: tx.id,
        vaultId: tx.vault_id,
        sourceChain: tx.source_chain,
        destinationChain: tx.destination_chain,
        sourceAsset: tx.source_asset,
        destinationAsset: tx.destination_asset,
        amount: tx.amount,
        amountReceived: tx.amount_received,
        feeAmount: tx.fee_amount,
        feeToken: tx.fee_token,
        sourceTxHash: tx.source_tx_hash,
        destinationTxHash: tx.destination_tx_hash,
        providerType: tx.provider_type,
        status: tx.status,
        sourceMultisigId: tx.source_multisig_id,
        destinationMultisigId: tx.destination_multisig_id,
        metadata: tx.metadata,
        errorMessage: tx.error_message,
        createdAt: tx.created_at,
        updatedAt: tx.updated_at
      }));
      
      return { success: true, transactions };
    } catch (error) {
      console.error('Error in getVaultBridgeTransactions:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Load all asset mappings from the database
   */
  private async loadAssetMappings(): Promise<void> {
    try {
      const supabase = createServerClient();
      
      const { data, error } = await supabase
        .from('chain_asset_mappings')
        .select('*')
        .eq('is_active', true);
      
      if (error) {
        console.error('Error loading asset mappings:', error);
        return;
      }
      
      if (!data || data.length === 0) {
        console.warn('No active asset mappings found');
        return;
      }
      
      // Group assets by canonical name for quick lookup
      for (const mapping of data) {
        const canonicalName = mapping.canonical_name;
        
        if (!this.assetMappings.has(canonicalName)) {
          this.assetMappings.set(canonicalName, []);
        }
        
        this.assetMappings.get(canonicalName)?.push({
          id: mapping.id,
          canonicalName: mapping.canonical_name,
          chainSlug: mapping.chain_slug,
          assetAddress: mapping.asset_address,
          assetSymbol: mapping.asset_symbol,
          assetDecimals: mapping.asset_decimals,
          assetIconUrl: mapping.asset_icon_url,
          isNative: mapping.is_native,
          isActive: mapping.is_active,
          metadata: mapping.metadata,
          createdAt: mapping.created_at,
          updatedAt: mapping.updated_at
        });
      }
      
      console.log(`Loaded ${data.length} asset mappings for ${this.assetMappings.size} canonical assets`);
    } catch (error) {
      console.error('Error in loadAssetMappings:', error);
    }
  }
  
  /**
   * Helper method to get all multisig wallets for a vault
   */
  private async getVaultMultisigs(vaultId: string): Promise<{ 
    id: string; 
    chainSlug: string; 
    multisigAddress: string;
    multisigType: string;
  }[] | null> {
    try {
      const supabase = createServerClient();
      
      const { data, error } = await supabase
        .from('farm_vault_multisigs')
        .select('id, chain_slug, multisig_address, multisig_type')
        .eq('vault_id', vaultId)
        .eq('status', 'active');
      
      if (error) {
        console.error('Error getting vault multisigs:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.warn(`No multisig wallets found for vault ${vaultId}`);
        return null;
      }
      
      return data.map(m => ({
        id: m.id,
        chainSlug: m.chain_slug,
        multisigAddress: m.multisig_address,
        multisigType: m.multisig_type
      }));
    } catch (error) {
      console.error('Error in getVaultMultisigs:', error);
      return null;
    }
  }
  
  /**
   * Helper method to resolve an asset by address or symbol on a specific chain
   */
  private async resolveAsset(chainSlug: string, assetIdentifier: string): Promise<ChainAssetMapping | null> {
    try {
      const supabase = createServerClient();
      
      // Try to find by address
      const { data: addressData, error: addressError } = await supabase
        .from('chain_asset_mappings')
        .select('*')
        .eq('chain_slug', chainSlug)
        .eq('asset_address', assetIdentifier)
        .eq('is_active', true)
        .single();
      
      if (!addressError && addressData) {
        return {
          id: addressData.id,
          canonicalName: addressData.canonical_name,
          chainSlug: addressData.chain_slug,
          assetAddress: addressData.asset_address,
          assetSymbol: addressData.asset_symbol,
          assetDecimals: addressData.asset_decimals,
          assetIconUrl: addressData.asset_icon_url,
          isNative: addressData.is_native,
          isActive: addressData.is_active,
          metadata: addressData.metadata,
          createdAt: addressData.created_at,
          updatedAt: addressData.updated_at
        };
      }
      
      // If not found by address, try by symbol
      const { data: symbolData, error: symbolError } = await supabase
        .from('chain_asset_mappings')
        .select('*')
        .eq('chain_slug', chainSlug)
        .eq('asset_symbol', assetIdentifier)
        .eq('is_active', true)
        .single();
      
      if (!symbolError && symbolData) {
        return {
          id: symbolData.id,
          canonicalName: symbolData.canonical_name,
          chainSlug: symbolData.chain_slug,
          assetAddress: symbolData.asset_address,
          assetSymbol: symbolData.asset_symbol,
          assetDecimals: symbolData.asset_decimals,
          assetIconUrl: symbolData.asset_icon_url,
          isNative: symbolData.is_native,
          isActive: symbolData.is_active,
          metadata: symbolData.metadata,
          createdAt: symbolData.created_at,
          updatedAt: symbolData.updated_at
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error in resolveAsset:', error);
      return null;
    }
  }
  
  /**
   * Helper method to find a matching asset by canonical name on a specific chain
   */
  private async findMatchingAsset(canonicalName: string, chainSlug: string): Promise<ChainAssetMapping | null> {
    try {
      const supabase = createServerClient();
      
      const { data, error } = await supabase
        .from('chain_asset_mappings')
        .select('*')
        .eq('canonical_name', canonicalName)
        .eq('chain_slug', chainSlug)
        .eq('is_active', true)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return {
        id: data.id,
        canonicalName: data.canonical_name,
        chainSlug: data.chain_slug,
        assetAddress: data.asset_address,
        assetSymbol: data.asset_symbol,
        assetDecimals: data.asset_decimals,
        assetIconUrl: data.asset_icon_url,
        isNative: data.is_native,
        isActive: data.is_active,
        metadata: data.metadata,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error in findMatchingAsset:', error);
      return null;
    }
  }
  
  /**
   * Helper method to get bridgeable assets between two chains
   */
  private async getBridgeableAssets(sourceChain: string, destinationChain: string): Promise<{ 
    sourceAsset: string; 
    destinationAsset: string;
  }[]> {
    try {
      const result: { sourceAsset: string; destinationAsset: string }[] = [];
      
      // Go through all canonical assets and check if they exist on both chains
      for (const [canonicalName, mappings] of this.assetMappings.entries()) {
        const sourceAssets = mappings.filter(m => m.chainSlug === sourceChain);
        const destAssets = mappings.filter(m => m.chainSlug === destinationChain);
        
        if (sourceAssets.length > 0 && destAssets.length > 0) {
          for (const sourceAsset of sourceAssets) {
            for (const destAsset of destAssets) {
              result.push({
                sourceAsset: sourceAsset.assetSymbol,
                destinationAsset: destAsset.assetSymbol
              });
            }
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error in getBridgeableAssets:', error);
      return [];
    }
  }
}
