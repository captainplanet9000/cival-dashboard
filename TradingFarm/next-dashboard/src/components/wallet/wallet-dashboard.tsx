'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WalletService, WalletConfig } from '@/services/wallet-service';
import WalletCard from './wallet-card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { createBrowserClient } from '@/utils/supabase/client';

interface WalletDashboardProps {
  farmId: string;
  userId: string;
}

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Wallet name must be at least 2 characters.",
  }),
  address: z.string().min(10, {
    message: "Please enter a valid wallet address.",
  }),
  network: z.string().min(2, {
    message: "Please select a network.",
  }),
  currency: z.string().min(1, {
    message: "Currency is required.",
  }),
});

export default function WalletDashboard({ farmId, userId }: WalletDashboardProps) {
  const [wallets, setWallets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      network: "Ethereum",
      currency: "ETH",
    },
  });

  const loadWallets = async () => {
    setIsLoading(true);
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('farm_id', farmId);
      
      if (error) throw error;
      setWallets(data || []);
    } catch (error) {
      console.error('Error loading wallets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();
  }, [farmId]);

  const handleViewTransactions = (walletId: string) => {
    router.push(`/dashboard/${farmId}/wallets/${walletId}/transactions`);
  };

  const handleDeposit = (walletId: string) => {
    router.push(`/dashboard/${farmId}/wallets/${walletId}/deposit`);
  };

  const handleWithdraw = (walletId: string) => {
    router.push(`/dashboard/${farmId}/wallets/${walletId}/withdraw`);
  };

  const handleRefresh = async (walletId: string) => {
    try {
      // In a real implementation, you'd call your service to refresh wallet data
      console.log('Refreshing wallet', walletId);
      // For demo, just reload the wallets
      await loadWallets();
      return true;
    } catch (error) {
      console.error('Error refreshing wallet:', error);
      return false;
    }
  };

  const handleSettings = (walletId: string) => {
    router.push(`/dashboard/${farmId}/wallets/${walletId}/settings`);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const walletConfig: WalletConfig = {
        farmId,
        ownerId: userId,
        name: values.name,
        address: values.address,
        network: values.network,
        currency: values.currency,
        balance: 0,
      };
      
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('wallets')
        .insert({
          farm_id: farmId,
          owner_id: userId,
          name: values.name,
          address: values.address,
          network: values.network,
          currency: values.currency,
          balance: 0,
          status: 'active'
        })
        .select();
      
      if (error) throw error;
      
      await loadWallets();
      setDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error creating wallet:', error);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Wallet Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Wallet
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Wallet</DialogTitle>
              <DialogDescription>
                Enter your wallet details below to add it to your farm.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Trading Wallet" {...field} />
                      </FormControl>
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
                        <Input 
                          placeholder="0x..." 
                          {...field} 
                          className="font-mono text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="network"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Network</FormLabel>
                        <FormControl>
                          <Input placeholder="Ethereum" {...field} />
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
                          <Input placeholder="ETH" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit">Add Wallet</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No wallets found</h3>
          <p className="text-gray-500 mb-4">
            Add your first wallet to start managing your assets.
          </p>
          <Button 
            onClick={() => setDialogOpen(true)}
            variant="outline"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Wallet
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallets.map((wallet) => (
            <WalletCard
              key={wallet.id}
              id={wallet.id}
              name={wallet.name}
              address={wallet.address}
              network={wallet.network}
              balance={wallet.balance}
              currency={wallet.currency}
              status={wallet.status}
              lastUpdated={wallet.last_updated}
              onViewTransactions={handleViewTransactions}
              onDeposit={handleDeposit}
              onWithdraw={handleWithdraw}
              onRefresh={handleRefresh}
              onSettings={handleSettings}
            />
          ))}
        </div>
      )}
    </div>
  );
}
