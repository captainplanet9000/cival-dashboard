import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, arbitrum, optimism, polygon } from 'wagmi/chains'
import { defaultWagmiConfig } from '@web3modal/wagmi/react'

// Environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '00000000000000000000000000000000'

// Configure supported chains
export const chains = [mainnet, sepolia, arbitrum, optimism, polygon] as const

// Web3Modal configuration with supported networks
export const config = defaultWagmiConfig({
  projectId,
  chains,
  metadata: {
    name: 'Trading Farm',
    description: 'AI-powered trading farm platform with agent management',
    url: 'https://tradingfarm.io',
    icons: ['https://avatars.githubusercontent.com/u/37784886']
  },
  ssr: true
})

// Define network configuration interface
interface NetworkConfig {
  name: string;
  symbol: string;
  explorerUrl: string;
  iconColor: string;
  isTestnet?: boolean;
}

// Network configuration for display purposes
export const networkConfig: Record<number, NetworkConfig> = {
  [mainnet.id]: {
    name: 'Ethereum',
    symbol: 'ETH',
    explorerUrl: 'https://etherscan.io',
    iconColor: '#627EEA',
    isTestnet: false,
  },
  [sepolia.id]: {
    name: 'Sepolia',
    symbol: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io',
    iconColor: '#627EEA',
    isTestnet: true,
  },
  [arbitrum.id]: {
    name: 'Arbitrum',
    symbol: 'ARB',
    explorerUrl: 'https://arbiscan.io',
    iconColor: '#28A0F0',
    isTestnet: false,
  },
  [optimism.id]: {
    name: 'Optimism',
    symbol: 'OP',
    explorerUrl: 'https://optimistic.etherscan.io',
    iconColor: '#FF0420',
    isTestnet: false,
  },
  [polygon.id]: {
    name: 'Polygon',
    symbol: 'MATIC',
    explorerUrl: 'https://polygonscan.com',
    iconColor: '#8247E5',
    isTestnet: false,
  },
}
