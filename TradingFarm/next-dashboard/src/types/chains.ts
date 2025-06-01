/**
 * Types for blockchain chains and networks
 */

/**
 * Supported chain IDs for the application
 */
export enum SupportedChainId {
  ETHEREUM_MAINNET = 1,
  OPTIMISM = 10,
  BSC = 56,
  ARBITRUM_ONE = 42161,
  AVALANCHE = 43114,
  POLYGON = 137,
  FANTOM = 250,
  BASE = 8453,
  ZKSYNC_ERA = 324,
  LINEA = 59144,
  
  // Testnets
  ETHEREUM_SEPOLIA = 11155111,
  POLYGON_MUMBAI = 80001,
  ARBITRUM_GOERLI = 421613,
  OPTIMISM_GOERLI = 420,
  BASE_GOERLI = 84531,
}

/**
 * Chain names mapped to their IDs
 */
export const CHAIN_NAMES: Record<SupportedChainId, string> = {
  [SupportedChainId.ETHEREUM_MAINNET]: 'Ethereum',
  [SupportedChainId.OPTIMISM]: 'Optimism',
  [SupportedChainId.BSC]: 'BNB Chain',
  [SupportedChainId.ARBITRUM_ONE]: 'Arbitrum',
  [SupportedChainId.AVALANCHE]: 'Avalanche',
  [SupportedChainId.POLYGON]: 'Polygon',
  [SupportedChainId.FANTOM]: 'Fantom',
  [SupportedChainId.BASE]: 'Base',
  [SupportedChainId.ZKSYNC_ERA]: 'zkSync Era',
  [SupportedChainId.LINEA]: 'Linea',
  
  // Testnets
  [SupportedChainId.ETHEREUM_SEPOLIA]: 'Ethereum Sepolia',
  [SupportedChainId.POLYGON_MUMBAI]: 'Polygon Mumbai',
  [SupportedChainId.ARBITRUM_GOERLI]: 'Arbitrum Goerli',
  [SupportedChainId.OPTIMISM_GOERLI]: 'Optimism Goerli',
  [SupportedChainId.BASE_GOERLI]: 'Base Goerli',
};

/**
 * Native tokens for each chain
 */
export const NATIVE_TOKENS: Record<SupportedChainId, { symbol: string; decimals: number }> = {
  [SupportedChainId.ETHEREUM_MAINNET]: { symbol: 'ETH', decimals: 18 },
  [SupportedChainId.OPTIMISM]: { symbol: 'ETH', decimals: 18 },
  [SupportedChainId.BSC]: { symbol: 'BNB', decimals: 18 },
  [SupportedChainId.ARBITRUM_ONE]: { symbol: 'ETH', decimals: 18 },
  [SupportedChainId.AVALANCHE]: { symbol: 'AVAX', decimals: 18 },
  [SupportedChainId.POLYGON]: { symbol: 'MATIC', decimals: 18 },
  [SupportedChainId.FANTOM]: { symbol: 'FTM', decimals: 18 },
  [SupportedChainId.BASE]: { symbol: 'ETH', decimals: 18 },
  [SupportedChainId.ZKSYNC_ERA]: { symbol: 'ETH', decimals: 18 },
  [SupportedChainId.LINEA]: { symbol: 'ETH', decimals: 18 },
  
  // Testnets
  [SupportedChainId.ETHEREUM_SEPOLIA]: { symbol: 'ETH', decimals: 18 },
  [SupportedChainId.POLYGON_MUMBAI]: { symbol: 'MATIC', decimals: 18 },
  [SupportedChainId.ARBITRUM_GOERLI]: { symbol: 'ETH', decimals: 18 },
  [SupportedChainId.OPTIMISM_GOERLI]: { symbol: 'ETH', decimals: 18 },
  [SupportedChainId.BASE_GOERLI]: { symbol: 'ETH', decimals: 18 },
};

/**
 * RPC URLs for each chain
 */
export const RPC_URLS: Record<SupportedChainId, string[]> = {
  [SupportedChainId.ETHEREUM_MAINNET]: ['https://ethereum.publicnode.com', 'https://rpc.ankr.com/eth'],
  [SupportedChainId.OPTIMISM]: ['https://mainnet.optimism.io', 'https://rpc.ankr.com/optimism'],
  [SupportedChainId.BSC]: ['https://bsc-dataseed.binance.org', 'https://rpc.ankr.com/bsc'],
  [SupportedChainId.ARBITRUM_ONE]: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'],
  [SupportedChainId.AVALANCHE]: ['https://api.avax.network/ext/bc/C/rpc', 'https://rpc.ankr.com/avalanche'],
  [SupportedChainId.POLYGON]: ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'],
  [SupportedChainId.FANTOM]: ['https://rpc.ftm.tools', 'https://rpc.ankr.com/fantom'],
  [SupportedChainId.BASE]: ['https://mainnet.base.org', 'https://base.publicnode.com'],
  [SupportedChainId.ZKSYNC_ERA]: ['https://mainnet.era.zksync.io', 'https://zksync.drpc.org'],
  [SupportedChainId.LINEA]: ['https://rpc.linea.build', 'https://linea.blockpi.network/v1/rpc/public'],
  
  // Testnets
  [SupportedChainId.ETHEREUM_SEPOLIA]: ['https://ethereum-sepolia.publicnode.com', 'https://rpc.sepolia.org'],
  [SupportedChainId.POLYGON_MUMBAI]: ['https://rpc-mumbai.maticvigil.com', 'https://polygon-mumbai.public.blastapi.io'],
  [SupportedChainId.ARBITRUM_GOERLI]: ['https://goerli-rollup.arbitrum.io/rpc', 'https://arbitrum-goerli.public.blastapi.io'],
  [SupportedChainId.OPTIMISM_GOERLI]: ['https://goerli.optimism.io', 'https://optimism-goerli.public.blastapi.io'],
  [SupportedChainId.BASE_GOERLI]: ['https://goerli.base.org', 'https://base-goerli.public.blastapi.io'],
};

