import { getDefaultWallets } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, ChainNotConfiguredError } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { Chain } from 'wagmi/chains';
import { fallback, http } from 'wagmi/providers';

// Define Sonic Network as a custom chain
export const sonicNetwork = {
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 7700,
  name: 'Sonic Network',
  network: 'sonic',
  nativeCurrency: {
    decimals: 18,
    name: 'Sonic',
    symbol: 'SONIC',
  },
  rpcUrls: {
    public: { http: [process.env.NEXT_PUBLIC_SONIC_NETWORK_RPC_URL || 'https://rpc.sonic.network'] },
    default: { http: [process.env.NEXT_PUBLIC_SONIC_NETWORK_RPC_URL || 'https://rpc.sonic.network'] },
  },
  blockExplorers: {
    default: { name: 'SonicScan', url: 'https://explorer.sonic.network' },
  },
} as const satisfies Chain;

// Define Sonic Testnet as a custom chain
export const sonicTestnet = {
  id: Number(process.env.NEXT_PUBLIC_TESTNET_CHAIN_ID) || 7701,
  name: 'Sonic Testnet',
  network: 'sonic-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Sonic',
    symbol: 'SONIC',
  },
  rpcUrls: {
    public: { http: [process.env.NEXT_PUBLIC_SONIC_TESTNET_RPC_URL || 'https://testnet.rpc.sonic.network'] },
    default: { http: [process.env.NEXT_PUBLIC_SONIC_TESTNET_RPC_URL || 'https://testnet.rpc.sonic.network'] },
  },
  blockExplorers: {
    default: { name: 'SonicScan Testnet', url: 'https://testnet-explorer.sonic.network' },
  },
  testnet: true,
} as const satisfies Chain;

// Dynamic contract address based on network
export const getContractAddress = (chainId?: number): `0x${string}` => {
  if (chainId === sonicTestnet.id) {
    return (process.env.NEXT_PUBLIC_TESTNET_CONTRACT_ADDRESS as `0x${string}`) || 
           '0x0000000000000000000000000000000000000000';
  }
  
  return (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) || 
         '0x0000000000000000000000000000000000000000';
};

// Determine which network to use (can be controlled via env variable or UI toggle)
const isTestnet = process.env.NEXT_PUBLIC_USE_TESTNET === 'true';

// Configure chains and providers with multiple fallback providers for reliability
export const { chains, publicClient } = configureChains(
  [sonicNetwork, sonicTestnet], // Include both networks in config
  [
    fallback([
      http(process.env.NEXT_PUBLIC_SONIC_NETWORK_RPC_URL || 'https://rpc.sonic.network'),
      publicProvider(),
    ], { rank: true }), // Rank helps pick the fastest provider
  ],
  {
    pollingInterval: 10000, // Poll for new blocks every 10 seconds
    retryCount: 3, // Retry failed requests 3 times
    retryDelay: 1000, // Wait 1 second between retries
  }
);

// Configure connectors for RainbowKit
const { connectors } = getDefaultWallets({
  appName: 'Sonic NFT Collection',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains,
});

// Create wagmi config with event listeners for errors
export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  logger: {
    warn: (message) => console.warn(message),
    error: (message) => {
      console.error(message);
      // You can add custom error reporting here
      if (message instanceof ChainNotConfiguredError) {
        console.error('Chain not configured error - user needs to switch networks');
      }
    },
  },
});

// Contract ABI with event definitions
const contractABI = [
  // Mint function
  {
    inputs: [{ internalType: 'uint256', name: 'quantity', type: 'uint256' }],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Total supply function
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Max supply constant
  {
    inputs: [],
    name: 'MAX_SUPPLY',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Minting status
  {
    inputs: [],
    name: 'mintingActive',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Reveal status
  {
    inputs: [],
    name: 'revealed',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Max per wallet
  {
    inputs: [],
    name: 'maxPerWallet',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view', 
    type: 'function',
  },
  // Minted per wallet
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'mintedPerWallet',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Minted event
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' }
    ],
    name: 'Minted',
    type: 'event',
  },
  // Revealed event
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'bool', name: 'revealState', type: 'bool' }
    ],
    name: 'Revealed',
    type: 'event',
  },
];

// Dynamic contract configuration that changes based on the active chain
export const getContractConfig = (chainId?: number) => ({
  address: getContractAddress(chainId),
  abi: contractABI,
}); 