import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertCircle, ArrowRightCircle, CheckCircle, XCircle } from 'lucide-react';
import { createBrowserClient } from '@/utils/supabase/client';
import { ExchangeConfig } from '@/utils/exchange/types';
import useExchange from '@/hooks/use-exchange';

interface ExchangeListProps {
  userId: string;
  onSelectExchange: (exchangeId: string) => void;
}

export default function ExchangeList({ userId, onSelectExchange }: ExchangeListProps) {
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(true);
  const [exchanges, setExchanges] = useState<ExchangeConfig[]>([]);
  const [connectedExchangeId, setConnectedExchangeId] = useState<string | null>(null);
  const { connectExchange, disconnectExchange, isConnected } = useExchange();

  // Fetch exchanges
  const fetchExchanges = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('exchange_configs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setExchanges(data || []);
    } catch (error) {
      console.error('Error fetching exchanges:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch exchanges',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle connect/disconnect
  const handleConnectToggle = async (exchangeId: string, isActive: boolean) => {
    try {
      if (isActive) {
        // Connect to exchange
        const success = await connectExchange(exchangeId);
        
        if (success) {
          setConnectedExchangeId(exchangeId);
          onSelectExchange(exchangeId);
          
          // Update active status in database
          await supabase
            .from('exchange_configs')
            .update({ active: true })
            .eq('id', exchangeId);
        }
      } else {
        // Disconnect from exchange
        await disconnectExchange();
        setConnectedExchangeId(null);
        
        // Update active status in database
        await supabase
          .from('exchange_configs')
          .update({ active: false })
          .eq('id', exchangeId);
      }
    } catch (error) {
      console.error('Error toggling exchange connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle exchange connection',
        variant: 'destructive',
      });
    }
  };

  // Delete exchange
  const handleDeleteExchange = async (exchangeId: string) => {
    if (!confirm('Are you sure you want to delete this exchange?')) {
      return;
    }
    
    try {
      // Disconnect if connected
      if (connectedExchangeId === exchangeId) {
        await disconnectExchange();
        setConnectedExchangeId(null);
      }
      
      // Delete exchange config and credentials
      const { error } = await supabase
        .from('exchange_configs')
        .delete()
        .eq('id', exchangeId);
      
      if (error) throw error;
      
      toast({
        title: 'Exchange Deleted',
        description: 'Exchange connection removed successfully',
      });
      
      // Refresh exchanges
      fetchExchanges();
    } catch (error) {
      console.error('Error deleting exchange:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete exchange',
        variant: 'destructive',
      });
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchExchanges();
    
    // Set up real-time subscription for exchange config changes
    const subscription = supabase
      .channel('exchange_configs_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'exchange_configs', filter: `user_id=eq.${userId}` }, 
        fetchExchanges
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId]);

  // Get exchange type label and icon
  const getExchangeLabel = (exchange: string) => {
    switch (exchange) {
      case 'bybit':
        return { label: 'Bybit', color: 'bg-yellow-500' };
      case 'coinbase':
        return { label: 'Coinbase', color: 'bg-blue-500' };
      case 'hyperliquid':
        return { label: 'Hyperliquid', color: 'bg-purple-500' };
      case 'binance':
        return { label: 'Binance', color: 'bg-orange-500' };
      default:
        return { label: exchange, color: 'bg-gray-500' };
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Your Exchanges</h3>
      
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-6 w-6 border-2 border-current border-t-transparent rounded-full"></div>
          <span className="ml-2">Loading exchanges...</span>
        </div>
      ) : exchanges.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
            <p>No exchanges found. Add your first exchange connection.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {exchanges.map((exchange) => {
            const { label, color } = getExchangeLabel(exchange.exchange);
            const isConnected = connectedExchangeId === exchange.id;
            
            return (
              <Card key={exchange.id} className={isConnected ? 'border-primary' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{exchange.name}</CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <Badge className={`${color} text-white mr-2`}>{label}</Badge>
                        <Badge variant="outline">{exchange.testnet ? 'Testnet' : 'Mainnet'}</Badge>
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div 
                        className={`w-2 h-2 rounded-full ${
                          isConnected ? 'bg-green-500' : 'bg-gray-500'
                        }`} 
                      />
                      <span className="text-xs text-muted-foreground">
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`connect-${exchange.id}`}
                        checked={isConnected}
                        onCheckedChange={(checked) => handleConnectToggle(exchange.id, checked)}
                      />
                      <Label htmlFor={`connect-${exchange.id}`} className="cursor-pointer">
                        {isConnected ? 'Disconnect' : 'Connect'}
                      </Label>
                    </div>
                    {isConnected && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectExchange(exchange.id)}
                      >
                        View Dashboard <ArrowRightCircle className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeleteExchange(exchange.id)}
                    disabled={isConnected}
                  >
                    <XCircle className="mr-1 h-4 w-4" /> Delete
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    ID: {exchange.id.substring(0, 8)}...
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
