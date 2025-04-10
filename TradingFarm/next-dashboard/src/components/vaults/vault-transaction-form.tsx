'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { VaultAccountSchema, CreateVaultTransactionInput } from '@/schemas/vault-schemas';
import { useVaultAccount, useCreateVaultTransaction } from '@/hooks';
import { FormError, FormSuccess } from '@/forms';
import { cn } from '@/lib/utils';
import { z as zod } from 'zod';

interface VaultTransactionFormProps {
  accountId: number;
}

/**
 * Transaction types
 */
const transactionTypes = [
  { id: 'deposit', label: 'Deposit' },
  { id: 'withdrawal', label: 'Withdrawal' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'adjustment', label: 'Balance Adjustment' },
  { id: 'fee', label: 'Fee' },
  { id: 'interest', label: 'Interest' },
];

/**
 * Form schema for creating a vault transaction
 */
const formSchema = z.object({
  vault_account_id: z.coerce.number().min(1, {
    message: 'Account ID is required',
  }),
  transaction_type: z.enum(['deposit', 'withdrawal', 'transfer', 'adjustment', 'fee', 'interest'], {
    errorMap: () => ({ message: 'Please select a valid transaction type' }),
  }),
  amount: z.coerce.number().min(0.01, {
    message: 'Amount must be greater than 0',
  }),
  description: z.string().max(500, {
    message: 'Description must be less than 500 characters',
  }).optional(),
  reference_id: z.string().max(50, {
    message: 'Reference ID must be less than 50 characters',
  }).optional(),
  target_account_id: z.coerce.number().optional(),
  transaction_date: z.date({
    required_error: "Please select a date",
    invalid_type_error: "That's not a date!",
  }).default(() => new Date()),
  category: z.string().max(50, {
    message: 'Category must be less than 50 characters',
  }).optional(),
  external_source: z.string().max(100, {
    message: 'External source must be less than 100 characters',
  }).optional(),
}).refine((data) => {
  // If transaction type is 'transfer', require target_account_id
  if (data.transaction_type === 'transfer') {
    return !!data.target_account_id;
  }
  return true;
}, {
  message: "Target account is required for transfers",
  path: ["target_account_id"],
});

/**
 * Vault Transaction form component
 */
export function VaultTransactionForm({ accountId }: VaultTransactionFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [success, setSuccess] = React.useState<string | undefined>(undefined);
  
  // Get account details
  const { data: account, isLoading: isLoadingAccount } = useVaultAccount(accountId);
  
  // Use the create transaction mutation hook
  const createTransaction = useCreateVaultTransaction();
  
  // Create form with React Hook Form and Zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vault_account_id: accountId,
      transaction_type: 'deposit',
      amount: 0,
      description: '',
      reference_id: '',
      transaction_date: new Date(),
      category: '',
      external_source: '',
    },
  });
  
  // Get the current transaction type
  const transactionType = form.watch('transaction_type');
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError(undefined);
    setSuccess(undefined);
    
    // Perform adjustments based on transaction type
    let finalAmount = values.amount;
    if (values.transaction_type === 'withdrawal' || values.transaction_type === 'fee') {
      finalAmount = -finalAmount; // Negative for withdrawals and fees
    }
    
    try {
      // Create the transaction
      await createTransaction.mutateAsync({
        ...values,
        amount: finalAmount,
      } as CreateVaultTransactionInput);
      
      setSuccess("Transaction created successfully!");
      
      // Reset the form
      form.reset({
        vault_account_id: accountId,
        transaction_type: 'deposit',
        amount: 0,
        description: '',
        reference_id: '',
        transaction_date: new Date(),
        category: '',
        external_source: '',
      });
      
      // Stay on the same page to allow creating more transactions
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    }
  };
  
  if (isLoadingAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Account...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!account) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Unable to load account details. Please try again.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.back()}>Go Back</Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>New Transaction</CardTitle>
        <CardDescription>
          Account: {account.name} ({account.currency_code}) - Current Balance: {account.balance.toLocaleString('en-US', {
            style: 'currency',
            currency: account.currency_code,
          })}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select transaction type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {transactionTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The type of transaction to perform
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ({account.currency_code})</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    {transactionType === 'withdrawal' || transactionType === 'fee'
                      ? "This amount will be subtracted from the account balance"
                      : transactionType === 'deposit' || transactionType === 'interest'
                      ? "This amount will be added to the account balance"
                      : "Enter the transaction amount"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {transactionType === 'transfer' && (
              <FormField
                control={form.control}
                name="target_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Account</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Target account ID" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      The account ID to transfer funds to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="transaction_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Transaction Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    The date when this transaction occurred
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Salary, Food, Investment" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Categorize this transaction for reporting
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="reference_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference ID (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="External reference ID" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      External reference number if applicable
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="external_source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source/Destination (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Bank Name, Exchange, Person" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    The source of funds or destination for withdrawals
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Transaction details" 
                      className="resize-none min-h-[100px]" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Additional details about this transaction
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormError message={error} />
            <FormSuccess message={success} />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createTransaction.isPending}
              className={cn(
                createTransaction.isPending && "opacity-50 cursor-not-allowed"
              )}
            >
              {createTransaction.isPending
                ? "Processing..."
                : "Create Transaction"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
