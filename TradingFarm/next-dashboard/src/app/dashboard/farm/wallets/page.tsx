'use client';

/**
 * Wallets Management Page
 * Main page for managing farm wallets
 */
import React, { useState, useEffect } from 'react';
import { WalletGrid } from '@/components/wallets/wallet-grid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Bell, AlertTriangle, RefreshCw, Wallet } from 'lucide-react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import WalletFormDialog from '@/components/wallets/wallet-form-dialog';

// Mock farm data - this would come from your API
const FARM_ID = 'farm-1';

export default function WalletsPage() {
  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<any[]>([]);
  const [showAddWalletDialog, setShowAddWalletDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createBrowserClient();

  // Fetch wallets on component mount
  useEffect(() => {
    fetchWallets();
  }, []);

  // Fetch wallets from API
  const fetchWallets = async () => {
    setLoading(true);
    try {
      // In a real app, you would fetch from your API
      // const { data, error } = await supabase
      //   .from('wallets')
      //   .select('*')
      //   .eq('farm_id', FARM_ID);
      
      // if (error) throw error;
      
      // For demo purposes, simulate API response with mock data
      const mockData = [
        {
          id: 'wallet-1',
          name: 'Main Trading Wallet',
          address: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
          exchange: 'Binance',
          network: 'Ethereum',
          balance: 1.25436,
          currency: 'ETH',
          lastUpdated: new Date().toISOString(),
          changePercent24h: 5.43,
          status: 'active',
          alerts: [
            {
              type: 'large_deposit',
              message: 'Large deposit of 0.5 ETH detected',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
            }
          ]
        },
        {
          id: 'wallet-2',
          name: 'BTC Reserve',
          address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
          exchange: 'Coinbase',
          network: 'Bitcoin',
          balance: 0.03589,
          currency: 'BTC',
          lastUpdated: new Date(Date.now() - 86400000).toISOString(),
          changePercent24h: -1.24,
          status: 'active',
        },
        {
          id: 'wallet-3',
          name: 'USDT Holdings',
          address: 'TBAYEcXRZxtRQA4nyyfCiEHnHQrLAsjSw2',
          network: 'Tron',
          balance: 5000,
          currency: 'USD',
          lastUpdated: new Date(Date.now() - 172800000).toISOString(),
          changePercent24h: 0.01,
          status: 'inactive',
        },
        {
          id: 'wallet-4',
          name: 'Solana Wallet',
          address: '8ZU1tCRBSLEXN1nvSD3cquXJKgUCHaEgFpuFfF4UF6S7',
          exchange: 'FTX',
          network: 'Solana',
          balance: 45.78,
          currency: 'SOL',
          lastUpdated: new Date(Date.now() - 43200000).toISOString(),
          changePercent24h: 12.38,
          status: 'warning',
          alerts: [
            {
              type: 'low_balance',
              message: 'Balance below minimum threshold',
              timestamp: new Date(Date.now() - 7200000).toISOString(),
            }
          ]
        }
      ];
      
      // Simulate network delay
      setTimeout(() => {
        setWallets(mockData);
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error fetching wallets:', error);
      toast({
        title: "Error",
        description: "Failed to load wallets. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Filter wallets based on active tab
  const getFilteredWallets = () => {
    if (activeTab === 'all') {
      return wallets;
    }
    
    if (activeTab === 'alerts') {
      return wallets.filter(wallet => 
        wallet.alerts && wallet.alerts.length > 0
      );
    }
    
    return wallets.filter(wallet => wallet.status === activeTab);
  };

  // Handle adding a new wallet
  const handleAddWallet = () => {
    setShowAddWalletDialog(true);
  };

  // Handle wallet creation
  const handleCreateWallet = async (walletData: any) => {
    try {
      // In a real app, you would post to your API
      // const { data, error } = await supabase
      //   .from('wallets')
      //   .insert([{ ...walletData, farm_id: FARM_ID }])
      //   .select()
      //   .single();
      
      // if (error) throw error;
      
      // For demo purposes, simulate API response
      const newWallet = {
        id: `wallet-${wallets.length + 1}`,
        ...walletData,
        lastUpdated: new Date().toISOString(),
        status: 'active',
      };
      
      setWallets([...wallets, newWallet]);
      setShowAddWalletDialog(false);
      
      toast({
        title: "Wallet Added",
        description: "The wallet was successfully added to your farm.",
      });
    } catch (error) {
      console.error('Error creating wallet:', error);
      toast({
        title: "Error",
        description: "Failed to add wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Navigate to wallet details
  const handleViewWalletDetails = (walletId: string) => {
    router.push(`/dashboard/farm/wallets/${walletId}`);
  };

  // Refresh a specific wallet
  const handleRefreshWallet = async (walletId: string) => {
    try {
      toast({
        title: "Refreshing Wallet",
        description: "Updating wallet balance and information...",
      });
      
      // In a real app, you would call your API to fetch the latest wallet data
      // Simulate API call
      setTimeout(() => {
        setWallets(wallets.map(wallet => {
          if (wallet.id === walletId) {
            return {
              ...wallet,
              lastUpdated: new Date().toISOString(),
              // Simulate a small balance change
              balance: wallet.balance * (1 + (Math.random() * 0.002 - 0.001)),
            };
          }
          return wallet;
        }));
        
        toast({
          title: "Wallet Refreshed",
          description: "Wallet information has been updated.",
        });
      }, 1500);
    } catch (error) {
      console.error('Error refreshing wallet:', error);
      toast({
        title: "Error",
        description: "Failed to refresh wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Refresh all wallets
  const handleRefreshAllWallets = async () => {
    try {
      toast({
        title: "Refreshing All Wallets",
        description: "Updating all wallet balances and information...",
      });
      
      // In a real app, you would call your API to fetch the latest data for all wallets
      // Simulate API call
      setTimeout(() => {
        setWallets(wallets.map(wallet => ({
          ...wallet,
          lastUpdated: new Date().toISOString(),
          // Simulate small balance changes
          balance: wallet.balance * (1 + (Math.random() * 0.002 - 0.001)),
        })));
        
        toast({
          title: "All Wallets Refreshed",
          description: "All wallet information has been updated.",
        });
      }, 2000);
    } catch (error) {
      console.error('Error refreshing wallets:', error);
      toast({
        title: "Error",
        description: "Failed to refresh wallets. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Wallet Management</h1>
          <p className="text-muted-foreground">
            Manage farm wallets, track balances, and monitor transactions
          </p>
        </div>
        <Button onClick={handleAddWallet}>
          <Plus className="h-4 w-4 mr-2" />
          Add Wallet
        </Button>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <TabsList>
            <TabsTrigger value="all">All Wallets</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="warning">Warning</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
            <TabsTrigger value="alerts">With Alerts</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="all" className="mt-0">
          <WalletGrid
            wallets={getFilteredWallets()}
            farmId={FARM_ID}
            loading={loading}
            onViewWalletDetails={handleViewWalletDetails}
            onAddWallet={handleAddWallet}
            onRefreshAllWallets={handleRefreshAllWallets}
            onRefreshWallet={handleRefreshWallet}
          />
        </TabsContent>
        
        <TabsContent value="active" className="mt-0">
          <WalletGrid
            wallets={getFilteredWallets()}
            farmId={FARM_ID}
            loading={loading}
            onViewWalletDetails={handleViewWalletDetails}
            onAddWallet={handleAddWallet}
            onRefreshAllWallets={handleRefreshAllWallets}
            onRefreshWallet={handleRefreshWallet}
          />
        </TabsContent>
        
        <TabsContent value="warning" className="mt-0">
          <WalletGrid
            wallets={getFilteredWallets()}
            farmId={FARM_ID}
            loading={loading}
            onViewWalletDetails={handleViewWalletDetails}
            onAddWallet={handleAddWallet}
            onRefreshAllWallets={handleRefreshAllWallets}
            onRefreshWallet={handleRefreshWallet}
          />
        </TabsContent>
        
        <TabsContent value="inactive" className="mt-0">
          <WalletGrid
            wallets={getFilteredWallets()}
            farmId={FARM_ID}
            loading={loading}
            onViewWalletDetails={handleViewWalletDetails}
            onAddWallet={handleAddWallet}
            onRefreshAllWallets={handleRefreshAllWallets}
            onRefreshWallet={handleRefreshWallet}
          />
        </TabsContent>
        
        <TabsContent value="alerts" className="mt-0">
          <WalletGrid
            wallets={getFilteredWallets()}
            farmId={FARM_ID}
            loading={loading}
            onViewWalletDetails={handleViewWalletDetails}
            onAddWallet={handleAddWallet}
            onRefreshAllWallets={handleRefreshAllWallets}
            onRefreshWallet={handleRefreshWallet}
          />
        </TabsContent>
      </Tabs>
      
      {/* Add Wallet Dialog */}
      {showAddWalletDialog && (
        <WalletFormDialog
          open={showAddWalletDialog} 
          onClose={() => setShowAddWalletDialog(false)}
          onSubmit={handleCreateWallet}
        />
      )}
    </div>
  );
}
