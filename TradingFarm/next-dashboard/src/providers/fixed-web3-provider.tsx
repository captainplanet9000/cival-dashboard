"use client";

import { ReactNode, useState, useEffect, Component } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mainnet, sepolia, arbitrum, optimism, polygon, base } from "wagmi/chains";
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";

// Default for development if the env variable isn't set
const DEFAULT_PROJECT_ID = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || DEFAULT_PROJECT_ID;

const metadata = {
  name: "Trading Farm Dashboard",
  description: "AI-powered trading farm platform with wallet integration",
  url: "https://trading-farm.io", 
  icons: ["https://trading-farm.io/logo.png"],
};

interface Web3ProviderProps {
  children: ReactNode;
}

// Error boundary to catch React errors
class Web3ErrorBoundary extends Component<
  { children: ReactNode, onError: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode, onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Web3Provider caught error:", error, errorInfo);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.children; // Still render children, but without the Web3 provider
    }
    return this.props.children;
  }
}

// Fixed version of the Web3Provider
export function FixedWeb3Provider({ children }: Web3ProviderProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  }));
  
  const [isClientReady, setIsClientReady] = useState(false);
  const [wagmiConfig, setWagmiConfig] = useState<any>(null);
  const [initError, setInitError] = useState<Error | null>(null);

  // Safe initialization on client side only
  useEffect(() => {
    try {
      // Only run on client, and only once
      if (typeof window !== 'undefined' && !wagmiConfig) {
        const config = defaultWagmiConfig({
          chains: [mainnet, sepolia, arbitrum, optimism, polygon, base],
          projectId,
          metadata,
          enableWalletConnect: true, // Enable WalletConnect explicitly 
          enableInjected: true,      // Enable injected wallets (MetaMask)
          enableEIP6963: true,       // Enable EIP-6963 for wallet discovery
        });

        // Only create the modal if it doesn't exist yet
        if (!window.document.getElementById('w3m-modal')) {
          createWeb3Modal({
            wagmiConfig: config,
            projectId,
            themeMode: "dark",
            themeVariables: {
              '--w3m-font-family': 'Inter, sans-serif',
              '--w3m-accent': '#3b82f6',
            }
          });
        }

        setWagmiConfig(config);
        setIsClientReady(true);
      }
    } catch (err) {
      console.error("Failed to initialize Web3Provider:", err);
      setInitError(err instanceof Error ? err : new Error(String(err)));
      // Still set client as ready so we can render children without the provider
      setIsClientReady(true);
    }
  }, [wagmiConfig]);

  // Fallback when not ready or on error
  if (!isClientReady || initError) {
    return (
      <>
        {children}
      </>
    );
  }

  return (
    <Web3ErrorBoundary onError={(error) => setInitError(error)}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </Web3ErrorBoundary>
  );
}

// Main export that wraps the provider in additional error handling
export function SafeFixedWeb3Provider({ children }: Web3ProviderProps) {
  const [error, setError] = useState<Error | null>(null);
  
  // Simple error boundary
  const handleError = (err: any) => {
    console.error("Web3Provider error caught in safe wrapper:", err);
    setError(err instanceof Error ? err : new Error(String(err)));
  };
  
  // If an error occurred, render children without the provider
  if (error) {
    return <>{children}</>;
  }
  
  try {
    return (
      <FixedWeb3Provider>
        {children}
      </FixedWeb3Provider>
    );
  } catch (err) {
    handleError(err);
    return <>{children}</>;
  }
}
