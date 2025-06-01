import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import {
  ArrowUpDown,
  Wallet,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  BarChart3,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

// Import the actual available functions from the trading service
import { 
  submitOrder, 
  getTradingPairs, 
  fetchOrderHistory,
  cancelExistingOrder,
  getMarketData,
  getPositions 
} from '@/services/supabase/trading-service';

// Import functions from other services
import { getRiskProfiles } from '@/services/supabase/risk-service';
import { getWallets } from '@/services/supabase/wallet-service';

// Import market data hook from our utils instead of the original path
import { MarketData } from '@/services/supabase/trading-service';

// Import required components
import TradingChart from './trading-chart';
import OrderBook from './order-book';
import RecentTrades from './recent-trades';
import MarketOverview from './market-overview';
import PositionsList from './positions-list';
import OrderHistory from './order-history';

// Import ElizaOS service
import elizaService, { ElizaOSConfig } from '@/services/eliza/eliza-service';

// Custom hook for market data
function useMarketData(symbol: string, exchange?: string) {
  const [data, setData] = React.useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;
    
    const fetchData = async () => {
      if (!symbol) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const marketData = await getMarketData(symbol, exchange || 'default');
        
        if (isMounted && marketData && marketData.length > 0) {
          setData(marketData[0]);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching market data:', err);
          setError(err instanceof Error ? err : new Error('Failed to fetch market data'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling interval for real-time updates
    intervalId = setInterval(fetchData, 5000); // Update every 5 seconds

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [symbol, exchange]);

  return { 
    data, 
    isLoading, 
    error 
  };
}

// Add ElizaOS integration for AI-powered trading
interface ElizaOSResponse {
  recommendation: string;
  confidence: number;
  explanation: string;
  actions?: {
    type: string;
    params: Record<string, any>;
  }[];
}

function useElizaOS(symbol: string, marketData: MarketData | null, selectedFarm?: string | null) {
  const [aiRecommendation, setAiRecommendation] = React.useState<ElizaOSResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize ElizaOS on component mount
  React.useEffect(() => {
    const initEliza = async () => {
      try {
        // Configure ElizaOS with trading-specific settings
        const config: Partial<ElizaOSConfig> = {
          enabledFeatures: ['marketAnalysis', 'tradeRecommendations', 'riskAssessment'],
          agentCoordination: true
        };
        
        const success = await elizaService.initialize(config);
        setIsInitialized(success);
        
        if (!success) {
          console.warn('ElizaOS initialized with limited functionality');
        }
      } catch (err) {
        console.error('ElizaOS initialization error handled gracefully:', err);
        // We'll still set initialized to true so the UI doesn't break
        setIsInitialized(true);
      }
    };
    
    initEliza();
  }, []);

  const requestAIAnalysis = React.useCallback(async () => {
    if (!symbol || !marketData) return;
    
    setIsLoading(true);
    try {
      // Use the ElizaOS service to get recommendations
      if (!isInitialized && !elizaService.isReady()) {
        await elizaService.initialize();
      }
      
      // In a real implementation, this would call the actual ElizaOS API
      // But for now we'll use our service's method which returns mock data
      console.log(`Requesting AI analysis for ${symbol} from farm ${selectedFarm || 'default'}`);
      
      // Use a more reliable way to get recommendations
      const recommendation = await elizaService.getTradeRecommendation(symbol, {
        marketData,
        farmId: selectedFarm
      });
      
      // Convert to our expected format
      const response: ElizaOSResponse = {
        recommendation: recommendation.action,
        confidence: recommendation.confidence,
        explanation: recommendation.reasoning,
        actions: [
          {
            type: 'PLACE_ORDER',
            params: {
              symbol,
              side: recommendation.action.toLowerCase(),
              type: 'limit',
              price: marketData.lastPrice * (recommendation.action === 'BUY' ? 0.99 : 1.01),
              quantity: 0.01
            }
          }
        ]
      };
      
      setAiRecommendation(response);
      setError(null);
    } catch (err) {
      console.error('Error getting AI recommendation:', err);
      setError(err instanceof Error ? err : new Error('Failed to get AI recommendation'));
    } finally {
      setIsLoading(false);
    }
  }, [symbol, marketData, selectedFarm, isInitialized]);

  return {
    aiRecommendation,
    isLoading,
    error,
    requestAIAnalysis,
    isInitialized: isInitialized || elizaService.isReady()
  };
}

// Types for component props and form values
interface RiskProfileData {
  id: string;
  name: string;
  max_position_size: number;
  max_leverage: number;
  max_drawdown: number;
  user_id: string;
}

interface WalletData {
  id: string;
  name: string;
  balance: number;
  currency: string;
  user_id: string;
}

interface ExchangeAccount {
  id: string;
  name: string;
  type: string;
}

interface OrderResult {
  id: string;
  status: string;
  message: string;
}

interface OrderHistoryItem {
  id: string;
  symbol: string;
  type: string;
  side: string;
  price: number;
  quantity: number;
  status: string;
  createTime: string;
  walletId: string;
}

interface TradingPair {
  id: string;
  symbol: string;
  base_asset: string;
  quote_asset: string;
  exchange: string;
}

interface Exchange {
  id: string;
  name: string;
}

// Define the order form schema with Zod for validation
const orderFormSchema = z.object({
  symbol: z.string().min(1, { message: "Symbol is required" }),
  type: z.enum(["market", "limit", "stop", "stop_limit"]),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive({ message: "Quantity must be positive" }),
  price: z.number().positive({ message: "Price must be positive" }).optional(),
  stopPrice: z.number().positive({ message: "Stop price must be positive" }).optional(),
  walletId: z.string().min(1, { message: "Wallet is required" }),
  exchangeAccountId: z.string().min(1, { message: "Exchange account is required" }),
  riskProfileId: z.string().optional(),
  reduceOnly: z.boolean().default(false),
  postOnly: z.boolean().default(false),
  timeInForce: z.enum(["GTC", "IOC", "FOK"]).default("GTC"),
});

// Type for form values
type OrderFormValues = z.infer<typeof orderFormSchema>;

export default function TradingTerminal() {
  const [selectedPair, setSelectedPair] = React.useState<string>('');
  const [selectedExchange, setSelectedExchange] = React.useState<string>('');
  const [selectedFarm, setSelectedFarm] = React.useState<string | null>(null);
  const [orderSide, setOrderSide] = React.useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = React.useState<'market' | 'limit' | 'stop' | 'stop_limit'>('market');
  const [priceData, setPriceData] = React.useState<any>(null);
  const [availablePairs, setAvailablePairs] = React.useState<TradingPair[]>([]);
  const [availableExchanges, setAvailableExchanges] = React.useState<Exchange[]>([]);
  const [orderHistory, setOrderHistory] = React.useState<OrderHistoryItem[]>([]);
  const [wallets, setWallets] = React.useState<WalletData[]>([]);
  const [riskProfile, setRiskProfile] = React.useState<RiskProfileData | null>(null);
  const [timeframe, setTimeframe] = React.useState<string>('1h');
  const [isLoading, setIsLoading] = React.useState({
    data: false,
    order: false,
    history: false,
    risk: false,
  });
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const { toast } = useToast();

  // Use our market data hook for real-time price updates
  const { data: liveMarketData, isLoading: isMarketDataLoading, error: marketDataError } = 
    useMarketData(selectedPair, selectedExchange);
    
  // Add ElizaOS AI recommendation hook
  const { 
    aiRecommendation, 
    isLoading: isAiLoading, 
    requestAIAnalysis, 
    isInitialized 
  } = useElizaOS(selectedPair, liveMarketData, selectedFarm);

  // Create form
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      symbol: selectedPair,
      type: 'market',
      side: 'buy',
      quantity: 0.01,
      price: undefined,
      stopPrice: undefined,
      walletId: '',
      exchangeAccountId: '1',
      riskProfileId: '',
      reduceOnly: false,
      postOnly: false,
      timeInForce: 'GTC',
    },
  });

  // Watch values to dynamically update form
  const watchOrderType = form.watch('type');
  const watchSide = form.watch('side');
  const watchQuantity = form.watch('quantity');
  const watchPrice = form.watch('price');

  // Load initial data
  React.useEffect(() => {
    loadTradingData();
  }, []);

  // Refresh data when pair changes or refresh is triggered
  React.useEffect(() => {
    if (selectedPair) {
      loadOrderHistory(selectedPair);
    }
  }, [selectedPair, refreshTrigger]);

  // Update form when live market data changes
  React.useEffect(() => {
    if (liveMarketData && watchOrderType === 'market') {
      // Update market price in the form for market orders
      form.setValue('price', liveMarketData.lastPrice);
    }
  }, [liveMarketData, watchOrderType, form]);

  // Update form values when pair or side changes
  React.useEffect(() => {
    if (selectedPair) {
      form.setValue('symbol', selectedPair);
    }
  }, [selectedPair, form]);

  React.useEffect(() => {
    form.setValue('side', orderSide);
  }, [orderSide, form]);

  React.useEffect(() => {
    form.setValue('type', orderType);
  }, [orderType, form]);

  const loadTradingData = async () => {
    setIsLoadingData(true);
    try {
      // Load available trading pairs
      const pairs = await getTradingPairs();
      setAvailablePairs(pairs);
      
      // Load available exchanges
      const { data: exchanges, error: exchangesError } = await fetch('/api/trading/exchanges').then(res => res.json());
      
      if (exchangesError) {
        throw new Error(exchangesError.message);
      }
      
      setAvailableExchanges(exchanges || []);
      
      // Set default pair if available
      if (pairs.length > 0 && !selectedPair) {
        setSelectedPair(pairs[0].symbol);
        form.setValue('symbol', pairs[0].symbol);
      }
      
      // Set default exchange if available
      if (exchanges && exchanges.length > 0 && !selectedExchange) {
        setSelectedExchange(exchanges[0].id);
      }
      
      // Load wallets for trading
      const walletsData = await getWallets();
      setWallets(walletsData);
      
      if (walletsData.length > 0) {
        form.setValue('walletId', walletsData[0].id);
      }
      
      // Load risk profile
      const loadRiskProfile = async () => {
        setIsLoadingRisk(true);
        try {
          const profiles = await getRiskProfiles();
          if (profiles && profiles.length > 0) {
            const riskProfileData = profiles[0] as unknown as RiskProfileData;
            setRiskProfile(riskProfileData);
          }
        } catch (error) {
          console.error("Failed to load risk profile:", error);
          toast({
            title: "Error Loading Risk Profile",
            description: "Failed to load risk profile data. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingRisk(false);
        }
      };
      loadRiskProfile();
      
    } catch (error) {
      console.error('Failed to load trading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load trading data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadOrderHistory = React.useCallback(async (pair: string) => {
    setIsLoadingHistory(true);
    try {
      const history = await fetchOrderHistory(pair, selectedExchange);
      setOrderHistory(history);
    } catch (error) {
      console.error('Failed to load order history:', error);
      toast({
        title: 'Error Loading Orders',
        description: 'Failed to load order history. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingHistory(false);
    }
  }, [selectedExchange, toast]);

  const onSubmit = async (values: OrderFormValues) => {
    setIsLoadingOrder(true);
    try {
      // Prepare order parameters
      const orderParams = {
        symbol: values.symbol,
        exchangeAccountId: values.exchangeAccountId,
        walletId: values.walletId,
        side: values.side as 'buy' | 'sell',
        type: values.type as 'market' | 'limit' | 'stop' | 'stop_limit',
        quantity: values.quantity,
        price: values.price,
        stopPrice: values.stopPrice,
        timeInForce: values.timeInForce as 'GTC' | 'IOC' | 'FOK',
        postOnly: values.postOnly,
        reduceOnly: values.reduceOnly,
        riskProfileId: values.riskProfileId
      };
      
      // Check risk profile before placing order
      const currentRiskProfile = riskProfile;
      
      const tradingLimitExceeded = 
        currentRiskProfile && 
        currentRiskProfile.max_position_size && 
        currentRiskProfile.max_position_size < (orderParams.quantity * (orderParams.price || (liveMarketData?.lastPrice || 0)));
      
      if (tradingLimitExceeded) {
        toast({
          title: "Risk Limit Exceeded",
          description: "This order exceeds your configured risk limits.",
          variant: "destructive",
        });
        return;
      }
      
      // Place the order
      const result = await submitOrder(orderParams);
      
      const orderResult: OrderResult = {
        id: result.id,
        status: result.status,
        message: `Order placed successfully: ${result.id}`
      };

      toast({
        title: "Order Placed",
        description: orderResult.message,
      });

      // Refresh order history
      await loadOrderHistory(values.symbol);
      
      // Reset form fields
      form.reset({
        ...form.getValues(),
        quantity: 0.01,
        price: undefined,
        stopPrice: undefined,
      });
      
      return orderResult;
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: "Order Failed",
        description: error instanceof Error ? error.message : "Failed to place order",
        variant: "destructive",
      });
      
      return {
        id: '',
        status: 'failed',
        message: error instanceof Error ? error.message : "Failed to place order"
      };
    } finally {
      setIsLoadingOrder(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      // Cancel the order
      const result = await cancelExistingOrder(orderId);
      
      if (result.success) {
        toast({
          title: "Order Cancelled",
          description: "Your order has been cancelled successfully.",
          variant: "default",
        });
        
        // Refresh order history if we have a selected pair
        if (selectedPair) {
          await loadOrderHistory(selectedPair);
        }
      } else {
        toast({
          title: "Cancellation Failed",
          description: "Failed to cancel your order. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to cancel order:", error);
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel your order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger((prev: number) => prev + 1);
  };

  const calculateEstimatedValue = () => {
    const quantity = watchQuantity || 0;
    const price = watchPrice || (liveMarketData?.lastPrice || 0);
    return !isNaN(quantity) && !isNaN(price) ? quantity * price : 0;
  };

  // Render market data display
  const renderMarketData = () => {
    if (isMarketDataLoading) {
      return (
        <div className="flex items-center justify-center p-4">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          <span>Loading market data...</span>
        </div>
      );
    }

    if (marketDataError) {
      return (
        <div className="flex items-center justify-center p-4 text-red-500">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <span>Error loading market data</span>
        </div>
      );
    }

    if (liveMarketData) {
      // Calculate 24h price change percentage
      const priceChange = liveMarketData.high24h > 0 
        ? ((liveMarketData.lastPrice - liveMarketData.low24h) / liveMarketData.low24h) * 100 
        : 0;
      const priceDirection = priceChange >= 0 ? 'up' : 'down';

      return (
        <div className="flex flex-col">
          <div className="flex items-end space-x-2">
            <div className="text-2xl font-bold">{liveMarketData.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</div>
            <div className={`flex items-center space-x-1 ${priceDirection === 'up' ? 'text-green-500' : 'text-red-500'}`}>
              {priceDirection === 'up' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="text-sm">{Math.abs(priceChange).toFixed(2)}%</span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            <div className="flex space-x-4">
              <div>Vol: {liveMarketData.volume24h.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
              <div>High: {liveMarketData.high24h.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
              <div>Low: {liveMarketData.low24h.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const setIsLoadingData = React.useCallback((value: boolean) => {
    setIsLoading((prev: typeof isLoading) => ({ ...prev, data: value }));
  }, []);

  const setIsLoadingOrder = React.useCallback((value: boolean) => {
    setIsLoading((prev: typeof isLoading) => ({ ...prev, order: value }));
  }, []);

  const setIsLoadingHistory = React.useCallback((value: boolean) => {
    setIsLoading((prev: typeof isLoading) => ({ ...prev, history: value }));
  }, []);

  const setIsLoadingRisk = React.useCallback((value: boolean) => {
    setIsLoading((prev: typeof isLoading) => ({ ...prev, risk: value }));
  }, []);

  const handleSelectPair = (pair: string) => {
    setSelectedPair(pair);
    form.setValue('symbol', pair);
  };

  const handleSelectExchange = (exchange: string) => {
    setSelectedExchange(exchange);
  };

  const handleSelectPrice = (price: number) => {
    form.setValue('price', price);
  };

  const renderPairOptions = () => {
    return availablePairs.map((pair: TradingPair) => (
      <SelectItem key={pair.id} value={pair.symbol}>
        {pair.symbol}
      </SelectItem>
    ));
  };

  const renderExchangeOptions = () => {
    return availableExchanges.map((exchange: Exchange) => (
      <SelectItem key={exchange.id} value={exchange.id}>
        {exchange.name}
      </SelectItem>
    ));
  };

  const renderWalletOptions = () => {
    return wallets.map((wallet: WalletData) => (
      <SelectItem key={wallet.id} value={wallet.id}>
        {wallet.name} - {wallet.balance} {wallet.currency}
      </SelectItem>
    ));
  };

  const renderOrderHistory = () => {
    return (
      <OrderHistory 
        symbol={selectedPair} 
        refreshTrigger={refreshTrigger} 
      />
    );
  };

  const handleRefreshData = () => {
    setRefreshTrigger((prev: number) => prev + 1);
    loadTradingData();
  };

  // Add a function to apply AI recommendations to the order form
  const applyAiRecommendation = () => {
    if (!aiRecommendation || !aiRecommendation.actions) return;
    
    const orderAction = aiRecommendation.actions.find((a: { type: string }) => a.type === 'PLACE_ORDER');
    if (orderAction && orderAction.params) {
      const { side, type, price, quantity } = orderAction.params;
      
      form.setValue('side', side);
      form.setValue('type', type);
      form.setValue('price', price);
      form.setValue('quantity', quantity);
      
      toast({
        title: "AI Recommendation Applied",
        description: `Applied ${side.toUpperCase()} recommendation to order form`,
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
      {/* Left column - Chart and pair selection */}
      <div className="md:col-span-2 space-y-4">
        <Card className="h-[500px]">
          <CardHeader className="py-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Select
                  value={selectedPair}
                  onValueChange={handleSelectPair}
                  disabled={isLoading.data}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select pair" />
                  </SelectTrigger>
                  <SelectContent>
                    {renderPairOptions()}
                  </SelectContent>
                </Select>
                
                <Select
                  value={selectedExchange}
                  onValueChange={handleSelectExchange}
                  disabled={isLoading.data}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select exchange" />
                  </SelectTrigger>
                  <SelectContent>
                    {renderExchangeOptions()}
                  </SelectContent>
                </Select>
                
                <div className="hidden md:block">
                  {renderMarketData()}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Select
                  value={timeframe}
                  onValueChange={setTimeframe}
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue placeholder="Timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1m</SelectItem>
                    <SelectItem value="5m">5m</SelectItem>
                    <SelectItem value="15m">15m</SelectItem>
                    <SelectItem value="1h">1h</SelectItem>
                    <SelectItem value="4h">4h</SelectItem>
                    <SelectItem value="1d">1d</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleRefreshData}
                  disabled={isLoading.data}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading.data ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-60px)]">
            {selectedPair ? (
              <TradingChart 
                symbol={selectedPair}
                exchangeId={selectedExchange}
                timeframe={timeframe}
                height={440}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a trading pair to view chart
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="md:hidden">
          <Card className="p-4">
            {renderMarketData()}
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-lg">Order Book</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <OrderBook 
                symbol={selectedPair || ''}
                exchangeId={selectedExchange || ''}
                onSelectPrice={handleSelectPrice}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-lg">Recent Trades</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <RecentTrades 
                symbol={selectedPair || ''}
                exchangeId={selectedExchange || ''}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Right column - Order form and info */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-lg">Place Order</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="limit" onValueChange={(value) => setOrderType(value as any)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="market">Market</TabsTrigger>
                <TabsTrigger value="limit">Limit</TabsTrigger>
                <TabsTrigger value="stop">Stop</TabsTrigger>
                <TabsTrigger value="stop_limit">Stop-Limit</TabsTrigger>
              </TabsList>
              
              <div className="mt-4">
                <div className="flex mb-4">
                  <Button
                    type="button"
                    variant={orderSide === 'buy' ? 'default' : 'outline'}
                    className={`w-1/2 ${orderSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                    onClick={() => setOrderSide('buy')}
                  >
                    Buy
                  </Button>
                  <Button
                    type="button"
                    variant={orderSide === 'sell' ? 'default' : 'outline'}
                    className={`w-1/2 ${orderSide === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                    onClick={() => setOrderSide('sell')}
                  >
                    Sell
                  </Button>
                </div>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Pair selection (hidden, handled by the chart's pair selector) */}
                    <FormField
                      control={form.control}
                      name="symbol"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    {/* Order Type (hidden, handled by tabs) */}
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    {/* Order Side (hidden, handled by Buy/Sell buttons) */}
                    <FormField
                      control={form.control}
                      name="side"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    {/* Quantity */}
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.00" type="number" step="0.001" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Price (for limit, stop-limit orders) */}
                    {watchOrderType !== 'market' && (
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="0.00" type="number" step="0.01" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {/* Stop Price (for stop, stop-limit orders) */}
                    {['stop', 'stop_limit'].includes(watchOrderType) && (
                      <FormField
                        control={form.control}
                        name="stopPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stop Price</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="0.00" type="number" step="0.01" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {/* Wallet Selection */}
                    <FormField
                      control={form.control}
                      name="walletId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wallet</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select wallet" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {renderWalletOptions()}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Order Options (Time In Force) */}
                    {watchOrderType !== 'market' && (
                      <FormField
                        control={form.control}
                        name="timeInForce"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time In Force</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Time in force" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="GTC">Good Till Cancelled</SelectItem>
                                <SelectItem value="IOC">Immediate or Cancel</SelectItem>
                                <SelectItem value="FOK">Fill or Kill</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Determines how long the order remains active
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {/* Advanced Options */}
                    <div className="flex space-x-4">
                      {watchOrderType !== 'market' && (
                        <FormField
                          control={form.control}
                          name="postOnly"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel>Post Only</FormLabel>
                            </FormItem>
                          )}
                        />
                      )}
                      
                      <FormField
                        control={form.control}
                        name="reduceOnly"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Reduce Only</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Order Summary */}
                    <div className="bg-muted p-3 rounded-md">
                      <div className="text-sm font-medium mb-2">Order Summary</div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <div className="text-muted-foreground">Estimated Value:</div>
                        <div className="text-right">{calculateEstimatedValue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</div>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className={`w-full ${orderSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                      disabled={isLoading.order}
                    >
                      {isLoading.order ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {orderSide === 'buy' ? 'Buy' : 'Sell'} {selectedPair.split('/')[0]}
                    </Button>
                  </form>
                </Form>
              </div>
            </Tabs>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-lg">Open Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {renderOrderHistory()}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-lg">Positions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <PositionsList 
              symbol={selectedPair || ''}
              exchangeId={selectedExchange || ''}
            />
          </CardContent>
        </Card>
        
        {/* Add AI recommendation section to the trading terminal UI, right before the order form */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-lg">ElizaOS AI Trading Assistant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Get AI-powered trading recommendations</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={requestAIAnalysis}
                  disabled={isAiLoading || !selectedPair}
                >
                  {isAiLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Get AI Analysis
                    </>
                  )}
                </Button>
              </div>
              
              {aiRecommendation ? (
                <div className="rounded-lg border p-3 mt-2">
                  <div className="flex justify-between">
                    <div className={`font-semibold ${aiRecommendation.recommendation === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                      {aiRecommendation.recommendation} 
                      <span className="text-muted-foreground font-normal ml-2">
                        (Confidence: {Math.round(aiRecommendation.confidence * 100)}%)
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={applyAiRecommendation}
                    >
                      Apply
                    </Button>
                  </div>
                  <p className="text-sm mt-2">{aiRecommendation.explanation}</p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Get AI-powered trading recommendations for {selectedPair || 'the selected trading pair'}.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
