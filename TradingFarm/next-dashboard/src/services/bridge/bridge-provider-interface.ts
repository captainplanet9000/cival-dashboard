/**
 * Trading Farm Multi-Chain Integration
 * IBridgeProvider Interface - Standardized interface for bridging assets across different chains
 */

import { BridgeTransaction } from '@/types/bridge.types';

export interface BridgeAsset {
  chainSlug: string;
  assetAddress: string;
  assetSymbol: string;
  amount: string; // Decimal string representation to avoid precision issues
  decimals: number;
}

export interface BridgeParams {
  sourceVaultId: string;
  sourceMultisigAddress: string;
  sourceAsset: BridgeAsset;
  destinationChain: string;
  destinationAsset: BridgeAsset;
  destinationMultisigAddress: string;
  slippageTolerance?: number; // In percentage points (e.g., 0.5 = 0.5%)
  gasLimit?: number;
  deadline?: number; // Unix timestamp
}

export interface BridgeQuote {
  sourceAsset: BridgeAsset;
  destinationAsset: BridgeAsset;
  expectedOutput: string; // Expected amount after fees and slippage
  minOutput: string; // Minimum amount with slippage tolerance applied
  fee: {
    amount: string;
    token: string;
  };
  exchangeRate: string; // Source to destination asset rate
  estimatedGasCost: {
    sourceChain: string;
    destinationChain: string;
  };
  estimatedTimeMinutes: number;
  provider: string;
  providerType: 'layerzero' | 'wormhole' | 'sonic_gateway' | 'custom';
  validUntil: number; // Unix timestamp
}

export interface BridgeResult {
  success: boolean;
  transactionId?: string; // Database bridge transaction ID
  sourceTxHash?: string;
  error?: string;
  bridgeTransaction?: BridgeTransaction;
}

/**
 * IBridgeProvider - Interface for chain-specific bridge providers
 */
export interface IBridgeProvider {
  /**
   * Get the provider type
   */
  readonly providerType: 'layerzero' | 'wormhole' | 'sonic_gateway' | 'custom';
  
  /**
   * Get supported source chains
   */
  readonly supportedSourceChains: string[];
  
  /**
   * Get supported destination chains
   */
  readonly supportedDestinationChains: string[];
  
  /**
   * Check if this provider supports bridging between the given chains
   */
  supportsRoute(sourceChain: string, destinationChain: string): boolean;
  
  /**
   * Get a quote for bridging assets between chains
   */
  getQuote(params: Omit<BridgeParams, 'sourceVaultId' | 'sourceMultisigAddress' | 'destinationMultisigAddress'>): Promise<BridgeQuote>;
  
  /**
   * Execute a bridge transaction
   */
  executeBridge(params: BridgeParams): Promise<BridgeResult>;
  
  /**
   * Check the status of a bridge transaction
   */
  checkBridgeStatus(transactionId: string): Promise<BridgeTransaction>;
}
