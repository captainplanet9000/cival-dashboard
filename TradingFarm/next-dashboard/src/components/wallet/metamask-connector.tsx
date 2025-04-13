"use client"

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'
import { WalletService } from '@/services/wallet-service'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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

// Define wallet interface based on the actual implementation
interface WalletInfo {
  address: string;
  connected: boolean;
  balance: string;
  network?: string;
}

/**
 * MetaMask connector component 
 * Handles basic wallet connection functionality
 */
export default function MetaMaskConnector() {
  const [wallet, setWallet] = React.useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [balance, setBalance] = React.useState<string | null>(null);
  const [network, setNetwork] = React.useState<string | null>(null);

  // Check if MetaMask is available
  const isMetaMaskAvailable = (): boolean => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  };

  React.useEffect(() => {
    // Check if wallet is already connected
    checkConnection();
  }, []);

  // Get current account (if connected)
  const checkConnection = async () => {
    if (isMetaMaskAvailable()) {
      try {
        const accounts = await window.ethereum!.request({ 
          method: 'eth_accounts' 
        });
        
        if (accounts && accounts.length > 0) {
          const address = accounts[0];
          const ethBalance = await getBalance(address);
          const networkInfo = await getNetwork();
          
          setWallet({
            address,
            connected: true,
            balance: ethBalance,
            network: networkInfo
          });
          
          setBalance(ethBalance);
          setNetwork(networkInfo);
        }
      } catch (err) {
        console.error('Error checking MetaMask connection:', err);
      }
    }
  };

  const getBalance = async (address: string): Promise<string> => {
    try {
      const balanceHex = await window.ethereum!.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
      
      // Convert hex balance to ETH (wei to ether)
      const balanceWei = parseInt(balanceHex as string, 16);
      const balanceEth = (balanceWei / 1e18).toFixed(4);
      
      return balanceEth;
    } catch (err) {
      console.error('Error getting balance:', err);
      return '0';
    }
  };

  const getNetwork = async (): Promise<string> => {
    try {
      const chainIdHex = await window.ethereum!.request({ 
        method: 'eth_chainId' 
      });
      
      // Convert hex chainId to decimal
      const chainId = parseInt(chainIdHex as string, 16);
      
      // Map chain ID to network name
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
  };

  const connectMetaMask = async () => {
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
        const address = accounts[0];
        const ethBalance = await getBalance(address);
        const networkInfo = await getNetwork();
        
        const walletInfo = {
          address,
          connected: true,
          balance: ethBalance,
          network: networkInfo
        };
        
        setWallet(walletInfo);
        setBalance(ethBalance);
        setNetwork(networkInfo);
        
        // Setup listeners for account and chain changes
        setupEventListeners();
      } else {
        setError('No accounts found or user denied access');
      }
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const setupEventListeners = () => {
    if (window.ethereum) {
      // Account changed event
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          disconnectWallet();
        } else {
          // User switched accounts
          checkConnection();
        }
      });
      
      // Chain changed event
      window.ethereum.on('chainChanged', () => {
        // Refresh the page on chain change as recommended by MetaMask
        checkConnection();
      });
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    setBalance(null);
    setNetwork(null);
    setError(null);
  };

  const refreshBalance = async () => {
    if (!wallet || !wallet.address) return;
    
    try {
      const newBalance = await getBalance(wallet.address);
      setBalance(newBalance);
      setWallet({
        ...wallet,
        balance: newBalance
      });
    } catch (err: any) {
      console.error('Failed to refresh balance:', err);
      setError(err.message || 'Failed to refresh balance');
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatBalance = (value: string | null) => {
    if (!value) return '0.00';
    return parseFloat(value).toFixed(4);
  };

  if (isConnecting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connecting to MetaMask...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (wallet && wallet.connected) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              MetaMask Connected
            </CardTitle>
            <Badge variant="outline" className={network?.includes('Mainnet') ? 'bg-green-100' : 'bg-yellow-100'}>
              {network || 'Unknown Network'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          {error && (
            <Alert variant="destructive" className="mb-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Address</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      <span className="font-mono">{formatAddress(wallet.address)}</span>
                      <a 
                        href={`https://etherscan.io/address/${wallet.address}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-1 text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View on Etherscan</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Balance</span>
              <div className="flex items-center">
                <span className="font-medium mr-1">{formatBalance(balance)} ETH</span>
                <button 
                  onClick={refreshBalance} 
                  className="text-muted-foreground hover:text-primary"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Button 
            variant="secondary" 
            className="w-full" 
            size="sm" 
            onClick={disconnectWallet}
          >
            Disconnect
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Connect MetaMask</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your MetaMask wallet to access trading farms and strategies.
        </p>
        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button 
          className="w-full" 
          onClick={connectMetaMask}
        >
          Connect Wallet
        </Button>
      </CardContent>
    </Card>
  );
}
