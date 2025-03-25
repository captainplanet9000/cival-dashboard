"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider, createConfig } from "wagmi";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mainnet, sepolia, arbitrum, optimism, polygon, base } from "wagmi/chains";
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

// Create wagmi config
const metadata = {
  name: "Trading Farm Dashboard",
  description: "AI-powered trading farm platform with wallet integration",
  url: "https://trading-farm.io",
  icons: ["https://trading-farm.io/logo.png"],
};

interface Web3ProviderProps {
  children: ReactNode;
}

export function SafeWeb3Provider({ children }: Web3ProviderProps) {
  const [error, setError] = useState<Error | null>(null);
  
  if (error) {
    console.error("Web3Provider Error:", error);
    return (
      <div className="p-4">
        {children}
      </div>
    );
  }
  
  try {
    return (
      <Web3Provider>
        {children}
      </Web3Provider>
    );
  } catch (err) {
    console.error("Failed to initialize Web3Provider:", err);
    return (
      <div className="p-4">
        {children}
      </div>
    );
  }
}

export function Web3Provider({ children }: Web3ProviderProps) {
  // Create wagmi config with specific chains
  const wagmiConfig = defaultWagmiConfig({
    chains: [mainnet, sepolia, arbitrum, optimism, polygon, base],
    projectId,
    metadata,
  });
  
  // Create React Query client
  const [queryClient] = useState(() => new QueryClient());

  // Initialize web3modal on client side only
  if (typeof window !== 'undefined' && !window.document.getElementById('w3m-modal')) {
    createWeb3Modal({ 
      wagmiConfig, 
      projectId,
      themeMode: "dark",
      // Only use standard properties that are definitely in the ThemeVariables type
      themeVariables: {
        '--w3m-font-family': 'Inter, sans-serif',
        '--w3m-accent': '#3b82f6',
      }
    });
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
