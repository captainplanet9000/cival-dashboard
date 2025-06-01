/**
 * Analytics utilities for tracking user interactions
 * This is a simple implementation that can be extended with services like 
 * Google Analytics, Mixpanel, Amplitude, etc.
 */

// Initialize analytics (called in _app.tsx)
export const initAnalytics = (): void => {
  if (typeof window === 'undefined') return;
  
  // Initialize your analytics service here
  // Example with Google Analytics (you'd need to add the script to _document.tsx)
  if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    console.log('Analytics initialized');
    // In a real implementation, this would initialize the analytics SDK
  }
};

// Track page views
export const trackPageView = (url: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    // Track with your analytics service
    console.log(`Page view: ${url}`);
    
    // Example with Google Analytics
    if (typeof window.gtag === 'function') {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID as string, {
        page_path: url,
      });
    }
  } catch (error) {
    console.error('Error tracking page view:', error);
  }
};

// Track user events
export const trackEvent = (
  eventName: string, 
  properties: Record<string, any> = {}
): void => {
  if (typeof window === 'undefined') return;
  
  try {
    // Track with your analytics service
    console.log(`Event: ${eventName}`, properties);
    
    // Example with Google Analytics
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, properties);
    }
  } catch (error) {
    console.error('Error tracking event:', error);
  }
};

// Track mint attempts
export const trackMintAttempt = (
  quantity: number, 
  walletAddress: string
): void => {
  trackEvent('mint_attempt', {
    quantity,
    wallet_address: walletAddress,
    timestamp: new Date().toISOString(),
  });
};

// Track successful mints
export const trackMintSuccess = (
  quantity: number,
  walletAddress: string,
  transactionHash: string,
  totalPrice: string
): void => {
  trackEvent('mint_success', {
    quantity,
    wallet_address: walletAddress,
    transaction_hash: transactionHash,
    total_price: totalPrice,
    timestamp: new Date().toISOString(),
  });
};

// Track mint failures
export const trackMintFailure = (
  quantity: number,
  walletAddress: string,
  errorMessage: string
): void => {
  trackEvent('mint_failure', {
    quantity,
    wallet_address: walletAddress,
    error_message: errorMessage,
    timestamp: new Date().toISOString(),
  });
};

// Track wallet connections
export const trackWalletConnect = (
  walletType: string,
  walletAddress: string
): void => {
  trackEvent('wallet_connect', {
    wallet_type: walletType,
    wallet_address: walletAddress,
    timestamp: new Date().toISOString(),
  });
};

// Augment Window interface to include gtag
declare global {
  interface Window {
    gtag: (command: string, id: string, config?: any) => void;
  }
} 