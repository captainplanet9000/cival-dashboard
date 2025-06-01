'use client';

import React, { useEffect, useState } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpIcon, ArrowDownIcon, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatPrice } from '@/utils/format';

interface MarketData {
  id: number;
  symbol: string;
  last_price: number;
  bid_price: number;
  ask_price: number;
  high_24h: number;
  low_24h: number;
  volume_24h: number;
  price_change_percent: number;
  timestamp: string;
  updated_at: string;
}

interface MarketPriceTickerProps {
  defaultSymbols?: string[];
}

export function MarketPriceTicker({ defaultSymbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'] }: MarketPriceTickerProps) {
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const supabase = createBrowserClient();
  
  // Initialize market data and realtime subscription
  useEffect(() => {
    let marketDataSubscription: any;
    
    async function initializeMarketData() {
      try {
        setLoading(true);
        
        // Fetch market data for default symbols
        const { data, error } = await supabase
          .from('market_data')
          .select('*')
          .in('symbol', defaultSymbols);
        
        if (error) throw error;
        
        // Convert array to record object keyed by symbol
        const marketDataMap = (data || []).reduce((acc: Record<string, MarketData>, item: MarketData) => {
          acc[item.symbol] = item;
          return acc;
        }, {} as Record<string, MarketData>);
        
        setMarketData(marketDataMap);
        
        // Set up realtime subscription
        marketDataSubscription = supabase
          .channel('market_data_changes')
          .on('postgres_changes', 
              { event: '*', schema: 'public', table: 'market_data', filter: `symbol=in.(${defaultSymbols.map(s => `"${s}"`).join(',')})` }, 
              (payload: any) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                  const data = payload.new as MarketData;
                  setMarketData((current: Record<string, MarketData>) => ({
                    ...current,
                    [data.symbol]: data
                  }));
                }
              })
          .subscribe();
      } catch (error) {
        console.error('Error fetching market data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load market data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    
    initializeMarketData();
    
    return () => {
      // Clean up subscription
      if (marketDataSubscription) {
        supabase.removeChannel(marketDataSubscription);
      }
    };
  }, [supabase, toast, defaultSymbols]);
  
  const refreshMarketData = async () => {
    try {
      setRefreshing(true);
      
      // Call the API to refresh market data
      const response = await fetch('/api/market/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: defaultSymbols }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to refresh market data');
      }
      
      toast({
        title: 'Market Data Refreshed',
        description: 'Latest market prices have been updated',
      });
    } catch (error: any) {
      console.error('Error refreshing market data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to refresh market data',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };
  
  // Format timestamp to local time
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Market Prices</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshMarketData} 
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-24">
                <RefreshCw className="h-8 w-8 animate-spin opacity-30" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {defaultSymbols.map((symbol) => {
              const data = marketData[symbol];
              
              // If no data for this symbol yet
              if (!data) {
                return (
                  <Card key={symbol} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle>{symbol}</CardTitle>
                      <CardDescription>Waiting for data...</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="h-16 flex items-center justify-center">
                        <RefreshCw className="h-5 w-5 animate-spin opacity-30" />
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              
              const priceChange = data.price_change_percent || 0;
              const isPositive = priceChange >= 0;
              
              return (
                <Card key={symbol} className={`overflow-hidden border-l-4 ${isPositive ? 'border-l-green-500' : 'border-l-red-500'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle>{symbol}</CardTitle>
                      <Badge variant={isPositive ? 'default' : 'destructive'} className="flex items-center bg-green-500 text-white">
                        {isPositive ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : <ArrowDownIcon className="h-3 w-3 mr-1" />}
                        {Math.abs(priceChange).toFixed(2)}%
                      </Badge>
                    </div>
                    <CardDescription>
                      Last updated: {formatTimestamp(data.updated_at)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="text-3xl font-bold mb-2">
                      {formatPrice(data.last_price)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">24h High:</span> {formatPrice(data.high_24h)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">24h Low:</span> {formatPrice(data.low_24h)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Bid:</span> {formatPrice(data.bid_price)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ask:</span> {formatPrice(data.ask_price)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
