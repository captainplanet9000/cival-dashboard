'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LineChart, PlayIcon, PauseIcon, PencilIcon, Trash2Icon, CopyIcon, Bot, ChevronLeft, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

import { getStrategyById, deleteStrategy, toggleStrategyActive, runBacktest } from '@/app/actions/strategy-actions';
import { Separator } from '@/components/ui/separator';
import StrategyCommandConsole from '@/components/eliza-integration/strategy-command-console';
import elizaStrategyService, { StrategyKnowledgeType } from '@/services/eliza-strategy-service';

export default function StrategyDetailPage() {
  const params = useParams();
  const strategyId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  
  const [strategy, setStrategy] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [performanceData, setPerformanceData] = React.useState<any>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [elizaAnalyses, setElizaAnalyses] = React.useState<any[]>([]);
  
  // Fetch strategy data
  React.useEffect(() => {
    const fetchStrategy = async () => {
      if (strategyId) {
        try {
          const result = await getStrategyById(strategyId);
          if (result.success && result.data) {
            setStrategy(result.data);
            
            // Initialize ElizaOS connection
            elizaStrategyService.initializeElizaConnection(strategyId);
            
            // Fetch ElizaOS analyses
            const analyses = await elizaStrategyService.getElizaAnalysesForStrategy(strategyId);
            setElizaAnalyses(analyses);
            
            // Run a backtest to get performance data if not available
            if (!result.data.performance_metrics || Object.keys(result.data.performance_metrics).length === 0) {
              try {
                const backtestResult = await runBacktest({
                  strategyId,
                  params: {
                    timeframe: '1h',
                    startDate: '2023-01-01',
                    endDate: '2023-12-31',
                    symbol: 'BTCUSDT'
                  }
                });
                if (backtestResult.success) {
                  setPerformanceData(backtestResult.data);
                }
              } catch (error) {
                console.error('Error running backtest:', error);
              }
            } else {
              setPerformanceData(result.data.performance_metrics);
            }
          } else {
            toast.error(`Error fetching strategy: ${result.error}`);
          }
        } catch (error) {
          console.error('Error fetching strategy:', error);
          toast.error('Failed to load strategy details');
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchStrategy();
    
    // Cleanup ElizaOS connection on unmount
    return () => {
      // Clean up any resources
    };
  }, [strategyId]);
  
  // Toggle strategy active status
  const handleToggleActive = async () => {
    if (!strategy) return;
    
    try {
      const result = await toggleStrategyActive(strategyId);
      if (result.success) {
        setStrategy({
          ...strategy,
          is_active: !strategy.is_active
        });
        toast.success(`Strategy ${strategy.is_active ? 'deactivated' : 'activated'} successfully`);
      } else {
        toast.error(`Failed to toggle strategy: ${result.error}`);
      }
    } catch (error) {
      console.error('Error toggling strategy:', error);
      toast.error('Failed to update strategy status');
    }
  };
  
  // Delete strategy
  const handleDelete = async () => {
    if (!strategy) return;
    
    if (window.confirm(`Are you sure you want to delete "${strategy.name}"? This action cannot be undone.`)) {
      setIsDeleting(true);
      
      try {
        const result = await deleteStrategy(strategyId);
        if (result.success) {
          toast.success('Strategy deleted successfully');
          router.push('/dashboard/strategies');
        } else {
          toast.error(`Failed to delete strategy: ${result.error}`);
          setIsDeleting(false);
        }
      } catch (error) {
        console.error('Error deleting strategy:', error);
        toast.error('Failed to delete strategy');
        setIsDeleting(false);
      }
    }
  };
  
  // Request AI analysis
  const requestAIAnalysis = async (type: StrategyKnowledgeType) => {
    if (!strategy) return;
    
    toast.info('Requesting AI analysis...');
    
    try {
      const strategyData = strategy.content ? JSON.parse(strategy.content) : { nodes: [], edges: [] };
      
      elizaStrategyService.queryElizaKnowledge(
        type,
        {
          id: strategyId,
          name: strategy.name,
          description: strategy.description,
          nodes: strategyData.nodes || [],
          edges: strategyData.edges || []
        }
      );
      
      setActiveTab('elizaos');
    } catch (error) {
      console.error('Error requesting AI analysis:', error);
      toast.error('Failed to request AI analysis');
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!strategy) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center p-6">
              <LineChart className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-2xl font-bold mb-2">Strategy Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The requested strategy could not be found or you don't have permission to access it.
              </p>
              <Button onClick={() => router.push('/dashboard/strategies')}>
                Back to Strategies
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const strategyData = strategy.content ? JSON.parse(strategy.content) : { nodes: [], edges: [] };
  
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push('/dashboard/strategies')}
          className="mr-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{strategy.name}</h1>
        <Badge
          variant={strategy.is_active ? "default" : "outline"}
          className="ml-2"
        >
          {strategy.is_active ? 'Active' : 'Inactive'}
        </Badge>
        
        <div className="ml-auto flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleActive}
          >
            {strategy.is_active ? (
              <>
                <PauseIcon className="mr-2 h-4 w-4" />
                Deactivate
              </>
            ) : (
              <>
                <PlayIcon className="mr-2 h-4 w-4" />
                Activate
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/strategies/builder?edit=${strategyId}`)}
          >
            <PencilIcon className="mr-2 h-4 w-4" />
            Edit
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/strategies/${strategyId}/agent`)}
          >
            <Bot className="mr-2 h-4 w-4" />
            Deploy as Agent
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2Icon className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="visualization">Visualization</TabsTrigger>
          <TabsTrigger value="elizaos">ElizaOS AI</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Strategy Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Description</h3>
                    <p className="text-sm text-muted-foreground">{strategy.description || 'No description provided'}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Type</h3>
                    <p className="text-sm">{strategy.type || 'Custom'}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Version</h3>
                    <p className="text-sm">{strategy.version || '1.0'}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Created</h3>
                    <p className="text-sm">{new Date(strategy.created_at).toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Last Updated</h3>
                    <p className="text-sm">{new Date(strategy.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {performanceData ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Return</p>
                      <p className={`text-2xl font-bold ${(performanceData.total_return || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {typeof performanceData.total_return === 'number' 
                          ? `${(performanceData.total_return * 100).toFixed(2)}%` 
                          : 'N/A'}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                      <p className="text-2xl font-bold">
                        {typeof performanceData.win_rate === 'number' 
                          ? `${(performanceData.win_rate * 100).toFixed(2)}%` 
                          : 'N/A'}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                      <p className="text-2xl font-bold">
                        {typeof performanceData.sharpe_ratio === 'number' 
                          ? performanceData.sharpe_ratio.toFixed(2) 
                          : 'N/A'}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Max Drawdown</p>
                      <p className="text-2xl font-bold text-amber-500">
                        {typeof performanceData.max_drawdown === 'number' 
                          ? `${(performanceData.max_drawdown * 100).toFixed(2)}%` 
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">No performance data available yet.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setActiveTab('performance')}
                    >
                      Run Backtest
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Actions</CardTitle>
              <CardDescription>
                Use ElizaOS AI capabilities to analyze and optimize your strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center"
                  onClick={() => requestAIAnalysis(StrategyKnowledgeType.PERFORMANCE_ANALYSIS)}
                >
                  <LineChart className="h-10 w-10 mb-2" />
                  <span>Analyze Performance</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center"
                  onClick={() => requestAIAnalysis(StrategyKnowledgeType.PARAMETER_OPTIMIZATION)}
                >
                  <Zap className="h-10 w-10 mb-2" />
                  <span>Optimize Parameters</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center"
                  onClick={() => requestAIAnalysis(StrategyKnowledgeType.RISK_ANALYSIS)}
                >
                  <Bot className="h-10 w-10 mb-2" />
                  <span>Analyze Risk</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center"
                  onClick={() => requestAIAnalysis(StrategyKnowledgeType.CODE_GENERATION)}
                >
                  <CopyIcon className="h-10 w-10 mb-2" />
                  <span>Generate Code</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance & Backtest</CardTitle>
              <CardDescription>
                View detailed performance metrics and run backtests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Performance content would go here */}
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Backtest functionality to be implemented</p>
                <Button onClick={() => router.push(`/dashboard/strategies/builder?edit=${strategyId}`)}>
                  Edit in Strategy Builder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="visualization">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Visualization</CardTitle>
              <CardDescription>
                Visual representation of your trading strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Strategy visualization would go here */}
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Strategy has {strategyData.nodes?.length || 0} nodes and {strategyData.edges?.length || 0} connections</p>
                <Button onClick={() => router.push(`/dashboard/strategies/builder?edit=${strategyId}`)}>
                  View in Strategy Builder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="elizaos" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[600px]">
            <StrategyCommandConsole
              strategyId={strategyId}
              strategyName={strategy.name}
              nodes={strategyData.nodes}
              edges={strategyData.edges}
            />
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ElizaOS Integration</CardTitle>
                <CardDescription>
                  AI-powered trading strategy assistance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  ElizaOS provides advanced AI capabilities to analyze, optimize, and execute your trading strategies.
                  Use the command console to interact with ElizaOS and gain insights about your strategy performance.
                </p>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Example Commands</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Analyze my strategy performance</li>
                    <li>Optimize the RSI parameters for better returns</li>
                    <li>What market conditions does this strategy perform best in?</li>
                    <li>Generate Python code for this strategy</li>
                    <li>Explain the strategy logic</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Analyses</CardTitle>
              </CardHeader>
              <CardContent>
                {elizaAnalyses.length > 0 ? (
                  <div className="space-y-4">
                    {elizaAnalyses.slice(0, 3).map((analysis) => (
                      <div key={analysis.id} className="border rounded-md p-3">
                        <div className="flex justify-between">
                          <h4 className="font-medium">{analysis.analysis_type}</h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(analysis.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{analysis.content.substring(0, 100)}...</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">No analyses available yet.</p>
                    <p className="text-sm mt-2">Use the command console to request strategy analyses</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
