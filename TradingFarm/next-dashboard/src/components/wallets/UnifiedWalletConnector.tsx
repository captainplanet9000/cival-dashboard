/**
 * Trading Farm Multi-Chain Integration
 * UnifiedWalletConnector - Component for connecting to wallets across multiple chains
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { MetaMaskConnector } from './MetaMaskConnector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Wallet, ExternalLink, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Types for connected accounts
export interface ConnectedAccount {
  address: string;
  chainSlug: 'evm' | 'sonic' | 'sui' | 'solana';
  chainName: string;
  balance?: string;
  isActive: boolean;
  walletType: 'metamask' | 'phantom' | 'suiwallet' | 'walletconnect';
}

// Types for wallet connection state
export interface WalletState {
  accounts: ConnectedAccount[];
  isConnecting: boolean;
  selectedChain: string;
  error: string | null;
}

// Context for accessing wallet state throughout the app
interface WalletContextType {
  walletState: WalletState;
  connectWallet: (chainSlug: string) => Promise<boolean>;
  disconnectWallet: (address: string) => void;
  switchChain: (chainSlug: string) => void;
  getActiveAccount: () => ConnectedAccount | undefined;
}

const initialState: WalletState = {
  accounts: [],
  isConnecting: false,
  selectedChain: 'evm',
  error: null,
};

const WalletContext = createContext<WalletContextType>({
  walletState: initialState,
  connectWallet: async () => false,
  disconnectWallet: () => {},
  switchChain: () => {},
  getActiveAccount: () => undefined,
});

export const useWallet = () => useContext(WalletContext);

// Chain configuration
const SUPPORTED_CHAINS = [
  { slug: 'evm', name: 'Ethereum', logo: '🔷', walletTypes: ['metamask', 'walletconnect'] },
  { slug: 'sonic', name: 'Sonic', logo: '⚡', walletTypes: ['metamask', 'walletconnect'] },
  { slug: 'sui', name: 'Sui', logo: '🔵', walletTypes: ['suiwallet', 'walletconnect'] },
  { slug: 'solana', name: 'Solana', logo: '🟣', walletTypes: ['phantom', 'walletconnect'] },
];

// WalletConnect Provider
export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletState, setWalletState] = useState<WalletState>(initialState);

  // Connect to a wallet
  const connectWallet = async (chainSlug: string): Promise<boolean> => {
    setWalletState((prev) => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      // Determine the right connector based on chain
      let address = '';
      let walletType: 'metamask' | 'phantom' | 'suiwallet' | 'walletconnect' = 'walletconnect';
      
      if (chainSlug === 'evm' || chainSlug === 'sonic') {
        // For development, we'll simulate a successful connection
        // In production, this would call the actual wallet connection logic
        address = `0x${Math.random().toString(36).substring(2, 14)}`;
        walletType = 'metamask';
      } else if (chainSlug === 'sui') {
        address = `0x${Math.random().toString(16).substring(2, 66)}`;
        walletType = 'suiwallet';
      } else if (chainSlug === 'solana') {
        address = `${Math.random().toString(36).substring(2, 14)}`;
        walletType = 'phantom';
      }
      
      // Find chain name
      const chainInfo = SUPPORTED_CHAINS.find(c => c.slug === chainSlug);
      if (!chainInfo) throw new Error(`Unsupported chain: ${chainSlug}`);
      
      // Add the connected account to state
      setWalletState((prev) => {
        // Deactivate any existing accounts for this chain
        const updatedAccounts = prev.accounts.map(acc => 
          acc.chainSlug === chainSlug ? { ...acc, isActive: false } : acc
        );
        
        // Add the new account
        return {
          ...prev,
          isConnecting: false,
          accounts: [
            ...updatedAccounts,
            {
              address,
              chainSlug: chainSlug as any,
              chainName: chainInfo.name,
              balance: '0.0',
              isActive: true,
              walletType,
            },
          ],
          selectedChain: chainSlug,
        };
      });
      
      return true;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setWalletState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      }));
      return false;
    }
  };

  // Disconnect a wallet
  const disconnectWallet = (address: string) => {
    setWalletState((prev) => ({
      ...prev,
      accounts: prev.accounts.filter(acc => acc.address !== address),
    }));
  };

  // Switch active chain
  const switchChain = (chainSlug: string) => {
    setWalletState((prev) => {
      // If we have an account for this chain, activate it
      const hasAccount = prev.accounts.some(acc => acc.chainSlug === chainSlug);
      if (hasAccount) {
        return {
          ...prev,
          selectedChain: chainSlug,
          accounts: prev.accounts.map(acc => ({
            ...acc,
            isActive: acc.chainSlug === chainSlug,
          })),
        };
      }
      
      // Otherwise just update selected chain
      return {
        ...prev,
        selectedChain: chainSlug,
      };
    });
  };

  // Get the active account
  const getActiveAccount = (): ConnectedAccount | undefined => {
    return walletState.accounts.find(acc => acc.isActive);
  };

  // Simulate fetching balances for connected accounts
  useEffect(() => {
    const fetchBalances = async () => {
      if (walletState.accounts.length === 0) return;
      
      // In production, this would query chain-specific APIs
      // For development, we'll use mock balances
      setWalletState((prev) => ({
        ...prev,
        accounts: prev.accounts.map(acc => ({
          ...acc,
          balance: (Math.random() * 10).toFixed(4),
        })),
      }));
    };
    
    fetchBalances();
    // Set up periodic balance fetching
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [walletState.accounts.length]);

  return (
    <WalletContext.Provider
      value={{
        walletState,
        connectWallet,
        disconnectWallet,
        switchChain,
        getActiveAccount,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function UnifiedWalletConnector() {
  const { walletState, connectWallet, disconnectWallet, switchChain } = useWallet();
  const [isOpen, setIsOpen] = useState(false);

  // Get the active account if any
  const activeAccount = walletState.accounts.find(acc => acc.isActive);

  // Determine button style based on connection state
  const buttonStyle = activeAccount
    ? 'bg-green-500 hover:bg-green-600'
    : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 ${buttonStyle}`}
      >
        <Wallet className="h-4 w-4" />
        {activeAccount ? (
          <span className="flex items-center gap-2">
            {SUPPORTED_CHAINS.find(c => c.slug === activeAccount.chainSlug)?.logo}
            {activeAccount.address.substring(0, 6)}...{activeAccount.address.substring(activeAccount.address.length - 4)}
            <ChevronDown className="h-4 w-4" />
          </span>
        ) : (
          'Connect Wallet'
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 mt-2 z-50 w-80 shadow-lg">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>Choose a chain to connect to</CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue={walletState.selectedChain} onValueChange={switchChain}>
              <TabsList className="grid grid-cols-4">
                {SUPPORTED_CHAINS.map((chain) => (
                  <TabsTrigger key={chain.slug} value={chain.slug} className="text-xs">
                    {chain.logo} {chain.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {SUPPORTED_CHAINS.map((chain) => (
                <TabsContent key={chain.slug} value={chain.slug}>
                  <div className="space-y-4 py-2">
                    <h3 className="text-sm font-medium">{chain.name} Wallets</h3>
                    
                    {/* Connected account for this chain */}
                    {walletState.accounts
                      .filter(acc => acc.chainSlug === chain.slug)
                      .map(acc => (
                        <div key={acc.address} className="flex items-center justify-between bg-muted p-2 rounded-md">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-xs">{acc.address.substring(0, 8)}...{acc.address.substring(acc.address.length - 6)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{acc.balance || '0.0'}</Badge>
                            <Button variant="ghost" size="sm" onClick={() => disconnectWallet(acc.address)}>
                              Disconnect
                            </Button>
                          </div>
                        </div>
                      ))}
                    
                    {/* Wallet connection options */}
                    <div className="space-y-2">
                      {chain.walletTypes.map(type => (
                        <Button
                          key={type}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => connectWallet(chain.slug)}
                          disabled={walletState.isConnecting}
                        >
                          {type === 'metamask' && 'Connect MetaMask'}
                          {type === 'phantom' && 'Connect Phantom'}
                          {type === 'suiwallet' && 'Connect Sui Wallet'}
                          {type === 'walletconnect' && 'Connect WalletConnect'}
                        </Button>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            {walletState.error && (
              <div className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {walletState.error}
              </div>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
