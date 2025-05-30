'use client';

/**
 * Wallet Form Dialog Component
 * Dialog for adding or editing wallet information
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Form validation schema
const walletFormSchema = z.object({
  name: z.string().min(1, 'Wallet name is required').max(50, 'Wallet name cannot exceed 50 characters'),
  address: z.string().min(1, 'Wallet address is required'),
  network: z.string().min(1, 'Network is required'),
  exchange: z.string().optional(),
  balance: z.coerce.number().min(0, 'Balance must be a positive number'),
  currency: z.string().min(1, 'Currency is required'),
});

type WalletFormValues = z.infer<typeof walletFormSchema>;

interface WalletFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: WalletFormValues) => void;
  initialData?: Partial<WalletFormValues>;
}

export default function WalletFormDialog({
  open,
  onClose,
  onSubmit,
  initialData
}: WalletFormDialogProps) {
  // Form setup
  const form = useForm<WalletFormValues>({
    resolver: zodResolver(walletFormSchema),
    defaultValues: initialData || {
      name: '',
      address: '',
      network: '',
      exchange: '',
      balance: 0,
      currency: 'USD',
    },
  });

  // Network options
  const networkOptions = [
    { value: 'Bitcoin', label: 'Bitcoin' },
    { value: 'Ethereum', label: 'Ethereum' },
    { value: 'Solana', label: 'Solana' },
    { value: 'Arbitrum', label: 'Arbitrum' },
    { value: 'Avalanche', label: 'Avalanche' },
    { value: 'Polygon', label: 'Polygon' },
    { value: 'BNB Smart Chain', label: 'BNB Smart Chain' },
    { value: 'Tron', label: 'Tron' },
    { value: 'Optimism', label: 'Optimism' },
    { value: 'Cardano', label: 'Cardano' },
  ];

  // Exchange options
  const exchangeOptions = [
    { value: '', label: 'None (Self-custody)' },
    { value: 'Binance', label: 'Binance' },
    { value: 'Coinbase', label: 'Coinbase' },
    { value: 'Kraken', label: 'Kraken' },
    { value: 'Bitfinex', label: 'Bitfinex' },
    { value: 'OKX', label: 'OKX' },
    { value: 'Kucoin', label: 'Kucoin' },
    { value: 'Bybit', label: 'Bybit' },
    { value: 'FTX', label: 'FTX' },
    { value: 'Gemini', label: 'Gemini' },
  ];

  // Currency options
  const currencyOptions = [
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
    { value: 'GBP', label: 'GBP' },
    { value: 'BTC', label: 'Bitcoin (BTC)' },
    { value: 'ETH', label: 'Ethereum (ETH)' },
    { value: 'SOL', label: 'Solana (SOL)' },
    { value: 'USDT', label: 'Tether (USDT)' },
    { value: 'USDC', label: 'USD Coin (USDC)' },
  ];

  // Submit handler
  const handleSubmit = (data: WalletFormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Wallet' : 'Add New Wallet'}</DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update the details for this wallet.'
              : 'Enter the details for the new wallet.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wallet Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Main Trading Wallet" {...field} />
                    </FormControl>
                    <FormDescription>
                      A descriptive name to identify this wallet
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wallet Address</FormLabel>
                    <FormControl>
                      <Input placeholder="0x..." {...field} />
                    </FormControl>
                    <FormDescription>
                      The public address of this wallet
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="network"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Network</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Network" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {networkOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Blockchain network
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="exchange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="None (Self-custody)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {exchangeOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Leave empty for self-custody
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Balance</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.000001" min="0" {...field} />
                      </FormControl>
                      <FormDescription>
                        Current balance amount
                      </FormDescription>
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
                            <SelectValue placeholder="Select Currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencyOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Currency of the balance
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {initialData ? 'Update Wallet' : 'Add Wallet'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
