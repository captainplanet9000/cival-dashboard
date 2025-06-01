"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Icons } from '@/components/ui/icons';

// Simplified MetaMask connector without wagmi dependencies
// This is a temporary solution to get the build working
export function MetaMaskConnect({ onConnected }: { onConnected?: (address: string) => void }) {
  const [isConnected, setIsConnected] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [address, setAddress] = React.useState<string>('');
  
  // Connect to MetaMask manually without wagmi
  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // Check if ethereum is injected by MetaMask
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        // Request account access
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts'
        });
        
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
          toast({ title: 'MetaMask Connected', description: accounts[0] });
          onConnected?.(accounts[0]);
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'MetaMask Not Found',
          description: 'Please install MetaMask browser extension'
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Connection Error',
        description: error?.message || 'Failed to connect'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDisconnect = () => {
    setIsConnected(false);
    setAddress('');
    toast({ title: 'Disconnected', description: 'Wallet disconnected successfully' });
  };

  return (
    <div className="flex flex-col gap-2 items-start">
      {isConnected ? (
        <>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono">{address}</span>
            <span className="ml-2 text-xs text-muted-foreground">ETH</span>
          </div>
          <Button size="sm" variant="secondary" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </>
      ) : (
        <Button size="sm" onClick={handleConnect} disabled={isLoading}>
          {isLoading ? (
            <>
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            'Connect MetaMask'
          )}
        </Button>
      )}
    </div>
  );
}
