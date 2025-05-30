'use client';

// This project may be using Next.js with a different React import approach
import React from 'react';
const { useState, useEffect, useCallback } = React;
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
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';

// Import new API services
import useExchange from '@/services/hooks/use-exchange';
import useSimulation from '@/services/hooks/use-simulation';
import useNotifications from '@/services/hooks/use-notifications';
import { Order } from '@/services/clients/exchange-client';
import type { OrderParams } from '@/services/clients/exchange-client';
import { SimulationTrade, VirtualBalance as SimVirtualBalance } from '@/services/clients/simulation-client';
import { MonitoringService } from '@/services/monitoring-service';

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
  // Use our new hooks instead of direct service instances
  const { toast } = useToast();
  const { 
    getLatestPrice, 
    subscribeToMarket,
    exchange,
    loading: exchangeLoading,
    error: exchangeError,
    lastPrice,
    changeExchange,
    placeOrder
  } = useExchange({ defaultExchange: 'bybit' });
  
  const {
    agentId,
    configId,
    runId,
    currentRun,
    balances: virtualBalances,
    trades,
    metrics,
    loading: simulationLoading,
    error: simulationError,
    loadAgentSimulationConfigs,
    createAgentSimulationConfig,
    startSimulationRun,
    loadVirtualBalances,
    executeTrade,
    selectAgent
  } = useSimulation();
  
  const { createNotification } = useNotifications();
  
  // State
  const [balances, setBalances] = useState<SimVirtualBalance[]>([]);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [price, setPrice] = useState<number | null>(null);
  const [amount, setAmount] = useState('0.001');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [agents, setAgents] = useState<TradingAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  // Effect for fetching and updating latest price
  useEffect(() => {
    if (symbol) {
      getLatestPrice(symbol)
        .then((price: number) => {
          if (price) setPrice(price);
        })
        .catch((err: Error) => {
          console.error('Error fetching price:', err);
          toast({
            title: 'Error',
            description: 'Could not fetch latest price',
            variant: 'destructive'
          });
        });
      
      // Subscribe to real-time updates
      const unsubscribe = subscribeToMarket(symbol, (data: { price?: number }) => {
        if (data?.price) {
          setPrice(data.price);
        }
      });
      
      return () => unsubscribe();
    }
  }, [symbol, getLatestPrice, subscribeToMarket, toast]);
  
  // Effect to update local balances when virtualBalances from simulation hook changes
  useEffect(() => {
    if (virtualBalances && virtualBalances.length > 0) {
      setBalances(virtualBalances);
      setIsInitializing(false);
    }
  }, [virtualBalances]);

  // Load available agents
  useEffect(() => {
    async function loadAgents() {
      try {
        // Get current user ID
        const supabase = createBrowserClient();
        
        // Check and log auth status for debugging
        console.log('Checking auth session...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('Auth session:', sessionData?.session ? 'Valid' : 'None', sessionError);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('No authenticated user found');
          
          // Show a fallback UI with demo agents for testing
          setAgents([
            {
              id: 'demo-1',
              name: 'Demo Bitcoin Trader',
              exchange: 'bybit',
              execution_mode: 'dry-run',
              user_id: 'demo',
              created_at: new Date().toISOString()
            },
            {
              id: 'demo-2',
              name: 'Demo Ethereum Trader',
              exchange: 'coinbase',
              execution_mode: 'dry-run',
              user_id: 'demo',
              created_at: new Date().toISOString()
            }
          ]);
          
          setSelectedAgentId('demo-1');
          if (onAgentSelect) {
            onAgentSelect('demo-1', 'Demo Bitcoin Trader', 'bybit');
          }
          
          toast({
            title: 'Demo Mode Active',
            description: 'Using demo agents since you are not authenticated. Some features will be limited.',
            variant: 'default'
          });
          return;
        }
        
        setUserId(user.id);
        
        // Load agents for this user
        console.log('Loading agents for user:', user.id);
        const { data: agentsData, error } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', user.id)
          .eq('execution_mode', 'dry-run');
        
        if (error) {
          throw error;
        }
        
        if (agentsData && agentsData.length > 0) {
          console.log('Found agents:', agentsData);
          setAgents(agentsData);
          
          // Select the first agent
          setSelectedAgentId(agentsData[0].id);
          if (onAgentSelect) {
            onAgentSelect(agentsData[0].id, agentsData[0].name, agentsData[0].exchange);
          }
        } else {
          console.log('No agents found, creating fallback agent');
          // No agents found, create a fallback demo agent
          const { data: newAgent, error: createError } = await supabase
            .from('agents')
            .insert([
              {
                name: 'Demo Dry Run Agent',
                exchange: 'bybit',
                execution_mode: 'dry-run',
                user_id: user.id
              }
            ])
            .select()
            .single();
          
          if (createError) {
            console.error('Error creating fallback agent:', createError);
            throw createError;
          }
          
          if (newAgent) {
            setAgents([newAgent]);
            setSelectedAgentId(newAgent.id);
            if (onAgentSelect) {
              onAgentSelect(newAgent.id, newAgent.name, newAgent.exchange);
            }
          }
        }
      } catch (error) {
        console.error('Error loading agents:', error);
        toast({
          title: 'Error',
          description: 'Failed to load trading agents. Please try again later.',
          variant: 'destructive'
        });
      }
    }
    
    loadAgents();
  }, [toast, onAgentSelect]);

  // Initialize simulation when agent is selected
  useEffect(() => {
    if (selectedAgentId) {
      initializeSimulation();
    }
  }, [selectedAgentId]);

  // Function to initialize the simulation
  async function initializeSimulation() {
    setIsInitializing(true);
    
    try {
      // Add explicit type annotation to fix TypeScript error
      const agent = agents.find((a: { id: string, exchange: string, name: string }) => a.id === selectedAgentId);
      if (!agent) {
        throw new Error('Selected agent not found');
      }
      
      // Set the exchange from the agent
      if (agent.exchange !== exchange) {
        // Change the exchange which will trigger the price update effect
        changeExchange(agent.exchange);
      }
      
      // Load or create simulation config for this agent
      const configs = await loadAgentSimulationConfigs(agent.id);
      
      let configId;
      if (configs && configs.length > 0) {
        // Use existing config
        configId = configs[0].id;
      } else {
        // Create a new simulation config
        const newConfig = await createAgentSimulationConfig({
          agentId: agent.id,
          simulationModelId: 'default', // This would need to be a valid ID from your models table
          initialBalances: [
            { currency: 'BTC', amount: 1.0 },
            { currency: 'USDT', amount: 50000 },
            { currency: 'ETH', amount: 10.0 }
          ],
          tradingPairs: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
          enabledActions: ['market_order', 'limit_order']
        });
        
        if (newConfig) {
          configId = newConfig.id;
        }
      }
      
      // Start a simulation run if we have a config
      if (configId) {
        const run = await startSimulationRun(configId, {
          startedBy: userId || 'anonymous',
          startedAt: new Date().toISOString()
        });
        
        if (run) {
          // This will trigger the balances loading effect
          console.log('Simulation started:', run.id);
        }
      }
      
      // The balances will be loaded by the effect that watches virtualBalances
      // The price will be updated by the effect that watches symbol

      // Select the agent in our simulation hook
      selectAgent(agent.id);
      
      setIsInitializing(false);
      console.log('Simulation initialized for agent:', agent.name);
      
      // Send notification
      createNotification(
        'Simulation Started',
        `Dry-run trading simulation started for ${agent.name}`,
        'info'
      );
    } catch (error) {
      console.error('Error initializing simulation:', error);
      setIsInitializing(false);
      toast({
        title: 'Error',
        description: 'Failed to initialize trading simulator. Please try again.',
        variant: 'destructive'
      });
    }
  }

  // Handle agent selection
  function handleAgentChange(agentId: string) {
    setSelectedAgentId(agentId);
    
    // Add explicit type annotation to fix TypeScript error
    const agent = agents.find((a: { id: string, exchange: string, name: string }) => a.id === agentId);
    if (agent && onAgentSelect) {
      onAgentSelect(agent.id, agent.name, agent.exchange);
    }
    
    // Reset state
    setPrice(null);
    setBalances([]);
  }
  
  // Reset virtual balances
  async function handleResetBalances() {
    if (!runId) {
      console.error('No active simulation run');
      toast({
        title: 'Error',
        description: 'No active simulation run to reset.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      // Start a new simulation run with the same config
      if (configId) {
        const run = await startSimulationRun(configId, {
          startedBy: userId || 'anonymous',
          startedAt: new Date().toISOString(),
          reset: true
        });
        
        if (run) {
          // This will trigger the balances loading effect
          console.log('Simulation reset with new run:', run.id);
          
          toast({
            title: 'Balances Reset',
            description: 'Virtual balances have been reset to initial values.',
            variant: 'default'
          });
        }
      }
    } catch (error) {
      console.error('Error resetting balances:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset balances. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Place simulated order
  async function handlePlaceOrder() {
    if (!runId) {
      console.error('No active simulation run');
      toast({
        title: 'Error',
        description: 'No active simulation run to place order.',
        variant: 'destructive'
      });
      return;
    }
    
    if (!price) {
      console.error('Price not available');
      return;
    }
    
    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Invalid amount');
      }
      
      let orderPrice = price;
      if (orderType === 'limit') {
        const limitPriceNum = parseFloat(limitPrice);
        if (isNaN(limitPriceNum) || limitPriceNum <= 0) {
          throw new Error('Invalid limit price');
        }
        orderPrice = limitPriceNum;
      }
      
      // Use our executeTrade function from the simulation hook
      const trade = await executeTrade({
        symbol,
        side: side as 'buy' | 'sell',
        type: orderType as 'market' | 'limit',
        amount: amountNum,
        price: orderType === 'limit' ? parseFloat(limitPrice) : undefined
      });
      
      if (trade) {
        console.log('Order placed:', trade);
        
        // Update will happen automatically via the balances effect
        
        toast({
          title: 'Order Executed',
          description: `Successfully placed ${side} order for ${amountNum} ${symbol.slice(0, -4)}`,
          variant: 'default'
        });
        
        // Send notification
        createNotification(
          'Trade Executed',
          `${side.toUpperCase()} ${amountNum} ${symbol.slice(0, -4)} at ${orderPrice}`,
          'success'
        );
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: 'Order Failed',
        description: error instanceof Error ? error.message : 'Failed to place order',
        variant: 'destructive'
      });
    }
  };

  // Calculate estimated cost/proceeds
  function calculateTotal() {
    if (!price || !amount) return '0.00';
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return '0.00';
    
    const usePrice = orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : price;
    if (isNaN(usePrice)) return '0.00';
    
    // Apply a 0.1% fee (this is just an example)
    const total = amountNum * usePrice;
    const fee = total * 0.001;
    
    return side === 'buy' 
      ? (total + fee).toFixed(2)
      : (total - fee).toFixed(2);
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
          <h3 className="font-medium mb-2">Virtual Account Balance</h3>
          <div className="flex justify-between mb-2">
            <h3 className="font-medium">Virtual Account Balance</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResetBalances}
              disabled={isInitializing}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Reset
            </Button>
          </div>
          {balances.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {balances.map((balance: { currency: string, available: number }) => (
                <div key={balance.currency} className="border rounded p-2 text-center">
                  <div className="text-sm text-muted-foreground">{balance.currency}</div>
                  <div className="font-mono">{balance.available.toFixed(4)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-2 text-muted-foreground">
              {isInitializing ? 'Loading balances...' : 'No balance data available'}
            </div>
          )}
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
