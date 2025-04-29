'use client';

/**
 * Development Auto-Connector Utility
 * 
 * Automatically connects to wallets and exchange APIs in development environment
 * without requiring manual authentication steps from the user.
 */

import * as React from 'react';
import { useEffect, useState } from 'react';

// Mock exchange API types
interface ExchangeConnection {
  name: string;
  connected: boolean;
  balances: Record<string, number>;
  error?: string;
}

// Mock wallet connection type
interface WalletConnection {
  address: string;
  connected: boolean;
  balance: number;
  network: string;
  chainId: number;
}

// Development environment configuration
const DEV_CONFIG = {
  autoConnectWallet: true,
  autoConnectExchanges: true,
  mockLatency: 800, // Simulated connection latency in ms
  defaultWallet: {
    address: '0x7Fa9385bE102ac3EAc297483Dd6233D62b3e1496',
    balance: 2.5,
    network: 'Ethereum',
    chainId: 1,
  },
  exchanges: [
    { name: 'Binance', apiKey: 'dev_binance_key', apiSecret: 'dev_binance_secret' },
    { name: 'Coinbase', apiKey: 'dev_coinbase_key', apiSecret: 'dev_coinbase_secret' },
    { name: 'Bybit', apiKey: 'dev_bybit_key', apiSecret: 'dev_bybit_secret' },
  ]
};

// Context for auto-connected resources
type AutoConnectContextType = {
  wallet: WalletConnection | null;
  exchanges: ExchangeConnection[];
  isConnecting: boolean;
  disconnectWallet: () => void;
  connectWallet: () => Promise<WalletConnection>;
  disconnectExchange: (name: string) => void;
  connectExchange: (name: string) => Promise<ExchangeConnection>;
};

const defaultContext: AutoConnectContextType = {
  wallet: null,
  exchanges: [],
  isConnecting: false,
  disconnectWallet: () => {},
  connectWallet: async () => ({ address: '', connected: false, balance: 0, network: '', chainId: 0 }),
  disconnectExchange: () => {},
  connectExchange: async () => ({ name: '', connected: false, balances: {} }),
};

const AutoConnectContext = React.createContext<AutoConnectContextType>(defaultContext);

export function DevAutoConnector({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [exchanges, setExchanges] = useState<ExchangeConnection[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Mock function to simulate wallet connection
  const connectWallet = async (): Promise<WalletConnection> => {
    setIsConnecting(true);
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, DEV_CONFIG.mockLatency));
    
    const connectedWallet = {
      ...DEV_CONFIG.defaultWallet,
      connected: true,
    };
    
    setWallet(connectedWallet);
    setIsConnecting(false);
    
    console.log('[DEV] Auto-connected to wallet:', connectedWallet.address);
    return connectedWallet;
  };
  
  // Mock function to disconnect wallet
  const disconnectWallet = () => {
    setWallet(null);
    console.log('[DEV] Disconnected wallet');
  };
  
  // Mock function to connect to exchange API
  const connectExchange = async (name: string): Promise<ExchangeConnection> => {
    setIsConnecting(true);
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, DEV_CONFIG.mockLatency));
    
    const exchange = DEV_CONFIG.exchanges.find(e => e.name === name);
    
    if (!exchange) {
      setIsConnecting(false);
      return { name, connected: false, balances: {}, error: 'Exchange not found' };
    }
    
    // Create mock balances based on exchange name
    const mockBalances: Record<string, number> = {};
    
    if (name === 'Binance') {
      mockBalances['BTC'] = 0.5;
      mockBalances['ETH'] = 5.0;
      mockBalances['USDT'] = 10000;
    } else if (name === 'Coinbase') {
      mockBalances['BTC'] = 0.2;
      mockBalances['ETH'] = 2.5;
      mockBalances['USDC'] = 5000;
    } else if (name === 'Bybit') {
      mockBalances['BTC'] = 0.3;
      mockBalances['ETH'] = 3.0;
      mockBalances['USDT'] = 7500;
    }
    
    const connectedExchange: ExchangeConnection = {
      name,
      connected: true,
      balances: mockBalances,
    };
    
    // Update exchanges state, replacing if already exists
    setExchanges(prev => {
      const filtered = prev.filter(e => e.name !== name);
      return [...filtered, connectedExchange];
    });
    
    setIsConnecting(false);
    console.log(`[DEV] Auto-connected to ${name} exchange`);
    
    return connectedExchange;
  };
  
  // Mock function to disconnect from exchange
  const disconnectExchange = (name: string) => {
    setExchanges(prev => prev.filter(e => e.name !== name));
    console.log(`[DEV] Disconnected from ${name} exchange`);
  };
  
  // Auto-connect on component mount in development
  useEffect(() => {
    const autoConnect = async () => {
      // Only auto-connect in development environment
      if (process.env.NODE_ENV !== 'development') return;
      
      // Auto-connect wallet if enabled
      if (DEV_CONFIG.autoConnectWallet) {
        await connectWallet();
      }
      
      // Auto-connect exchanges if enabled
      if (DEV_CONFIG.autoConnectExchanges) {
        for (const exchange of DEV_CONFIG.exchanges) {
          await connectExchange(exchange.name);
        }
      }
    };
    
    autoConnect();
  }, []);
  
  return (
    <AutoConnectContext.Provider
      value={{
        wallet,
        exchanges,
        isConnecting,
        connectWallet,
        disconnectWallet,
        connectExchange,
        disconnectExchange,
      }}
    >
      {children}
    </AutoConnectContext.Provider>
  );
}

// Hook to use auto-connect features
export function useDevAutoConnect() {
  return React.useContext(AutoConnectContext);
}

// Decorator component that auto-connects resources for a component
export function withAutoConnect<T>(Component: React.ComponentType<T>) {
  return function WithAutoConnect(props: T) {
    return (
      <DevAutoConnector>
        <Component {...props} />
      </DevAutoConnector>
    );
  };
}
