import React, { useState, useEffect, useCallback } from 'react';
import { WalletProvider, WalletType, WalletInfo } from '@/services/wallet/wallet-provider';

interface WalletConnectorProps {
  onConnect?: (walletInfo: WalletInfo) => void;
  onDisconnect?: () => void;
  className?: string;
}

export default function WalletConnector({
  onConnect,
  onDisconnect,
  className = ''
}: WalletConnectorProps) {
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize wallet provider
  const walletProvider = WalletProvider.getInstance();
  
  // Update wallet info when it changes
  useEffect(() => {
    const handleWalletChange = (info: WalletInfo | null) => {
      setWalletInfo(info);
      
      if (info && info.isConnected) {
        onConnect?.(info);
      } else if (!info || !info.isConnected) {
        onDisconnect?.();
      }
    };
    
    // Add wallet change listener
    walletProvider.addWalletChangeListener(handleWalletChange);
    
    // Initial check
    const currentWalletInfo = walletProvider.getWalletInfo();
    if (currentWalletInfo) {
      setWalletInfo(currentWalletInfo);
      if (currentWalletInfo.isConnected) {
        onConnect?.(currentWalletInfo);
      }
    }
    
    // Clean up
    return () => {
      walletProvider.removeWalletChangeListener(handleWalletChange);
    };
  }, [onConnect, onDisconnect]);
  
  // Connect to a wallet
  const connectWallet = useCallback(async (walletType: WalletType) => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const info = await walletProvider.connect(walletType);
      setWalletInfo(info);
      onConnect?.(info);
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, [onConnect]);
  
  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    walletProvider.disconnect();
    setWalletInfo(null);
    onDisconnect?.();
  }, [onDisconnect]);
  
  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Format ETH balance for display
  const formatBalance = (balance?: string) => {
    if (!balance) return '0 ETH';
    
    // Parse balance and round to 4 decimal places
    const balanceNum = parseFloat(balance);
    const roundedBalance = Math.round(balanceNum * 10000) / 10000;
    
    return `${roundedBalance} ETH`;
  };
  
  return (
    <div className={`wallet-connector ${className}`}>
      {walletInfo && walletInfo.isConnected ? (
        <div className="connected-wallet">
          <div className="wallet-info">
            <div className="wallet-address">
              {formatAddress(walletInfo.address)}
            </div>
            <div className="wallet-balance">
              {formatBalance(walletInfo.balance)}
            </div>
          </div>
          
          <button
            className="disconnect-button"
            onClick={disconnectWallet}
            disabled={isConnecting}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="wallet-buttons">
          <button
            className="connect-button metamask"
            onClick={() => connectWallet(WalletType.METAMASK)}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
          </button>
          
          <button
            className="connect-button walletconnect"
            onClick={() => connectWallet(WalletType.WALLETCONNECT)}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'WalletConnect'}
          </button>
          
          <button
            className="connect-button coinbase"
            onClick={() => connectWallet(WalletType.COINBASE)}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Coinbase Wallet'}
          </button>
        </div>
      )}
      
      {error && (
        <div className="wallet-error">
          {error}
        </div>
      )}
    </div>
  );
} 