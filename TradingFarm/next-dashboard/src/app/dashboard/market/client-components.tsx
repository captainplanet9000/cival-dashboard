'use client';

import * as React from 'react';
const { useState, useEffect } = React;
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Zap, RefreshCw, BarChart3, LineChart, Settings } from 'lucide-react';
import { MarketOverviewWidget } from '@/components/market/market-overview-widget';
import { MarketWatchlist } from '@/components/market/market-watchlist';
import { OrderManagement } from '@/components/market/order-management';
import { ExecutionMonitor } from '@/components/market/execution-monitor';
import RealTimePriceChart from '@/components/market/real-time-price-chart';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface MarketDashboardClientProps {
  userId: string;
}

interface ActiveSymbol {
  symbol: string;
  exchange: string;
  price: number | null;
}

export function MarketDashboardClient({ userId }: MarketDashboardClientProps) {
  const [activeExchange, setActiveExchange] = useState<string | null>(null);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSymbol, setActiveSymbol] = useState<ActiveSymbol | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [marketData, setMarketData] = useState<Record<string, any>>({});
  const [refreshingData, setRefreshingData] = useState(false);
  const { toast } = useToast();

  // Fetch connected exchanges
  useEffect(() => {
    const fetchExchanges = async () => {
      try {
        setLoading(true);
        const supabase = createBrowserClient();

        const { data, error } = await supabase
          .from('exchange_configs')
          .select('*')
          .eq('user_id', userId)
          .eq('active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setExchanges(data || []);

        // Set active exchange if available
        if (data && data.length > 0 && !activeExchange) {
          setActiveExchange(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching exchanges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExchanges();
  }, [userId]);

  // Major trading pairs for quick access
  const tradingPairs = {
    crypto: [
      { symbol: 'BTC/USD', name: 'Bitcoin' },
      { symbol: 'ETH/USD', name: 'Ethereum' },
      { symbol: 'SOL/USD', name: 'Solana' }
    ],
    forex: [
      { symbol: 'EUR/USD', name: 'Euro/Dollar' },
      { symbol: 'GBP/USD', name: 'Pound/Dollar' },
      { symbol: 'USD/JPY', name: 'Dollar/Yen' }
    ],
    commodities: [
      { symbol: 'XAUUSD', name: 'Gold' },
      { symbol: 'XAGUSD', name: 'Silver' },
      { symbol: 'WTICOUSD', name: 'Crude Oil' }
    ]
  };

  // Handle selecting a symbol from watchlist
  const handleSymbolSelect = (symbol: string, exchange: string, price: number | null) => {
    setActiveSymbol({
      symbol,
      exchange,
      price
    });
    // Switch to trading tab when symbol is selected
    setSelectedTab('trading');

    // Show toast notification
    toast({
      title: "Symbol Selected",
      description: `${symbol} from ${exchange} has been selected for trading.`,
      variant: "default"
    });

    // Fetch latest market data for this symbol
    fetchMarketData(symbol, exchange);
  };

  // Fetch market data for a specific symbol
  const fetchMarketData = async (symbol: string, exchange: string) => {
    try {
      setRefreshingData(true);

      // This would typically be an API call to fetch real-time market data
      // For now, we'll simulate with some mock data
      const mockData = {
        price: activeSymbol?.price || Math.random() * 30000 + 20000,
        high24h: Math.random() * 32000 + 20000,
        low24h: Math.random() * 28000 + 20000,
        volume24h: Math.random() * 1000000000,
        change24h: (Math.random() * 10 - 5),
        timestamp: new Date().toISOString()
      };

      setMarketData({
        ...marketData,
        [`${symbol}_${exchange}`]: mockData
      });

      // Update active symbol with latest price
      if (activeSymbol && activeSymbol.symbol === symbol && activeSymbol.exchange === exchange) {
        setActiveSymbol({
          ...activeSymbol,
          price: mockData.price
        });
      }

    } catch (error) {
      console.error('Error fetching market data:', error);
      toast({
        title: "Data Fetch Error",
        description: "Could not retrieve the latest market data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRefreshingData(false);
    }
  };

  // Handle new order placement
  const handleOrderPlaced = (order: any) => {
    // Provide user feedback
    toast({
      title: "Order Placed Successfully",
      description: `${order.side.toUpperCase()} ${order.quantity} ${order.symbol} at ${order.order_type === 'market' ? 'MARKET' : order.price}`,
      variant: "default"
    });

    // Refresh execution monitor data after a short delay to give time for the backend to process
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('refresh-executions'));
    }, 1000);
  };

  // Handle refresh of market data
  const handleRefreshMarketData = () => {
    if (activeSymbol) {
      fetchMarketData(activeSymbol.symbol, activeSymbol.exchange);
    }
  };

  // Handle when a user requests to switch to live trading
  const handleSwitchToLive = () => {
    toast({
      title: "Live Trading Coming Soon",
      description: "Live trading functionality will be available in the next release. Currently operating in simulation mode.",
      variant: "default"
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {activeSymbol && (
            <Alert className="w-auto p-2 border-green-500/50">
              <AlertCircle className="h-4 w-4 text-green-500" />
              <AlertTitle className="ml-2 text-sm font-medium">Active Trading Pair:</AlertTitle>
              <AlertDescription className="ml-2 text-sm font-semibold">
                {activeSymbol.symbol} ({activeSymbol.exchange}) - 
                ${activeSymbol.price ? activeSymbol.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'Market'}
              </AlertDescription>
            </Alert>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefreshMarketData} disabled={refreshingData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshingData ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Market Dashboard Settings</DialogTitle>
                <DialogDescription>
                  Configure your market dashboard preferences
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Live Trading Mode</span>
                  <Button onClick={handleSwitchToLive} variant="outline" size="sm">
                    <Zap className="h-4 w-4 mr-2" />
                    Enable
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Chart Type</span>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="bg-secondary">
                      <LineChart className="h-4 w-4 mr-2" />
                      Line
                    </Button>
                    <Button variant="outline" size="sm">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Candle
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Market Overview</TabsTrigger>
          <TabsTrigger value="trading">Trading</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
          <TabsTrigger value="exchanges">Exchanges</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Market Overview Widget */}
            <div className="md:col-span-2">
              <MarketOverviewWidget userId={userId} className="h-[500px]" />
            </div>

            {/* Market Watchlist */}
            <div className="flex flex-col lg:col-span-1">
              <MarketWatchlist 
                userId={userId} 
                onSymbolSelect={handleSymbolSelect}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trading" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="col-span-2">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {activeSymbol ? activeSymbol.symbol : 'Select a Symbol'}
                      {activeSymbol && (
                        <Badge className="ml-2" variant={marketData[`${activeSymbol.symbol}_${activeSymbol.exchange}`]?.change24h > 0 ? 'default' : 'destructive'}>
                          {marketData[`${activeSymbol.symbol}_${activeSymbol.exchange}`]?.change24h > 0 ? '+' : ''}
                          {marketData[`${activeSymbol.symbol}_${activeSymbol.exchange}`]?.change24h?.toFixed(2)}%
                        </Badge>
                      )}
                    </span>
                    {activeSymbol && (
                      <span className="text-xl font-bold">
                        ${activeSymbol.price?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {activeSymbol ? `Exchange: ${activeSymbol.exchange}` : 'Select a symbol from your watchlist to start trading'}
                    {activeSymbol && marketData[`${activeSymbol.symbol}_${activeSymbol.exchange}`] && (
                      <div className="mt-1 flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>24h High: ${marketData[`${activeSymbol.symbol}_${activeSymbol.exchange}`].high24h.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                        <span>24h Low: ${marketData[`${activeSymbol.symbol}_${activeSymbol.exchange}`].low24h.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                        <span>24h Vol: ${(marketData[`${activeSymbol.symbol}_${activeSymbol.exchange}`].volume24h / 1000000).toFixed(2)}M</span>
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeSymbol ? (
                    <RealTimePriceChart
                      exchangeId={activeSymbol.exchange}
                      symbol={activeSymbol.symbol}
                      height={400}
                      showControls={true}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[400px] bg-muted/40 rounded-md">
                      <p className="text-muted-foreground mb-2">No trading pair selected</p>
                      <p className="text-sm text-muted-foreground">Select a symbol from your watchlist to view the chart</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Management */}
            <div className="md:col-span-1">
              <OrderManagement
                userId={userId}
                selectedSymbol={activeSymbol?.symbol}
                selectedExchange={activeSymbol?.exchange}
                currentPrice={activeSymbol?.price || undefined}
                onOrderPlaced={handleOrderPlaced}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="executions" className="mt-4">
          <ExecutionMonitor userId={userId} />
        </TabsContent>
        
        <TabsContent value="exchanges" className="mt-4 space-y-4">
      
      {/* Connected Exchanges Card */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Exchanges</CardTitle>
          <CardDescription>Your active exchange connections</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : exchanges.length === 0 ? (
            <div className="text-center p-6 border rounded-lg bg-muted/30">
              <p className="text-muted-foreground mb-2">No active exchanges</p>
              <p className="text-xs">
                Connect to an exchange in the Exchange Management section
                to enable live trading.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {exchanges.map((exchange: any) => (
                <div key={exchange.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="font-medium">{exchange.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center">
                      <Badge variant="outline" className="mr-2">{exchange.exchange}</Badge>
                      {exchange.testnet ? (
                        <Badge variant="secondary">Testnet</Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-500">Live</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">Connected</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
      
      {/* Market Category Tabs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Major Markets</CardTitle>
          <CardDescription>Quick view of major trading pairs</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="crypto" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="crypto">Cryptocurrency</TabsTrigger>
              <TabsTrigger value="forex">Forex</TabsTrigger>
              <TabsTrigger value="commodities">Commodities</TabsTrigger>
            </TabsList>
            
            <TabsContent value="crypto" className="mt-4">
              <div className="grid gap-4 md:grid-cols-3">
                {tradingPairs.crypto.map(pair => (
                  <Card key={pair.symbol} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{pair.name}</CardTitle>
                      <CardDescription>{pair.symbol}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <RealTimePriceChart
                        exchangeId="coinbase"
                        symbol={pair.symbol}
                        height={200}
                        showControls={false}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="forex" className="mt-4">
              <div className="grid gap-4 md:grid-cols-3">
                {tradingPairs.forex.map(pair => (
                  <Card key={pair.symbol} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{pair.name}</CardTitle>
                      <CardDescription>{pair.symbol}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-4 text-center text-muted-foreground">
                        <p>Forex data subscription required</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="commodities" className="mt-4">
              <div className="grid gap-4 md:grid-cols-3">
                {tradingPairs.commodities.map(pair => (
                  <Card key={pair.symbol} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{pair.name}</CardTitle>
                      <CardDescription>{pair.symbol}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-4 text-center text-muted-foreground">
                        <p>Commodities data subscription required</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
