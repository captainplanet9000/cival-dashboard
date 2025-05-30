'use client';

import { useEffect, useState } from 'react';
import { useVaultBanking } from '@/hooks/use-vault-banking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowDownUp, BanknoteIcon, Briefcase, CreditCard, Loader2, RefreshCcw } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreateVaultMasterDialog } from '@/components/vault/create-vault-master-dialog';
import { CreateVaultAccountDialog } from '@/components/vault/create-vault-account-dialog';
import { CreateVaultTransactionDialog } from '@/components/vault/create-vault-transaction-dialog';
import { VaultTransactionList } from '@/components/vault/vault-transaction-list';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function VaultDashboardPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateMasterDialog, setShowCreateMasterDialog] = useState(false);
  const [showCreateAccountDialog, setShowCreateAccountDialog] = useState(false);
  const [showCreateTransactionDialog, setShowCreateTransactionDialog] = useState(false);
  
  const {
    loading,
    vaultMasters,
    selectedVaultMaster,
    selectedVaultAccount,
    isVaultIntegrationEnabled,
    error,
    loadVaultMasters,
    selectVaultMaster,
    loadVaultAccounts,
    selectVaultAccount,
    getAccountsForCurrentMaster,
    getTransactionsForCurrentAccount,
    synchronizeWithVaultSystem
  } = useVaultBanking();

  // Load vault masters on initial render
  useEffect(() => {
    loadVaultMasters();
  }, [loadVaultMasters]);

  // Handle refresh button click
  const handleRefresh = async () => {
    if (selectedVaultAccount) {
      await selectVaultAccount(selectedVaultAccount.id);
    } else if (selectedVaultMaster) {
      await selectVaultMaster(selectedVaultMaster.id);
    } else {
      await loadVaultMasters();
    }
  };

  // Handle synchronize button click
  const handleSynchronize = async () => {
    await synchronizeWithVaultSystem();
  };

  // Get accounts for the selected master
  const accounts = getAccountsForCurrentMaster();
  
  // Get transactions for the selected account
  const transactions = getTransactionsForCurrentAccount();

  // Calculate total balances
  const calculateTotalBalance = () => {
    if (!accounts?.length) return {};
    
    const totals: Record<string, number> = {};
    accounts.forEach(account => {
      if (!totals[account.currency]) {
        totals[account.currency] = 0;
      }
      totals[account.currency] += account.balance;
    });
    
    return totals;
  };
  
  const totalBalances = calculateTotalBalance();

  // Render vault integration disabled warning
  if (!isVaultIntegrationEnabled) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="warning" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Vault Banking Integration Disabled</AlertTitle>
          <AlertDescription>
            The Vault Banking integration is currently disabled. All vault operations will use the local mock implementation.
            To enable the integration, set the <code>NEXT_PUBLIC_ENABLE_VAULT_BANKING</code> environment variable to <code>true</code>.
          </AlertDescription>
        </Alert>
        
        <h1 className="text-3xl font-bold mb-6">Vault Banking</h1>
        <p className="text-muted-foreground mb-4">
          You are using the mock vault implementation. All data is stored locally and will not persist between sessions.
        </p>
        
        {/* Continue rendering the UI with mock data */}
        {/* The remaining UI is the same as the real implementation */}
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <Button onClick={handleRefresh} variant="outline" className="mb-6">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vault Banking</h1>
        <div className="flex space-x-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          <Button onClick={handleSynchronize} variant="outline" size="sm">
            <ArrowDownUp className="h-4 w-4 mr-2" />
            Sync with Vault System
          </Button>
          <Button onClick={() => setShowCreateMasterDialog(true)} variant="default" size="sm">
            <Briefcase className="h-4 w-4 mr-2" />
            New Vault
          </Button>
        </div>
      </div>

      {/* Main grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vault Masters List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Vaults</CardTitle>
            <CardDescription>Select a vault to view its accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !vaultMasters.length ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : vaultMasters.length === 0 ? (
              <div className="text-center p-4">
                <p className="text-muted-foreground">No vaults found</p>
                <Button 
                  onClick={() => setShowCreateMasterDialog(true)} 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                >
                  Create Vault
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="space-y-2">
                  {vaultMasters.map(master => (
                    <div
                      key={master.id}
                      className={`p-3 rounded-md cursor-pointer transition-colors ${
                        selectedVaultMaster?.id === master.id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => selectVaultMaster(master.id)}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">{master.name}</h3>
                        <Badge variant={master.status === 'active' ? 'outline' : 'secondary'}>
                          {master.status}
                        </Badge>
                      </div>
                      {master.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {master.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Accounts and Transactions */}
        <Card className="md:col-span-2">
          {!selectedVaultMaster ? (
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center h-[calc(100vh-300px)]">
                <Briefcase className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Select a vault to view accounts and transactions</p>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{selectedVaultMaster.name}</CardTitle>
                    <CardDescription>
                      {selectedVaultMaster.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setShowCreateAccountDialog(true)}
                    size="sm"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    New Account
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="accounts">Accounts</TabsTrigger>
                    {selectedVaultAccount && (
                      <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    )}
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4">
                    {/* Total Balance Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.keys(totalBalances).length > 0 ? (
                        Object.entries(totalBalances).map(([currency, amount]) => (
                          <Card key={currency}>
                            <CardHeader className="pb-2">
                              <CardDescription>Total Balance</CardDescription>
                              <CardTitle className="text-2xl">
                                {formatCurrency(amount, currency)}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">
                                {currency} across {
                                  accounts.filter(a => a.currency === currency).length
                                } accounts
                              </p>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardDescription>No Accounts</CardDescription>
                            <CardTitle>Add an account to get started</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Button 
                              onClick={() => setShowCreateAccountDialog(true)}
                              size="sm"
                              variant="outline"
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Create Account
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    
                    {/* Recent Transactions */}
                    {accounts.length > 0 && (
                      <>
                        <h3 className="text-lg font-medium mt-6 mb-2">Recent Transactions</h3>
                        <VaultTransactionList 
                          transactions={transactions.slice(0, 5)}
                          loading={loading}
                          accounts={accounts}
                          showAccount={true}
                        />
                        {transactions.length > 5 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => setActiveTab('transactions')}
                          >
                            View All Transactions
                          </Button>
                        )}
                      </>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="accounts">
                    {loading && !accounts.length ? (
                      <div className="space-y-2">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : accounts.length === 0 ? (
                      <div className="text-center p-8">
                        <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground mb-4">No accounts found for this vault</p>
                        <Button 
                          onClick={() => setShowCreateAccountDialog(true)}
                          variant="outline"
                        >
                          Create Account
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {accounts.map(account => (
                          <Card 
                            key={account.id}
                            className={`cursor-pointer transition-all hover:border-primary/50 ${
                              selectedVaultAccount?.id === account.id 
                                ? 'border-primary' 
                                : ''
                            }`}
                            onClick={() => selectVaultAccount(account.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="font-medium">{account.name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {account.account_type} · {account.currency}
                                    {account.exchange && ` · ${account.exchange}`}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">
                                    {formatCurrency(account.balance, account.currency)}
                                  </p>
                                  <Badge variant={account.status === 'active' ? 'outline' : 'secondary'}>
                                    {account.status}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="transactions">
                    {selectedVaultAccount ? (
                      <>
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="text-lg font-medium">{selectedVaultAccount.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Balance: {formatCurrency(selectedVaultAccount.balance, selectedVaultAccount.currency)}
                            </p>
                          </div>
                          <Button 
                            onClick={() => setShowCreateTransactionDialog(true)}
                            size="sm"
                          >
                            <BanknoteIcon className="h-4 w-4 mr-2" />
                            New Transaction
                          </Button>
                        </div>
                        
                        <Separator className="mb-4" />
                        
                        <VaultTransactionList 
                          transactions={transactions}
                          loading={loading}
                          accounts={accounts}
                          showAccount={false}
                        />
                      </>
                    ) : (
                      <div className="text-center p-8">
                        <p className="text-muted-foreground">Select an account to view transactions</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Dialogs */}
      {showCreateMasterDialog && (
        <CreateVaultMasterDialog 
          open={showCreateMasterDialog}
          onOpenChange={setShowCreateMasterDialog}
          onSuccess={(master) => {
            loadVaultMasters();
            toast({
              title: "Vault Created",
              description: `Successfully created vault: ${master.name}`,
            });
          }}
        />
      )}
      
      {showCreateAccountDialog && selectedVaultMaster && (
        <CreateVaultAccountDialog 
          open={showCreateAccountDialog}
          onOpenChange={setShowCreateAccountDialog}
          vaultMaster={selectedVaultMaster}
          onSuccess={(account) => {
            loadVaultAccounts(selectedVaultMaster.id);
            toast({
              title: "Account Created",
              description: `Successfully created account: ${account.name}`,
            });
          }}
        />
      )}
      
      {showCreateTransactionDialog && selectedVaultAccount && (
        <CreateVaultTransactionDialog 
          open={showCreateTransactionDialog}
          onOpenChange={setShowCreateTransactionDialog}
          account={selectedVaultAccount}
          accounts={accounts}
          onSuccess={() => {
            selectVaultAccount(selectedVaultAccount.id);
            toast({
              title: "Transaction Created",
              description: "Transaction has been successfully created",
            });
          }}
        />
      )}
    </div>
  );
}
