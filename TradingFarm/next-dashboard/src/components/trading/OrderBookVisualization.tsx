import React, { useState, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button-standardized';
import { cn } from '@/lib/utils';
import { useMarketData } from '@/hooks/use-market-data';
import { useOrderManagement } from '@/hooks/use-order-management';

/**
 * @component OrderBookVisualization
 * @description Displays order book data with depth visualization and 1-click trading
 */
export interface OrderBookVisualizationProps {
  symbol: string;
  exchange: string;
  exchangeCredentialId: number;
  maxDepth?: number;
  onPriceSelect?: (price: string, side: 'buy' | 'sell') => void;
}

type OrderBookEntry = {
  price: number;
  amount: number;
  total: number;
  percent: number;
};

export function OrderBookVisualization({
  symbol,
  exchange,
  exchangeCredentialId,
  maxDepth = 15,
  onPriceSelect
}: OrderBookVisualizationProps) {
  // State
  const [groupingIndex, setGroupingIndex] = useState(0);
  const [depthView, setDepthView] = useState<'both' | 'bids' | 'asks'>('both');
  
  // Hooks
  const { orderBook, ticker } = useMarketData(symbol, exchange);
  const { createOrder } = useOrderManagement();
  const { theme } = useTheme();
  
  // Get base and quote assets from symbol
  const [baseAsset, quoteAsset] = symbol.split('/');
  
  // Calculate price precision based on ticker data
  const pricePrecision = useMemo(() => {
    if (!ticker || !ticker.lastPrice) return 2;
    const priceStr = ticker.lastPrice.toString();
    const decimalIndex = priceStr.indexOf('.');
    if (decimalIndex === -1) return 0;
    return priceStr.length - decimalIndex - 1;
  }, [ticker]);
  
  // Available grouping settings
  const groupingOptions = useMemo(() => {
    // Dynamically calculate grouping steps based on price
    if (!ticker || !ticker.lastPrice) return [0.01, 0.1, 1, 10, 100];
    
    const price = ticker.lastPrice;
    if (price < 1) return [0.0001, 0.001, 0.01, 0.1, 1];
    if (price < 10) return [0.001, 0.01, 0.1, 1, 10];
    if (price < 100) return [0.01, 0.1, 1, 5, 10];
    if (price < 1000) return [0.1, 1, 5, 10, 50];
    return [1, 5, 10, 50, 100];
  }, [ticker]);
  
  // Current grouping value
  const grouping = groupingOptions[groupingIndex];
  
  // Process order book data
  const { bids, asks, maxTotal } = useMemo(() => {
    if (!orderBook) {
      return { bids: [], asks: [], maxTotal: 0 };
    }
    
    // Helper function to group and aggregate orders
    const processOrders = (
      orders: [number, number][],
      groupSize: number,
      isAsk: boolean
    ): OrderBookEntry[] => {
      if (!orders || orders.length === 0) return [];
      
      const groupedOrders = new Map<number, number>();
      
      // Group orders by price level
      orders.forEach(([price, amount]) => {
        const groupPrice = isAsk
          ? Math.ceil(price / groupSize) * groupSize
          : Math.floor(price / groupSize) * groupSize;
        
        const currentAmount = groupedOrders.get(groupPrice) || 0;
        groupedOrders.set(groupPrice, currentAmount + amount);
      });
      
      // Convert to array and sort
      let result = Array.from(groupedOrders.entries())
        .map(([price, amount]) => ({ price, amount, total: 0, percent: 0 }));
      
      // Sort appropriately (bids descending, asks ascending)
      result = isAsk
        ? result.sort((a, b) => a.price - b.price)
        : result.sort((a, b) => b.price - a.price);
      
      // Limit to max depth
      result = result.slice(0, maxDepth);
      
      // Calculate cumulative total
      let runningTotal = 0;
      result.forEach(entry => {
        runningTotal += entry.amount;
        entry.total = runningTotal;
      });
      
      return result;
    };
    
    // Process both sides of the book
    const processedBids = processOrders(orderBook.bids, grouping, false);
    const processedAsks = processOrders(orderBook.asks, grouping, true);
    
    // Find max total for visualization scaling
    const bidMaxTotal = processedBids.length > 0 ? processedBids[processedBids.length - 1].total : 0;
    const askMaxTotal = processedAsks.length > 0 ? processedAsks[processedAsks.length - 1].total : 0;
    const maxTotal = Math.max(bidMaxTotal, askMaxTotal);
    
    // Calculate percentage for visualization
    processedBids.forEach(bid => {
      bid.percent = (bid.total / maxTotal) * 100;
    });
    
    processedAsks.forEach(ask => {
      ask.percent = (ask.total / maxTotal) * 100;
    });
    
    return { bids: processedBids, asks: processedAsks, maxTotal };
  }, [orderBook, grouping, maxDepth]);
  
  // Calculate mid price
  const midPrice = useMemo(() => {
    if (!orderBook || !orderBook.bids || !orderBook.asks ||
        orderBook.bids.length === 0 || orderBook.asks.length === 0) {
      return ticker?.lastPrice || 0;
    }
    
    const highestBid = orderBook.bids[0][0];
    const lowestAsk = orderBook.asks[0][0];
    
    return (highestBid + lowestAsk) / 2;
  }, [orderBook, ticker]);
  
  // Handle quick trade
  const handleQuickTrade = async (price: number, side: 'buy' | 'sell') => {
    try {
      await createOrder({
        symbol,
        side,
        type: 'limit',
        quantity: 0.01, // Default small quantity
        price,
        timeInForce: 'GTC',
        exchangeCredentialId,
      });
    } catch (error) {
      console.error('Quick trade failed:', error);
    }
  };
  
  return (
    <Card className="h-full">
      <CardHeader className="py-3 px-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-medium">Order Book</CardTitle>
          <div className="flex items-center space-x-1">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 px-2 text-xs"
              onClick={() => setGroupingIndex(prev => 
                prev > 0 ? prev - 1 : prev
              )}
            >
              -
            </Button>
            <span className="text-xs px-1">{grouping}</span>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 px-2 text-xs"
              onClick={() => setGroupingIndex(prev => 
                prev < groupingOptions.length - 1 ? prev + 1 : prev
              )}
            >
              +
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="both" className="w-full">
          <TabsList className="grid grid-cols-3 h-8 px-4 py-1">
            <TabsTrigger 
              value="both" 
              className="text-xs h-6"
              onClick={() => setDepthView('both')}
            >
              Both
            </TabsTrigger>
            <TabsTrigger 
              value="bids" 
              className="text-xs h-6"
              onClick={() => setDepthView('bids')}
            >
              Bids
            </TabsTrigger>
            <TabsTrigger 
              value="asks" 
              className="text-xs h-6"
              onClick={() => setDepthView('asks')}
            >
              Asks
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="both" className="m-0">
            <div>
              {/* Header row */}
              <div className="grid grid-cols-3 text-xs px-4 py-1 border-b text-muted-foreground">
                <div>Price ({quoteAsset})</div>
                <div className="text-center">Amount ({baseAsset})</div>
                <div className="text-right">Total ({baseAsset})</div>
              </div>
              
              {/* Asks (sell orders) - displayed in reverse order (lowest ask first) */}
              <div className="max-h-[250px] overflow-y-auto">
                {asks.slice().reverse().map((ask, i) => (
                  <div 
                    key={`ask-${ask.price}-${i}`}
                    className="grid grid-cols-3 text-xs px-4 py-1 border-b border-muted hover:bg-muted/50 cursor-pointer relative"
                    onClick={() => {
                      onPriceSelect?.(ask.price.toFixed(pricePrecision), 'buy');
                    }}
                    onDoubleClick={() => handleQuickTrade(ask.price, 'buy')}
                  >
                    {/* Background depth visualization */}
                    <div 
                      className="absolute right-0 top-0 bottom-0 bg-red-500/10"
                      style={{ width: `${ask.percent}%` }}
                    />
                    <div className="text-red-500 z-10">{ask.price.toFixed(pricePrecision)}</div>
                    <div className="text-center z-10">{ask.amount.toFixed(6)}</div>
                    <div className="text-right z-10">{ask.total.toFixed(6)}</div>
                  </div>
                ))}
              </div>
              
              {/* Spread & mid price */}
              <div className="px-4 py-1 bg-muted/30 text-center text-xs">
                <div className="font-medium">
                  {midPrice.toFixed(pricePrecision)} {quoteAsset}
                </div>
                {orderBook && orderBook.bids.length > 0 && orderBook.asks.length > 0 && (
                  <div className="text-muted-foreground text-xs">
                    Spread: {(orderBook.asks[0][0] - orderBook.bids[0][0]).toFixed(pricePrecision)} 
                    {" "}
                    ({(((orderBook.asks[0][0] - orderBook.bids[0][0]) / midPrice) * 100).toFixed(2)}%)
                  </div>
                )}
              </div>
              
              {/* Bids (buy orders) */}
              <div className="max-h-[250px] overflow-y-auto">
                {bids.map((bid, i) => (
                  <div 
                    key={`bid-${bid.price}-${i}`}
                    className="grid grid-cols-3 text-xs px-4 py-1 border-b border-muted hover:bg-muted/50 cursor-pointer relative"
                    onClick={() => {
                      onPriceSelect?.(bid.price.toFixed(pricePrecision), 'sell');
                    }}
                    onDoubleClick={() => handleQuickTrade(bid.price, 'sell')}
                  >
                    {/* Background depth visualization */}
                    <div 
                      className="absolute right-0 top-0 bottom-0 bg-green-500/10"
                      style={{ width: `${bid.percent}%` }}
                    />
                    <div className="text-green-500 z-10">{bid.price.toFixed(pricePrecision)}</div>
                    <div className="text-center z-10">{bid.amount.toFixed(6)}</div>
                    <div className="text-right z-10">{bid.total.toFixed(6)}</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="bids" className="m-0">
            {/* Bids-only view */}
            <div>
              {/* Header row */}
              <div className="grid grid-cols-3 text-xs px-4 py-1 border-b text-muted-foreground">
                <div>Price ({quoteAsset})</div>
                <div className="text-center">Amount ({baseAsset})</div>
                <div className="text-right">Total ({baseAsset})</div>
              </div>
              
              <div className="max-h-[500px] overflow-y-auto">
                {bids.map((bid, i) => (
                  <div 
                    key={`bid-only-${bid.price}-${i}`}
                    className="grid grid-cols-3 text-xs px-4 py-1 border-b border-muted hover:bg-muted/50 cursor-pointer relative"
                    onClick={() => {
                      onPriceSelect?.(bid.price.toFixed(pricePrecision), 'sell');
                    }}
                    onDoubleClick={() => handleQuickTrade(bid.price, 'sell')}
                  >
                    {/* Background depth visualization */}
                    <div 
                      className="absolute right-0 top-0 bottom-0 bg-green-500/10"
                      style={{ width: `${bid.percent}%` }}
                    />
                    <div className="text-green-500 z-10">{bid.price.toFixed(pricePrecision)}</div>
                    <div className="text-center z-10">{bid.amount.toFixed(6)}</div>
                    <div className="text-right z-10">{bid.total.toFixed(6)}</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="asks" className="m-0">
            {/* Asks-only view */}
            <div>
              {/* Header row */}
              <div className="grid grid-cols-3 text-xs px-4 py-1 border-b text-muted-foreground">
                <div>Price ({quoteAsset})</div>
                <div className="text-center">Amount ({baseAsset})</div>
                <div className="text-right">Total ({baseAsset})</div>
              </div>
              
              <div className="max-h-[500px] overflow-y-auto">
                {asks.map((ask, i) => (
                  <div 
                    key={`ask-only-${ask.price}-${i}`}
                    className="grid grid-cols-3 text-xs px-4 py-1 border-b border-muted hover:bg-muted/50 cursor-pointer relative"
                    onClick={() => {
                      onPriceSelect?.(ask.price.toFixed(pricePrecision), 'buy');
                    }}
                    onDoubleClick={() => handleQuickTrade(ask.price, 'buy')}
                  >
                    {/* Background depth visualization */}
                    <div 
                      className="absolute right-0 top-0 bottom-0 bg-red-500/10"
                      style={{ width: `${ask.percent}%` }}
                    />
                    <div className="text-red-500 z-10">{ask.price.toFixed(pricePrecision)}</div>
                    <div className="text-center z-10">{ask.amount.toFixed(6)}</div>
                    <div className="text-right z-10">{ask.total.toFixed(6)}</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
