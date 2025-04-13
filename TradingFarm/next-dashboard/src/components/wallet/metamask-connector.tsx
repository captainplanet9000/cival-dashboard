"use client"

import React from 'react'
import { Button } from '@/components/ui/button'

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

/**
 * MetaMask connector component 
 * Handles basic wallet connection functionality
 */
export default function MetaMaskConnector() {
  const [account, setAccount] = React.useState<string | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Check if MetaMask is available
  const isMetaMaskAvailable = (): boolean => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  };

  // Get current account (if connected)
  React.useEffect(() => {
    const checkConnection = async () => {
      if (isMetaMaskAvailable()) {
        try {
          const accounts = await window.ethereum!.request({ 
            method: 'eth_accounts' 
          });
          
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
          }
        } catch (err) {
          console.error('Error checking MetaMask connection:', err);
        }
      }
    };

    checkConnection();
  }, []);

  // Connect wallet function
  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    if (!isMetaMaskAvailable()) {
      setError('MetaMask not detected. Please install MetaMask extension.');
      setIsConnecting(false);
      return;
    }

    try {
      const accounts = await window.ethereum!.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
      } else {
        setError('No accounts found or user denied access');
      }
    } catch (err: any) {
      console.error('Error connecting to MetaMask:', err);
      setError(err.message || 'Failed to connect to MetaMask');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet (just UI state, doesn't actually disconnect MetaMask)
  const disconnectWallet = () => {
    setAccount(null);
  };

  // Format account address for display
  const formatAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="flex flex-col space-y-4">
      {!isMetaMaskAvailable() && (
        <div className="p-4 border rounded bg-amber-50 text-amber-700">
          MetaMask not detected. Please install the MetaMask browser extension.
        </div>
      )}

      {error && (
        <div className="p-4 border rounded bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {account ? (
        <div className="flex items-center justify-between p-4 border rounded bg-green-50 text-green-700">
          <div className="flex flex-col">
            <span className="font-medium">Connected</span>
            <span className="text-sm">{formatAddress(account)}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={disconnectWallet}
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <Button
          onClick={connectWallet}
          disabled={isConnecting}
          className="w-full"
        >
          {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
        </Button>
      )}
    </div>
  );
}
