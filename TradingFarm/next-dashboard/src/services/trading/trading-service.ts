/**
 * Trading Farm Multi-Chain Integration
 * TradingService - Unified service for trading across multiple chains
 */

import { ITradingAdapter, OrderParams, OrderResult, MarketInfo } from './trading-adapter-interface';
import { EvmTradingAdapter } from './evm-trading-adapter';
import { SuiTradingAdapter } from './sui-trading-adapter';
import { SolanaTradingAdapter } from './solana-trading-adapter';
import { MultisigWalletService } from '../multisig-wallet-service';
import { createServerClient } from '@/utils/supabase/server';

/**
 * TradingService - Provides a unified interface for trading operations across all supported chains
 * Selects the appropriate adapter based on the chain and handles the trading operations
 */
export class TradingService {
  private adapters: Map<string, ITradingAdapter> = new Map();
  
  constructor() {
    // Initialize default adapters for each chain
    this.registerAdapter(new EvmTradingAdapter('evm', 'UniswapV3'));
    this.registerAdapter(new EvmTradingAdapter('sonic', 'Sonic'));
    this.registerAdapter(new SuiTradingAdapter());
    this.registerAdapter(new SolanaTradingAdapter('Jupiter'));
    this.registerAdapter(new SolanaTradingAdapter('OpenBook'));
  }
  
  /**
   * Register a trading adapter
   */
  registerAdapter(adapter: ITradingAdapter): void {
    const key = this.getAdapterKey(adapter.chainSlug, adapter.dexName);
    this.adapters.set(key, adapter);
  }
  
  /**
   * Get an adapter for a specific chain and DEX
   */
  getAdapter(chainSlug: string, dexName?: string): ITradingAdapter | undefined {
    if (dexName) {
      // Try to get a specific adapter for the chain and DEX
      const key = this.getAdapterKey(chainSlug, dexName);
      const adapter = this.adapters.get(key);
      if (adapter) return adapter;
    }
    
    // Default DEXes for each chain
    const defaultDex: Record<string, string> = {
      'evm': 'UniswapV3',
      'sonic': 'Sonic',
      'sui': 'DeepBook',
      'solana': 'Jupiter'
    };
    
    const key = this.getAdapterKey(chainSlug, defaultDex[chainSlug] || '');
    return this.adapters.get(key);
  }
  
  /**
   * Generate a unique key for an adapter
   */
  private getAdapterKey(chainSlug: string, dexName: string): string {
    return `${chainSlug}:${dexName}`;
  }
  
