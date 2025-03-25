"use client"

import { useWeb3Modal } from '@web3modal/wagmi/react';
import { Button } from "@/components/ui/button";
import { Loader2, Wallet } from "lucide-react";
import { useAccount, useDisconnect } from 'wagmi';
import { useCallback, useState } from 'react';

interface WalletConnectButtonProps {
  className?: string;
}

export function WalletConnectButton({ className = "" }: WalletConnectButtonProps) {
  const { open } = useWeb3Modal();
  const { address, isConnecting, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [isLoading, setIsLoading] = useState(false);

  // Format address for display
  const formatAddress = useCallback((address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  // Handle connect button click
  const handleConnect = useCallback(async () => {
    try {
      setIsLoading(true);
      await open();
    } catch (error) {
      console.error('Connection error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [open]);

  // Handle disconnect button click
  const handleDisconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      await disconnect();
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [disconnect]);

  if (isConnected && address) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 font-medium"
          onClick={() => open({ view: 'Account' })}
          disabled={isLoading}
        >
          <Wallet className="h-4 w-4" />
          {address && formatAddress(address)}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={handleDisconnect}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disconnect"}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="default"
      size="sm"
      className={`gap-2 font-medium ${className}`}
      onClick={handleConnect}
      disabled={isConnecting || isLoading}
    >
      {isConnecting || isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Wallet className="h-4 w-4" />
      )}
      Connect Wallet
    </Button>
  );
}
