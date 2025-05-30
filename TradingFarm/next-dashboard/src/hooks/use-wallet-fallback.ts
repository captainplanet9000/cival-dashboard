'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Error handler for wallet balance fetching
 * Provides graceful fallback when exchange_credentials table doesn't exist yet
 */
export function useWalletErrorHandler() {
  const { toast } = useToast();
  const [showedToast, setShowedToast] = useState(false);

  useEffect(() => {
    // Listen for console errors related to exchange_credentials
    const originalConsoleError = console.error;
    
    console.error = function(...args) {
      // Call the original console.error
      originalConsoleError.apply(console, args);
      
      // Check if this is an exchange_credentials error
      const errorString = args.join(' ');
      if (errorString.includes('exchange_credentials') && !showedToast) {
        // Show a friendly toast notification just once
        toast({
          title: "Demo mode active",
          description: "Using sample wallet data. Exchange connections will be available in production.",
          duration: 5000,
        });
        
        setShowedToast(true);
      }
    };
    
    // Restore original console.error on cleanup
    return () => {
      console.error = originalConsoleError;
    };
  }, [toast, showedToast]);
  
  // Return mock wallet data as a fallback
  return {
    getWalletFallbackData: () => ({
      balances: [
        { asset: 'BTC', balance: 0.5, usdValue: 35000, percentage: 35 },
        { asset: 'ETH', balance: 10, usdValue: 30000, percentage: 30 },
        { asset: 'SOL', balance: 150, usdValue: 15000, percentage: 15 },
        { asset: 'USDC', balance: 20000, usdValue: 20000, percentage: 20 },
      ],
      totalValue: 100000,
      performance: {
        daily: 2.5,
        weekly: 5.3,
        monthly: -1.2,
        yearly: 32.5
      }
    })
  };
}
