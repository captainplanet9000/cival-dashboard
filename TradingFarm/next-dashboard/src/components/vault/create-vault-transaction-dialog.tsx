'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { VaultAccount, VaultTransaction } from '@/types/vault-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

// Form schema for vault transaction creation
const formSchema = z.object({
  account_id: z.number(),
  type: z.enum(['deposit', 'withdrawal', 'transfer', 'trade', 'fee', 'interest', 'allocation', 'reward'], {
    required_error: 'Please select a transaction type.',
  }),
  subtype: z.string().optional(),
  amount: z.number().min(0.000001, {
    message: 'Amount must be greater than zero.',
  }),
  currency: z.string().min(1, {
    message: 'Currency is required.',
  }),
  source_account_id: z.number().optional().nullable(),
  destination_account_id: z.number().optional().nullable(),
  external_source: z.string().optional(),
  external_destination: z.string().optional(),
  fee: z.number().optional(),
  fee_currency: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateVaultTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: VaultAccount;
  accounts: VaultAccount[];
  onSuccess: (transaction: VaultTransaction) => void;
}

export function CreateVaultTransactionDialog({
  open,
  onOpenChange,
  account,
  accounts,
  onSuccess,
}: CreateVaultTransactionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      account_id: account.id,
      type: 'deposit',
      subtype: '',
      amount: 0,
      currency: account.currency,
      source_account_id: null,
      destination_account_id: null,
      external_source: '',
      external_destination: '',
      fee: 0,
      fee_currency: account.currency,
      note: '',
    },
  });

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      // Clean up values based on transaction type
      const cleanedValues = { ...values };
      
      // For deposits, we don't need destination account
      if (values.type === 'deposit') {
        cleanedValues.destination_account_id = null;
      }
      
      // For withdrawals, we don't need source account
      if (values.type === 'withdrawal') {
        cleanedValues.source_account_id = null;
      }
      
      // For transfers, we need either source or destination (the other one is the current account)
      if (values.type === 'transfer') {
        if (!values.source_account_id && !values.destination_account_id) {
          throw new Error('For transfers, you must specify either a source or destination account');
        }
        
        // If this is the source account (money going out)
        if (!values.source_account_id) {
          cleanedValues.source_account_id = account.id;
        }
        
        // If this is the destination account (money coming in)
        if (!values.destination_account_id) {
          cleanedValues.destination_account_id = account.id;
        }
      }

      const response = await fetch('/api/vault/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedValues),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create transaction');
      }

      const result = await response.json();
      onSuccess(result.data);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating transaction:', error);
      if (error instanceof Error) {
        form.setError('root', {
          message: error.message,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Transaction type options
  const transactionTypes = [
    { value: 'deposit', label: 'Deposit' },
    { value: 'withdrawal', label: 'Withdrawal' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'trade', label: 'Trade' },
    { value: 'fee', label: 'Fee' },
    { value: 'interest', label: 'Interest' },
    { value: 'allocation', label: 'Allocation' },
    { value: 'reward', label: 'Reward' },
  ];

  // Filter accounts for transfer (exclude current account)
  const transferAccounts = accounts.filter(a => 
    a.id !== account.id && a.currency === account.currency
  );

  // Watch for transaction type to update form
  const transactionType = form.watch('type');
  
  // Determine if this is a source or destination account for transfers
  const isSourceAccount = transactionType === 'transfer' && !form.watch('source_account_id');
  const isDestinationAccount = transactionType === 'transfer' && !form.watch('destination_account_id');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Transaction</DialogTitle>
          <DialogDescription>
            Create a new transaction for account: {account.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {transactionTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.00000001"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value === 0 ? '' : field.value}
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
                    <FormControl>
                      <Input value={account.currency} disabled />
                    </FormControl>
                    <FormDescription>
                      Using account currency
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Transfer-specific fields */}
            {transactionType === 'transfer' && transferAccounts.length > 0 && (
              <FormField
                control={form.control}
                name={isSourceAccount ? 'destination_account_id' : 'source_account_id'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isSourceAccount ? 'Destination Account' : 'Source Account'}
                    </FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString() || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${isSourceAccount ? 'destination' : 'source'} account`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {transferAccounts.map(a => (
                          <SelectItem key={a.id} value={a.id.toString()}>
                            {a.name} ({a.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {isSourceAccount 
                        ? 'Account receiving the funds' 
                        : 'Account sending the funds'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* No compatible accounts warning */}
            {transactionType === 'transfer' && transferAccounts.length === 0 && (
              <div className="text-sm text-amber-500 bg-amber-50 border border-amber-200 rounded-md p-2">
                No compatible accounts found for transfer. Create another account with the same currency.
              </div>
            )}

            {/* External source/destination fields */}
            {(transactionType === 'deposit' || transactionType === 'transfer' && isDestinationAccount) && (
              <FormField
                control={form.control}
                name="external_source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>External Source (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Bank account, exchange, etc."
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Where the funds are coming from
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(transactionType === 'withdrawal' || transactionType === 'transfer' && isSourceAccount) && (
              <FormField
                control={form.control}
                name="external_destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>External Destination (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Bank account, wallet address, etc."
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Where the funds are going
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Fee field */}
            {['withdrawal', 'transfer', 'trade'].includes(transactionType) && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.00000001"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value === 0 ? '' : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fee_currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee Currency</FormLabel>
                      <FormControl>
                        <Input value={account.currency} disabled {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Note field */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a note for this transaction"
                      className="resize-none"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <div className="text-sm font-medium text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || (transactionType === 'transfer' && transferAccounts.length === 0)}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Transaction
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
