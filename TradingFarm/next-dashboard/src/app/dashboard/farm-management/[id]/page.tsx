"use client";

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Loader2, Activity, BarChart2, Wallet, Users, AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../../../components/ui/alert';
import { useToast } from '../../../../components/ui/use-toast';
import RiskControl from '../risk-control';

// Mock API client if the real one is not accessible
// This would be replaced by the actual API client in a production environment
const api = {
  getFarm: async (id: number): Promise<{ data: Farm | null, error: string | null }> => {
    try {
      // In production, this would call the actual API
      // For now, return demo data after a delay to simulate network
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return demo data
      return { 
        data: DEMO_FARM,
        error: null
      };
    } catch (error: any) {
      console.error("API error:", error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  
  updateFarm: async (id: number, data: any): Promise<{ data: { success: boolean } | null, error: string | null }> => {
    try {
      // Simulate update
      await new Promise(resolve => setTimeout(resolve, 500));
      return { 
        data: { success: true }, 
        error: null
      };
    } catch (error: any) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Error updating farm'
      };
    }
  },
  
  getFarmRiskProfile: async (id: number): Promise<{ 
    data: { 
      riskScore: number, 
      factors: Array<{ name: string, impact: number, description: string }> 
    } | null, 
    error: string | null 
  }> => {
    try {
      // Simulate risk profile data
      await new Promise(resolve => setTimeout(resolve, 500));
      return { 
        data: {
          riskScore: 65,
          factors: [
            { name: 'Volatility Exposure', impact: 0.7, description: 'High exposure to volatile markets' },
            { name: 'Diversification', impact: 0.4, description: 'Moderate diversification across assets' },
            { name: 'Liquidity', impact: 0.3, description: 'Good liquidity in primary markets' },
          ]
        }, 
        error: null
      };
    } catch (error: any) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Error fetching risk profile'
      };
    }
  }
};

interface Farm {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  risk_profile: {
    max_drawdown: number;
    max_trade_size?: number;
    risk_per_trade?: number;
    volatility_tolerance?: 'low' | 'medium' | 'high';
  };
  performance_metrics: {
    win_rate: number;
    profit_factor?: number;
    trades_count: number;
    total_profit_loss?: number;
    average_win?: number;
    average_loss?: number;
  };
  created_at: string;
  updated_at: string;
  agents?: Agent[];
  wallets?: Wallet[];
  strategies?: any[];
}

interface Agent {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  status: 'idle' | 'running' | 'error';
  farm_id: number;
  strategy_id?: number;
  strategy_name?: string;
  created_at: string;
  updated_at: string;
  configuration?: {
    exchange?: string;
    api_key?: string;
    secret_key?: string;
    passphrase?: string;
    trading_pairs?: string[];
    risk_level?: number;
    max_order_size?: number;
    use_elizaos?: boolean;
  };
  performance?: {
    trades_count: number;
    win_rate: number;
    profit_loss: number;
  };
}

interface Wallet {
  id: number;
  name: string;
  description?: string;
  balance: number;
  currency: string;
  wallet_type: string;
  is_active: boolean;
  farm_id: number;
  created_at: string;
  updated_at: string;
}

