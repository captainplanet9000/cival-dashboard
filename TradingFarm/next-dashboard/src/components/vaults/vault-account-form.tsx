'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
  VaultAccountSchema, 
  CreateVaultAccountInput, 
  UpdateVaultAccountInput,
  VaultCurrencySchema
} from '@/schemas/vault-schemas';
import { 
  useCreateVaultAccount, 
  useUpdateVaultAccount, 
  useVaultMaster 
} from '@/hooks';
import { FormError, FormSuccess } from '@/forms';
import { cn } from '@/lib/utils';
import { z as zod } from 'zod';

interface VaultAccountFormProps {
  initialData?: zod.infer<typeof VaultAccountSchema>;
  isEditMode?: boolean;
  masterId: number;
}

/**
 * Form schema for creating/editing a vault account
 */
const formSchema = z.object({
  name: z.string().min(3, {
    message: 'Account name must be at least 3 characters long',
  }).max(50, {
    message: 'Account name must be less than 50 characters',
  }),
  description: z.string().max(500, {
    message: 'Description must be less than 500 characters',
  }).optional(),
  vault_master_id: z.coerce.number().min(1, {
    message: 'Vault Master ID is required',
  }),
  currency_code: z.string().min(1, {
    message: 'Currency is required',
  }),
  account_number: z.string().optional(),
  is_active: z.boolean().default(true),
  balance: z.coerce.number().min(0, {
    message: 'Balance must be a positive number',
  }).default(0),
  daily_withdrawal_limit: z.coerce.number().min(0, {
    message: 'Withdrawal limit must be a positive number',
  }).optional(),
});

/**
 * The list of available currencies
 */
const availableCurrencies = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'BTC', name: 'Bitcoin' },
  { code: 'ETH', name: 'Ethereum' },
  { code: 'USDT', name: 'Tether' },
  { code: 'USDC', name: 'USD Coin' },
];

/**
 * Vault Account form component
 */
export function VaultAccountForm({ initialData, isEditMode = false, masterId }: VaultAccountFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [success, setSuccess] = React.useState<string | undefined>(undefined);
  
  // Get vault master details
  const { data: vaultMaster, isLoading: isLoadingMaster } = useVaultMaster(masterId);
  
  // Use the appropriate mutation hook
  const createAccount = useCreateVaultAccount();
  const updateAccount = initialData ? useUpdateVaultAccount(initialData.id, masterId) : null;
  
  // Create form with React Hook Form and Zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      description: initialData.description || '',
      vault_master_id: initialData.vault_master_id,
      currency_code: initialData.currency_code,
      account_number: initialData.account_number || '',
      is_active: initialData.is_active,
      balance: initialData.balance,
      daily_withdrawal_limit: initialData.daily_withdrawal_limit || 0,
    } : {
      name: '',
      description: '',
      vault_master_id: masterId,
      currency_code: 'USD',
      account_number: '',
      is_active: true,
      balance: 0,
      daily_withdrawal_limit: 0,
    },
  });
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError(undefined);
    setSuccess(undefined);
    
    try {
      if (isEditMode && initialData) {
        // Update existing account
        await updateAccount?.mutateAsync(values as UpdateVaultAccountInput);
        setSuccess("Account updated successfully!");
        
        // Redirect after a brief delay to show success message
        setTimeout(() => {
          router.push(`/dashboard/vaults/${masterId}/accounts/${initialData.id}`);
        }, 1500);
      } else {
        // Create new account
        const newAccount = await createAccount.mutateAsync(values as CreateVaultAccountInput);
        setSuccess("Account created successfully!");
        
        // Redirect after a brief delay to show success message
        setTimeout(() => {
          router.push(`/dashboard/vaults/${masterId}/accounts/${newAccount.id}`);
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    }
  };
  
  if (isLoadingMaster) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Vault Details...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditMode ? "Edit Account" : "Create New Account"}
          {vaultMaster && ` for ${vaultMaster.name}`}
        </CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter account name" {...field} />
                  </FormControl>
                  <FormDescription>
                    Give this account a descriptive name
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter account description" 
                      className="resize-none min-h-[100px]" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Describe the purpose of this account
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="currency_code"
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
                        {availableCurrencies.map(currency => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The currency this account will hold
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="account_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter account number" 
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Balance</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        disabled={isEditMode} // Cannot change balance directly in edit mode
                      />
                    </FormControl>
                    <FormDescription>
                      {isEditMode 
                        ? "Balance can only be modified via transactions" 
                        : "The initial balance for this account"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="daily_withdrawal_limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Withdrawal Limit (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum daily withdrawal amount (0 for no limit)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>
                      Enable or disable this account
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="vault_master_id"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
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
              disabled={createAccount.isPending || (updateAccount?.isPending ?? false)}
              className={cn(
                (createAccount.isPending || (updateAccount?.isPending ?? false)) && "opacity-50 cursor-not-allowed"
              )}
            >
              {createAccount.isPending || (updateAccount?.isPending ?? false)
                ? "Saving..."
                : isEditMode ? "Update Account" : "Create Account"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
