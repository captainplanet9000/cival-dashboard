'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VaultMaster, VaultAccount, CreateVaultAccountRequest } from '@/types/vault-types';
import { Button } from '@/components/ui/button';
import { Plus, Edit, ArrowDownUp, ExternalLink, Trash2, MoreHorizontal } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { createVaultAccount } from '@/services/vault-service';

interface VaultAccountsProps {
  vaults: VaultMaster[];
  farmId: string;
  userId: string;
  onRefresh: () => void;
}

export default function VaultAccounts({ 
  vaults, 
  farmId,
  userId,
  onRefresh
}: VaultAccountsProps) {
  const [activeVaultId, setActiveVaultId] = useState<number | undefined>(
    vaults.length > 0 ? vaults[0].id : undefined
  );
  const [newAccountDialogOpen, setNewAccountDialogOpen] = useState(false);
  const [accountFormData, setAccountFormData] = useState<Partial<CreateVaultAccountRequest>>({
    account_type: 'trading',
    currency: 'USD'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeVault = vaults.find(v => v.id === activeVaultId);
  
  const formatBalance = (balance: number, currency: string) => {
    return balance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }) + ' ' + currency;
  };

  const handleAccountFormChange = (field: string, value: any) => {
    setAccountFormData({
      ...accountFormData,
      [field]: value
    });
  };

  const handleCreateAccount = async () => {
    if (!activeVaultId || !accountFormData.name || !accountFormData.currency || !accountFormData.account_type) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const formData: CreateVaultAccountRequest = {
        vault_id: activeVaultId,
        name: accountFormData.name,
        currency: accountFormData.currency,
        account_type: accountFormData.account_type as any,
        address: accountFormData.address,
        network: accountFormData.network,
        exchange: accountFormData.exchange,
        initial_balance: accountFormData.initial_balance || 0,
        farm_id: farmId ? parseInt(farmId) : undefined
      };
      
      const response = await createVaultAccount(userId, formData);
      
      if (response.error) {
        console.error('Error creating account:', response.error);
        // You would typically show a toast error message here
      } else {
        setNewAccountDialogOpen(false);
        setAccountFormData({
          account_type: 'trading',
          currency: 'USD'
        });
        onRefresh();
      }
    } catch (error) {
      console.error('Unexpected error creating account:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Vault Accounts</h2>
        <Button 
          onClick={() => setNewAccountDialogOpen(true)}
          disabled={vaults.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Account
        </Button>
      </div>

      {vaults.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Vaults Available</CardTitle>
            <CardDescription>
              Create a vault first before adding accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>You need to create a vault before you can add accounts to it.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={activeVaultId?.toString()} onValueChange={(value) => setActiveVaultId(parseInt(value, 10))}>
          <ScrollArea className="w-full" orientation="horizontal">
            <TabsList className="mb-4">
              {vaults.map((vault) => (
                <TabsTrigger key={vault.id} value={vault.id.toString()}>
                  {vault.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
          
          {vaults.map((vault) => (
            <TabsContent key={vault.id} value={vault.id.toString()}>
              <Card>
                <CardHeader>
                  <CardTitle>{vault.name} Accounts</CardTitle>
                  <CardDescription>
                    {vault.description || `Manage accounts for ${vault.name}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(!vault.accounts || vault.accounts.length === 0) ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No accounts found in this vault</p>
                      <Button onClick={() => setNewAccountDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Account
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Currency</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead className="text-right">Available</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vault.accounts.map((account) => (
                            <TableRow key={account.id}>
                              <TableCell className="font-medium">{account.name}</TableCell>
                              <TableCell>{account.account_type}</TableCell>
                              <TableCell>{account.currency}</TableCell>
                              <TableCell className="text-right">
                                {formatBalance(account.balance, account.currency)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatBalance(account.balance - account.reserved_balance, account.currency)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                                  {account.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem>
                                      <ArrowDownUp className="mr-2 h-4 w-4" />
                                      Transfer
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      View Transactions
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={newAccountDialogOpen} onOpenChange={setNewAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>
              Add a new account to {activeVault?.name || 'your vault'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                placeholder="Trading Account"
                className="col-span-3"
                value={accountFormData.name || ''}
                onChange={(e) => handleAccountFormChange('name', e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="account-type" className="text-right">
                Type
              </Label>
              <Select
                value={accountFormData.account_type}
                onValueChange={(value) => handleAccountFormChange('account_type', value)}
              >
                <SelectTrigger id="account-type" className="col-span-3">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trading">Trading</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="reserve">Reserve</SelectItem>
                  <SelectItem value="fee">Fee</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="custody">Custody</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currency" className="text-right">
                Currency
              </Label>
              <Select
                value={accountFormData.currency}
                onValueChange={(value) => handleAccountFormChange('currency', value)}
              >
                <SelectTrigger id="currency" className="col-span-3">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                  <SelectItem value="USDT">Tether (USDT)</SelectItem>
                  <SelectItem value="USDC">USD Coin (USDC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="initial-balance" className="text-right">
                Initial Balance
              </Label>
              <Input
                id="initial-balance"
                type="number"
                placeholder="0.00"
                className="col-span-3"
                value={accountFormData.initial_balance || ''}
                onChange={(e) => handleAccountFormChange('initial_balance', parseFloat(e.target.value) || 0)}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Address
              </Label>
              <Input
                id="address"
                placeholder="Optional blockchain address"
                className="col-span-3"
                value={accountFormData.address || ''}
                onChange={(e) => handleAccountFormChange('address', e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="network" className="text-right">
                Network
              </Label>
              <Input
                id="network"
                placeholder="Optional blockchain network"
                className="col-span-3"
                value={accountFormData.network || ''}
                onChange={(e) => handleAccountFormChange('network', e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="exchange" className="text-right">
                Exchange
              </Label>
              <Input
                id="exchange"
                placeholder="Optional exchange name"
                className="col-span-3"
                value={accountFormData.exchange || ''}
                onChange={(e) => handleAccountFormChange('exchange', e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewAccountDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAccount} 
              disabled={isSubmitting || !accountFormData.name || !accountFormData.currency}
            >
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
