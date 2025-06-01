'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DollarSign,
  Shield,
  MoreHorizontal,
  PlusCircle,
  RefreshCw,
  Settings,
  Lock,
  ExternalLink,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
} from 'lucide-react';
import { VaultMaster, VaultAccount, VaultTransaction, VaultAccountType } from '@/types/vault';
import { unifiedBankingService } from '@/services/unifiedBankingService';

interface AccountsOverviewProps {
  masterVaults: VaultMaster[];
  accounts: VaultAccount[];
  pendingApprovals: VaultTransaction[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function AccountsOverview({
  masterVaults,
  accounts,
  pendingApprovals,
  isLoading,
  onRefresh,
}: AccountsOverviewProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  
  // Format currency values
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Get account details
  const getAccountDetails = (id: string): VaultAccount | undefined => {
    return accounts.find(a => a.id === id);
  };

  // Group accounts by type
  const accountsByType = accounts.reduce((acc, account) => {
    const type = account.type || 'other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(account);
    return acc;
  }, {} as Record<string, VaultAccount[]>);
  
  // Group accounts by vault
  const accountsByVault = accounts.reduce((acc, account) => {
    const vaultId = account.masterId;
    if (!acc[vaultId]) {
      acc[vaultId] = [];
    }
    acc[vaultId].push(account);
    return acc;
  }, {} as Record<string, VaultAccount[]>);
  
  // Account type label
  const getAccountTypeLabel = (type: VaultAccountType | string): string => {
    switch (type) {
      case VaultAccountType.TRADING:
        return 'Trading Account';
      case VaultAccountType.RESERVE:
        return 'Reserve Account';
      case VaultAccountType.SETTLEMENT:
        return 'Settlement Account';
      case VaultAccountType.STAKING:
        return 'Staking Account';
      case VaultAccountType.YIELD:
        return 'Yield Account';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };
  
  // Account icon based on type
  const getAccountIcon = (type: VaultAccountType | string) => {
    switch (type) {
      case VaultAccountType.TRADING:
        return (
          <div className="p-2 rounded-full bg-blue-100 text-blue-600">
            <CreditCard className="h-4 w-4" />
          </div>
        );
      case VaultAccountType.RESERVE:
        return (
          <div className="p-2 rounded-full bg-green-100 text-green-600">
            <DollarSign className="h-4 w-4" />
          </div>
        );
      case VaultAccountType.SETTLEMENT:
        return (
          <div className="p-2 rounded-full bg-orange-100 text-orange-600">
            <RefreshCw className="h-4 w-4" />
          </div>
        );
      case VaultAccountType.STAKING:
        return (
          <div className="p-2 rounded-full bg-purple-100 text-purple-600">
            <Lock className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-full bg-gray-100 text-gray-600">
            <CreditCard className="h-4 w-4" />
          </div>
        );
    }
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium">Accounts</h3>
          <Skeleton className="h-9 w-32" />
        </div>
        
        <Skeleton className="w-full h-12 mb-2" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Skeleton className="w-full h-40" />
          <Skeleton className="w-full h-40" />
          <Skeleton className="w-full h-40" />
        </div>
        <Skeleton className="w-full h-12 mb-2" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="w-full h-40" />
          <Skeleton className="w-full h-40" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium">Accounts</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRefresh} className="gap-1">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-1">
            <PlusCircle className="h-4 w-4" />
            New Account
          </Button>
        </div>
      </div>
      
      {/* Hierarchical View */}
      <div>
        <h4 className="font-medium text-sm text-muted-foreground mb-3">Master Vault Structure</h4>
        <Accordion type="single" collapsible>
          {masterVaults.map(vault => (
            <AccordionItem value={vault.id} key={vault.id}>
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span>{vault.name}</span>
                  <Badge variant="outline" className="ml-2">
                    {formatCurrency(vault.totalBalance)}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {accountsByVault[vault.id] ? (
                  <div className="pl-6 space-y-2 mt-2">
                    {accountsByVault[vault.id].map(account => (
                      <Card 
                        key={account.id} 
                        className={`hover:shadow-sm transition-shadow border-l-4 ${
                          account.type === VaultAccountType.TRADING 
                            ? 'border-l-blue-500' 
                            : account.type === VaultAccountType.RESERVE 
                            ? 'border-l-green-500' 
                            : account.type === VaultAccountType.STAKING 
                            ? 'border-l-purple-500' 
                            : 'border-l-gray-500'
                        }`}
                      >
                        <CardContent className="p-3 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            {getAccountIcon(account.type)}
                            <div>
                              <div className="font-medium">{account.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {getAccountTypeLabel(account.type)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="font-medium">
                                {formatCurrency(account.balance)}
                              </div>
                              {account.lockedAmount > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  <Lock className="h-3 w-3 inline mr-1" />
                                  {formatCurrency(account.lockedAmount)} locked
                                </div>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Account Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setIsTransferDialogOpen(true)}>
                                  Transfer Funds
                                </DropdownMenuItem>
                                <DropdownMenuItem>View Transactions</DropdownMenuItem>
                                <DropdownMenuItem>Security Settings</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">Deactivate</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="pl-6 text-sm text-muted-foreground">No accounts in this vault</p>
                )}
                <div className="pl-6 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1"
                    onClick={() => {
                      setSelectedAccountId(vault.id);
                      setIsCreateDialogOpen(true);
                    }}
                  >
                    <PlusCircle className="h-3 w-3" />
                    Add Account to Vault
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      
      {/* Account Type Categories */}
      <div className="space-y-6 mt-8">
        <h4 className="font-medium text-sm text-muted-foreground mb-3">Accounts by Type</h4>
        
        {Object.entries(accountsByType).map(([type, typeAccounts]) => (
          <div key={type}>
            <h5 className="font-medium mb-3 flex items-center gap-2">
              {getAccountIcon(type)}
              {getAccountTypeLabel(type)}
              <Badge className="ml-1">{typeAccounts.length}</Badge>
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {typeAccounts.map(account => (
                <Card key={account.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{account.name}</CardTitle>
                    <CardDescription>
                      {account.farmId && 'Farm: ' + account.farmId}
                      {account.agentId && 'Agent: ' + account.agentId}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(account.balance)}
                        </div>
                        {account.lockedAmount > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <Lock className="h-3 w-3 inline mr-1" />
                            {formatCurrency(account.lockedAmount)} locked
                          </div>
                        )}
                      </div>
                      <Badge variant={account.isActive ? 'secondary' : 'outline'}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-0">
                    <Button variant="outline" size="sm" className="gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1"
                      onClick={() => setIsTransferDialogOpen(true)}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Transfer
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Create Account Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>
              Add a new account to your banking system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" placeholder="Account name" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vault" className="text-right">
                Master Vault
              </Label>
              <Select defaultValue={selectedAccountId || undefined}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select master vault" />
                </SelectTrigger>
                <SelectContent>
                  {masterVaults.map(vault => (
                    <SelectItem key={vault.id} value={vault.id}>
                      {vault.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Account Type
              </Label>
              <Select>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={VaultAccountType.TRADING}>Trading Account</SelectItem>
                  <SelectItem value={VaultAccountType.RESERVE}>Reserve Account</SelectItem>
                  <SelectItem value={VaultAccountType.SETTLEMENT}>Settlement Account</SelectItem>
                  <SelectItem value={VaultAccountType.STAKING}>Staking Account</SelectItem>
                  <SelectItem value={VaultAccountType.YIELD}>Yield Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="initial-balance" className="text-right">
                Initial Balance
              </Label>
              <div className="relative col-span-3">
                <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="initial-balance" 
                  type="number" 
                  placeholder="0.00" 
                  className="pl-8" 
                  defaultValue="0" 
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currency" className="text-right">
                Currency
              </Label>
              <Select defaultValue="USD">
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="security-level" className="text-right">
                Security Level
              </Label>
              <Select defaultValue="standard">
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select security level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="enhanced">Enhanced</SelectItem>
                  <SelectItem value="maximum">Maximum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={() => setIsCreateDialogOpen(false)}>
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Transfer Funds Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transfer Funds</DialogTitle>
            <DialogDescription>
              Move funds between accounts in your banking system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="from-account" className="text-right">
                From Account
              </Label>
              <Select>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select source account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(account.balance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="to-account" className="text-right">
                To Account
              </Label>
              <Select>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(account.balance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <div className="relative col-span-3">
                <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="amount" type="number" placeholder="0.00" className="pl-8" />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input 
                id="description" 
                placeholder="Description for this transfer" 
                className="col-span-3" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={() => setIsTransferDialogOpen(false)}>
              Transfer Funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 