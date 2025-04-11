'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { DryRunExchangeService, OrderParams } from '@/services/exchange-service';
import { SimulationService } from '@/services/simulation-service';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';

interface VirtualBalance {
  asset: string;
  free: number;
  locked: number;
}

interface TradingAgent {
  id: string;
  name: string;
  exchange: string;
  execution_mode: 'live' | 'dry-run';
  user_id: string;
  created_at: string;
}

interface DryRunTradingPanelProps {
  onAgentSelect?: (agentId: string, agentName: string, exchange: string) => void;
}

export default function DryRunTradingPanel({ onAgentSelect }: DryRunTradingPanelProps) {
  const [dryRunService, setDryRunService] = useState<DryRunExchangeService | null>(null);
  const [balances, setBalances] = useState<VirtualBalance[]>([]);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [price, setPrice] = useState<number | null>(null);
  const [amount, setAmount] = useState('0.001');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [agents, setAgents] = useState<TradingAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const { toast } = useToast();

  // Load available agents
  useEffect(() => {
    async function loadAgents() {
      try {
        // Get current user ID
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast({
            title: 'Authentication Error',
            description: 'You must be logged in to use the dry-run trading feature',
            variant: 'destructive'
          });
          return;
        }
        
        setUserId(user.id);
        
        // Load agents for this user
        const { data: agentsData, error } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        if (agentsData && agentsData.length > 0) {
          setAgents(agentsData);
          
          // Set first agent as default if none selected
          if (!selectedAgentId && agentsData.length > 0) {
            const agent = agentsData[0];
            setSelectedAgentId(agent.id);
            
            // Call the callback if provided
            if (onAgentSelect) {
              onAgentSelect(agent.id, agent.name, agent.exchange);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load agents:', error);
        toast({
          title: 'Load Error',
          description: `Error loading agents: ${(error as Error).message}`,
          variant: 'destructive'
        });
      }
    }
    
    loadAgents();
  }, [toast, onAgentSelect]);
  
  // Initialize dry run service
  useEffect(() => {
    async function initializeDryRunService() {
      if (!selectedAgentId || !userId) return;
      
      try {
        setIsInitializing(true);
        
        // Find the selected agent
        const agent = agents.find((a: TradingAgent) => a.id === selectedAgentId);
        if (!agent) {
          toast({
            title: 'Agent Error',
            description: 'Selected agent not found',
            variant: 'destructive'
          });
          return;
        }
        
        // Create the dry run service
        // In a production app, we would use the ExchangeServiceFactory
        // For TypeScript compatibility, we're creating a mock service using any type
        const mockBaseService: any = {
          getAccountBalance: async () => ({
            balances: [
              { asset: 'USDT', free: 10000, locked: 0 },
              { asset: 'BTC', free: 0.5, locked: 0 },
              { asset: 'ETH', free: 5, locked: 0 }
            ]
          }),
          getMarketData: async () => ({}),
          getLatestPrice: async () => 50000 + Math.random() * 1000
        };
        const dryRun = new DryRunExchangeService(mockBaseService, userId);
        setDryRunService(dryRun);
        
        // Load initial balances
        const balanceData = await dryRun.getAccountBalance('dry-run');
        setBalances(balanceData.balances);
        
        // Get initial price
        const currentPrice = await dryRun.getLatestPrice(symbol, 'dry-run');
        setPrice(currentPrice);
        
        setIsInitializing(false);
        
        toast({
          title: 'Dry Run Mode Initialized',
          description: 'Trading simulator is ready with virtual balances'
        });
      } catch (error) {
        console.error('Failed to initialize dry run service:', error);
        toast({
          title: 'Initialization Failed',
          description: `Error: ${(error as Error).message}`,
          variant: 'destructive'
        });
        setIsInitializing(false);
      }
    }
    
    initializeDryRunService();
    
    // Refresh price every 10 seconds
    const priceInterval = setInterval(async () => {
      if (dryRunService) {
        try {
          const currentPrice = await dryRunService.getLatestPrice(symbol, 'dry-run');
          setPrice(currentPrice);
        } catch (error) {
          console.error('Failed to update price:', error);
        }
      }
    }, 10000);
    
    return () => {
      clearInterval(priceInterval);
    };
  }, [symbol, toast, selectedAgentId, userId, agents]);

  // Handle agent selection
  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId);
    const agent = agents.find((a: TradingAgent) => a.id === agentId);
    
    if (agent && onAgentSelect) {
      onAgentSelect(agent.id, agent.name, agent.exchange);
    }
    
    // Re-initialize with the new agent
    setDryRunService(null);
    setBalances([]);
    setPrice(null);
    setIsInitializing(true);
  };
  
  // Reset virtual balances
  const handleResetBalances = async () => {
    if (!dryRunService) return;
    
    try {
      await dryRunService.resetVirtualBalances();
      const balanceData = await dryRunService.getAccountBalance('dry-run');
      setBalances(balanceData.balances);
      
      toast({
        title: 'Balances Reset',
        description: 'Virtual balances have been reset to default values'
      });
    } catch (error) {
      toast({
        title: 'Reset Failed',
        description: `Error: ${(error as Error).message}`,
        variant: 'destructive'
      });
    }
  };

  // Place simulated order
  const handlePlaceOrder = async () => {
    if (!dryRunService || !price) return;
    
    try {
      const orderParams: OrderParams = {
        symbol,
        side,
        type: orderType,
        amount: parseFloat(amount),
        exchange: 'dry-run'
      };
      
      // Add price for limit orders
      if (orderType === 'limit') {
        if (!limitPrice || parseFloat(limitPrice) <= 0) {
          toast({
            title: 'Invalid Price',
            description: 'Please enter a valid limit price',
            variant: 'destructive'
          });
          return;
        }
        orderParams.price = parseFloat(limitPrice);
      }
      
      const result = await dryRunService.placeOrder(orderParams);
      
      // Refresh balances
      const balanceData = await dryRunService.getAccountBalance('dry-run');
      setBalances(balanceData.balances);
      
      toast({
        title: 'Order Executed',
        description: `Successfully placed ${side} order for ${amount} ${symbol} at ${result.price}`,
      });
    } catch (error) {
      toast({
        title: 'Order Failed',
        description: `Error: ${(error as Error).message}`,
        variant: 'destructive'
      });
    }
  };

  // Calculate estimated cost/proceeds
  const calculateTotal = () => {
    if (!price) return '0.00';
    
    const amountNum = parseFloat(amount) || 0;
    const priceToUse = orderType === 'limit' ? (parseFloat(limitPrice) || price) : price;
    const total = amountNum * priceToUse;
    
    // Add 0.1% fee
    const withFee = side === 'buy' ? total * 1.001 : total * 0.999;
    
    return withFee.toFixed(2);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Dry Run Trading</CardTitle>
        <CardDescription>
          Practice trading with virtual assets using real market data
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Agent Selector */}
        <div className="space-y-2">
          <Label htmlFor="agent">Select Trading Agent</Label>
          <Select 
            value={selectedAgentId} 
            onValueChange={handleAgentChange}
            disabled={isInitializing || agents.length === 0}
          >
            <SelectTrigger id="agent">
              <SelectValue placeholder="Select a trading agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent: TradingAgent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name} ({agent.exchange})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {agents.length === 0 && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No agents found</AlertTitle>
              <AlertDescription>
                Create a trading agent first before using dry run mode.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Virtual Balances */}
        <div className="border p-3 rounded-md">
          <h3 className="font-medium mb-2">Virtual Balances</h3>
          <div className="grid grid-cols-3 gap-2">
            {balances.map((balance: VirtualBalance) => (
              <div key={balance.asset} className="flex justify-between p-1 border rounded">
                <span className="font-mono">{balance.asset}:</span>
                <span className="font-mono">{balance.free.toFixed(6)}</span>
              </div>
            ))}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={handleResetBalances}
            disabled={isInitializing}
          >
            Reset Balances
          </Button>
        </div>
        
        {/* Market Data */}
        <div className="border p-3 rounded-md">
          <h3 className="font-medium mb-2">Market Data</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="symbol">Symbol</Label>
              <Select 
                value={symbol} 
                onValueChange={(value: string) => setSymbol(value)}
                disabled={isInitializing}
              >
                <SelectTrigger id="symbol">
                  <SelectValue placeholder="Select Symbol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                  <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                  <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="flex-1">
                <Label>Current Price</Label>
                <div className="border h-10 rounded-md px-3 py-2 bg-muted text-right font-mono">
                  {price ? price.toFixed(2) : 'Loading...'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Order Form */}
        <div className="border p-3 rounded-md">
          <h3 className="font-medium mb-2">Place Order</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <Label htmlFor="side">Side</Label>
              <Select 
                value={side} 
                onValueChange={(value: string) => setSide(value as 'buy' | 'sell')}
                disabled={isInitializing}
              >
                <SelectTrigger id="side">
                  <SelectValue placeholder="Order Side" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type">Order Type</Label>
              <Select 
                value={orderType} 
                onValueChange={(value: string) => setOrderType(value as 'market' | 'limit')}
                disabled={isInitializing}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Order Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="limit">Limit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                type="number"
                step="0.0001"
                min="0.0001"
                disabled={isInitializing}
              />
            </div>
            {orderType === 'limit' && (
              <div>
                <Label htmlFor="limitPrice">Limit Price</Label>
                <Input
                  id="limitPrice"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder={price ? price.toString() : 'Enter price'}
                  type="number"
                  step="0.01"
                  min="0.01"
                  disabled={isInitializing}
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center mb-3">
            <Label>Estimated Total (incl. fees):</Label>
            <div className="font-mono text-right">
              {calculateTotal()} USDT
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          onClick={handlePlaceOrder}
          disabled={isInitializing || !price || parseFloat(amount) <= 0}
          className="w-full"
        >
          {isInitializing ? 'Initializing...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol.slice(0, -4)}`}
        </Button>
      </CardFooter>
    </Card>
  );
}
