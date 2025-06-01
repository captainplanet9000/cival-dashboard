"use client";

import { useState, useEffect } from "react";
import { walletService, WalletConnectionDetails, WalletBalance } from "@/services/wallet-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, WalletIcon, LinkIcon, ArrowRightIcon, Coins } from "lucide-react";
import { truncateAddress } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export interface WalletConnectProps {
  onConnect?: (wallet: WalletConnectionDetails) => void;
  onDisconnect?: () => void;
}

export function WalletConnect({ onConnect, onDisconnect }: WalletConnectProps) {
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [wallet, setWallet] = useState<WalletConnectionDetails | null>(null);
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check for existing wallet connection on load
  useEffect(() => {
    async function checkWalletConnection() {
      try {
        const connection = await walletService.getWalletConnection();
        if (connection) {
          setWallet(connection);
          
          // Load balances if wallet is connected
          try {
            const walletBalances = await walletService.getAllBalances();
            setBalances(walletBalances);
          } catch (err) {
            console.error("Error fetching balances:", err);
          }
        }
      } catch (err) {
        console.error("Error checking wallet connection:", err);
      }
    }

    if (user) {
      checkWalletConnection();
    }
  }, [user]);

  const handleConnect = async (provider: 'metamask' | 'walletconnect' | 'coinbase') => {
    setIsConnecting(true);
    setError(null);

    try {
      const connection = await walletService.connectWallet(provider);
      setWallet(connection);
      
      // Fetch balances after connection
      const walletBalances = await walletService.getAllBalances();
      setBalances(walletBalances);
      
      if (onConnect) {
        onConnect(connection);
      }
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setError(err.message || "Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await walletService.disconnectWallet();
      setWallet(null);
      setBalances([]);
      
      if (onDisconnect) {
        onDisconnect();
      }
    } catch (err: any) {
      console.error("Error disconnecting wallet:", err);
      setError(err.message || "Failed to disconnect wallet. Please try again.");
    }
  };

  const refreshBalances = async () => {
    if (!wallet) return;
    
    try {
      const walletBalances = await walletService.getAllBalances();
      setBalances(walletBalances);
    } catch (err: any) {
      console.error("Error refreshing balances:", err);
      setError(err.message || "Failed to refresh balances. Please try again.");
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <WalletIcon className="mr-2 h-5 w-5" />
          Wallet Connection
        </CardTitle>
        <CardDescription>
          Connect your wallet to manage your funds and allocations
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {!wallet ? (
          <div className="grid gap-4">
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => handleConnect('metamask')}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <img src="/icons/metamask.svg" alt="MetaMask" className="mr-2 h-5 w-5" />}
              Connect with MetaMask
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => handleConnect('walletconnect')}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <img src="/icons/walletconnect.svg" alt="WalletConnect" className="mr-2 h-5 w-5" />}
              Connect with WalletConnect
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => handleConnect('coinbase')}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <img src="/icons/coinbase.svg" alt="Coinbase Wallet" className="mr-2 h-5 w-5" />}
              Connect with Coinbase Wallet
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
              <TabsTrigger value="balances" className="flex-1">Balances</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Connected Wallet</span>
                  <div className="flex items-center">
                    <Badge variant="outline" className="mr-2 font-mono">
                      {truncateAddress(wallet.address)}
                    </Badge>
                    <Badge variant="secondary">
                      {wallet.provider}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Network</span>
                  <Badge variant="outline">
                    {wallet.chain_id === 1 ? 'Ethereum Mainnet' : 
                     wallet.chain_id === 5 ? 'Goerli Testnet' : 
                     wallet.chain_id === 11155111 ? 'Sepolia Testnet' :
                     wallet.chain_id === 137 ? 'Polygon' :
                     wallet.chain_id === 42161 ? 'Arbitrum One' :
                     `Chain ID: ${wallet.chain_id}`}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Connected At</span>
                  <span className="text-sm text-muted-foreground">
                    {wallet.connected_at ? new Date(wallet.connected_at).toLocaleString() : 'Unknown'}
                  </span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="balances" className="p-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Available Balances</h3>
                  <Button variant="ghost" size="sm" onClick={refreshBalances}>
                    Refresh
                  </Button>
                </div>
                
                {balances.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Coins className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>No balances found</p>
                    <p className="text-sm">Connect your wallet to view your balances</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {balances.map((balance) => (
                      <div key={`${balance.wallet_address}-${balance.currency}`} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                        <div className="flex items-center">
                          <div className="bg-primary/10 p-2 rounded-full mr-3">
                            <Coins className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{balance.currency}</p>
                            <p className="text-xs text-muted-foreground">
                              {balance.last_updated ? `Updated ${new Date(balance.last_updated).toLocaleString()}` : ''}
                            </p>
                          </div>
                        </div>
                        <p className="font-mono font-medium">{balance.balance}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      
      <CardFooter className={wallet ? "justify-between" : "justify-center"}>
        {wallet ? (
          <>
            <Button variant="ghost" size="sm" onClick={handleDisconnect}>
              Disconnect
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(`https://etherscan.io/address/${wallet.address}`, '_blank')}>
              View on Explorer <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </>
        ) : (
          <p className="text-xs text-center text-muted-foreground max-w-xs">
            By connecting your wallet, you agree to our Terms of Service and Privacy Policy
          </p>
        )}
      </CardFooter>
    </Card>
  );
} 