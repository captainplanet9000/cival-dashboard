'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { storeExchangeCredentials } from '@/utils/exchange/exchange-credentials-service';
import { createBrowserClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// Exchange options
const exchangeOptions = [
  { value: 'binance', label: 'Binance' },
  { value: 'coinbase', label: 'Coinbase' },
  { value: 'kraken', label: 'Kraken' },
  { value: 'kucoin', label: 'KuCoin' },
  { value: 'bybit', label: 'Bybit' },
  { value: 'hyperliquid', label: 'HyperLiquid' },
];

export function ConnectExchangeModal() {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    exchange: '',
    name: '',
    apiKey: '',
    apiSecret: '',
    passphrase: '',
    testnet: false,
  });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleExchangeChange = (value: string) => {
    setFormData({ ...formData, exchange: value });
  };

  const handleTestnetChange = (checked: boolean) => {
    setFormData({ ...formData, testnet: checked });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // If name is not provided, use exchange name
      const name = formData.name || 
        exchangeOptions.find(option => option.value === formData.exchange)?.label || 
        formData.exchange;

      // Store credentials
      await storeExchangeCredentials({
        user_id: user.id,
        exchange: formData.exchange,
        name,
        api_key: formData.apiKey,
        api_secret: formData.apiSecret,
        passphrase: formData.passphrase,
        testnet: formData.testnet,
        uses_vault: false, // Let the service determine this based on env settings
      });

      // Query wallet balances (will trigger on the first fetch cycle)
      await fetch('/api/wallet/refresh', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchange: formData.exchange })
      });

      toast({
        title: 'Exchange Connected',
        description: `Successfully connected to ${name}. Fetching balances...`,
      });

      // Reset form and close modal
      setFormData({
        exchange: '',
        name: '',
        apiKey: '',
        apiSecret: '',
        passphrase: '',
        testnet: false,
      });
      setOpen(false);
      
      // Refresh the page to show updated balances
      router.refresh();
    } catch (err: any) {
      console.error('Error connecting exchange:', err);
      setError(err.message || 'Failed to connect exchange');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          Connect Exchange
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect Exchange</DialogTitle>
          <DialogDescription>
            Connect your exchange account using API keys. Your keys will be securely encrypted.
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
                  {exchangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="name">Connection Name (Optional)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleChange('name')}
                placeholder="e.g., My Binance Account"
              />
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
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="testnet" 
                checked={formData.testnet}
                onCheckedChange={handleTestnetChange}
              />
              <Label htmlFor="testnet" className="text-sm">Use testnet</Label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
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
  );
}
