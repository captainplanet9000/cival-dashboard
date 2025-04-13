import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCcw, ZoomIn, ZoomOut, CopyPlus } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
  percentage: number;
}

interface OrderBook {
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
  spread: number;
  spreadPercentage: number;
  timestamp: number;
}

interface OrderBookVisualizationProps {
  symbol: string;
  exchange?: string;
  depth?: number;
  grouped?: boolean;
  onPriceClick?: (price: number) => void;
  refreshInterval?: number; // in milliseconds
  hideHeader?: boolean;
}

export function OrderBookVisualization({
  symbol,
  exchange = 'binance',
  depth = 15,
  grouped = true,
  onPriceClick,
  refreshInterval = 3000,
  hideHeader = false
}: OrderBookVisualizationProps) {
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupingFactor, setGroupingFactor] = useState<number>(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  
  // Available grouping options based on price range
  const groupingOptions = useMemo(() => {
    if (!orderBook) return [1];
    
    const highestPrice = orderBook.asks[orderBook.asks.length - 1]?.price || 0;
    
    if (highestPrice > 10000) return [1, 5, 10, 50, 100];
    if (highestPrice > 1000) return [0.5, 1, 5, 10, 50];
    if (highestPrice > 100) return [0.1, 0.5, 1, 5, 10];
    if (highestPrice > 10) return [0.01, 0.05, 0.1, 0.5, 1];
    if (highestPrice > 1) return [0.001, 0.005, 0.01, 0.05, 0.1];
    return [0.0001, 0.0005, 0.001, 0.005, 0.01];
  }, [orderBook]);
  
  // Format price based on price range
  const priceFormatter = useMemo(() => {
    if (!orderBook) return (price: number) => price.toString();
    
    const highestPrice = orderBook.asks[orderBook.asks.length - 1]?.price || 0;
    
    if (highestPrice < 0.01) return (price: number) => price.toFixed(8);
    if (highestPrice < 0.1) return (price: number) => price.toFixed(6);
    if (highestPrice < 1) return (price: number) => price.toFixed(5);
    if (highestPrice < 10) return (price: number) => price.toFixed(4);
    if (highestPrice < 100) return (price: number) => price.toFixed(3);
    if (highestPrice < 1000) return (price: number) => price.toFixed(2);
    return (price: number) => price.toFixed(1);
  }, [orderBook]);
  
  // Fetch order book data
  const fetchOrderBook = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // In a real implementation, this would connect to your API
      const response = await fetch(`/api/market-data/${exchange}/orderbook?symbol=${symbol}&depth=${depth * 2}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch order book data');
      }
      
      const data = await response.json();
      
      // Process the order book data
      const asks = processOrderBookSide(data.asks, false, groupingFactor, depth);
      const bids = processOrderBookSide(data.bids, true, groupingFactor, depth);
      
      // Calculate spread
      const lowestAsk = asks[0]?.price || 0;
      const highestBid = bids[0]?.price || 0;
      const spread = lowestAsk - highestBid;
      const spreadPercentage = highestBid > 0 ? (spread / highestBid) * 100 : 0;
      
      setOrderBook({
        asks,
        bids,
        spread,
        spreadPercentage,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('Error fetching order book:', err);
      setError('Failed to load order book data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial fetch and refresh interval
  useEffect(() => {
    // For demo purposes, generate mock data instead of actual API call
    const generateMockOrderBook = () => {
      setIsLoading(true);
      
      // Generate a random mid price based on the symbol
      const basePrice = getSymbolBasePrice(symbol);
      const midPrice = basePrice * (0.99 + Math.random() * 0.02); // ±1% variation
      
      // Generate mock asks and bids around the mid price
      const mockAsks = [];
      const mockBids = [];
      
      for (let i = 0; i < depth * 2; i++) {
        // Asks (increasing prices)
        const askPrice = midPrice * (1 + (i * 0.0005));
        const askSize = Math.random() * 10 + 0.1;
        mockAsks.push([askPrice, askSize]);
        
        // Bids (decreasing prices)
        const bidPrice = midPrice * (1 - (i * 0.0005));
        const bidSize = Math.random() * 10 + 0.1;
        mockBids.push([bidPrice, bidSize]);
      }
      
      // Process the order book data
      const asks = processOrderBookSide(mockAsks, false, groupingFactor, depth);
      const bids = processOrderBookSide(mockBids, true, groupingFactor, depth);
      
      // Calculate spread
      const lowestAsk = asks[0]?.price || 0;
      const highestBid = bids[0]?.price || 0;
      const spread = lowestAsk - highestBid;
      const spreadPercentage = highestBid > 0 ? (spread / highestBid) * 100 : 0;
      
      setOrderBook({
        asks,
        bids,
        spread,
        spreadPercentage,
        timestamp: Date.now()
      });
      
      setIsLoading(false);
    };
    
    // Generate initial mock data
    generateMockOrderBook();
    
    // Set up refresh interval if autoRefresh is enabled
    let intervalId: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      intervalId = setInterval(() => {
        generateMockOrderBook();
      }, refreshInterval);
    }
    
    // Cleanup on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [symbol, exchange, depth, autoRefresh, refreshInterval, groupingFactor]);
  
  // Handle grouping factor change
  const handleGroupingChange = (value: string) => {
    setGroupingFactor(parseFloat(value));
  };
  
  // Handle manual refresh
  const handleRefresh = () => {
    fetchOrderBook();
    toast({
      title: 'Refreshed',
      description: 'Order book data has been updated.',
      duration: 2000
    });
  };
  
  // Handle price click - for populating order entry form
  const handlePriceClick = (price: number) => {
    if (onPriceClick) {
      onPriceClick(price);
    } else {
      navigator.clipboard.writeText(price.toString());
      toast({
        title: 'Price Copied',
        description: `${price} copied to clipboard.`,
        duration: 2000
      });
    }
  };
  
  // Create new order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: { side: 'BUY' | 'SELL'; price: number }) => {
      router.push(`/dashboard/trading/new-order?symbol=${symbol}&side=${orderData.side}&price=${orderData.price}&type=LIMIT`);
    }
  });
  
  // UI for when no data is available
  if (isLoading && !orderBook) {
    return (
      <Card className="w-full">
        <CardHeader className={cn(hideHeader && "hidden")}>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Order Book: {symbol}</span>
            <Badge variant="outline">{exchange}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OrderBookSkeleton />
        </CardContent>
      </Card>
    );
  }
  
  // UI for when an error occurs
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader className={cn(hideHeader && "hidden")}>
          <CardTitle className="text-lg">Order Book: {symbol}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={handleRefresh}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader className={cn("pb-2", hideHeader && "hidden")}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Order Book: {symbol}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{exchange}</Badge>
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Group by:</span>
            <Select value={groupingFactor.toString()} onValueChange={handleGroupingChange}>
              <SelectTrigger className="w-20 h-7">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                {groupingOptions.map(option => (
                  <SelectItem key={option} value={option.toString()}>
                    {option < 0.001 ? option.toExponential() : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Pause' : 'Resume'}
            </Button>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {orderBook && (
          <div className="grid grid-cols-12">
            {/* Bid side */}
            <div className="col-span-6 border-r">
              <div className="grid grid-cols-12 px-4 py-2 text-xs font-semibold text-muted-foreground">
                <div className="col-span-3 text-left">Total</div>
                <div className="col-span-4 text-right">Size</div>
                <div className="col-span-5 text-right">Bid Price</div>
              </div>
              
              <div className="max-h-[50vh] overflow-y-auto">
                {orderBook.bids.map((level, index) => (
                  <div 
                    key={`bid-${index}`}
                    className="grid grid-cols-12 px-4 py-1 text-sm hover:bg-muted/50 cursor-pointer group"
                    onClick={() => handlePriceClick(level.price)}
                  >
                    <div className="col-span-3 text-left text-xs text-muted-foreground">
                      {formatNumber(level.total)}
                    </div>
                    <div className="col-span-4 text-right">
                      {formatNumber(level.quantity)}
                    </div>
                    <div className="col-span-5 text-right font-medium text-green-600 relative">
                      {priceFormatter(level.price)}
                      <div 
                        className="absolute inset-y-0 right-0 bg-green-100/20" 
                        style={{ width: `${level.percentage}%` }}
                      ></div>
                      <div className="opacity-0 group-hover:opacity-100 absolute right-0 -translate-y-1/2 top-1/2 pr-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            createOrderMutation.mutate({ side: 'BUY', price: level.price });
                          }}
                        >
                          <CopyPlus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Ask side */}
            <div className="col-span-6">
              <div className="grid grid-cols-12 px-4 py-2 text-xs font-semibold text-muted-foreground">
                <div className="col-span-5 text-left">Ask Price</div>
                <div className="col-span-4 text-left">Size</div>
                <div className="col-span-3 text-right">Total</div>
              </div>
              
              <div className="max-h-[50vh] overflow-y-auto">
                {orderBook.asks.map((level, index) => (
                  <div 
                    key={`ask-${index}`}
                    className="grid grid-cols-12 px-4 py-1 text-sm hover:bg-muted/50 cursor-pointer group"
                    onClick={() => handlePriceClick(level.price)}
                  >
                    <div className="col-span-5 text-left font-medium text-red-600 relative">
                      <div 
                        className="absolute inset-y-0 left-0 bg-red-100/20" 
                        style={{ width: `${level.percentage}%` }}
                      ></div>
                      {priceFormatter(level.price)}
                      <div className="opacity-0 group-hover:opacity-100 absolute left-0 -translate-y-1/2 top-1/2 pl-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            createOrderMutation.mutate({ side: 'SELL', price: level.price });
                          }}
                        >
                          <CopyPlus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="col-span-4 text-left">
                      {formatNumber(level.quantity)}
                    </div>
                    <div className="col-span-3 text-right text-xs text-muted-foreground">
                      {formatNumber(level.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Spread indicator */}
        {orderBook && (
          <div className="grid grid-cols-12 px-4 py-2 border-t text-sm">
            <div className="col-span-6 text-right pr-4">
              <span className="text-muted-foreground">Spread:</span>{' '}
              <span className="font-medium">{priceFormatter(orderBook.spread)}</span>
            </div>
            <div className="col-span-6 text-left pl-4">
              <span className="text-muted-foreground">Spread %:</span>{' '}
              <span className="font-medium">{orderBook.spreadPercentage.toFixed(4)}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Process order book data for display
function processOrderBookSide(
  levels: [number, number][],
  isBids: boolean,
  groupingFactor: number,
  depth: number
): OrderBookLevel[] {
  // Group levels based on grouping factor
  const groupedLevels = new Map<number, number>();
  
  for (const [price, size] of levels) {
    // Round price based on grouping factor
    const groupedPrice = isBids
      ? Math.floor(price / groupingFactor) * groupingFactor
      : Math.ceil(price / groupingFactor) * groupingFactor;
    
    // Add size to the group
    const currentSize = groupedLevels.get(groupedPrice) || 0;
    groupedLevels.set(groupedPrice, currentSize + size);
  }
  
  // Convert to array and sort
  let processedLevels = Array.from(groupedLevels).map(([price, quantity]) => ({
    price,
    quantity,
    total: 0, // Will calculate below
    percentage: 0 // Will calculate below
  }));
  
  // Sort by price (descending for bids, ascending for asks)
  processedLevels.sort((a, b) => isBids ? b.price - a.price : a.price - b.price);
  
  // Limit to specified depth
  processedLevels = processedLevels.slice(0, depth);
  
  // Calculate cumulative total and percentage
  let cumulativeTotal = 0;
  const maxSize = Math.max(...processedLevels.map(level => level.quantity));
  
  for (let i = 0; i < processedLevels.length; i++) {
    cumulativeTotal += processedLevels[i].quantity;
    processedLevels[i].total = cumulativeTotal;
    processedLevels[i].percentage = (processedLevels[i].quantity / maxSize) * 100;
  }
  
  return processedLevels;
}

// Get a base price for a symbol (for mock data generation)
function getSymbolBasePrice(symbol: string): number {
  const symbolMap: Record<string, number> = {
    'BTC/USDT': 50000,
    'ETH/USDT': 2800,
    'SOL/USDT': 120,
    'BNB/USDT': 550,
    'XRP/USDT': 0.62,
    'ADA/USDT': 0.45,
    'DOGE/USDT': 0.13,
    'AVAX/USDT': 35,
    'DOT/USDT': 7.2,
    'MATIC/USDT': 0.85
  };
  
  return symbolMap[symbol] || 100; // Default to 100 if symbol not found
}

// Skeleton loader for the order book
function OrderBookSkeleton() {
  return (
    <div className="grid grid-cols-12">
      <div className="col-span-6 border-r p-4 space-y-2">
        <div className="grid grid-cols-12 text-xs font-semibold text-muted-foreground">
          <div className="col-span-3 text-left">Total</div>
          <div className="col-span-4 text-right">Size</div>
          <div className="col-span-5 text-right">Bid Price</div>
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={`bid-skel-${i}`} className="grid grid-cols-12 py-1">
            <div className="col-span-3 text-left">
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="col-span-4 text-right">
              <Skeleton className="h-4 w-12 ml-auto" />
            </div>
            <div className="col-span-5 text-right">
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          </div>
        ))}
      </div>
      <div className="col-span-6 p-4 space-y-2">
        <div className="grid grid-cols-12 text-xs font-semibold text-muted-foreground">
          <div className="col-span-5 text-left">Ask Price</div>
          <div className="col-span-4 text-left">Size</div>
          <div className="col-span-3 text-right">Total</div>
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={`ask-skel-${i}`} className="grid grid-cols-12 py-1">
            <div className="col-span-5 text-left">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="col-span-4 text-left">
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="col-span-3 text-right">
              <Skeleton className="h-4 w-12 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
