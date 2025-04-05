'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  VaultAccount, 
  Transaction, 
  createUnifiedBankingService 
} from '@/services/unified-banking-service';
import { Loader2, ArrowLeftRight, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const transactionSchema = z.object({
  transaction_type: z.enum(['deposit', 'withdrawal', 'transfer', 'trade', 'fee']),
  amount: z.coerce.number().positive({
    message: 'Amount must be greater than zero',
  }),
  currency: z.string().min(1, {
    message: 'Currency is required',
  }),
  source_account_id: z.string().optional(),
  destination_account_id: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  memo: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  accounts: VaultAccount[];
  selectedAccountId?: string;
  onSubmit: (data: Transaction) => Promise<void>;
  onCancel?: () => void;
}

export function TransactionForm({
  accounts,
  selectedAccountId,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionTab, setTransactionTab] = useState<string>('transfer');
  const [sourceAccount, setSourceAccount] = useState<VaultAccount | null>(null);
  const [destinationAccount, setDestinationAccount] = useState<VaultAccount | null>(null);
  
  const bankingService = createUnifiedBankingService();
  
  // Default form values
  const defaultValues: Partial<TransactionFormValues> = {
    transaction_type: 'transfer',
    amount: 0,
    currency: 'USD',
    source_account_id: selectedAccountId,
    metadata: {},
    memo: '',
  };
  
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  });
  
  // Watch form values
  const transactionType = form.watch('transaction_type');
  const amount = form.watch('amount');
  const sourceAccountId = form.watch('source_account_id');
  const destinationAccountId = form.watch('destination_account_id');
  
  // Update transaction type when tab changes
  useEffect(() => {
    form.setValue('transaction_type', transactionTab as any);
    
    // Clear irrelevant fields based on transaction type
    if (transactionTab === 'deposit') {
      form.setValue('source_account_id', undefined);
    } else if (transactionTab === 'withdrawal') {
      form.setValue('destination_account_id', undefined);
    }
  }, [transactionTab, form]);
  
  // Initialize with selected account if provided
  useEffect(() => {
    if (selectedAccountId) {
      const account = accounts.find(acc => acc.id === selectedAccountId);
      if (account) {
        if (transactionTab === 'deposit') {
          form.setValue('destination_account_id', selectedAccountId);
          setDestinationAccount(account);
        } else {
          form.setValue('source_account_id', selectedAccountId);
          setSourceAccount(account);
        }
      }
    }
  }, [selectedAccountId, accounts, transactionTab]);
  
  // Update source account info when ID changes
  useEffect(() => {
    if (sourceAccountId) {
      const account = accounts.find(acc => acc.id === sourceAccountId);
      setSourceAccount(account || null);
    } else {
      setSourceAccount(null);
    }
  }, [sourceAccountId, accounts]);
  
  // Update destination account info when ID changes
  useEffect(() => {
    if (destinationAccountId) {
      const account = accounts.find(acc => acc.id === destinationAccountId);
      setDestinationAccount(account || null);
    } else {
      setDestinationAccount(null);
    }
  }, [destinationAccountId, accounts]);
  
  async function handleSubmit(data: TransactionFormValues) {
    setIsSubmitting(true);
    
    try {
      // Prepare transaction data
      const transactionData: Transaction = {
        transaction_type: data.transaction_type,
        amount: data.amount,
        currency: data.currency,
        source_account_id: data.source_account_id,
        destination_account_id: data.destination_account_id,
      };
      
      // Add metadata if memo is provided
      if (data.memo) {
        transactionData.metadata = {
          ...data.metadata,
          memo: data.memo,
        };
      }
      
      await onSubmit(transactionData);
      form.reset(defaultValues); // Reset form after successful submission
    } catch (error) {
      console.error('Error submitting transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Validation helpers
  const validateTransaction = (): boolean => {
    if (transactionType === 'deposit' && !destinationAccountId) {
      return false;
    }
    
    if (transactionType === 'withdrawal' && !sourceAccountId) {
      return false;
    }
    
    if (transactionType === 'transfer' && (!sourceAccountId || !destinationAccountId)) {
      return false;
    }
    
    if (amount <= 0) {
      return false;
    }
    
    // Check if source has enough balance for withdrawals and transfers
    if (
      (transactionType === 'withdrawal' || transactionType === 'transfer') &&
      sourceAccount &&
      sourceAccount.balance !== undefined &&
      amount > sourceAccount.balance
    ) {
      return false;
    }
    
    return true;
  };
  
  const getTransactionSummary = (): string => {
    if (!validateTransaction()) {
      return 'Please complete all required fields';
    }
    
    switch (transactionType) {
      case 'deposit':
        return `Deposit ${formatCurrency(amount)} to ${destinationAccount?.name || 'selected account'}`;
      case 'withdrawal':
        return `Withdraw ${formatCurrency(amount)} from ${sourceAccount?.name || 'selected account'}`;
      case 'transfer':
        return `Transfer ${formatCurrency(amount)} from ${sourceAccount?.name || 'source'} to ${destinationAccount?.name || 'destination'}`;
      default:
        return '';
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Transaction</CardTitle>
        <CardDescription>
          Move funds between accounts or deposit/withdraw
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs 
              defaultValue="transfer" 
              value={transactionTab}
              onValueChange={setTransactionTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="deposit">
                  <ArrowDown className="mr-2 h-4 w-4" />
                  Deposit
                </TabsTrigger>
                <TabsTrigger value="withdrawal">
                  <ArrowUp className="mr-2 h-4 w-4" />
                  Withdraw
                </TabsTrigger>
                <TabsTrigger value="transfer">
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Transfer
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="deposit" className="pt-4">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="destination_account_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destination Account</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select destination account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id || ''}>
                                {account.name} ({account.account_type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The account to deposit funds into
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="withdrawal" className="pt-4">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="source_account_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source Account</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select source account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id || ''}>
                                {account.name} ({formatCurrency(account.balance || 0)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The account to withdraw funds from
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {sourceAccount && sourceAccount.balance !== undefined && (
                    <div className="text-sm">
                      Available balance: <span className="font-medium">{formatCurrency(sourceAccount.balance)}</span>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="transfer" className="pt-4">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="source_account_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Account</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select source account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id || ''}>
                                {account.name} ({formatCurrency(account.balance || 0)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The account to transfer funds from
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {sourceAccount && sourceAccount.balance !== undefined && (
                    <div className="text-sm">
                      Available balance: <span className="font-medium">{formatCurrency(sourceAccount.balance)}</span>
                    </div>
                  )}
                  
                  <FormField
                    control={form.control}
                    name="destination_account_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Account</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select destination account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts
                              .filter(account => account.id !== sourceAccountId) // Exclude source account
                              .map((account) => (
                                <SelectItem key={account.id} value={account.id || ''}>
                                  {account.name} ({account.account_type})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The account to receive the funds
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="BTC">BTC</SelectItem>
                        <SelectItem value="ETH">ETH</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="memo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Memo (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add a note about this transaction"
                      className="resize-none"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="border rounded-md p-4 bg-gray-50">
              <h3 className="text-sm font-medium">Transaction Summary</h3>
              <p className="text-sm mt-1">{getTransactionSummary()}</p>
              
              {/* Show warning if insufficient funds */}
              {sourceAccount && 
               sourceAccount.balance !== undefined && 
               amount > sourceAccount.balance && 
               (transactionType === 'withdrawal' || transactionType === 'transfer') && (
                <p className="text-red-500 text-sm mt-2">
                  Warning: Insufficient funds in source account
                </p>
              )}
              
              {/* Show approval requirement for multisig */}
              {((sourceAccount && sourceAccount.security_level === 'multisig') ||
                (destinationAccount && destinationAccount.security_level === 'multisig')) && (
                <p className="text-amber-600 text-sm mt-2">
                  Note: This transaction may require multiple approvals
                </p>
              )}
            </div>
            
            <div className="flex justify-end space-x-4 pt-4">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={isSubmitting || !validateTransaction()}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Transaction
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
