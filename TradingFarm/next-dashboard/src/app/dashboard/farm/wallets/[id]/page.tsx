'use client';

/**
 * Wallet Details Page
 * Displays comprehensive information about a single wallet
 */
import React, { useState, useEffect, use } from 'react';
import { WalletDetails } from '@/components/wallets/wallet-details';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Home, Wallet } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/utils/supabase/client';

export default function WalletDetailsPage({ params }: { params: { id: string } }) {
  // Properly unwrap params in Next.js 15+
  const walletId = use(Promise.resolve(params.id));
  
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createBrowserClient();

  // Fetch wallet data
  useEffect(() => {
    fetchWalletDetails();
  }, [walletId]);

  // Fetch wallet details from API
  const fetchWalletDetails = async () => {
    setLoading(true);
    try {
      // In a real app, you would fetch from your API
      // const { data, error } = await supabase
      //   .from('wallets')
      //   .select('*, transactions(*), alerts(*)')
      //   .eq('id', walletId)
      //   .single();
      
      // if (error) throw error;
      
      // For demo purposes, simulate API response with mock data
      const mockWallet = {
        id: walletId,
        name: walletId === 'wallet-1' ? 'Main Trading Wallet' : 
             walletId === 'wallet-2' ? 'BTC Reserve' : 
             walletId === 'wallet-3' ? 'USDT Holdings' : 
             walletId === 'wallet-4' ? 'Solana Wallet' : 'Unknown Wallet',
        address: walletId === 'wallet-1' ? '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t' :
               walletId === 'wallet-2' ? 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' :
               walletId === 'wallet-3' ? 'TBAYEcXRZxtRQA4nyyfCiEHnHQrLAsjSw2' :
               walletId === 'wallet-4' ? '8ZU1tCRBSLEXN1nvSD3cquXJKgUCHaEgFpuFfF4UF6S7' : 
               '0x0000000000000000000000000000000000000000',
        exchange: walletId === 'wallet-1' ? 'Binance' :
                 walletId === 'wallet-2' ? 'Coinbase' :
                 walletId === 'wallet-4' ? 'FTX' : undefined,
        network: walletId === 'wallet-1' ? 'Ethereum' :
                walletId === 'wallet-2' ? 'Bitcoin' :
                walletId === 'wallet-3' ? 'Tron' :
                walletId === 'wallet-4' ? 'Solana' : 'Unknown',
        balance: walletId === 'wallet-1' ? 1.25436 :
                walletId === 'wallet-2' ? 0.03589 :
                walletId === 'wallet-3' ? 5000 :
                walletId === 'wallet-4' ? 45.78 : 0,
        currency: walletId === 'wallet-1' ? 'ETH' :
                 walletId === 'wallet-2' ? 'BTC' :
                 walletId === 'wallet-3' ? 'USD' :
                 walletId === 'wallet-4' ? 'SOL' : 'Unknown',
        lastUpdated: new Date().toISOString(),
        changePercent24h: walletId === 'wallet-1' ? 5.43 :
                         walletId === 'wallet-2' ? -1.24 :
                         walletId === 'wallet-3' ? 0.01 :
                         walletId === 'wallet-4' ? 12.38 : 0,
        status: walletId === 'wallet-1' ? 'active' :
               walletId === 'wallet-2' ? 'active' :
               walletId === 'wallet-3' ? 'inactive' :
               walletId === 'wallet-4' ? 'warning' : 'inactive',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        balanceHistory: Array.from({ length: 90 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (89 - i));
          
          // Create some realistic mock data with trends
          let baseBalance;
          if (walletId === 'wallet-1') {
            baseBalance = 1.0 + (i / 100); // Gradually increasing trend
          } else if (walletId === 'wallet-2') {
            baseBalance = 0.035 - (0.01 * Math.sin(i / 10)); // Sine wave pattern
          } else if (walletId === 'wallet-3') {
            baseBalance = 5000; // Stable pattern
            if (i > 60) baseBalance += 100; // Step change after a certain date
          } else if (walletId === 'wallet-4') {
            baseBalance = 30 + (i / 5); // Steep incline
            if (i > 70) baseBalance *= 1.1; // Sudden increase at the end
          } else {
            baseBalance = 100;
          }
          
          // Add some random noise
          const noise = (Math.random() - 0.5) * 0.05 * baseBalance;
          
          return {
            date: date.toISOString(),
            balance: baseBalance + noise
          };
        }),
        transactions: Array.from({ length: 15 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i * 2);
          
          // Generate different transaction types with varying properties
          const type = i % 5 === 0 ? 'deposit' : 
                     i % 5 === 1 ? 'withdrawal' : 
                     i % 5 === 2 ? 'transfer' : 
                     i % 5 === 3 ? 'trade' : 'fee';
          
          const status = i % 10 === 0 ? 'pending' : 
                       i % 20 === 0 ? 'failed' : 'completed';
          
          let amount;
          if (type === 'deposit') {
            amount = walletId === 'wallet-1' ? 0.1 + (Math.random() * 0.2) :
                   walletId === 'wallet-2' ? 0.005 + (Math.random() * 0.01) :
                   walletId === 'wallet-3' ? 500 + (Math.random() * 1000) :
                   walletId === 'wallet-4' ? 5 + (Math.random() * 10) : 100;
          } else if (type === 'withdrawal') {
            amount = walletId === 'wallet-1' ? 0.05 + (Math.random() * 0.1) :
                   walletId === 'wallet-2' ? 0.002 + (Math.random() * 0.005) :
                   walletId === 'wallet-3' ? 200 + (Math.random() * 500) :
                   walletId === 'wallet-4' ? 2 + (Math.random() * 5) : 50;
          } else {
            amount = walletId === 'wallet-1' ? 0.01 + (Math.random() * 0.05) :
                   walletId === 'wallet-2' ? 0.001 + (Math.random() * 0.002) :
                   walletId === 'wallet-3' ? 100 + (Math.random() * 200) :
                   walletId === 'wallet-4' ? 1 + (Math.random() * 3) : 10;
          }
          
          return {
            id: `tx-${walletId}-${i}`,
            type,
            amount,
            currency: walletId === 'wallet-1' ? 'ETH' :
                     walletId === 'wallet-2' ? 'BTC' :
                     walletId === 'wallet-3' ? 'USD' :
                     walletId === 'wallet-4' ? 'SOL' : 'Unknown',
            timestamp: date.toISOString(),
            status,
            txHash: type !== 'fee' ? `0x${Math.random().toString(16).substr(2, 40)}` : undefined,
            destination: type === 'withdrawal' || type === 'transfer' ? `0x${Math.random().toString(16).substr(2, 40)}` : undefined,
            source: type === 'deposit' || type === 'transfer' ? `0x${Math.random().toString(16).substr(2, 40)}` : undefined,
            fee: Math.random() * 0.01,
            feeCurrency: walletId === 'wallet-1' ? 'ETH' :
                        walletId === 'wallet-2' ? 'BTC' :
                        walletId === 'wallet-3' ? 'USD' :
                        walletId === 'wallet-4' ? 'SOL' : 'Unknown',
            note: i % 3 === 0 ? `Automatic ${type} via Trading Farm system` : undefined
          };
        }),
        alerts: [
          ...(walletId === 'wallet-1' ? [{
            id: `alert-${walletId}-1`,
            type: 'large_deposit',
            message: 'Large deposit of 0.5 ETH detected',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            resolved: false
          }] : []),
          ...(walletId === 'wallet-4' ? [{
            id: `alert-${walletId}-1`,
            type: 'low_balance',
            message: 'Balance below minimum threshold',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            resolved: false
          }, {
            id: `alert-${walletId}-2`,
            type: 'suspicious_activity',
            message: 'Unusual withdrawal pattern detected',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            resolved: true
          }] : []),
          ...(walletId === 'wallet-3' ? [{
            id: `alert-${walletId}-1`,
            type: 'other',
            message: 'Network congestion affecting transaction speed',
            timestamp: new Date(Date.now() - 43200000).toISOString(),
            resolved: true
          }] : [])
        ],
        settings: {
          lowBalanceThreshold: walletId === 'wallet-1' ? 0.5 :
                              walletId === 'wallet-2' ? 0.01 :
                              walletId === 'wallet-3' ? 1000 :
                              walletId === 'wallet-4' ? 10 : undefined,
          alertsEnabled: true,
          autoRefresh: true,
          refreshInterval: 15
        }
      };
      
      // Simulate network delay
      setTimeout(() => {
        setWallet(mockWallet);
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error fetching wallet details:', error);
      toast({
        title: "Error",
        description: "Failed to load wallet details. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Handle wallet refresh
  const handleRefresh = async () => {
    try {
      toast({
        title: "Refreshing Wallet",
        description: "Updating wallet information...",
      });
      
      await fetchWalletDetails();
      
      toast({
        title: "Wallet Refreshed",
        description: "Wallet information has been updated.",
      });
    } catch (error) {
      console.error('Error refreshing wallet:', error);
      toast({
        title: "Error",
        description: "Failed to refresh wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle edit settings
  const handleEditSettings = () => {
    // In a real app, you would show a settings dialog
    toast({
      title: "Edit Settings",
      description: "Settings dialog would open here in a real application.",
    });
  };

  // Handle wallet name update
  const handleUpdateName = async (name: string) => {
    try {
      // In a real app, you would call your API
      // const { data, error } = await supabase
      //   .from('wallets')
      //   .update({ name })
      //   .eq('id', walletId)
      //   .select()
      //   .single();
      
      // if (error) throw error;
      
      // For demo purposes, update local state
      setWallet({
        ...wallet,
        name
      });
      
      toast({
        title: "Wallet Updated",
        description: "Wallet name has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating wallet:', error);
      toast({
        title: "Error",
        description: "Failed to update wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle resolving alert
  const handleResolveAlert = async (alertId: string) => {
    try {
      // In a real app, you would call your API
      // const { data, error } = await supabase
      //   .from('wallet_alerts')
      //   .update({ resolved: true })
      //   .eq('id', alertId)
      //   .select()
      //   .single();
      
      // if (error) throw error;
      
      // For demo purposes, update local state
      setWallet({
        ...wallet,
        alerts: wallet.alerts.map((alert: any) => 
          alert.id === alertId ? { ...alert, resolved: true } : alert
        )
      });
      
      toast({
        title: "Alert Resolved",
        description: "The alert has been marked as resolved.",
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: "Error",
        description: "Failed to resolve alert. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumb navigation */}
      <div className="flex justify-between items-center">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">
                <Home className="h-4 w-4 mr-1" />
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard/farm">
                Farm
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard/farm/wallets">
                Wallets
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {loading ? 'Loading...' : wallet?.name || 'Wallet Details'}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <Button variant="outline" onClick={() => router.push('/dashboard/farm/wallets')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Wallets
        </Button>
      </div>
      
      {/* Wallet details */}
      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      ) : wallet ? (
        <WalletDetails
          wallet={wallet}
          onRefresh={handleRefresh}
          onEditSettings={handleEditSettings}
          onUpdateName={handleUpdateName}
          onResolveAlert={handleResolveAlert}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-[400px]">
          <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Wallet Not Found</h2>
          <p className="text-muted-foreground max-w-md text-center mb-6">
            The wallet you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => router.push('/dashboard/farm/wallets')}>
            Go to Wallet List
          </Button>
        </div>
      )}
    </div>
  );
}
