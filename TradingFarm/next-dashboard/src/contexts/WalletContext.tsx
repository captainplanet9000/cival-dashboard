'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { formatAddress } from '@/lib/utils';

// Define the structure of the wallet information we want to share
interface WalletState {
  address: string | null;
  isConnected: boolean;
  balance: string | null;
  network: string | null;
  error: string | null;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshBalance: () => Promise<void>;
}

// Create the context with a default undefined value to ensure it's used within a provider
const WalletContext = createContext<WalletState | undefined>(undefined);

// Define the props for the provider component
interface WalletProviderProps {
  children: ReactNode;
}

// Types for global ethereum object
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

// Create the provider component
export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const { toast } = useToast();

  const isMetaMaskAvailable = useCallback((): boolean => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }, []);

  const getBalance = useCallback(async (addr: string): Promise<string> => {
    if (!isMetaMaskAvailable() || !addr) return '0';
    try {
      const balanceHex = await window.ethereum!.request({
        method: 'eth_getBalance',
        params: [addr, 'latest']
      });
      const balanceWei = parseInt(balanceHex as string, 16);
      const balanceEth = (balanceWei / 1e18).toFixed(4);
      return balanceEth;
    } catch (err) {
      console.error('Error getting balance:', err);
      setError('Failed to fetch balance.');
      toast({
        title: "Balance Error",
        description: "Could not fetch wallet balance.",
        variant: "destructive",
      });
      return '0';
    }
  }, [isMetaMaskAvailable, toast]);

  const getNetwork = useCallback(async (): Promise<string> => {
    if (!isMetaMaskAvailable()) return 'Unknown Network';
    try {
      const chainIdHex = await window.ethereum!.request({ 
        method: 'eth_chainId' 
      });
      const chainId = parseInt(chainIdHex as string, 16);
      const networks: Record<number, string> = {
        1: 'Ethereum Mainnet',
        3: 'Ropsten Testnet',
        4: 'Rinkeby Testnet',
        5: 'Goerli Testnet',
        42: 'Kovan Testnet',
        56: 'Binance Smart Chain',
        137: 'Polygon Mainnet',
        80001: 'Polygon Mumbai',
        42161: 'Arbitrum One',
        10: 'Optimism',
        250: 'Fantom Opera'
      };
      return networks[chainId] || `Chain ID: ${chainId}`;
    } catch (err) {
      console.error('Error getting network:', err);
      return 'Unknown Network';
    }
  }, [isMetaMaskAvailable]);

  const updateWalletState = useCallback(async (addr: string | null) => {
    if (addr) {
      const bal = await getBalance(addr);
      const net = await getNetwork();
      setAddress(addr);
      setBalance(bal);
      setNetwork(net);
      setIsConnected(true);
      setError(null);
      if (!address) {
        toast({
          title: "Wallet Connected",
          description: `Connected to ${formatAddress(addr)} on ${net}.`,
        });
      }
    } else {
      const previouslyConnected = isConnected;
      setAddress(null);
      setBalance(null);
      setNetwork(null);
      setIsConnected(false);
      if (previouslyConnected) {
        toast({
          title: "Wallet Disconnected",
          description: "Your wallet has been disconnected.",
        });
      }
    }
  }, [getBalance, getNetwork, toast, address, isConnected]);

  const connectWallet = useCallback(async () => {
    if (!isMetaMaskAvailable()) {
      const errorMsg = 'MetaMask not detected. Please install MetaMask extension.';
      setError(errorMsg);
      toast({ title: "Connection Error", description: errorMsg, variant: "destructive" });
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const accounts = await window.ethereum!.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        await updateWalletState(accounts[0]);
      } else {
        const errorMsg = 'No accounts found or user denied access';
        setError(errorMsg);
        toast({ title: "Connection Error", description: errorMsg, variant: "destructive" });
        await updateWalletState(null);
      }
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      const errorMsg = err.message || 'Failed to connect wallet';
      setError(errorMsg);
      toast({ title: "Connection Error", description: errorMsg, variant: "destructive" });
      await updateWalletState(null);
    } finally {
      setIsConnecting(false);
    }
  }, [isMetaMaskAvailable, updateWalletState, toast]);

  const disconnectWallet = useCallback(async () => {
    console.log("Disconnect wallet triggered from context");
    await updateWalletState(null);
  }, [updateWalletState]);

  const refreshBalance = useCallback(async () => {
    if (!address) {
      const errorMsg = "Cannot refresh balance: Wallet not connected.";
      setError(errorMsg);
      toast({ title: "Balance Error", description: errorMsg, variant: "destructive" });
      return;
    }
    console.log("Refresh balance triggered from context");
    const newBalance = await getBalance(address);
    setBalance(newBalance);
    toast({ title: "Balance Refreshed", description: `New balance: ${newBalance} ETH` });
  }, [address, getBalance, toast]);

  // Effect to check initial connection and setup listeners
  useEffect(() => {
    const checkInitialConnection = async () => {
      if (isMetaMaskAvailable()) {
        try {
          const accounts = await window.ethereum!.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            await updateWalletState(accounts[0]);
          } else {
            await updateWalletState(null);
          }
        } catch (err) {
          console.error('Error checking initial MetaMask connection:', err);
          await updateWalletState(null);
        }
      }
    };

    checkInitialConnection();

    const handleAccountsChanged = (accounts: string[]) => {
      const currentAddress = address;
      if (accounts.length === 0 && currentAddress) {
        updateWalletState(null);
      } else if (accounts.length > 0 && accounts[0] !== currentAddress) {
        updateWalletState(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      if(address) updateWalletState(address);
      toast({ title: "Network Changed", description: "Wallet network updated." });
    };

    if (isMetaMaskAvailable()) {
      window.ethereum!.on('accountsChanged', handleAccountsChanged);
      window.ethereum!.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (isMetaMaskAvailable()) {
        window.ethereum!.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum!.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [isMetaMaskAvailable, updateWalletState, address, toast]);

  const value: WalletState = {
    address,
    isConnected,
    balance,
    network,
    error,
    isConnecting,
    connectWallet,
    disconnectWallet,
    refreshBalance,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook to use the WalletContext
export const useWallet = (): WalletState => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}; 