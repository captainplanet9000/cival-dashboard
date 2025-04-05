'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  getUserVaults, 
  getVaultBalanceSummary, 
  getVaultTransactions,
  isConsolidatedVaultSystemAvailable
} from '@/services/vault-service';
import { VaultMaster, VaultBalanceSummary, VaultTransactionFilter } from '@/types/vault-types';
import VaultOverview from './vault-overview';
import VaultAccounts from './vault-accounts';
import VaultTransactions from './vault-transactions';
import VaultApprovals from './vault-approvals';
import CreateVaultDialog from './create-vault-dialog';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { VaultNavigation } from './vault-navigation';

interface VaultDashboardProps {
  farmId: string;
  userId: string;
  activeTab?: 'overview' | 'accounts' | 'transactions' | 'approvals';
}

export default function VaultDashboard({ farmId, userId, activeTab = 'overview' }: VaultDashboardProps) {
  const [activeTabState, setActiveTabState] = useState(activeTab);
  const [vaults, setVaults] = useState<VaultMaster[]>([]);
  const [balanceSummary, setBalanceSummary] = useState<VaultBalanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isConsolidated, setIsConsolidated] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<VaultTransactionFilter>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    setActiveTabState(activeTab);
  }, [activeTab]);

  useEffect(() => {
    async function checkSystemType() {
      const consolidated = await isConsolidatedVaultSystemAvailable();
      setIsConsolidated(consolidated);
    }
    
    checkSystemType();
  }, []);

  useEffect(() => {
    async function loadVaultData() {
      setLoading(true);
      try {
        const vaultData = await getUserVaults(userId);
        setVaults(vaultData);
        
        const summaryData = await getVaultBalanceSummary(userId);
        setBalanceSummary(summaryData);
      } catch (error) {
        console.error('Error loading vault data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadVaultData();
  }, [userId, refreshTrigger]);

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCreateVault = () => {
    setShowCreateDialog(true);
  };

  const handleVaultCreated = () => {
    setShowCreateDialog(false);
    refreshData();
  };

  const totalPortfolioValue = balanceSummary.reduce((sum, item) => sum + (item.usd_value || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <VaultNavigation farmId={farmId} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vault Banking</h1>
          <p className="text-muted-foreground">
            Manage your accounts, transactions, and approvals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleCreateVault}>
            <Plus className="mr-2 h-4 w-4" />
            New Vault
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Portfolio Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalPortfolioValue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Across {vaults.length} vault{vaults.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Active Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vaults.reduce((sum, vault) => sum + (vault.accounts?.length || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {balanceSummary.length} currencies managed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vaults.reduce((sum, vault) => {
                  const pendingCount = vault.accounts?.reduce((count, account) => {
                    // This is a placeholder; in reality, you'd need to query pending transactions
                    return count + 0;
                  }, 0) || 0;
                  return sum + pendingCount;
                }, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting processing
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vaults.reduce((sum, vault) => {
                  // This is a placeholder; in reality, you'd need to query pending approvals
                  return sum + (vault.requires_approval ? 0 : 0);
                }, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Requiring your authorization
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTabState} onValueChange={setActiveTabState} className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <VaultOverview 
            vaults={vaults}
            balanceSummary={balanceSummary}
            loading={loading}
            onRefresh={refreshData}
          />
        </TabsContent>
        <TabsContent value="accounts">
          <VaultAccounts 
            vaults={vaults}
            farmId={farmId}
            userId={userId}
            onRefresh={refreshData}
          />
        </TabsContent>
        <TabsContent value="transactions">
          <VaultTransactions 
            userId={userId}
            filter={transactionFilter}
            onFilterChange={setTransactionFilter}
            onRefresh={refreshData}
          />
        </TabsContent>
        <TabsContent value="approvals">
          <VaultApprovals 
            userId={userId}
            onRefresh={refreshData}
          />
        </TabsContent>
      </Tabs>

      <CreateVaultDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        userId={userId}
        onVaultCreated={handleVaultCreated}
      />
    </div>
  );
}
