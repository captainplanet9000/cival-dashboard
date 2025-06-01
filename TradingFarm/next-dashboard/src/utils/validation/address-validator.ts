/**
 * Trading Farm Address Validator
 * Utility for validating blockchain addresses across different chains
 */

import { isAddress as isEthAddress } from 'ethers/lib/utils';

/**
 * Validate if an address is valid for a specific blockchain
 * @param address The address to validate
 * @param chain The blockchain identifier (e.g., 'ethereum', 'solana')
 * @returns Boolean indicating if the address is valid
 */
export function isValidAddress(address: string, chain: string): boolean {
  // Normalize chain name
  const normalizedChain = chain.toLowerCase();
  
  // EVM-compatible chains
  if ([
    'ethereum', 'arbitrum', 'optimism', 'polygon', 'avalanche', 
    'binance', 'base', 'linea', 'zksync', 'scroll', 'mantle',
    'celo', 'fantom', 'kava', 'moonbeam'
  ].includes(normalizedChain)) {
    return isEthAddress(address);
  }
  
  // Solana addresses are 32-44 characters long and base58 encoded
  if (normalizedChain === 'solana') {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }
  
  // Cosmos-based chains (including Axelar)
  if (['cosmos', 'axelar', 'osmosis'].includes(normalizedChain)) {
    return address.startsWith(normalizedChain) && address.length >= 39 && address.length <= 50;
  }
  
  // Near addresses
  if (normalizedChain === 'near') {
    return /^([a-z\d]+[-_])*[a-z\d]+\.([a-z\d]+[-_])*[a-z\d]+$/.test(address) || 
           /^([a-z\d]+[-_])*[a-z\d]+$/.test(address);
  }
  
  // Default to true for chains we don't explicitly validate
  // This is to avoid blocking transactions on chains we haven't implemented validation for yet
  console.warn(`No validation implemented for ${chain} addresses, proceeding with caution`);
  return true;
}