// Demo data to use as fallback when connection fails
const DEMO_FARM: Farm = {
  id: 1,
  name: "Demo Trading Farm",
  description: "This is a demo farm with sample data (connection to Supabase failed)",
  is_active: true,
  risk_profile: {
    max_drawdown: 10,
    max_trade_size: 5000,
    risk_per_trade: 2,
    volatility_tolerance: 'medium'
  },
  performance_metrics: {
    win_rate: 0.65,
    profit_factor: 1.8,
    trades_count: 124,
    total_profit_loss: 8750.5,
    average_win: 215.75,
    average_loss: -125.30
  },
  created_at: "2024-01-15T08:30:00Z",
  updated_at: "2024-04-01T14:22:00Z",
  agents: [
    {
      id: 1,
      name: "BTC Momentum Trader",
      description: "Bitcoin momentum trading with ElizaOS intelligence",
      is_active: true,
      status: 'running',
      farm_id: 1,
      strategy_id: 3,
      strategy_name: "Momentum Strategy v2",
      created_at: "2024-01-20T10:15:00Z",
      updated_at: "2024-03-28T09:45:00Z",
      configuration: {
        exchange: "Binance",
        trading_pairs: ["BTC/USDT", "ETH/USDT"],
        risk_level: 3,
        max_order_size: 2000,
        use_elizaos: true
      },
      performance: {
        trades_count: 87,
        win_rate: 0.68,
        profit_loss: 4500.75
      }
    },
    {
      id: 2,
      name: "ETH Swing Trader",
      description: "Ethereum swing trading strategy",
      is_active: false,
      status: 'idle',
      farm_id: 1,
      strategy_id: 5,
      strategy_name: "ETH Swing Strategy",
      created_at: "2024-02-10T14:30:00Z",
      updated_at: "2024-03-25T16:20:00Z",
      configuration: {
        exchange: "Kraken",
        trading_pairs: ["ETH/USD"],
        risk_level: 2,
        max_order_size: 1500,
        use_elizaos: true
      },
      performance: {
        trades_count: 37,
        win_rate: 0.62,
        profit_loss: 2250.25
      }
    }
  ],
  wallets: [
    {
      id: 1,
      name: "Main Trading Wallet",
      description: "Primary trading funds",
      balance: 24500.75,
      currency: "USDT",
      wallet_type: "Exchange",
      is_active: true,
      farm_id: 1,
      created_at: "2024-01-15T08:30:00Z",
      updated_at: "2024-04-01T14:22:00Z"
    },
    {
      id: 2,
      name: "Reserve Fund",
      description: "Emergency backup funds",
      balance: 10000.0,
      currency: "USD",
      wallet_type: "Fiat",
      is_active: true,
      farm_id: 1,
      created_at: "2024-01-15T08:30:00Z",
      updated_at: "2024-03-15T11:45:00Z"
    }
  ]
};

