/**
 * Trading Farm Multi-Chain Integration
 * Bridge types for cross-chain asset transfers
 */

export type BridgeTransactionStatus = 'initiated' | 'pending' | 'completed' | 'failed' | 'cancelled';
export type BridgeProviderType = 'layerzero' | 'wormhole' | 'sonic_gateway' | 'custom';

export interface BridgeTransaction {
  id: string;
  vaultId: string;
  sourceChain: string;
  destinationChain: string;
  sourceAsset: string;
  destinationAsset: string;
  amount: string;
  amountReceived?: string;
  feeAmount?: string;
  feeToken?: string;
  sourceTxHash?: string;
  destinationTxHash?: string;
  providerType: BridgeProviderType;
  status: BridgeTransactionStatus;
  sourceMultisigId?: string;
  destinationMultisigId?: string;
  metadata?: Record<string, any>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChainAssetMapping {
  id: string;
  canonicalName: string;
  chainSlug: string;
  assetAddress: string;
  assetSymbol: string;
  assetDecimals: number;
  assetIconUrl?: string;
  isNative: boolean;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface BridgeProviderConfig {
  id: string;
  providerType: BridgeProviderType;
  sourceChain: string;
  destinationChain: string;
  priority: number;
  config: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