/**
 * Block explorers for each chain
 */
export const EXPLORERS: Record<SupportedChainId, { name: string; url: string }> = {
  [SupportedChainId.ETHEREUM_MAINNET]: { name: 'Etherscan', url: 'https://etherscan.io' },
  [SupportedChainId.OPTIMISM]: { name: 'Optimism Explorer', url: 'https://optimistic.etherscan.io' },
  [SupportedChainId.BSC]: { name: 'BscScan', url: 'https://bscscan.com' },
  [SupportedChainId.ARBITRUM_ONE]: { name: 'Arbiscan', url: 'https://arbiscan.io' },
  [SupportedChainId.AVALANCHE]: { name: 'Snowtrace', url: 'https://snowtrace.io' },
  [SupportedChainId.POLYGON]: { name: 'PolygonScan', url: 'https://polygonscan.com' },
  [SupportedChainId.FANTOM]: { name: 'FTMScan', url: 'https://ftmscan.com' },
  [SupportedChainId.BASE]: { name: 'Basescan', url: 'https://basescan.org' },
  [SupportedChainId.ZKSYNC_ERA]: { name: 'zkSync Explorer', url: 'https://explorer.zksync.io' },
  [SupportedChainId.LINEA]: { name: 'Lineascan', url: 'https://lineascan.build' },
  
  // Testnets
  [SupportedChainId.ETHEREUM_SEPOLIA]: { name: 'Sepolia Etherscan', url: 'https://sepolia.etherscan.io' },
  [SupportedChainId.POLYGON_MUMBAI]: { name: 'Mumbai PolygonScan', url: 'https://mumbai.polygonscan.com' },
  [SupportedChainId.ARBITRUM_GOERLI]: { name: 'Arbitrum Goerli Explorer', url: 'https://goerli.arbiscan.io' },
  [SupportedChainId.OPTIMISM_GOERLI]: { name: 'Optimism Goerli Explorer', url: 'https://goerli-optimism.etherscan.io' },
  [SupportedChainId.BASE_GOERLI]: { name: 'Base Goerli Explorer', url: 'https://goerli.basescan.org' },
};

/**
 * Get chain name by ID
 */
export function getChainName(chainId: SupportedChainId): string {
  return CHAIN_NAMES[chainId] || 'Unknown Chain';
}

/**
 * Get default RPC URL for a chain
 */
export function getRpcUrl(chainId: SupportedChainId): string {
  const urls = RPC_URLS[chainId];
  return urls && urls.length > 0 ? urls[0] : '';
}

/**
 * Get explorer URL for a chain
 */
export function getExplorerUrl(chainId: SupportedChainId): string {
  return EXPLORERS[chainId]?.url || '';
}

/**
 * Get transaction URL on explorer
 */
export function getExplorerTxUrl(chainId: SupportedChainId, txHash: string): string {
  const baseUrl = getExplorerUrl(chainId);
  return baseUrl ? `${baseUrl}/tx/${txHash}` : '';
}

/**
 * Get address URL on explorer
 */
export function getExplorerAddressUrl(chainId: SupportedChainId, address: string): string {
  const baseUrl = getExplorerUrl(chainId);
  return baseUrl ? `${baseUrl}/address/${address}` : '';
}

/**
 * Check if a chain ID is supported
 */
export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return Object.values(SupportedChainId).includes(chainId as SupportedChainId);
}

/**
 * Check if a chain is a testnet
 */
export function isTestnet(chainId: SupportedChainId): boolean {
  return [
    SupportedChainId.ETHEREUM_SEPOLIA,
    SupportedChainId.POLYGON_MUMBAI,
    SupportedChainId.ARBITRUM_GOERLI,
    SupportedChainId.OPTIMISM_GOERLI,
    SupportedChainId.BASE_GOERLI,
  ].includes(chainId);
}

/**
 * Get RPC provider configuration for ethers
 */
export function getProviderConfig(chainId: SupportedChainId) {
  return {
    chainId,
    name: CHAIN_NAMES[chainId],
    rpcUrl: getRpcUrl(chainId),
  };
}
