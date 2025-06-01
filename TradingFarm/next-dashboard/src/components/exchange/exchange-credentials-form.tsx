'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import { ExchangeCredentials } from '@/utils/exchange/types';

interface ExchangeCredentialsFormProps {
  userId: string;
  onCredentialsSaved: () => void;
}

export default function ExchangeCredentialsForm({ userId, onCredentialsSaved }: ExchangeCredentialsFormProps) {
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<Partial<ExchangeCredentials>>({
    user_id: userId,
    exchange: 'bybit',
    name: '',
    api_key: '',
    api_secret: '',
    testnet: true
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleExchangeChange = (value: string) => {
    setCredentials((prev) => ({ 
      ...prev, 
      exchange: value as 'bybit' | 'coinbase' | 'hyperliquid' | 'binance',
      // Reset passphrase if not Coinbase
      passphrase: value === 'coinbase' ? prev.passphrase : undefined
    }));
  };

  const handleTestnetChange = (checked: boolean) => {
    setCredentials((prev) => ({ ...prev, testnet: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!credentials.name) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a name for this exchange connection',
        variant: 'destructive',
      });
      return;
    }
    
    if (!credentials.api_key) {
      toast({
        title: 'Validation Error',
        description: 'API Key is required',
        variant: 'destructive',
      });
      return;
    }
    
    if (!credentials.api_secret) {
      toast({
        title: 'Validation Error',
        description: 'API Secret is required',
        variant: 'destructive',
      });
      return;
    }
    
    if (credentials.exchange === 'coinbase' && !credentials.passphrase) {
      toast({
        title: 'Validation Error',
        description: 'Passphrase is required for Coinbase',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Store credentials securely via API
      const response = await fetch('/api/exchange/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save credentials');
      }
      
      // Success
      toast({
        title: 'Exchange Added',
        description: `Successfully added ${credentials.name}`,
      });
      
      // Reset form
      setCredentials({
        user_id: userId,
        exchange: 'bybit',
        name: '',
        api_key: '',
        api_secret: '',
        testnet: true
      });
      
      // Notify parent
      onCredentialsSaved();
    } catch (error) {
      console.error('Failed to save exchange credentials:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save credentials',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Exchange</CardTitle>
        <CardDescription>Connect your exchange API for automated trading</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Connection Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="My Bybit Account"
              value={credentials.name}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="exchange">Exchange</Label>
            <Select
              value={credentials.exchange}
              onValueChange={handleExchangeChange}
            >
              <SelectTrigger id="exchange">
                <SelectValue placeholder="Select Exchange" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bybit">Bybit</SelectItem>
                <SelectItem value="coinbase">Coinbase</SelectItem>
                <SelectItem value="hyperliquid">Hyperliquid</SelectItem>
                <SelectItem value="binance">Binance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="api_key">API Key</Label>
            <Input
              id="api_key"
              name="api_key"
              placeholder="Enter API Key"
              value={credentials.api_key}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="api_secret">API Secret</Label>
            <Input
              id="api_secret"
              name="api_secret"
              type="password"
              placeholder="Enter API Secret"
              value={credentials.api_secret}
              onChange={handleInputChange}
              required
            />
          </div>
          
          {credentials.exchange === 'coinbase' && (
            <div className="space-y-2">
              <Label htmlFor="passphrase">Passphrase</Label>
              <Input
                id="passphrase"
                name="passphrase"
                type="password"
                placeholder="Enter Passphrase"
                value={credentials.passphrase || ''}
                onChange={handleInputChange}
                required
              />
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Switch
              id="testnet"
              checked={credentials.testnet}
              onCheckedChange={handleTestnetChange}
            />
            <Label htmlFor="testnet" className="cursor-pointer">
              Use Testnet
            </Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Exchange'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
