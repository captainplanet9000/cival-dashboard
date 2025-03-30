import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { mainnet, polygon } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { loadStoredGatewayPerformance } from '@/utils/ipfs';
import { initAnalytics, trackPageView } from '@/utils/analytics';
import { initErrorMonitoring, setErrorUser } from '@/utils/errorMonitoring';

// Define Sonic chain
const sonicChain = {
  id: 2930,
  name: 'Sonic',
  network: 'sonic',
  nativeCurrency: {
    decimals: 18,
    name: 'SONIC',
    symbol: 'SONIC',
  },
  rpcUrls: {
    public: { http: [process.env.NEXT_PUBLIC_SONIC_RPC_URL || 'https://rpc.sonic.org'] },
    default: { http: [process.env.NEXT_PUBLIC_SONIC_RPC_URL || 'https://rpc.sonic.org'] },
  },
  blockExplorers: {
    default: { name: 'SonicScan', url: 'https://scan.sonic.org' },
  },
  contracts: {},
};

// Configure chains and providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [sonicChain, mainnet, polygon], // Add Sonic as the primary chain
  [
    publicProvider(),
    alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '' }),
  ]
);

// Create wagmi config
const config = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
      },
    }),
    new InjectedConnector({
      chains,
      options: {
        name: 'Injected',
        shimDisconnect: true,
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // Initialize systems
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize IPFS gateway performance
      loadStoredGatewayPerformance();
      
      // Initialize analytics
      initAnalytics();
      
      // Initialize error monitoring
      initErrorMonitoring();
    }
  }, []);
  
  // Track page views
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      trackPageView(url);
    };
    
    // Track initial page load
    trackPageView(router.pathname);
    
    // Track route changes
    router.events.on('routeChangeComplete', handleRouteChange);
    
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, router.pathname]);

  return (
    <WagmiConfig config={config}>
      <Component {...pageProps} />
    </WagmiConfig>
  );
} 