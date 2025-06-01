"use client";

import * as React from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Key, Loader2, Shield, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ExchangeCredential {
  id: number;
  exchange: string;
  is_active: boolean;
  last_used: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// List of supported exchanges
const SUPPORTED_EXCHANGES = [
  { value: 'binance', label: 'Binance' },
  { value: 'coinbase', label: 'Coinbase' },
  { value: 'kraken', label: 'Kraken' },
  { value: 'bybit', label: 'Bybit' },
  { value: 'okx', label: 'OKX' },
  { value: 'kucoin', label: 'KuCoin' },
];

export function ExchangeCredentialsManager() {
  const [credentials, setCredentials] = React.useState<ExchangeCredential[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [deleteCredentialId, setDeleteCredentialId] = React.useState<number | null>(null);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  // Form state for adding new credentials
  const [formData, setFormData] = React.useState({
    exchange: '',
    apiKey: '',
    apiSecret: '',
    passphrase: '',
  });

  // State for form submission
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Fetch credentials
  const fetchCredentials = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('manage_exchange_credentials', {
        p_action: 'list'
      });

      if (error) throw error;

      if (data && data.credentials) {
        setCredentials(data.credentials);
      } else {
        setCredentials([]);
      }
    } catch (err: any) {
      console.error('Error fetching credentials:', err);
      setError(err.message || 'Failed to load exchange credentials');
      toast({
        variant: 'destructive',
        title: 'Error loading credentials',
        description: err.message || 'Failed to load exchange credentials'
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  // Handle input change
  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  // Handle exchange selection
  const handleExchangeChange = (value: string) => {
    setFormData({ ...formData, exchange: value });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      // Basic validation
      if (!formData.exchange || !formData.apiKey || !formData.apiSecret) {
        throw new Error('Exchange, API key, and API secret are required');
      }

      // Create new credentials using RPC function
      const { data, error } = await supabase.rpc('manage_exchange_credentials', {
        p_action: 'create',
        p_exchange: formData.exchange,
        p_api_key: formData.apiKey,
        p_api_secret: formData.apiSecret,
        p_passphrase: formData.passphrase || null,
        p_metadata: {
          added_from: 'dashboard',
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });

      if (error) throw error;

      toast({
        title: 'Exchange Connected',
        description: `Successfully connected to ${formData.exchange}`
      });

      // Reset form and close dialog
      setFormData({
        exchange: '',
        apiKey: '',
        apiSecret: '',
        passphrase: '',
      });
      setIsAddDialogOpen(false);
      
      // Refresh credentials list
      fetchCredentials();
    } catch (err: any) {
      console.error('Error adding credentials:', err);
      setFormError(err.message || 'Failed to connect exchange');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle credential deletion
  const handleDeleteCredential = async () => {
    if (!deleteCredentialId) return;
    
    try {
      const { data, error } = await supabase.rpc('manage_exchange_credentials', {
        p_action: 'delete',
        p_credential_id: deleteCredentialId
      });

      if (error) throw error;

      toast({
        title: 'Credentials Removed',
        description: 'Exchange credentials have been removed'
      });
      
      // Clear delete state and refresh list
      setDeleteCredentialId(null);
      fetchCredentials();
    } catch (err: any) {
      console.error('Error deleting credentials:', err);
      toast({
        variant: 'destructive',
        title: 'Error removing credentials',
        description: err.message || 'Failed to remove exchange credentials'
      });
    }
  };

  // Load credentials on component mount
  React.useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Exchange Credentials</CardTitle>
            <CardDescription>
              Manage your trading exchange API connections
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            Connect Exchange
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading credentials...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : credentials.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 border rounded-md p-4 bg-muted/30">
              <Shield className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                No exchange credentials found. Connect an exchange to start trading.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {credentials.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Key className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {cred.exchange.charAt(0).toUpperCase() + cred.exchange.slice(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(cred.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={cred.is_active ? "outline" : "secondary"}>
                      {cred.is_active ? (
                        <Check className="mr-1 h-3 w-3 text-green-500" />
                      ) : (
                        <X className="mr-1 h-3 w-3 text-red-500" />
                      )}
                      {cred.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteCredentialId(cred.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Remove credentials</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            API keys are encrypted and stored securely. We never store the original values.
          </p>
        </CardFooter>
      </Card>

      {/* Add Exchange Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Exchange</DialogTitle>
            <DialogDescription>
              Connect your exchange account using API keys. Keys are encrypted and stored securely.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="exchange">Exchange</Label>
                <Select value={formData.exchange} onValueChange={handleExchangeChange} required>
                  <SelectTrigger id="exchange">
                    <SelectValue placeholder="Select exchange" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_EXCHANGES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  value={formData.apiKey}
                  onChange={handleChange('apiKey')}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apiSecret">API Secret</Label>
                <Input
                  id="apiSecret"
                  type="password"
                  value={formData.apiSecret}
                  onChange={handleChange('apiSecret')}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="passphrase">Passphrase (if required)</Label>
                <Input
                  id="passphrase"
                  type="password"
                  value={formData.passphrase}
                  onChange={handleChange('passphrase')}
                />
              </div>
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Exchange'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCredentialId} onOpenChange={(open) => !open && setDeleteCredentialId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Exchange Credentials</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the exchange API credentials from your account. Any active trades or positions will not be affected, but you will no longer be able to place new trades using these credentials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCredential} className="bg-destructive text-destructive-foreground">
              Remove Credentials
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