  /**
   * Execute a trade order on the appropriate chain
   */
  async executeOrder(
    vaultId: string,
    chainSlug: string,
    params: OrderParams,
    dexName?: string
  ): Promise<{ success: boolean; result?: OrderResult; error?: string }> {
    try {
      // Get the adapter for the chain
      const adapter = this.getAdapter(chainSlug, dexName);
      if (!adapter) {
        return { success: false, error: `No adapter available for chain ${chainSlug}${dexName ? ` and DEX ${dexName}` : ''}` };
      }
      
      // Get the multisig wallet address for the vault on this chain
      const multisigAddress = await this.getMultisigAddressForVault(vaultId, chainSlug);
      if (!multisigAddress) {
        return { success: false, error: `No multisig wallet found for vault ${vaultId} on chain ${chainSlug}` };
      }
      
      // Execute the order using the adapter
      const result = await adapter.executeOrder(multisigAddress, params);
      
      // Store the order in the database (in a real implementation)
      await this.storeOrderInDatabase(vaultId, result);
      
      return { success: true, result };
    } catch (error) {
      console.error('Error executing order:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * Get market information across multiple chains
   */
  async getMarketInfo(
    symbol: string,
    chains?: string[]
  ): Promise<{ success: boolean; results?: MarketInfo[]; error?: string }> {
    try {
      const supportedChains = chains || ['evm', 'sonic', 'sui', 'solana'];
      const results: MarketInfo[] = [];
      
      for (const chainSlug of supportedChains) {
        const adapter = this.getAdapter(chainSlug);
        if (adapter) {
          try {
            const marketInfo = await adapter.getMarketInfo(symbol);
            results.push(marketInfo);
          } catch (error) {
            console.warn(`Failed to get market info for ${symbol} on ${chainSlug}:`, error);
            // Continue with other chains even if one fails
          }
        }
      }
      
      if (results.length === 0) {
        return { success: false, error: `No market info available for ${symbol} on specified chains` };
      }
      
      return { success: true, results };
    } catch (error) {
      console.error('Error getting market info:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * Get all available trading pairs across multiple chains
   */
  async getAvailableMarkets(
    chains?: string[]
  ): Promise<{ success: boolean; results?: Record<string, string[]>; error?: string }> {
    try {
      const supportedChains = chains || ['evm', 'sonic', 'sui', 'solana'];
      const results: Record<string, string[]> = {};
      
      for (const chainSlug of supportedChains) {
        const adapter = this.getAdapter(chainSlug);
        if (adapter) {
          try {
            const markets = await adapter.getAvailableMarkets();
            results[chainSlug] = markets;
          } catch (error) {
            console.warn(`Failed to get available markets on ${chainSlug}:`, error);
            // Continue with other chains even if one fails
          }
        }
      }
      
      if (Object.keys(results).length === 0) {
        return { success: false, error: `No markets available on specified chains` };
      }
      
      return { success: true, results };
    } catch (error) {
      console.error('Error getting available markets:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * Cancel an order on the specified chain
   */
  async cancelOrder(
    vaultId: string,
    chainSlug: string,
    orderId: string,
    dexName?: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      // Get the adapter for the chain
      const adapter = this.getAdapter(chainSlug, dexName);
      if (!adapter) {
        return { success: false, error: `No adapter available for chain ${chainSlug}${dexName ? ` and DEX ${dexName}` : ''}` };
      }
      
      // Get the multisig wallet address for the vault on this chain
      const multisigAddress = await this.getMultisigAddressForVault(vaultId, chainSlug);
      if (!multisigAddress) {
        return { success: false, error: `No multisig wallet found for vault ${vaultId} on chain ${chainSlug}` };
      }
      
      // Cancel the order using the adapter
      const result = await adapter.cancelOrder(multisigAddress, orderId);
      
      // Update the order status in the database (in a real implementation)
      if (result.success) {
        await this.updateOrderStatusInDatabase(orderId, 'canceled');
      }
      
      return result;
    } catch (error) {
      console.error('Error cancelling order:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * Get all open orders for a vault across multiple chains
   */
  async getOpenOrders(
    vaultId: string,
    chains?: string[]
  ): Promise<{ success: boolean; results?: Record<string, OrderResult[]>; error?: string }> {
    try {
      const supportedChains = chains || ['evm', 'sonic', 'sui', 'solana'];
      const results: Record<string, OrderResult[]> = {};
      
      for (const chainSlug of supportedChains) {
        const adapter = this.getAdapter(chainSlug);
        if (adapter) {
          try {
            // Get the multisig wallet address for the vault on this chain
            const multisigAddress = await this.getMultisigAddressForVault(vaultId, chainSlug);
            if (multisigAddress) {
              const orders = await adapter.getOpenOrders(multisigAddress);
              if (orders.length > 0) {
                results[chainSlug] = orders;
              }
            }
          } catch (error) {
            console.warn(`Failed to get open orders on ${chainSlug}:`, error);
            // Continue with other chains even if one fails
          }
        }
      }
      
      return { success: true, results };
    } catch (error) {
      console.error('Error getting open orders:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * Helper method to get the multisig wallet address for a vault on a specific chain
   * In a real implementation, this would query the database
   */
  private async getMultisigAddressForVault(vaultId: string, chainSlug: string): Promise<string | null> {
    try {
      const supabase = createServerClient();
      
      const { data, error } = await supabase
        .from('farm_vault_multisigs')
        .select('multisig_address')
        .eq('vault_id', vaultId)
        .eq('chain_slug', chainSlug)
        .eq('status', 'active')
        .single();
      
      if (error || !data) {
        console.error('Error getting multisig address:', error);
        return null;
      }
      
      return data.multisig_address;
    } catch (error) {
      console.error('Error in getMultisigAddressForVault:', error);
      return null;
    }
  }
  
  /**
   * Helper method to store order information in the database
   * In a real implementation, this would insert into an orders table
   */
  private async storeOrderInDatabase(vaultId: string, order: OrderResult): Promise<void> {
    try {
      const supabase = createServerClient();
      
      // In a real implementation, we would store this in a proper orders table
      // For now, this is just a placeholder
      console.log(`[Database] Storing order ${order.orderId} for vault ${vaultId}`);
      
      // Example of a real implementation:
      /*
      const { error } = await supabase
        .from('trading_orders')
        .insert({
          vault_id: vaultId,
          order_id: order.orderId,
          chain_slug: order.chainSlug,
          multisig_address: order.multisigAddress,
          status: order.status,
          filled: order.filled,
          remaining: order.remaining,
          avg_price: order.avgPrice,
          cost: order.cost,
          timestamp: new Date(order.timestamp).toISOString(),
          tx_hash: order.txHash
        });
      
      if (error) {
        console.error('Error storing order in database:', error);
      }
      */
    } catch (error) {
      console.error('Error in storeOrderInDatabase:', error);
    }
  }
  
  /**
   * Helper method to update order status in the database
   * In a real implementation, this would update the orders table
   */
  private async updateOrderStatusInDatabase(orderId: string, status: string): Promise<void> {
    try {
      const supabase = createServerClient();
      
      // In a real implementation, we would update a proper orders table
      // For now, this is just a placeholder
      console.log(`[Database] Updating order ${orderId} status to ${status}`);
      
      // Example of a real implementation:
      /*
      const { error } = await supabase
        .from('trading_orders')
        .update({ status })
        .eq('order_id', orderId);
      
      if (error) {
        console.error('Error updating order status in database:', error);
      }
      */
    } catch (error) {
      console.error('Error in updateOrderStatusInDatabase:', error);
    }
  }
}
