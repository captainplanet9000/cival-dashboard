/**
 * Market Overview Widget
 * 
 * A dashboard widget that displays real-time market data for multiple assets
 * using the RealTimePriceChart component. Part of Phase 1 live trading implementation.
 */

"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import RealTimePriceChart from './real-time-price-chart';

interface MarketOverviewWidgetProps {
  userId: string;
  className?: string;
}

interface WatchlistItem {
  id: string;
  exchangeId: string;
  symbol: string;
  name?: string;
  addedAt: Date;
}

// Common trading pairs
const DEFAULT_WATCHLIST: Omit<WatchlistItem, 'id' | 'addedAt'>[] = [
  { exchangeId: 'coinbase', symbol: 'BTC/USD', name: 'Bitcoin' },
  { exchangeId: 'coinbase', symbol: 'ETH/USD', name: 'Ethereum' },
  { exchangeId: 'coinbase', symbol: 'SOL/USD', name: 'Solana' }
];

// Available exchanges
const EXCHANGES = [
  { id: 'coinbase', name: 'Coinbase' },
  { id: 'bybit', name: 'Bybit' },
  { id: 'hyperliquid', name: 'Hyperliquid' },
  { id: 'binance', name: 'Binance' }
];

export function MarketOverviewWidget({ userId, className }: MarketOverviewWidgetProps) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({ exchange: 'coinbase', symbol: 'BTC/USD' });
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([
    'BTC/USD', 'ETH/USD', 'SOL/USD', 'LINK/USD', 'AVAX/USD'
  ]);
  
  // Fetch watchlist from database
  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      const supabase = createBrowserClient();
      
      // Check if user has a watchlist
      const { data, error } = await supabase
        .from('market_watchlist')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Transform the data
        const items: WatchlistItem[] = data.map(item => ({
          id: item.id,
          exchangeId: item.exchange_id,
          symbol: item.symbol,
          name: item.display_name,
          addedAt: new Date(item.created_at)
        }));
        
        setWatchlist(items);
        
        // Set active symbol if none is selected
        if (!activeSymbol && items.length > 0) {
          setActiveSymbol(items[0].id);
        }
      } else {
        // Create default watchlist for new users
        createDefaultWatchlist();
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to load market watchlist',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Create default watchlist for new users
  const createDefaultWatchlist = async () => {
    try {
      const supabase = createBrowserClient();
      
      // Add default items
      const items: WatchlistItem[] = [];
      
      for (const defaultItem of DEFAULT_WATCHLIST) {
        const { data, error } = await supabase
          .from('market_watchlist')
          .insert({
            user_id: userId,
            exchange_id: defaultItem.exchangeId,
            symbol: defaultItem.symbol,
            display_name: defaultItem.name
          })
          .select('*')
          .single();
        
        if (error) {
          console.error('Error creating watchlist item:', error);
          continue;
        }
        
        items.push({
          id: data.id,
          exchangeId: data.exchange_id,
          symbol: data.symbol,
          name: data.display_name,
          addedAt: new Date(data.created_at)
        });
      }
      
      setWatchlist(items);
      
      // Set active symbol if none is selected
      if (!activeSymbol && items.length > 0) {
        setActiveSymbol(items[0].id);
      }
    } catch (error) {
      console.error('Error creating default watchlist:', error);
    }
  };
  
  // Add new symbol to watchlist
  const addToWatchlist = async () => {
    try {
      const supabase = createBrowserClient();
      
      // Check if already in watchlist
      const exists = watchlist.some(
        item => item.exchangeId === formValues.exchange && item.symbol === formValues.symbol
      );
      
      if (exists) {
        toast({
          title: 'Already in Watchlist',
          description: `${formValues.symbol} is already in your watchlist`,
          variant: 'default'
        });
        return;
      }
      
      // Add to database
      const { data, error } = await supabase
        .from('market_watchlist')
        .insert({
          user_id: userId,
          exchange_id: formValues.exchange,
          symbol: formValues.symbol
        })
        .select('*')
        .single();
      
      if (error) throw error;
      
      // Add to local state
      const newItem: WatchlistItem = {
        id: data.id,
        exchangeId: data.exchange_id,
        symbol: data.symbol,
        name: data.display_name,
        addedAt: new Date(data.created_at)
      };
      
      setWatchlist(prev => [...prev, newItem]);
      
      // Set as active symbol
      setActiveSymbol(newItem.id);
      
      toast({
        title: 'Added to Watchlist',
        description: `${formValues.symbol} added to your watchlist`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to add to watchlist',
        variant: 'destructive'
      });
    }
  };
  
  // Remove symbol from watchlist
  const removeFromWatchlist = async (itemId: string) => {
    try {
      const supabase = createBrowserClient();
      
      // Remove from database
      const { error } = await supabase
        .from('market_watchlist')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      
      // Remove from local state
      setWatchlist(prev => prev.filter(item => item.id !== itemId));
      
      // Update active symbol if needed
      if (activeSymbol === itemId) {
        const remaining = watchlist.filter(item => item.id !== itemId);
        setActiveSymbol(remaining.length > 0 ? remaining[0].id : null);
      }
      
      toast({
        title: 'Removed from Watchlist',
        description: 'Item removed from your watchlist',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove from watchlist',
        variant: 'destructive'
      });
    }
  };
  
  // Fetch available symbols for selected exchange
  useEffect(() => {
    const fetchSymbols = async () => {
      // In a real implementation, we would fetch from the exchange API
      // For now, just use some common symbols
      const symbols = [
        'BTC/USD', 'ETH/USD', 'SOL/USD', 'LINK/USD', 'AVAX/USD',
        'MATIC/USD', 'DOGE/USD', 'DOT/USD'
      ];
      
      setAvailableSymbols(symbols);
    };
    
    fetchSymbols();
  }, [formValues.exchange]);
  
  // Fetch watchlist on initial load
  useEffect(() => {
    fetchWatchlist();
  }, [userId]);
  
  // Get the active watchlist item
  const activeItem = activeSymbol ? watchlist.find(item => item.id === activeSymbol) : null;
  
  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex justify-between items-center">
          <span>Market Overview</span>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={fetchWatchlist}
            title="Refresh Watchlist"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div className="flex flex-col h-full">
          {/* Watchlist Tabs */}
          <div className="px-6 mb-2">
            <Tabs 
              value={activeSymbol || ''} 
              onValueChange={setActiveSymbol}
              className="w-full"
            >
              <TabsList className="w-full justify-start mb-2 overflow-x-auto py-1 px-1">
                {watchlist.map(item => (
                  <TabsTrigger
                    key={item.id}
                    value={item.id}
                    className="flex items-center whitespace-nowrap"
                  >
                    <span>{item.symbol}</span>
                    <Badge
                      variant="outline"
                      className="ml-2 text-xs"
                    >
                      {EXCHANGES.find(e => e.id === item.exchangeId)?.name || item.exchangeId}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {/* Price Charts for each symbol */}
              {watchlist.map(item => (
                <TabsContent key={item.id} value={item.id} className="mt-0 pb-0">
                  <div className="relative">
                    <RealTimePriceChart
                      exchangeId={item.exchangeId}
                      symbol={item.symbol}
                      title={item.name || item.symbol}
                      description={`Real-time price data from ${EXCHANGES.find(e => e.id === item.exchangeId)?.name || item.exchangeId}`}
                      height={320}
                      showControls={true}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-1 right-1 text-destructive"
                      onClick={() => removeFromWatchlist(item.id)}
                      title="Remove from Watchlist"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
          
          {/* Add to Watchlist Form */}
          <div className="mt-auto bg-muted/40 p-4 border-t">
            <div className="flex items-end space-x-2">
              <div className="space-y-1 flex-1">
                <Select
                  value={formValues.exchange}
                  onValueChange={(value) => setFormValues(prev => ({ ...prev, exchange: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Exchange" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXCHANGES.map(exchange => (
                      <SelectItem key={exchange.id} value={exchange.id}>
                        {exchange.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex-1">
                <Select
                  value={formValues.symbol}
                  onValueChange={(value) => setFormValues(prev => ({ ...prev, symbol: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Symbol" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSymbols.map(symbol => (
                      <SelectItem key={symbol} value={symbol}>
                        {symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addToWatchlist} className="flex-shrink-0">
                <PlusCircle className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MarketOverviewWidget;
