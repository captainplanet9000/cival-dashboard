"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Loader2, Activity, BarChart2, Wallet, Users, AlertTriangle, RefreshCw, AlertCircle, Bot } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../../../components/ui/alert';
import { useToast } from '../../../../components/ui/use-toast';
import RiskControl from '../risk-control';
import { useFarmData, getDemoFarm } from '@/hooks/useFarmData';
import { Farm, Agent, Wallet as WalletType, RiskProfile } from '@/types/farm-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CommandConsole from '@/components/elizaos/command-console';
import { useElizaOS } from '@/hooks/useElizaOS';
import { Separator } from '@/components/ui/separator';
import { CheckCircle } from 'lucide-react';

// Create QueryClient outside of component to avoid re-creation on renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

// Performance Chart Component will be implemented here or imported

export default function FarmManagementPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <FarmDetailPage />
    </QueryClientProvider>
  );
}

/**
 * Main Farm Detail Page Component
 */
function FarmDetailPage() {
  const params = useParams();
  const farmId = params.id as string;
  const [activeTab, setActiveTab] = React.useState('overview');
  const { toast } = useToast();

  // Fetch farm data using our custom hook
  const { 
    data: { farm, agents, wallets, riskProfile, isOfflineMode }, 
    isLoading, 
    error, 
    retryConnection,
    updateFarm,
    isUpdating
  } = useFarmData(farmId);

  // Fallback to demo data if API connection fails or farm is undefined
  const currentFarm: Farm = farm || getDemoFarm();

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Function to handle status toggle
  const handleStatusToggle = async (isActive: boolean) => {
    try {
      await updateFarm({ is_active: isActive });
      
      toast({
        title: `Farm ${isActive ? 'activated' : 'deactivated'} successfully`,
        description: `Your farm has been ${isActive ? 'activated' : 'deactivated'}.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error updating farm status",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    }
  };

  // ElizaOS integration
  const { 
    executeCommand,
    queryKnowledge,
    getStrategyRecommendations,
    getRiskAnalysis,
    isLoading: elizaLoading,
    error: elizaError
  } = useElizaOS();

  // State for strategy recommendations and risk analysis from ElizaOS
  const [strategyRecommendations, setStrategyRecommendations] = React.useState<{
    strategies: Array<{
      name: string;
      description: string;
      riskLevel: string;
      expectedReturn: number;
      confidence: number;
    }>;
  } | null>(null);
  
  const [riskAnalysis, setRiskAnalysis] = React.useState<{
    analysis: string;
    riskScore: number;
    recommendations: string[];
  } | null>(null);

  // Fetch ElizaOS data when farm is loaded
  React.useEffect(() => {
    if (farm && !isOfflineMode) {
      fetchElizaOSData();
    }
  }, [farm, isOfflineMode]);

  // Fetch strategy recommendations and risk analysis from ElizaOS
  const fetchElizaOSData = async () => {
    if (!farmId || isOfflineMode) return;
    
    try {
      // Fetch strategy recommendations
      const strategies = await getStrategyRecommendations(farmId);
      if (strategies) {
        setStrategyRecommendations(strategies);
      }
      
      // Fetch risk analysis
      const analysis = await getRiskAnalysis(farmId);
      if (analysis) {
        setRiskAnalysis(analysis);
      }
    } catch (error) {
      console.error('Error fetching ElizaOS data:', error);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading farm data...</p>
      </div>
    );
  }

  // Render error state
  if (error && !isOfflineMode) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load farm data: {error instanceof Error ? error.message : 'Unknown error'}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2" 
            onClick={retryConnection}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Render offline mode warning if we're using demo data
  const OfflineWarning = isOfflineMode && (
    <Alert variant="warning" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Offline Mode</AlertTitle>
      <AlertDescription>
        You're viewing demo data because we couldn't connect to the API.
        <Button 
          variant="outline" 
          size="sm" 
          className="ml-2" 
          onClick={retryConnection}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Try Reconnecting
        </Button>
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="space-y-4">
      {OfflineWarning}
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{currentFarm.name}</h2>
          <p className="text-muted-foreground">{currentFarm.description || 'No description provided'}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant={currentFarm.is_active ? "destructive" : "default"} 
            onClick={() => handleStatusToggle(!currentFarm.is_active)}
            disabled={isUpdating || isOfflineMode}
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              currentFarm.is_active ? "Deactivate Farm" : "Activate Farm"
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Agents
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentFarm.agents?.filter(agent => agent.status === 'running').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentFarm.agents?.filter(agent => agent.is_active).length || 0} configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Win Rate
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentFarm.performance_metrics.win_rate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {currentFarm.performance_metrics.trades_count} total trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Assets
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${currentFarm.wallets?.reduce((sum, wallet) => sum + wallet.balance, 0).toLocaleString() || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentFarm.wallets?.length || 0} wallets configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Profit/Loss
            </CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${currentFarm.performance_metrics?.total_profit_loss?.toLocaleString() || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentFarm.performance_metrics.profit_factor ? `${currentFarm.performance_metrics.profit_factor}x profit factor` : 'No profit data'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="wallets">Wallets</TabsTrigger>
            <TabsTrigger value="risk">Risk Management</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="elizaos">ElizaOS AI</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Farm Overview</CardTitle>
                <CardDescription>
                  Summary of your farm's performance and key metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Overview content goes here - Will be implemented with real data */}
                  <p>Status: <span className={currentFarm.is_active ? "text-green-500" : "text-red-500"}>
                    {currentFarm.is_active ? "Active" : "Inactive"}
                  </span></p>
                  <p>Exchange: {currentFarm.exchange || 'Not configured'}</p>
                  <p>Asset Pairs: {currentFarm.asset_pairs?.join(', ') || 'None configured'}</p>
                  <p>Risk Profile: {currentFarm.risk_profile.volatility_tolerance || 'Not set'}</p>
                  <p>Max Drawdown: {currentFarm.risk_profile.max_drawdown}%</p>
                  <p>Created: {new Date(currentFarm.created_at).toLocaleDateString()}</p>
                  
                  {/* Performance charts would go here */}
                  <div className="h-[200px] w-full bg-muted/20 rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Performance chart will be displayed here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trading Agents</CardTitle>
                <CardDescription>
                  Manage your automated trading agents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentFarm.agents && currentFarm.agents.length > 0 ? (
                    <div className="grid gap-4">
                      {currentFarm.agents.map((agent) => (
                        <Card key={agent.id} className="overflow-hidden">
                          <div className={`h-2 ${
                            agent.status === 'running' ? 'bg-green-500' : 
                            agent.status === 'error' ? 'bg-red-500' : 
                            'bg-amber-500'
                          }`} />
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle>{agent.name}</CardTitle>
                                <CardDescription>{agent.description || 'No description'}</CardDescription>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className={`text-xs px-2 py-1 rounded-full ${
                                  agent.status === 'running' ? 'bg-green-100 text-green-700' : 
                                  agent.status === 'error' ? 'bg-red-100 text-red-700' : 
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-2">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm font-medium">Strategy</p>
                                  <p className="text-sm text-muted-foreground">{agent.strategy_name || 'Custom'}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Type</p>
                                  <p className="text-sm text-muted-foreground">{agent.type || 'Unknown'}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Trading Pairs</p>
                                  <p className="text-sm text-muted-foreground">{agent.configuration?.trading_pairs?.join(', ') || 'None'}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Risk Level</p>
                                  <p className="text-sm text-muted-foreground">{agent.configuration?.risk_level || 'Unknown'}</p>
                                </div>
                              </div>
                              
                              {agent.performance && (
                                <div className="mt-4">
                                  <p className="text-sm font-medium">Performance</p>
                                  <div className="grid grid-cols-3 gap-2 mt-1">
                                    <div className="bg-muted rounded-md p-2">
                                      <p className="text-xs text-muted-foreground">Trades</p>
                                      <p className="text-sm font-medium">{agent.performance.trades_count}</p>
                                    </div>
                                    <div className="bg-muted rounded-md p-2">
                                      <p className="text-xs text-muted-foreground">Win Rate</p>
                                      <p className="text-sm font-medium">{agent.performance.win_rate}%</p>
                                    </div>
                                    <div className="bg-muted rounded-md p-2">
                                      <p className="text-xs text-muted-foreground">P/L</p>
                                      <p className="text-sm font-medium">${agent.performance.profit_loss}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {agent.configuration?.use_elizaos && (
                                <div className="mt-2 text-xs inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                  Using ElizaOS AI
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-lg">
                      <p>No agents configured</p>
                      <Button variant="outline" className="mt-2">Add Agent</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Wallets</CardTitle>
                <CardDescription>
                  Manage your trading wallets and funds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentFarm.wallets && currentFarm.wallets.length > 0 ? (
                    <div className="grid gap-4">
                      {currentFarm.wallets.map((wallet) => (
                        <Card key={wallet.id}>
                          <CardHeader>
                            <CardTitle>{wallet.name}</CardTitle>
                            <CardDescription>{wallet.description || 'No description'}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-2">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm font-medium">Balance</p>
                                  <p className="text-lg">{wallet.balance} {wallet.currency}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Type</p>
                                  <p className="text-sm text-muted-foreground">{wallet.wallet_type}</p>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-sm font-medium">Address</p>
                                  <p className="text-xs text-muted-foreground break-all">{wallet.address}</p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-lg">
                      <p>No wallets configured</p>
                      <Button variant="outline" className="mt-2">Add Wallet</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Risk Management</CardTitle>
                <CardDescription>
                  Configure risk parameters and view risk analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RiskControl 
                  riskProfile={riskProfile || {
                    riskScore: 65,
                    factors: [
                      { name: 'Volatility Exposure', impact: 0.7, description: 'High exposure to volatile markets' },
                      { name: 'Diversification', impact: 0.4, description: 'Moderate diversification across assets' },
                      { name: 'Liquidity', impact: 0.3, description: 'Good liquidity in primary markets' },
                    ]
                  }} 
                  farm={currentFarm}
                  onUpdate={!isOfflineMode ? (data: Partial<Farm>) => updateFarm(data) : undefined}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>
                  Detailed performance metrics and analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Performance content would go here */}
                  <p>Coming soon: Advanced performance analytics with AI-powered insights from ElizaOS.</p>
                  
                  <div className="grid gap-4 grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Win Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{currentFarm.performance_metrics.win_rate}%</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Profit Factor</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{currentFarm.performance_metrics.profit_factor || 'N/A'}</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Max Drawdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{currentFarm.risk_profile.max_drawdown}%</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Trades</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{currentFarm.performance_metrics.trades_count}</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="elizaos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ElizaOS AI Command Console</CardTitle>
                <CardDescription>
                  Interact with ElizaOS AI to manage your farm, access knowledge, and control various system features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isOfflineMode ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-lg">
                      <Bot size={48} className="text-muted-foreground mb-4" />
                      <p className="text-center mb-2">ElizaOS AI console is unavailable in offline mode</p>
                      <p className="text-sm text-muted-foreground text-center mb-4">
                        Connect to the backend to interact with the ElizaOS AI trading assistant
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-2" 
                        onClick={retryConnection}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Reconnecting
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 rounded-md border p-4 bg-muted/20">
                        <h3 className="font-medium mb-2">ElizaOS Knowledge Integration</h3>
                        <p className="text-sm mb-3">
                          ElizaOS provides AI-powered trading capabilities with advanced knowledge management. You can:
                        </p>
                        <ul className="text-sm space-y-1 pl-4 list-disc">
                          <li>Query market conditions and trading strategies</li>
                          <li>Request risk analysis and parameter optimization</li>
                          <li>Access the knowledge base for strategy information</li>
                          <li>Control agents and monitor performance metrics</li>
                          <li>Generate AI-optimized trading strategies</li>
                        </ul>
                      </div>

                      <div className="h-[500px]">
                        <CommandConsole 
                          farmId={farmId} 
                          height="full" 
                          autoScroll={true} 
                        />
                      </div>

                      <Separator className="my-6" />
                      
                      {/* AI Strategy Recommendations */}
                      <div className="mt-6">
                        <h3 className="text-lg font-medium mb-4">AI-Generated Strategy Recommendations</h3>
                        
                        {elizaLoading && (
                          <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2">Loading strategy recommendations...</span>
                          </div>
                        )}
                        
                        {strategyRecommendations && strategyRecommendations.strategies.length > 0 ? (
                          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                            {strategyRecommendations.strategies.map((strategy: {
                              name: string;
                              description: string;
                              riskLevel: string;
                              expectedReturn: number;
                              confidence: number;
                            }, index: number) => (
                              <Card key={index} className="overflow-hidden">
                                <CardHeader className={`py-4 ${
                                  strategy.riskLevel === 'low' ? 'bg-green-50 dark:bg-green-900/20' : 
                                  strategy.riskLevel === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20' : 
                                  'bg-red-50 dark:bg-red-900/20'
                                }`}>
                                  <CardTitle className="text-base flex items-center justify-between">
                                    {strategy.name}
                                    <span className={`text-xs font-normal px-2 py-1 rounded-full ${
                                      strategy.riskLevel === 'low' ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300' : 
                                      strategy.riskLevel === 'medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-800/30 dark:text-amber-300' : 
                                      'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300'
                                    }`}>
                                      {strategy.riskLevel.charAt(0).toUpperCase() + strategy.riskLevel.slice(1)} Risk
                                    </span>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="py-4">
                                  <p className="text-sm mb-3">{strategy.description}</p>
                                  <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Expected Return</p>
                                      <p className="font-medium">{strategy.expectedReturn}%</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">AI Confidence</p>
                                      <p className="font-medium">{Math.round(strategy.confidence * 100)}%</p>
                                    </div>
                                  </div>
                                  <Button variant="outline" size="sm" className="w-full mt-4">
                                    Apply Strategy
                                  </Button>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : !elizaLoading && (
                          <div className="flex flex-col items-center justify-center p-6 bg-muted/10 rounded-lg border border-dashed">
                            <p className="text-center text-muted-foreground">
                              No strategy recommendations available yet
                            </p>
                            <Button variant="outline" size="sm" className="mt-2">
                              Generate Recommendations
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <Separator className="my-6" />
                      
                      {/* AI Risk Analysis */}
                      <div className="mt-6">
                        <h3 className="text-lg font-medium mb-4">AI-Powered Risk Analysis</h3>
                        
                        {elizaLoading && (
                          <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2">Loading risk analysis...</span>
                          </div>
                        )}
                        
                        {riskAnalysis ? (
                          <Card>
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-base">Risk Assessment</CardTitle>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-normal">AI Risk Score:</span>
                                  <span className={`text-base font-semibold ${
                                    riskAnalysis.riskScore < 40 ? 'text-green-600' : 
                                    riskAnalysis.riskScore < 70 ? 'text-amber-600' : 
                                    'text-red-600'
                                  }`}>
                                    {riskAnalysis.riskScore}
                                  </span>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-2">
                              <p className="text-sm mb-4">{riskAnalysis.analysis}</p>
                              
                              {riskAnalysis.recommendations.length > 0 && (
                                <div className="mt-4">
                                  <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                                  <ul className="space-y-2">
                                    {riskAnalysis.recommendations.map((recommendation: string, index: number) => (
                                      <li key={index} className="flex gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span>{recommendation}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              <div className="flex justify-end mt-4">
                                <Button variant="outline" size="sm">
                                  Apply Recommendations
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ) : !elizaLoading && (
                          <div className="flex flex-col items-center justify-center p-6 bg-muted/10 rounded-lg border border-dashed">
                            <p className="text-center text-muted-foreground">
                              No risk analysis available yet
                            </p>
                            <Button variant="outline" size="sm" className="mt-2">
                              Generate Risk Analysis
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}