"use client";

import { ReactNode, useState, useEffect, Suspense, Component } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mainnet, sepolia, arbitrum, optimism, polygon, base } from "wagmi/chains";
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { Loader2 } from "lucide-react";

// Default project ID for development
const DEFAULT_PROJECT_ID = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || DEFAULT_PROJECT_ID;

// Production chains configuration with RPC URLs
const productionChains = [
  {
    ...mainnet,
    rpcUrls: {
      ...mainnet.rpcUrls,
      default: {
        http: [process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'],
      },
      public: {
        http: [process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'],
      },
    },
  },
  {
    ...polygon,
    rpcUrls: {
      ...polygon.rpcUrls,
      default: {
        http: [process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon.llamarpc.com'],
      },
      public: {
        http: [process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon.llamarpc.com'],
      },
    },
  },
  {
    ...arbitrum,
    rpcUrls: {
      ...arbitrum.rpcUrls,
      default: {
        http: [process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'],
      },
      public: {
        http: [process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'],
      },
    },
  },
  {
    ...optimism,
    rpcUrls: {
      ...optimism.rpcUrls,
      default: {
        http: [process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || 'https://mainnet.optimism.io'],
      },
      public: {
        http: [process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || 'https://mainnet.optimism.io'],
      },
    },
  },
  {
    ...base,
    rpcUrls: {
      ...base.rpcUrls,
      default: {
        http: [process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://base.llamarpc.com'],
      },
      public: {
        http: [process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://base.llamarpc.com'],
      },
    },
  },
  sepolia,
];

// Use as proper readonly Chain array required by wagmi
const chains = [mainnet, sepolia, arbitrum, optimism, polygon, base] as const;

// DeFi protocol addresses for integration
const defiProtocols = {
  uniswap: {
    v3Router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    v3Factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    nftPositionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
  },
  aave: {
    v3LendingPool: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
    dataProvider: "0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3"
  },
  curve: {
    addressProvider: "0x0000000022D53366457F9d5E68Ec105046FC4383"
  },
  chainlink: {
    feedRegistry: "0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf"
  }
};

const metadata = {
  name: "Trading Farm Dashboard",
  description: "AI-powered trading farm platform with wallet integration",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://trading-farm.io", 
  icons: [(process.env.NEXT_PUBLIC_APP_URL || "https://trading-farm.io") + "/logo.png"],
};

interface Web3ProviderProps {
  children: ReactNode;
}

// Define window augmentation for TypeScript
declare global {
  interface Window {
    __TRADING_FARM_DEBUG?: {
      web3ConnectionStatus: ConnectionStatus;
      connectedChainId: number | null;
      supportedChains: Array<{id: number, name: string}>;
      defiProtocols: string[];
    };
  }
}

// Web3 connection status
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// Lazy initialization component
function Web3Initializer({ children }: Web3ProviderProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  }));
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [wagmiConfig, setWagmiConfig] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectedChainId, setConnectedChainId] = useState<number | null>(null);

  // Initialize on client side only
  useEffect(() => {
    if (typeof window === 'undefined' || wagmiConfig) return;

    const initializeWeb3 = async () => {
      try {
        console.log("Initializing Web3 configuration...");
        setConnectionStatus('connecting');
        
        // Create Wagmi config with production-ready settings
        const config = defaultWagmiConfig({
          chains,
          projectId,
          metadata,
          enableWalletConnect: true,
          enableInjected: true,
          enableEIP6963: true,
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
            },
            featuredWalletIds: [
              'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
              '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust
              'ecc4036f814562b41a5268adc86270fba1365471402006302e70169465b7ac18', // WalletConnect
              'ef333840daf915aafdc4a004525502d6d49d77bd9c65e0642dbaefb3c2893bef'  // Coinbase
            ],
            includeWalletIds: [
              'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
              '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust
              'ecc4036f814562b41a5268adc86270fba1365471402006302e70169465b7ac18', // WalletConnect
              'ef333840daf915aafdc4a004525502d6d49d77bd9c65e0642dbaefb3c2893bef'  // Coinbase
            ]
          });
        }

        // Setup connection status listener using the correct wagmi subscription pattern
        config.subscribe(
          (state) => state, // selector: return the entire state
          (state: any) => {
            try {
              // Use a more robust approach to handle different state structures
              // that works with various versions of wagmi
              if (state && typeof state === 'object') {
                // Handle connection status
                const connected = 
                  ('status' in state && state.status === 'connected') || 
                  ('connector' in state && !!state.connector);
                
                if (connected) {
                  setConnectionStatus('connected');
                
                  // Try to find chain ID from the various possible state structures
                  let chainId = null;
                  if ('chain' in state && state.chain && typeof state.chain === 'object' && 'id' in state.chain) {
                    chainId = state.chain.id;
                  } else if ('chainId' in state && typeof state.chainId === 'number') {
                    chainId = state.chainId;
                  } else if ('data' in state && state.data && typeof state.data === 'object') {
                    if ('chain' in state.data && state.data.chain && typeof state.data.chain === 'object' && 'id' in state.data.chain) {
                      chainId = state.data.chain.id;
                    }
                  }
                
                  setConnectedChainId(chainId);
                  console.log('Web3 connected to chain:', chainId);
                } else {
                  setConnectionStatus('disconnected');
                  setConnectedChainId(null);
                }
              }
            } catch (err) {
              console.error('Error handling web3 state change:', err);
            }
          },
          {
            equalityFn: (prevState: any, nextState: any): boolean => prevState !== nextState
          }
        );

        setWagmiConfig(config);
        console.log("Web3 configuration initialized successfully");
        setIsInitialized(true);
      } catch (err) {
        console.error("Failed to initialize Web3:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setConnectionStatus('error');
        // Still set as initialized so we can render children without the provider
        setIsInitialized(true);
      }
    };

    // Add a slight delay to ensure other UI components load first
    const timeoutId = setTimeout(() => {
      initializeWeb3();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [wagmiConfig]);

  // Export connection data to global window object for debugging in production
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Only expose limited debugging info in production
      window.__TRADING_FARM_DEBUG = {
        web3ConnectionStatus: connectionStatus,
        connectedChainId: connectedChainId,
        supportedChains: chains.map(chain => ({ id: chain.id, name: chain.name })),
        defiProtocols: Object.keys(defiProtocols)
      };
    }
  }, [connectionStatus, connectedChainId]);

  // Show loading state for a brief moment
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  // If there was an error, still render the children without the provider
  if (error) {
    console.warn("Rendering without Web3 provider due to initialization error");
    return <>{children}</>;
  }

  // Properly initialized - render with providers
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// Lazy-loaded provider that doesn't block initial page rendering
export function PhasedWeb3Provider({ children }: Web3ProviderProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // During SSR and initial mount, render children without the provider
  if (!isMounted) {
    return <>{children}</>;
  }
  
  // After mounting, render with error boundary and suspended initialization
  return (
    <ErrorBoundary fallback={<>{children}</>}>
      <Suspense fallback={<>{children}</>}>
        <Web3Initializer>{children}</Web3Initializer>
      </Suspense>
    </ErrorBoundary>
  );
}

// Simple error boundary component
class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Web3Provider error:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
