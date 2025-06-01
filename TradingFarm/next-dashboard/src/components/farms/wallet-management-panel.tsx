/**
 * Wallet Management Panel
 * Component for managing multiple wallets for a farm
 */
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PieChart } from '@/components/charts';
import { Plus, Trash, RefreshCw, AlertTriangle, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClientClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';

// Wallet form schema
const walletFormSchema = z.object({
  walletName: z.string().min(2, {
    message: "Wallet name must be at least 2 characters.",
  }),
  exchangeId: z.string().min(1, {
    message: "Please select an exchange."
  }),
  apiKey: z.string().min(5, {
    message: "API key is required."
  }),
  apiSecret: z.string().min(5, {
    message: "API secret is required."
  }),
  apiPassphrase: z.string().optional(),
  isTestnet: z.boolean().default(false),
  alertThreshold: z.coerce.number().optional(),
  alertEnabled: z.boolean().default(false)
});

type WalletFormValues = z.infer<typeof walletFormSchema>;

interface Wallet {
  id: string;
  wallet_name: string;
  exchange_id: string;
  balance: Record<string, number>;
  last_balance_update: string;
  alert_threshold: number | null;
  alert_enabled: boolean;
  status: string;
}

interface WalletManagementPanelProps {
  farmId: string;
}

export function WalletManagementPanel({ farmId }: WalletManagementPanelProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<Record<string, boolean>>({});
  const [openDialog, setOpenDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const supabase = createClientClient();
  
  // Form for adding/editing wallets
  const form = useForm<WalletFormValues>({
    resolver: zodResolver(walletFormSchema),
    defaultValues: {
      walletName: "",
      exchangeId: "",
      apiKey: "",
      apiSecret: "",
      apiPassphrase: "",
      isTestnet: false,
      alertEnabled: false
    },
  });
  
  // Load wallets on component mount
  useEffect(() => {
    loadWallets();
  }, [farmId]);
  
  // Load wallets from database
  const loadWallets = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('farm_wallets')
        .select('*')
        .eq('farm_id', farmId);
        
      if (error) {
        throw error;
      }
      
      setWallets(data || []);
      
      // Select first wallet by default if available
      if (data?.length > 0 && !selectedWallet) {
        setSelectedWallet(data[0].id);
      }
    } catch (error) {
      console.error('Error loading wallets:', error);
      toast({
        title: "Error",
        description: "Failed to load wallet data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Add a new wallet
  const addWallet = async (values: WalletFormValues) => {
    try {
      setIsSubmitting(true);
      
      const { data, error } = await supabase
        .from('farm_wallets')
        .insert({
          farm_id: farmId,
          wallet_name: values.walletName,
          exchange_id: values.exchangeId,
          api_key: values.apiKey,
          api_secret: values.apiSecret,
          api_passphrase: values.apiPassphrase,
          is_testnet: values.isTestnet,
          alert_threshold: values.alertThreshold,
          alert_enabled: values.alertEnabled,
          status: 'active'
        })
        .select('id')
        .single();
        
      if (error) {
        throw error;
      }
      
      // Call API to trigger balance update
      await fetch(`/api/farms/${farmId}/wallets/${data.id}/balance-update`, {
        method: 'POST'
      });
      
      toast({
        title: "Success",
        description: "Wallet added successfully"
      });
      
      // Reset form and close dialog
      form.reset();
      setOpenDialog(false);
      
      // Reload wallets
      await loadWallets();
    } catch (error) {
      console.error('Error adding wallet:', error);
      toast({
        title: "Error",
        description: "Failed to add wallet",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Delete a wallet
  const deleteWallet = async (walletId: string) => {
    if (!confirm("Are you sure you want to delete this wallet? This action cannot be undone.")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('farm_wallets')
        .delete()
        .eq('id', walletId);
        
      if (error) {
        throw error;
      }
      
      toast({
        title: "Success",
        description: "Wallet deleted successfully"
      });
      
      // Reload wallets
      await loadWallets();
      
      // Reset selected wallet if it was deleted
      if (selectedWallet === walletId) {
        setSelectedWallet(null);
      }
    } catch (error) {
      console.error('Error deleting wallet:', error);
      toast({
        title: "Error",
        description: "Failed to delete wallet",
        variant: "destructive"
      });
    }
  };
  
  // Refresh wallet balance
  const refreshWalletBalance = async (walletId: string) => {
    try {
      setIsRefreshing({ ...isRefreshing, [walletId]: true });
      
      // Call API to update balance
      const response = await fetch(`/api/farms/${farmId}/wallets/${walletId}/balance-update`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to update balance');
      }
      
      toast({
        title: "Success",
        description: "Balance update has been queued"
      });
      
      // Reload wallets after a short delay
      setTimeout(() => loadWallets(), 3000);
    } catch (error) {
      console.error('Error refreshing balance:', error);
      toast({
        title: "Error",
        description: "Failed to update wallet balance",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing({ ...isRefreshing, [walletId]: false });
    }
  };
  
  // Format wallet balance for display
  const formatBalance = (wallet: Wallet) => {
    if (!wallet.balance || Object.keys(wallet.balance).length === 0) {
      return "No balance data";
    }
    
    const balances = Object.entries(wallet.balance);
    
    if (balances.length <= 2) {
      return balances.map(([currency, amount]) => (
        `${amount.toFixed(6)} ${currency}`
      )).join(", ");
    } else {
      return `${balances.length} currencies`;
    }
  };
  
  // Generate chart data for wallet balance
  const getBalanceChartData = (wallet: Wallet) => {
    if (!wallet.balance || Object.keys(wallet.balance).length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          data: [1],
          backgroundColor: ['#e2e8f0']
        }]
      };
    }
    
    const balances = Object.entries(wallet.balance).sort((a, b) => b[1] - a[1]);
    
    // Limit to top 5 for chart readability
    const topBalances = balances.slice(0, 5);
    const otherBalances = balances.slice(5);
    
    let chartData: {
      labels: string[];
      datasets: { data: number[]; backgroundColor: string[] }[]
    };
    
    if (otherBalances.length > 0) {
      const otherTotal = otherBalances.reduce((sum, [_, amount]) => sum + amount, 0);
      
      chartData = {
        labels: [...topBalances.map(([currency]) => currency), 'Others'],
        datasets: [{
          data: [...topBalances.map(([_, amount]) => amount), otherTotal],
          backgroundColor: [
            '#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#94a3b8'
          ]
        }]
      };
    } else {
      chartData = {
        labels: topBalances.map(([currency]) => currency),
        datasets: [{
          data: topBalances.map(([_, amount]) => amount),
          backgroundColor: [
            '#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ef4444'
          ]
        }]
      };
    }
    
    return chartData;
  };
  
  // Wallet list component
  const WalletList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Your Wallets</h3>
        
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Wallet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Wallet</DialogTitle>
              <DialogDescription>
                Connect a new wallet from an exchange to this farm.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(addWallet)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="walletName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Bybit Wallet" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="exchangeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange</FormLabel>
                      <FormControl>
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          {...field}
                        >
                          <option value="">Select Exchange</option>
                          <option value="bybit">Bybit</option>
                          <option value="coinbase">Coinbase</option>
                          <option value="binance">Binance</option>
                          <option value="kraken">Kraken</option>
                          <option value="kucoin">KuCoin</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input placeholder="Your exchange API key" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="apiSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Secret</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Your exchange API secret" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="apiPassphrase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Passphrase (if required)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Required for some exchanges" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Only required for certain exchanges like KuCoin
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isTestnet"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Testnet</FormLabel>
                        <FormDescription>
                          Use the exchange testnet instead of mainnet
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
                
                <Separator />
                
                <FormField
                  control={form.control}
                  name="alertEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Balance Alerts</FormLabel>
                        <FormDescription>
                          Receive alerts when balance drops below threshold
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
                
                {form.watch("alertEnabled") && (
                  <FormField
                    control={form.control}
                    name="alertThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alert Threshold (USD)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="100" 
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Alert when total wallet value falls below this amount
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Adding..." : "Add Wallet"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p>Loading wallets...</p>
        </div>
      ) : wallets.length === 0 ? (
        <div className="border rounded-md p-6 text-center">
          <h3 className="text-lg font-medium">No wallets found</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Add your first wallet to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {wallets.map((wallet) => (
            <Card 
              key={wallet.id} 
              className={`cursor-pointer hover:border-primary transition-colors ${
                selectedWallet === wallet.id ? 'border-primary' : ''
              }`}
              onClick={() => setSelectedWallet(wallet.id)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold">{wallet.wallet_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {wallet.exchange_id.charAt(0).toUpperCase() + wallet.exchange_id.slice(1)}
                      {wallet.is_testnet && <span className="ml-2 text-yellow-500">(Testnet)</span>}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation(); 
                        refreshWalletBalance(wallet.id);
                      }}
                      disabled={isRefreshing[wallet.id]}
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing[wallet.id] ? 'animate-spin' : ''}`} />
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteWallet(wallet.id);
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-sm">
                    {formatBalance(wallet)}
                  </span>
                  
                  <span className="text-xs text-muted-foreground">
                    {wallet.last_balance_update 
                      ? `Updated ${formatDistanceToNow(new Date(wallet.last_balance_update), { addSuffix: true })}` 
                      : 'No balance data'}
                  </span>
                </div>
                
                {wallet.alert_enabled && (
                  <div className="mt-2">
                    <Badge variant="outline" className="flex items-center gap-1 text-xs bg-yellow-50">
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      Alert: ${wallet.alert_threshold?.toFixed(2) || 0}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
  
  // Wallet detail component
  const WalletDetail = () => {
    if (!selectedWallet) {
      return (
        <div className="border rounded-md p-6 text-center">
          <h3 className="text-lg font-medium">No wallet selected</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Select a wallet from the list to view details.
          </p>
        </div>
      );
    }
    
    const wallet = wallets.find(w => w.id === selectedWallet);
    
    if (!wallet) {
      return null;
    }
    
    return (
      <Tabs defaultValue="balance">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="balance">Balance</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="balance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Wallet Balance</CardTitle>
              <CardDescription>
                Current balance distribution for {wallet.wallet_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!wallet.balance || Object.keys(wallet.balance).length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">No balance data available</p>
                    <Button 
                      className="mt-4" 
                      variant="outline" 
                      onClick={() => refreshWalletBalance(wallet.id)}
                      disabled={isRefreshing[wallet.id]}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing[wallet.id] ? 'animate-spin' : ''}`} />
                      Update Balance
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-60">
                    <PieChart data={getBalanceChartData(wallet)} />
                  </div>
                  
                  <div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Currency</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(wallet.balance)
                          .sort((a, b) => b[1] - a[1])
                          .map(([currency, amount]) => (
                            <TableRow key={currency}>
                              <TableCell>{currency}</TableCell>
                              <TableCell className="text-right">{amount.toFixed(8)}</TableCell>
                            </TableRow>
                          ))
                        }
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <span className="text-xs text-muted-foreground">
                {wallet.last_balance_update 
                  ? `Last updated: ${new Date(wallet.last_balance_update).toLocaleString()}` 
                  : 'No balance data'}
              </span>
              
              <Button 
                variant="outline" 
                onClick={() => refreshWalletBalance(wallet.id)}
                disabled={isRefreshing[wallet.id]}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing[wallet.id] ? 'animate-spin' : ''}`} />
                Update Balance
              </Button>
            </CardFooter>
          </Card>
          
          {wallet.alert_enabled && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Balance Alert Configured</AlertTitle>
              <AlertDescription>
                You will be notified when total wallet value falls below ${wallet.alert_threshold?.toFixed(2) || 0} USD.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                    Recent transactions for this wallet
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <iframe 
                src={`/dashboard/farms/${farmId}/wallets/${wallet.id}/transactions`} 
                className="w-full h-[500px] border-0"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Wallet Settings</CardTitle>
              <CardDescription>
                Configure settings for {wallet.wallet_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="wallet-name">Wallet Name</Label>
                <Input 
                  id="wallet-name"
                  value={wallet.wallet_name}
                  className="mt-1"
                  onChange={async (e) => {
                    try {
                      await supabase
                        .from('farm_wallets')
                        .update({ wallet_name: e.target.value })
                        .eq('id', wallet.id);
                      
                      loadWallets();
                    } catch (error) {
                      console.error('Error updating wallet name:', error);
                    }
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Balance Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts when balance drops below threshold
                  </p>
                </div>
                <Switch 
                  checked={wallet.alert_enabled}
                  onCheckedChange={async (checked) => {
                    try {
                      await supabase
                        .from('farm_wallets')
                        .update({ alert_enabled: checked })
                        .eq('id', wallet.id);
                      
                      loadWallets();
                    } catch (error) {
                      console.error('Error updating alert setting:', error);
                    }
                  }}
                />
              </div>
              
              {wallet.alert_enabled && (
                <div>
                  <Label htmlFor="alert-threshold">Alert Threshold (USD)</Label>
                  <Input 
                    id="alert-threshold"
                    type="number"
                    value={wallet.alert_threshold || ''}
                    className="mt-1"
                    onChange={async (e) => {
                      try {
                        await supabase
                          .from('farm_wallets')
                          .update({ alert_threshold: e.target.value })
                          .eq('id', wallet.id);
                        
                        loadWallets();
                      } catch (error) {
                        console.error('Error updating alert threshold:', error);
                      }
                    }}
                  />
                </div>
              )}
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Testnet Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use the exchange testnet instead of mainnet
                  </p>
                </div>
                <Switch 
                  checked={wallet.is_testnet}
                  onCheckedChange={async (checked) => {
                    try {
                      await supabase
                        .from('farm_wallets')
                        .update({ is_testnet: checked })
                        .eq('id', wallet.id);
                      
                      loadWallets();
                    } catch (error) {
                      console.error('Error updating testnet setting:', error);
                    }
                  }}
                />
              </div>
              
              <div className="mt-6">
                <Button variant="destructive" onClick={() => deleteWallet(wallet.id)}>
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Wallet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    );
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1">
        <WalletList />
      </div>
      <div className="md:col-span-2">
        <WalletDetail />
      </div>
    </div>
  );
}