export default function FarmDetailPage(): JSX.Element {
  const params = useParams();
  const { toast } = useToast();
  const farmId = parseInt(params.id as string, 10);
  const [farm, setFarm] = React.useState<Farm | null>(null);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isConnected, setIsConnected] = React.useState(true);
  const [retryCount, setRetryCount] = React.useState<number>(0);
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 2000;

  // Load farm data
  React.useEffect(() => {
    async function loadFarm() {
      try {
        setLoading(true);
        const response = await api.getFarm(farmId);
        
        if (response.error) {
          // Check if this is a timeout error
          if (response.error.includes('timeout') || response.error.includes('deadline exceeded')) {
            throw new Error('Connection to database timed out. Loading fallback data.');
          } else {
            setError(response.error);
          }
        } else if (response.data) {
          setFarm(response.data);
          setIsConnected(true);
          setError(null);
        }
      } catch (err: any) {
        console.error('Failed to fetch farm details:', err);
        const errorMessage = err.message || 'Failed to fetch farm details';
        
        setError(errorMessage);
        setIsConnected(false);
        
        // Use fallback data if connection fails
        if (!farm) {
          setFarm(DEMO_FARM);
          toast({
            title: "Using demo data",
            description: "Couldn't connect to database. Showing sample data instead.",
            variant: "destructive"
          });
        }
        
        // Attempt retry if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            setRetryCount((prev: number) => prev + 1);
          }, RETRY_DELAY);
        }
      } finally {
        setLoading(false);
      }
    }
    
    if (farmId) {
      loadFarm();
    }
  }, [farmId, retryCount, toast]);

  // Handle farm data refresh
  const handleRefresh = async () => {
    setRetryCount(0); // This will trigger a reload
    toast({
      title: "Refreshing data",
      description: "Attempting to reconnect to database...",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !farm) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
        <p className="font-medium">Error loading farm</p>
        <p>{error || 'Farm not found'}</p>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (value?: number): string => {
    if (value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <div className="space-y-6 p-6">
      {!isConnected && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <span>Using demo data. Connection to database failed.</span>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Retry Connection
            </Button>
          </AlertDescription>
        </Alert>
      )}
    
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{farm?.name}</h1>
          {farm?.description && (
            <p className="text-muted-foreground mt-1">{farm.description}</p>
          )}
        </div>
        
        <div className={`px-2 py-1 rounded text-sm font-medium ${
          farm?.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {farm?.is_active ? 'Active' : 'Inactive'}
        </div>
      </div>
      
      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (farm?.performance_metrics?.total_profit_loss || 0) >= 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {formatCurrency(farm?.performance_metrics?.total_profit_loss)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(farm?.performance_metrics?.win_rate || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Trades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {farm?.performance_metrics?.trades_count || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Max Drawdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatPercentage(farm?.risk_profile?.max_drawdown / 100 || 0)}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Users className="h-4 w-4 mr-2" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="wallets">
            <Wallet className="h-4 w-4 mr-2" />
            Wallets
          </TabsTrigger>
          <TabsTrigger value="risk">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Risk Management
          </TabsTrigger>
          <TabsTrigger value="performance">
            <BarChart2 className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Farm Details</CardTitle>
                <CardDescription>Basic information about this farm</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID</span>
                    <span>{farm?.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{farm?.created_at ? new Date(farm.created_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{farm?.updated_at ? new Date(farm.updated_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Agents</span>
                    <span>{farm?.agents?.filter(a => a.is_active).length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Strategies</span>
                    <span>{farm?.strategies?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Risk Profile</CardTitle>
                <CardDescription>Current risk parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Drawdown</span>
                    <span>{farm?.risk_profile?.max_drawdown || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risk Per Trade</span>
                    <span>{farm?.risk_profile?.risk_per_trade || 1}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Trade Size</span>
                    <span>{formatCurrency(farm?.risk_profile?.max_trade_size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volatility Tolerance</span>
                    <span className="capitalize">{farm?.risk_profile?.volatility_tolerance || 'medium'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>Key trading metrics for this farm</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Win Rate</h3>
                  <p className="text-2xl font-bold">{formatPercentage(farm?.performance_metrics?.win_rate || 0)}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium">Profit Factor</h3>
                  <p className="text-2xl font-bold">{farm?.performance_metrics?.profit_factor?.toFixed(2) || 'N/A'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium">Average Win</h3>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(farm?.performance_metrics?.average_win)}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium">Average Loss</h3>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(farm?.performance_metrics?.average_loss)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Agents Tab */}
        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle>Farm Agents</CardTitle>
              <CardDescription>Trading agents in this farm</CardDescription>
            </CardHeader>
            <CardContent>
              {farm?.agents && farm.agents.length > 0 ? (
                <div className="space-y-4">
                  {farm.agents.map((agent) => (
                    <Card key={agent.id} className="border rounded-md p-4">
                      <CardHeader className="p-0 pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">{agent.name}</CardTitle>
                          <div className="flex gap-2">
                            <div className={`px-2 py-1 rounded-full text-xs ${
                              agent.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {agent.is_active ? 'Active' : 'Inactive'}
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs ${
                              agent.status === 'running' ? 'bg-green-100 text-green-800' : 
                              agent.status === 'error' ? 'bg-red-100 text-red-800' : 
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {agent.status === 'running' ? 'Running' : 
                               agent.status === 'error' ? 'Error' : 'Idle'}
                            </div>
                          </div>
                        </div>
                        <CardDescription>{agent.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0 py-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium">Configuration</h4>
                            <div className="mt-1 space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Exchange</span>
                                <span>{agent.configuration?.exchange || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Trading Pairs</span>
                                <span>{agent.configuration?.trading_pairs?.join(', ') || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Risk Level</span>
                                <span>{agent.configuration?.risk_level || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Strategy</span>
                                <span>{agent.strategy_name || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">ElizaOS AI</span>
                                <span>{agent.configuration?.use_elizaos ? 'Enabled' : 'Disabled'}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium">Performance</h4>
                            <div className="mt-1 space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Trades</span>
                                <span>{agent.performance?.trades_count || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Win Rate</span>
                                <span>{agent.performance ? formatPercentage(agent.performance.win_rate) : 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">P&L</span>
                                <span className={`${agent.performance && agent.performance.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(agent.performance?.profit_loss)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Created</span>
                                <span>{new Date(agent.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No agents found for this farm.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Wallets Tab */}
        <TabsContent value="wallets">
          <Card>
            <CardHeader>
              <CardTitle>Farm Wallets</CardTitle>
              <CardDescription>Connected wallets and balances</CardDescription>
            </CardHeader>
            <CardContent>
              {farm?.wallets && farm.wallets.length > 0 ? (
                <div className="space-y-4">
                  {farm.wallets.map((wallet) => (
                    <div key={wallet.id} className="border rounded-md p-4">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-medium">{wallet.name}</h3>
                          <p className="text-sm text-muted-foreground">{wallet.description || wallet.wallet_type}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {formatCurrency(wallet.balance)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {wallet.currency} • {wallet.wallet_type}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No wallets found for this farm.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Risk Management Tab */}
        <TabsContent value="risk">
          <RiskControl 
            farmId={farmId} 
            initialRiskProfile={farm?.risk_profile}
            onUpdate={handleRefresh}
          />
        </TabsContent>
        
        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Detailed performance metrics and charts</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Performance visualization not yet implemented.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}