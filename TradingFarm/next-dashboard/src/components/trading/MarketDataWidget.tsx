import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowDown, 
  ArrowUp, 
  ChevronDown, 
  ChevronUp,
  Clock, 
  BarChart4,
  List,
  Activity
} from 'lucide-react';
import { MarketDataService, useMarketDataStore } from '@/utils/exchanges/market-data-service';
import { ExchangeName } from '@/utils/exchanges/exchange-factory';
import { Ticker, OrderBook, PublicTrade } from '@/utils/exchanges/exchange-adapter';

interface MarketDataWidgetProps {
  exchangeName: ExchangeName;
  symbol: string;
  showTrades?: boolean;
  showOrderBook?: boolean;
  height?: string;
  initialTab?: 'overview' | 'orderbook' | 'trades';
}

export function MarketDataWidget({
  exchangeName,
  symbol,
  showTrades = true,
  showOrderBook = true,
  height = 'h-[400px]',
  initialTab = 'overview'
}: MarketDataWidgetProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [orderBookDepth, setOrderBookDepth] = useState(10);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  // Connect to market data streams
  useEffect(() => {
    const marketDataService = MarketDataService.getInstance();
    
    const subscribe = async () => {
      try {
        await marketDataService.subscribeToTicker(exchangeName, symbol);
        
        if (showOrderBook) {
          await marketDataService.subscribeToOrderBook(exchangeName, symbol);
        }
        
        if (showTrades) {
          await marketDataService.subscribeToTrades(exchangeName, symbol);
        }
        
        setIsSubscribed(true);
      } catch (error) {
        console.error(`Failed to subscribe to market data for ${symbol}:`, error);
      }
    };
    
    if (!isSubscribed) {
      subscribe();
    }
    
    return () => {
      // Unsubscribe when component unmounts
      marketDataService.unsubscribeSymbol(exchangeName, symbol)
        .catch(error => console.error(`Failed to unsubscribe from ${symbol}:`, error));
    };
  }, [exchangeName, symbol, showOrderBook, showTrades, isSubscribed]);
  
  // Get market data from store
  const marketDataKey = `${exchangeName}:${symbol}`;
  const ticker = useMarketDataStore(state => state.tickers[marketDataKey]);
  const orderBook = useMarketDataStore(state => state.orderBooks[marketDataKey]);
  const trades = useMarketDataStore(state => state.lastTrades[marketDataKey] || []);
  
  // Calculate price change
  const priceChange = ticker ? {
    value: ticker.percentChange24h || 0,
    isPositive: (ticker.percentChange24h || 0) >= 0
  } : { value: 0, isPositive: true };
  
  // Format large numbers
  const formatNumber = (num: number, precision: number = 2) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(precision)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(precision)}K`;
    } else {
      return num.toFixed(precision);
    }
  };
  
  // Format price with appropriate precision
  const formatPrice = (price: number) => {
    if (price >= 10000) {
      return price.toFixed(0);
    } else if (price >= 1000) {
      return price.toFixed(1);
    } else if (price >= 100) {
      return price.toFixed(2);
    } else if (price >= 10) {
      return price.toFixed(3);
    } else if (price >= 1) {
      return price.toFixed(4);
    } else if (price >= 0.1) {
      return price.toFixed(5);
    } else if (price >= 0.01) {
      return price.toFixed(6);
    } else {
      return price.toFixed(8);
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg">
              {symbol}
            </CardTitle>
            <Badge 
              variant="secondary" 
              className="text-xs font-normal capitalize"
            >
              {exchangeName}
            </Badge>
          </div>
          
          {ticker && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {formatPrice(ticker.last)}
                </div>
                <div className={`flex items-center space-x-1 text-sm ${
                  priceChange.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {priceChange.isPositive ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span>{Math.abs(priceChange.value).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">
              <BarChart4 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            {showOrderBook && (
              <TabsTrigger value="orderbook">
                <List className="h-4 w-4 mr-2" />
                Order Book
              </TabsTrigger>
            )}
            {showTrades && (
              <TabsTrigger value="trades">
                <Activity className="h-4 w-4 mr-2" />
                Trades
              </TabsTrigger>
            )}
          </TabsList>
        </div>
        
        <CardContent className={`pt-4 ${height} overflow-auto`}>
          <TabsContent value="overview" className="mt-0">
            {ticker ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">24h High</p>
                    <p className="text-lg font-medium">{formatPrice(ticker.high)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">24h Low</p>
                    <p className="text-lg font-medium">{formatPrice(ticker.low)}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Bid / Ask</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-medium text-green-600">{formatPrice(ticker.bid)}</p>
                    <span className="text-muted-foreground">/</span>
                    <p className="text-lg font-medium text-red-600">{formatPrice(ticker.ask)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">24h Volume</p>
                    <p className="text-lg font-medium">{formatNumber(ticker.volume)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">24h Value</p>
                    <p className="text-lg font-medium">${formatNumber(ticker.quoteVolume)}</p>
                  </div>
                </div>
                
                <div className="space-y-1 border-t pt-4">
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Last update: {new Date(ticker.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="orderbook" className="mt-0">
            {orderBook ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Order Book</h4>
                  <Select 
                    value={orderBookDepth.toString()} 
                    onValueChange={(value) => setOrderBookDepth(parseInt(value))}
                  >
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue placeholder="Depth" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 rows</SelectItem>
                      <SelectItem value="10">10 rows</SelectItem>
                      <SelectItem value="20">20 rows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-3 text-xs text-muted-foreground border-b pb-1">
                  <div>Price</div>
                  <div className="text-right">Size</div>
                  <div className="text-right">Total</div>
                </div>
                
                <div className="space-y-1">
                  {orderBook.asks.slice(-orderBookDepth).reverse().map((ask, index) => {
                    const [price, size] = ask;
                    return (
                      <div 
                        key={`ask-${index}`} 
                        className="grid grid-cols-3 text-sm hover:bg-muted/50"
                      >
                        <div className="text-red-600">{formatPrice(price)}</div>
                        <div className="text-right font-mono">{size.toFixed(6)}</div>
                        <div className="text-right text-muted-foreground">{(price * size).toFixed(4)}</div>
                      </div>
                    );
                  })}
                  
                  <div className="grid grid-cols-3 my-1 py-1 border-y text-primary font-medium">
                    <div>
                      {ticker && formatPrice(ticker.last)}
                    </div>
                    <div className="text-right">Spread:</div>
                    <div className="text-right">
                      {ticker && ((ticker.ask - ticker.bid) / ticker.bid * 100).toFixed(3)}%
                    </div>
                  </div>
                  
                  {orderBook.bids.slice(0, orderBookDepth).map((bid, index) => {
                    const [price, size] = bid;
                    return (
                      <div 
                        key={`bid-${index}`} 
                        className="grid grid-cols-3 text-sm hover:bg-muted/50"
                      >
                        <div className="text-green-600">{formatPrice(price)}</div>
                        <div className="text-right font-mono">{size.toFixed(6)}</div>
                        <div className="text-right text-muted-foreground">{(price * size).toFixed(4)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="trades" className="mt-0">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Recent Trades</h4>
              
              <div className="grid grid-cols-3 text-xs text-muted-foreground border-b pb-1">
                <div>Price</div>
                <div className="text-right">Size</div>
                <div className="text-right">Time</div>
              </div>
              
              <div className="space-y-1">
                {trades.length > 0 ? (
                  trades.slice(0, 30).map((trade, index) => (
                    <div 
                      key={`trade-${index}`} 
                      className="grid grid-cols-3 text-sm hover:bg-muted/50"
                    >
                      <div className={trade.side === 'buy' ? 'text-green-600' : 'text-red-600'}>
                        {formatPrice(trade.price)}
                      </div>
                      <div className="text-right font-mono">{trade.quantity.toFixed(6)}</div>
                      <div className="text-right text-muted-foreground">
                        {trade.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-muted-foreground">
                    No recent trades
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
