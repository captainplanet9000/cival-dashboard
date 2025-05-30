// src/components/vault/TransferForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect } from 'react';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

import { type Wallet, type WalletTransaction, transferBetweenWallets } from '@/lib/clients/apiClient';
import { type TransferPayload } from '@/lib/types/vault';


const transferFormSchema = z.object({
  source_wallet_id: z.string().uuid({ message: "Please select a valid source wallet." }),
  destination_wallet_id: z.string().uuid({ message: "Please select a valid destination wallet." }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  description: z.string().max(200, { message: "Description can be at most 200 characters." }).optional(),
}).refine(data => data.source_wallet_id !== data.destination_wallet_id, {
  message: "Source and destination wallets cannot be the same.",
  path: ["destination_wallet_id"], // Or source_wallet_id, or a general form error
});
// Note: Currency match validation is better handled dynamically in the UI or server-side.
// Adding it to Zod schema directly would require fetching wallet details based on ID,
// which is complex for a schema. UI will filter destination wallets by source currency.

type TransferFormValues = z.infer<typeof transferFormSchema>;

interface TransferFormProps {
  userWallets: Wallet[];
  onSuccess?: (createdTransaction: WalletTransaction) => void;
}

export function TransferForm({ userWallets, onSuccess }: TransferFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSourceWalletCurrency, setSelectedSourceWalletCurrency] = useState<string | null>(null);

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      source_wallet_id: userWallets?.[0]?.wallet_id || '',
      destination_wallet_id: '',
      amount: 0,
      description: '',
    },
  });

  const sourceWalletId = form.watch('source_wallet_id');

  useEffect(() => {
    const selectedWallet = userWallets.find(w => w.wallet_id === sourceWalletId);
    setSelectedSourceWalletCurrency(selectedWallet?.currency || null);
    // Reset destination wallet if source changes and currencies might mismatch
    // or if previously selected destination is no longer valid.
    form.setValue('destination_wallet_id', ''); 
  }, [sourceWalletId, userWallets, form]);


  async function onSubmit(values: TransferFormValues) {
    setIsSubmitting(true);

    const sourceWallet = userWallets.find(w => w.wallet_id === values.source_wallet_id);
    const destinationWallet = userWallets.find(w => w.wallet_id === values.destination_wallet_id);

    if (sourceWallet && destinationWallet && sourceWallet.currency !== destinationWallet.currency) {
        toast({
            title: "Transfer Failed",
            description: "Currency mismatch between source and destination wallets.",
            variant: "destructive",
        });
        setIsSubmitting(false);
        return;
    }


    try {
      const payload: TransferPayload = {
        source_wallet_id: values.source_wallet_id,
        destination_wallet_id: values.destination_wallet_id,
        amount: values.amount,
        description: values.description || undefined,
      };
      const createdTransaction = await transferBetweenWallets(payload);
      
      toast({
        title: "Transfer Successful",
        description: `Successfully transferred ${values.amount} from wallet ...${values.source_wallet_id.slice(-4)} to ...${values.destination_wallet_id.slice(-4)}.`,
        variant: "default", 
      });

      if (onSuccess) {
        onSuccess(createdTransaction);
      }
      form.reset({ 
        source_wallet_id: userWallets?.[0]?.wallet_id || '', 
        destination_wallet_id: '',
        amount: 0, 
        description: '' 
      });
      setSelectedSourceWalletCurrency(userWallets?.[0]?.currency || null);


    } catch (error: any) {
      console.error("Transfer failed:", error);
      toast({
        title: "Transfer Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!userWallets || userWallets.length < 2) {
    return (
      <div className="p-4 border rounded-lg text-center">
        <p className="text-muted-foreground">
          You need at least two wallets to make a transfer.
        </p>
      </div>
    );
  }
  
  const availableDestinationWallets = selectedSourceWalletCurrency 
    ? userWallets.filter(w => w.currency === selectedSourceWalletCurrency && w.wallet_id !== sourceWalletId)
    : [];


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="source_wallet_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source Wallet</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a source wallet" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {userWallets.map((wallet) => (
                    <SelectItem key={wallet.wallet_id} value={wallet.wallet_id}>
                      Wallet ...{wallet.wallet_id.slice(-4)} ({wallet.currency}) - Bal: {Number(wallet.balance).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="destination_wallet_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destination Wallet</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value} // Ensure value is controlled
                disabled={!selectedSourceWalletCurrency || availableDestinationWallets.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={!selectedSourceWalletCurrency ? "Select source wallet first" : "Select a destination wallet"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableDestinationWallets.map((wallet) => (
                    <SelectItem key={wallet.wallet_id} value={wallet.wallet_id}>
                      Wallet ...{wallet.wallet_id.slice(-4)} ({wallet.currency}) - Bal: {Number(wallet.balance).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedSourceWalletCurrency && <FormDescription>Select a source wallet to see compatible destination wallets.</FormDescription>}
              {selectedSourceWalletCurrency && availableDestinationWallets.length === 0 && <FormDescription>No other wallets with currency {selectedSourceWalletCurrency} available.</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} step="0.01" />
              </FormControl>
              <FormDescription>
                The amount to transfer.
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
                  placeholder="E.g., Transfer to savings"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A brief note about this transfer.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting || !form.formState.isValid} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Transfer Funds"
          )}
        </Button>
      </form>
    </Form>
  );
}
