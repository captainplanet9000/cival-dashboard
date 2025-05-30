// src/components/vault/WithdrawalForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';

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

import { type Wallet, type WalletTransaction, withdrawFromWallet } from '@/lib/clients/apiClient';
import { type WalletTransactionPayload } from '@/lib/types/vault';


const withdrawalFormSchema = z.object({
  wallet_id: z.string().uuid({ message: "Please select a valid wallet." }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  description: z.string().max(200, { message: "Description can be at most 200 characters." }).optional(),
});

type WithdrawalFormValues = z.infer<typeof withdrawalFormSchema>;

interface WithdrawalFormProps {
  userWallets: Wallet[];
  onSuccess?: (createdTransaction: WalletTransaction) => void;
}

export function WithdrawalForm({ userWallets, onSuccess }: WithdrawalFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalFormSchema),
    defaultValues: {
      wallet_id: userWallets?.[0]?.wallet_id || '',
      amount: 0,
      description: '',
    },
  });

  async function onSubmit(values: WithdrawalFormValues) {
    setIsSubmitting(true);
    try {
      const payload: WalletTransactionPayload = {
        wallet_id: values.wallet_id,
        amount: values.amount,
        description: values.description || undefined,
      };
      const createdTransaction = await withdrawFromWallet(payload);
      
      toast({
        title: "Withdrawal Successful",
        description: `Successfully withdrew ${values.amount} from wallet ${values.wallet_id.substring(0,8)}...`,
        variant: "default", 
      });

      if (onSuccess) {
        onSuccess(createdTransaction);
      }
      form.reset({ 
        wallet_id: userWallets?.[0]?.wallet_id || '', 
        amount: 0, 
        description: '' 
      });

    } catch (error: any) {
      console.error("Withdrawal failed:", error);
      toast({
        title: "Withdrawal Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!userWallets || userWallets.length === 0) {
    return (
      <div className="p-4 border rounded-lg text-center">
        <p className="text-muted-foreground">
          No wallets available for withdrawal.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="wallet_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source Wallet</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a wallet" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {userWallets.map((wallet) => (
                    <SelectItem key={wallet.wallet_id} value={wallet.wallet_id}>
                      Wallet ending in ...{wallet.wallet_id.slice(-4)} ({wallet.currency}) - Bal: {Number(wallet.balance).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                The wallet to withdraw funds from.
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
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} step="0.01" />
              </FormControl>
              <FormDescription>
                The amount to withdraw.
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
                  placeholder="E.g., Weekly allowance withdrawal"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A brief note about this withdrawal.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Make Withdrawal"
          )}
        </Button>
      </form>
    </Form>
  );
}
