'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, ArrowUpDown, Plus, RefreshCcw } from 'lucide-react';
import { VaultAccount, createUnifiedBankingService } from '@/services/unified-banking-service';
import { formatCurrency } from '@/lib/utils';

interface AccountsListProps {
  filter?: {
    account_type?: string;
    parent_id?: string;
    farm_id?: string;
    agent_id?: string;
  };
  onAccountSelect?: (account: VaultAccount) => void;
  onCreateAccount?: () => void;
}

export function AccountsList({ 
  filter = {}, 
  onAccountSelect, 
  onCreateAccount 
}: AccountsListProps) {
  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const bankingService = createUnifiedBankingService();
  
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const fetchedAccounts = await bankingService.getAccounts(filter);
      setAccounts(fetchedAccounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAccounts();
  }, [filter]);
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const sortedAccounts = [...accounts].sort((a, b) => {
    let aValue: any = a[sortField as keyof VaultAccount];
    let bValue: any = b[sortField as keyof VaultAccount];
    
    // Handle nested properties if needed
    
    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    // Handle number comparison
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    // Fallback for null, undefined or mixed types
    if (aValue === undefined || aValue === null) return sortDirection === 'asc' ? -1 : 1;
    if (bValue === undefined || bValue === null) return sortDirection === 'asc' ? 1 : -1;
    
    return 0;
  });
  
  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'master':
        return 'bg-purple-500 hover:bg-purple-600';
      case 'farm':
        return 'bg-green-500 hover:bg-green-600';
      case 'agent':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };
  
  const getSecurityLevelBadge = (level: string) => {
    switch (level) {
      case 'standard':
        return <Badge variant="outline" className="bg-slate-100">Standard</Badge>;
      case 'multisig':
        return <Badge variant="outline" className="bg-amber-100">Multi-Sig</Badge>;
      case 'high':
        return <Badge variant="outline" className="bg-red-100">High Security</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-100">{level}</Badge>;
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Vault Accounts</CardTitle>
            <CardDescription>Manage your financial accounts</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="icon" onClick={fetchAccounts}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
            {onCreateAccount && (
              <Button onClick={onCreateAccount}>
                <Plus className="h-4 w-4 mr-2" />
                New Account
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No accounts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px] cursor-pointer" onClick={() => handleSort('name')}>
                    <div className="flex items-center">
                      Name
                      {sortField === 'name' && (
                        <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('account_type')}>
                    <div className="flex items-center">
                      Type
                      {sortField === 'account_type' && (
                        <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('balance')}>
                    <div className="flex items-center">
                      Balance
                      {sortField === 'balance' && (
                        <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Security</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAccounts.map((account) => (
                  <TableRow key={account.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {account.name}
                      {account.description && (
                        <p className="text-sm text-gray-500 truncate max-w-[220px]">{account.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getAccountTypeColor(account.account_type)}>
                        {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(account.balance || 0)}
                    </TableCell>
                    <TableCell>
                      {getSecurityLevelBadge(account.security_level)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={account.status === 'active' ? 'default' : 'destructive'}
                        className={account.status === 'active' ? 'bg-green-500' : 
                                 account.status === 'frozen' ? 'bg-blue-500' : 'bg-red-500'}
                      >
                        {account.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => onAccountSelect && onAccountSelect(account)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500">
          Showing {accounts.length} accounts
        </div>
      </CardFooter>
    </Card>
  );
}
