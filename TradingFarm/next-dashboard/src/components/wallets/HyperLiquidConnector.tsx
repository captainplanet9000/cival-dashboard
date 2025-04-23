/**
 * HyperLiquidConnector - Specialized wallet connector for HyperLiquid's blockchain
 * Supports signature-based login and HyperLiquid-specific wallet interactions
 */

import React, { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Wallet, ExternalLink, Copy, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// HyperLiquid wallet connection status types
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface StatusIndicatorProps {
  status: ConnectionStatus;
  className?: string;
}

// HyperLiquid specific network settings
const HYPERLIQUID_NETWORKS = [
  { id: 'hyperliquid-mainnet', name: 'HyperLiquid Mainnet', url: 'https://app.hyperliquid.xyz' },
  { id: 'hyperliquid-testnet', name: 'HyperLiquid Testnet', url: 'https://testnet.hyperliquid.xyz' }
];

// HyperLiquid connection options
const CONNECTION_OPTIONS = [
  { id: 'metamask', name: 'MetaMask', icon: '🦊' },
  { id: 'walletconnect', name: 'WalletConnect', icon: '🔗' },
  { id: 'ledger', name: 'Ledger', icon: '🔒' }
];

// Status indicator component
const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, className }) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "w-2 h-2 rounded-full",
        status === 'connected' && "bg-green-500",
        status === 'connecting' && "bg-yellow-500 animate-pulse",
        status === 'disconnected' && "bg-gray-500",
        status === 'error' && "bg-red-500"
      )} />
      <span className="text-xs font-medium">
        {status === 'connected' && "Connected"}
        {status === 'connecting' && "Connecting..."}
        {status === 'disconnected' && "Disconnected"}
        {status === 'error' && "Connection Error"}
      </span>
    </div>
  );
};

interface HyperLiquidConnectorProps {
  onConnect?: (address: string, signature: string, network: string) => void;
  onDisconnect?: () => void;
  defaultNetwork?: string;
}

export const HyperLiquidConnector: React.FC<HyperLiquidConnectorProps> = ({ 
  onConnect, 
  onDisconnect,
  defaultNetwork = 'hyperliquid-mainnet'
}) => {
  const { walletState, connectWallet, disconnectWallet, getActiveAccount } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [selectedNetwork, setSelectedNetwork] = useState(defaultNetwork);
  const [connectionMethod, setConnectionMethod] = useState('metamask');
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get active account or find a HyperLiquid account if one exists
  const activeAccount = getActiveAccount() || walletState.accounts.find(acc => 
    acc.chainSlug === 'evm' && acc.isActive
  );

  // HyperLiquid signature message
  const signatureMessage = `Trading Farm HyperLiquid Authentication\nTimestamp: ${Date.now()}\nWallet: ${activeAccount?.address || 'Not connected'}\nPlease sign this message to authenticate with HyperLiquid.`;

  // Connect to HyperLiquid wallet
  const handleConnect = async () => {
    setConnectionStatus('connecting');
    setError(null);
    
    try {
      // First connect the wallet using the main wallet connector
      const connected = await connectWallet('evm');
      
      if (!connected) {
        throw new Error('Failed to connect wallet');
      }
      
      // For HyperLiquid, we need to request a signature for authentication
      // This is a mock implementation - in production this would use actual web3 signing
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulating signature request
      
      const mockSignature = `0x${Array.from(
        { length: 130 }, 
        () => Math.floor(Math.random() * 16).toString(16)
      ).join('')}`;
      
      setSignature(mockSignature);
      setConnectionStatus('connected');
      
      // Call the onConnect callback with the address and signature
      if (onConnect && getActiveAccount()) {
        onConnect(getActiveAccount()!.address, mockSignature, selectedNetwork);
      }
    } catch (err: any) {
      setConnectionStatus('error');
      setError(err.message || 'Failed to connect to HyperLiquid');
    }
  };

  // Disconnect wallet
  const handleDisconnect = () => {
    if (activeAccount) {
      disconnectWallet(activeAccount.address);
      setConnectionStatus('disconnected');
      setSignature(null);
      if (onDisconnect) {
        onDisconnect();
      }
    }
  };

  // Copy address to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // In a real app, you would show a toast notification here
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        variant={activeAccount ? "default" : "outline"}
        className="flex items-center gap-2"
      >
        <Wallet className="h-4 w-4" />
        {activeAccount ? (
          <span className="flex items-center gap-1">
            <span className="hidden sm:inline">HyperLiquid</span>
            <span>{activeAccount.address.substring(0, 4)}...{activeAccount.address.substring(activeAccount.address.length - 4)}</span>
          </span>
        ) : (
          'Connect to HyperLiquid'
        )}
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img 
                src="/icons/hyperliquid.svg" 
                alt="HyperLiquid" 
                className="w-5 h-5" 
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              HyperLiquid Wallet Connect
            </DialogTitle>
            <DialogDescription>
              Connect your wallet to trade on HyperLiquid perpetuals
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {activeAccount ? (
              // Connected wallet view
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                  <div className="flex justify-between items-center mb-2">
                    <StatusIndicator status={connectionStatus} />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => copyToClipboard(activeAccount.address)}
                          >
                            <Copy className="h-4 w-4" />
                            <span className="sr-only">Copy</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy Address</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="text-sm font-mono break-all">
                    {activeAccount.address}
                  </div>
                  
                  {signature && (
                    <div className="mt-4">
                      <Label className="text-xs">Authentication Signature</Label>
                      <div className="mt-1 text-xs font-mono bg-blue-100 p-2 rounded overflow-scroll max-h-16">
                        {signature}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Network</h3>
                  <div className="flex items-center bg-muted p-2 rounded-md">
                    <span className="flex-1 text-sm">
                      {HYPERLIQUID_NETWORKS.find(n => n.id === selectedNetwork)?.name}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(
                        HYPERLIQUID_NETWORKS.find(n => n.id === selectedNetwork)?.url, 
                        '_blank'
                      )}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSignature(null);
                      handleConnect();
                    }}
                    disabled={connectionStatus === 'connecting'}
                  >
                    <RefreshCw className={cn(
                      "h-4 w-4 mr-2",
                      connectionStatus === 'connecting' && "animate-spin"
                    )} />
                    Re-authenticate
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              // Connection options
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">1. Select Network</h3>
                  <Tabs 
                    defaultValue={selectedNetwork} 
                    onValueChange={setSelectedNetwork} 
                    className="w-full"
                  >
                    <TabsList className="grid grid-cols-2">
                      {HYPERLIQUID_NETWORKS.map(network => (
                        <TabsTrigger key={network.id} value={network.id}>
                          {network.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">2. Choose Connection Method</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {CONNECTION_OPTIONS.map(option => (
                      <Button
                        key={option.id}
                        variant={connectionMethod === option.id ? "default" : "outline"}
                        className="flex flex-col items-center py-3 h-auto"
                        onClick={() => setConnectionMethod(option.id)}
                      >
                        <span className="text-xl mb-1">{option.icon}</span>
                        <span className="text-xs">{option.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                
                <Button
                  className="w-full"
                  onClick={handleConnect}
                  disabled={connectionStatus === 'connecting'}
                >
                  {connectionStatus === 'connecting' ? (
                    <>
                      <span className="animate-spin mr-2">⚙️</span>
                      Connecting...
                    </>
                  ) : (
                    'Connect Wallet'
                  )}
                </Button>
                
                {error && (
                  <div className="text-red-500 text-sm flex items-center gap-2 mt-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              By connecting, you agree to HyperLiquid's Terms of Service
            </div>
            {!activeAccount && (
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HyperLiquidConnector;
