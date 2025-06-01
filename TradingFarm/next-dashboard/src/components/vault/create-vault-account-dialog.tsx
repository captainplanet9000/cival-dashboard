'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { VaultMaster, VaultAccount } from '@/types/vault-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

// Form schema for vault account creation
const formSchema = z.object({
  vault_id: z.number(),
  name: z.string().min(1, {
    message: 'Name is required.',
  }),
  account_type: z.enum(['trading', 'operational', 'reserve', 'fee', 'investment', 'custody'], {
    required_error: 'Please select an account type.',
  }),
  currency: z.string().min(1, {
    message: 'Currency is required.',
  }),
  exchange: z.string().optional(),
  address: z.string().optional(),
  network: z.string().optional(),
  initial_balance: z.number().min(0).default(0),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateVaultAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaultMaster: VaultMaster;
  onSuccess: (account: VaultAccount) => void;
}

export function CreateVaultAccountDialog({
  open,
  onOpenChange,
  vaultMaster,
  onSuccess,
}: CreateVaultAccountDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [farms, setFarms] = useState<any[]>([]);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vault_id: vaultMaster.id,
      name: '',
      account_type: 'trading',
      currency: 'USD',
      exchange: '',
      address: '',
      network: '',
      initial_balance: 0,
    },
  });

  // Load farms
  useEffect(() => {
    const loadFarms = async () => {
      try {
        const response = await fetch('/api/farms');
        if (response.ok) {
          const data = await response.json();
          setFarms(data.data || []);
        }
      } catch (error) {
        console.error('Error loading farms:', error);
      }
    };

    loadFarms();
  }, []);

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/vault/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create vault account');
      }

      const result = await response.json();
      onSuccess(result.data);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating vault account:', error);
      if (error instanceof Error) {
        form.setError('root', {
          message: error.message,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Common currencies
  const commonCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
  const cryptoCurrencies = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'SOL', 'ADA', 'DOGE'];
  const currencies = [...commonCurrencies, ...cryptoCurrencies];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Account</DialogTitle>
          <DialogDescription>
            Create a new account in the {vaultMaster.name} vault.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Trading Account" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="account_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
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
                        <SelectItem value="trading">Trading</SelectItem>
                        <SelectItem value="operational">Operational</SelectItem>
                        <SelectItem value="reserve">Reserve</SelectItem>
                        <SelectItem value="fee">Fee</SelectItem>
                        <SelectItem value="investment">Investment</SelectItem>
                        <SelectItem value="custody">Custody</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="custom">Custom...</SelectItem>
                        {currencies.map(currency => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch('currency') === 'custom' && (
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Currency</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter currency code" {...field} value={field.value === 'custom' ? '' : field.value} />
                    </FormControl>
                    <FormDescription>
                      Enter the currency code (e.g., BTC, ETH, USDT)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="exchange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Binance" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>
                      For exchange accounts
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="network"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Network (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ethereum" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>
                      For blockchain accounts
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address/Account ID (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0x..."
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Wallet address or exchange account ID
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initial_balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Balance</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      value={field.value}
                    />
                  </FormControl>
                  <FormDescription>
                    Initial balance will create a deposit transaction
                  </FormDescription>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
