'use client';

import * as React from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { AlertCircle, ArrowUpRight, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Textarea } from '@/components/ui/textarea';
import { VaultCurrency, VaultBalance, createWithdrawal, getVaultBalances, getVaultCurrencies } from '@/services/vault-service';

export interface WithdrawalFormProps {
  userId: string;
  farmId?: string;
  onComplete?: () => void;
  onCancel?: () => void;
  className?: string;
}

const withdrawalSchema = z.object({
  currencyId: z.string({
    required_error: "Please select a currency",
  }),
  amount: z.coerce.number({
    required_error: "Please enter an amount",
    invalid_type_error: "Amount must be a number",
  })
  .positive("Amount must be positive")
  .refine((val) => val > 0, {
    message: "Amount must be greater than 0",
  }),
  address: z.string({
    required_error: "Please enter a destination address",
  })
  .min(10, "Address appears to be too short"),
  description: z.string().optional(),
});

export function WithdrawalForm({ 
  userId, 
  farmId,
  onComplete,
  onCancel,
  className
}: WithdrawalFormProps) {
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [currencies, setCurrencies] = React.useState<VaultCurrency[]>([]);
  const [balances, setBalances] = React.useState<VaultBalance[]>([]);
  const [selectedCurrency, setSelectedCurrency] = React.useState<VaultCurrency | null>(null);
  const [selectedBalance, setSelectedBalance] = React.useState<VaultBalance | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof withdrawalSchema>>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      currencyId: "",
      amount: 0,
      address: "",
      description: "",
    },
  });

  React.useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [currenciesData, balancesData] = await Promise.all([
          getVaultCurrencies(),
          getVaultBalances(userId)
        ]);
        
        // Filter currencies to only show those with balances
        const currenciesWithBalance = currenciesData.filter(
          currency => balancesData.some(
            balance => balance.currency_id === currency.id && balance.available > 0
          )
        );
        
        setCurrencies(currenciesWithBalance);
        setBalances(balancesData);
      } catch (error) {
        console.error('Error loading currencies and balances:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load currencies and balances"
        });
      } finally {
        setLoading(false);
      }
    }
    
    if (userId) {
      loadData();
    }
  }, [userId, toast]);

  // Watch for currency changes to update selected currency and balance
  const watchCurrencyId = form.watch("currencyId");
  
  React.useEffect(() => {
    if (watchCurrencyId) {
      const currency = currencies.find(c => c.id === watchCurrencyId) || null;
      const balance = balances.find(b => b.currency_id === watchCurrencyId) || null;
      
      setSelectedCurrency(currency);
      setSelectedBalance(balance);
    } else {
      setSelectedCurrency(null);
      setSelectedBalance(null);
    }
  }, [watchCurrencyId, currencies, balances]);

  async function onSubmit(data: z.infer<typeof withdrawalSchema>) {
    if (!userId) return;
    
    setSubmitting(true);
    try {
      const result = await createWithdrawal(
        userId,
        data.currencyId,
        data.amount,
        data.address,
        data.description,
        farmId
      );
      
      if (result.success) {
        toast({
          title: "Withdrawal Request Submitted",
          description: "Your withdrawal request has been received and is being processed.",
        });
        
        if (onComplete) {
          onComplete();
        }
      } else {
        toast({
          variant: "destructive",
          title: "Withdrawal Failed",
          description: result.error || "An error occurred while processing your withdrawal request.",
        });
      }
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Withdraw Funds</CardTitle>
        <CardDescription>
          Submit a withdrawal request to move funds from your trading account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="currencyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select
                    disabled={loading || currencies.length === 0}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currencies.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No currencies available
                        </SelectItem>
                      ) : (
                        currencies.map((currency) => (
                          <SelectItem key={currency.id} value={currency.id}>
                            <div className="flex items-center">
                              {currency.icon_url && (
                                <img
                                  src={currency.icon_url}
                                  alt={currency.code}
                                  className="w-5 h-5 mr-2"
                                />
                              )}
                              <span>{currency.name} ({currency.code})</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {selectedBalance && (
                      <span>
                        Available balance: <strong>
                          {selectedCurrency?.symbol}{selectedBalance.available.toFixed(selectedCurrency?.decimals || 2)}
                        </strong>
                      </span>
                    )}
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
                    <div className="relative">
                      {selectedCurrency && (
                        <div className="absolute left-3 inset-y-0 flex items-center text-muted-foreground">
                          {selectedCurrency.symbol}
                        </div>
                      )}
                      <Input
                        {...field}
                        type="number"
                        step="any"
                        disabled={!selectedCurrency}
                        className={selectedCurrency ? "pl-6" : ""}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    {selectedBalance && (
                      <div className="flex justify-between">
                        <span>Minimum withdrawal: {selectedCurrency?.symbol}0.001</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs text-blue-500"
                          onClick={() => form.setValue('amount', selectedBalance.available)}
                        >
                          Use max
                        </Button>
                      </div>
                    )}
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
                  <FormLabel>Withdrawal Address</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!selectedCurrency} />
                  </FormControl>
                  <FormDescription>
                    Enter the destination address for your {selectedCurrency?.name}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {selectedCurrency?.type === 'CRYPTO' && (
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Please ensure the address is correct for the {selectedCurrency.code} network. 
                  Withdrawals to incorrect addresses cannot be recovered.
                </AlertDescription>
              </Alert>
            )}
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Add notes for your reference"
                      disabled={!selectedCurrency}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          onClick={form.handleSubmit(onSubmit)}
          disabled={submitting || !selectedCurrency}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing
            </>
          ) : (
            <>
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Submit Withdrawal
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
