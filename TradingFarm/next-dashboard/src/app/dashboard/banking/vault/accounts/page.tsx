'use client';

import { useState, useEffect } from 'react';
import { Plus, ArrowLeftRight, RefreshCw, Wallet, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountsList } from '@/components/banking/accounts-list';
import { AccountForm } from '@/components/banking/account-form';
import { TransactionForm } from '@/components/banking/transaction-form';
import { VaultAccount, createUnifiedBankingService } from '@/services/unified-banking-service';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import ElizaChatInterface from '@/components/eliza/eliza-chat-interface';

export default function VaultAccountsPage() {
  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [parentAccounts, setParentAccounts] = useState<VaultAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAccountDialog, setShowNewAccountDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<VaultAccount | null>(null);
  const [accountFilter, setAccountFilter] = useState<'all' | 'master' | 'farm' | 'agent'>('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const bankingService = createUnifiedBankingService();
  const supabase = createBrowserClient();
  
  // Fetch user and farm data
  useEffect(() => {
    async function getUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          
          // Get user's primary farm
          const { data: farms } = await supabase
            .from('farms')
            .select('id, name')
            .eq('user_id', user.id);
          
          if (farms && farms.length > 0) {
            setFarmId(farms[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    }
    
    getUserData();
  }, []);
  
  // Fetch accounts based on filter
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const filter: any = {};
      if (accountFilter !== 'all') {
        filter.account_type = accountFilter;
      }
      
      const fetchedAccounts = await bankingService.getAccounts(filter);
      setAccounts(fetchedAccounts);
      
      // Also fetch parent accounts for the account creation form
      const masterAccounts = await bankingService.getAccounts({ account_type: 'master' });
      const farmAccounts = await bankingService.getAccounts({ account_type: 'farm' });
      setParentAccounts([...masterAccounts, ...farmAccounts]);
      
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load accounts. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAccounts();
  }, [accountFilter]);
  
  const handleCreateAccount = async (accountData: VaultAccount) => {
    try {
      await bankingService.createAccount(accountData);
      
      toast({
        title: 'Success',
        description: 'Account created successfully',
      });
      
      setShowNewAccountDialog(false);
      fetchAccounts();
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: 'Error',
        description: 'Failed to create account. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const handleAccountSelect = (account: VaultAccount) => {
    setSelectedAccount(account);
  };
  
  const handleCreateTransaction = async (transactionData: any) => {
    try {
      await bankingService.createTransaction(transactionData);
      
      toast({
        title: 'Success',
        description: 'Transaction created successfully',
      });
      
      setShowTransactionDialog(false);
      fetchAccounts(); // Refresh accounts to show updated balances
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to create transaction. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/banking/vault">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Vault Accounts</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your financial accounts in the vault system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAccounts}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowTransactionDialog(true)}>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
          <Button size="sm" onClick={() => setShowNewAccountDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Account
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-7">
        {/* Accounts Section - Takes up 5/7 of the width on medium screens and up */}
        <div className="md:col-span-5">
          <Tabs defaultValue="all" onValueChange={(value) => setAccountFilter(value as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Accounts</TabsTrigger>
              <TabsTrigger value="master">Master</TabsTrigger>
              <TabsTrigger value="farm">Farm</TabsTrigger>
              <TabsTrigger value="agent">Agent</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="m-0">
              <AccountsList 
                filter={{}} 
                onAccountSelect={handleAccountSelect}
                onCreateAccount={() => setShowNewAccountDialog(true)}
              />
            </TabsContent>
            
            <TabsContent value="master" className="m-0">
              <AccountsList 
                filter={{ account_type: 'master' }} 
                onAccountSelect={handleAccountSelect}
                onCreateAccount={() => setShowNewAccountDialog(true)}
              />
            </TabsContent>
            
            <TabsContent value="farm" className="m-0">
              <AccountsList 
                filter={{ account_type: 'farm' }} 
                onAccountSelect={handleAccountSelect}
                onCreateAccount={() => setShowNewAccountDialog(true)}
              />
            </TabsContent>
            
            <TabsContent value="agent" className="m-0">
              <AccountsList 
                filter={{ account_type: 'agent' }} 
                onAccountSelect={handleAccountSelect}
                onCreateAccount={() => setShowNewAccountDialog(true)}
              />
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Assistant Section - Takes up 2/7 of the width on medium screens and up */}
        <div className="md:col-span-2">
          <ElizaChatInterface
            initialContext={{
              module: 'banking-vault',
              userId: userId || '',
              farmId: farmId || '',
              view: 'accounts'
            }}
            showTitle={true}
            title="Banking Assistant"
          />
        </div>
      </div>
      
      {/* Account Details Drawer (to be implemented) */}
      {/* TODO: Add account details view when account is selected */}
      
      {/* New Account Dialog */}
      <Dialog open={showNewAccountDialog} onOpenChange={setShowNewAccountDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>
              Add a new account to your vault
            </DialogDescription>
          </DialogHeader>
          
          <AccountForm 
            parentAccounts={parentAccounts}
            farmId={farmId || undefined}
            onSubmit={handleCreateAccount}
            onCancel={() => setShowNewAccountDialog(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* New Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Transaction</DialogTitle>
            <DialogDescription>
              Move funds between your accounts
            </DialogDescription>
          </DialogHeader>
          
          <TransactionForm 
            accounts={accounts}
            selectedAccountId={selectedAccount?.id}
            onSubmit={handleCreateTransaction}
            onCancel={() => setShowTransactionDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
