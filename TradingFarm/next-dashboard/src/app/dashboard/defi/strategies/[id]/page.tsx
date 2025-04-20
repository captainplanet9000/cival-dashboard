"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";
import { 
  Card, 
  CardContent,
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertCircle, 
  ArrowLeft, 
  BarChart4, 
  Clock, 
  ExternalLink, 
  Hammer, 
  LayoutGrid, 
  RefreshCw, 
  Shield, 
  XCircle 
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useToast } from "@/components/ui/use-toast";
import { formatEther, formatUnits } from "ethers/lib/utils";
import StrategyActions from "@/components/defi/StrategyActions";
import StrategyHealthMetrics from "@/components/defi/StrategyHealthMetrics";
import StrategySettingsPanel from "@/components/defi/StrategySettingsPanel";
import defiLendingService from "@/services/defi-lending.service";
import { 
  LendingStrategyType, 
  StrategyExecutionStatus 
} from "@/types/defi-lending.types";

// Helper functions for formatting
const formatHealthFactor = (healthFactor: string) => {
  const value = parseFloat(formatUnits(healthFactor || "0", 18));
  return value.toFixed(2);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case StrategyExecutionStatus.ACTIVE:
      return "bg-green-500";
    case StrategyExecutionStatus.PENDING:
      return "bg-yellow-500";
    case StrategyExecutionStatus.PAUSED:
      return "bg-blue-500";
    case StrategyExecutionStatus.COMPLETED:
      return "bg-gray-500";
    case StrategyExecutionStatus.FAILED:
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

const getChainName = (chainId: number) => {
  switch (chainId) {
    case 1:
      return "Ethereum";
    case 42161:
      return "Arbitrum";
    case 8453:
      return "Base";
    case 10254:
      return "Sonic";
    default:
      return `Chain ${chainId}`;
  }
};

export default function StrategyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const { toast } = useToast();
  
  const [strategy, setStrategy] = useState<any>(null);
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Fetch strategy data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch strategy details
        const { data: strategyData, error: strategyError } = await supabase
          .from("lending_strategies")
          .select(`
            *,
            strategy_positions (*),
            agents (id, name, description)
          `)
          .eq("id", params.id)
          .single();
        
        if (strategyError) throw strategyError;
        setStrategy(strategyData);
        
        // Fetch strategy actions
        const { data: actionsData, error: actionsError } = await supabase
          .from("strategy_actions")
          .select("*")
          .eq("strategy_id", params.id)
          .order("timestamp", { ascending: false });
        
        if (actionsError) throw actionsError;
        setActions(actionsData || []);
        
      } catch (error) {
        console.error("Error fetching strategy data:", error);
        toast({
          title: "Error",
          description: "Failed to load strategy details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up real-time subscriptions
    const strategySubscription = supabase
      .channel("strategy_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lending_strategies", filter: `id=eq.${params.id}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "strategy_positions", filter: `strategy_id=eq.${params.id}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "strategy_actions", filter: `strategy_id=eq.${params.id}` },
        () => fetchData()
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(strategySubscription);
    };
  }, [params.id, supabase, toast]);
  
  // Handle strategy refresh
  const handleRefreshStrategy = async () => {
    try {
      setRefreshing(true);
      await defiLendingService.refreshStrategy(params.id);
      toast({
        title: "Success",
        description: "Strategy refreshed successfully",
      });
    } catch (error) {
      console.error("Error refreshing strategy:", error);
      toast({
        title: "Error",
        description: "Failed to refresh strategy",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };
  
  // Handle strategy execution
  const handleExecuteStrategy = async () => {
    try {
      setRefreshing(true);
      await defiLendingService.executeStrategy(params.id);
      toast({
        title: "Success",
        description: "Strategy execution started",
      });
    } catch (error) {
      console.error("Error executing strategy:", error);
      toast({
        title: "Error",
        description: "Failed to execute strategy",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };
  
  // Handle strategy closure
  const handleCloseStrategy = async () => {
    // Show confirmation dialog
    if (!window.confirm("Are you sure you want to close this strategy? This will repay all loans and withdraw collateral.")) {
      return;
    }
    
    try {
      setRefreshing(true);
      await defiLendingService.closeStrategy(params.id);
      toast({
        title: "Success",
        description: "Strategy closed successfully",
      });
    } catch (error) {
      console.error("Error closing strategy:", error);
      toast({
        title: "Error",
        description: "Failed to close strategy",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };
  
  // Handle strategy pause/unpause
  const handleTogglePause = async () => {
    try {
      setRefreshing(true);
      if (strategy.status === StrategyExecutionStatus.PAUSED) {
        await defiLendingService.unpauseStrategy(params.id);
        toast({
          title: "Success",
          description: "Strategy resumed successfully",
        });
      } else {
        await defiLendingService.pauseStrategy(params.id);
        toast({
          title: "Success",
          description: "Strategy paused successfully",
        });
      }
    } catch (error) {
      console.error("Error toggling strategy pause:", error);
      toast({
        title: "Error",
        description: "Failed to update strategy status",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <DashboardHeader
          heading={<Skeleton className="h-10 w-1/3" />}
          text={<Skeleton className="h-5 w-1/2" />}
        />
        <div className="grid grid-cols-1 gap-6 mt-6">
          <Skeleton className="h-[300px] w-full rounded-lg" />
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      </div>
    );
  }
  
  if (!strategy) {
    return (
      <div className="container mx-auto p-6">
        <DashboardHeader
          heading="Strategy Not Found"
          text="The requested strategy does not exist or you don't have access to it."
        >
          <Button onClick={() => router.push("/dashboard/defi/strategies")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Strategies
          </Button>
        </DashboardHeader>
        
        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            We couldn't find the strategy you're looking for. It may have been deleted or you may not have permission to view it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const position = strategy.strategy_positions?.[0] || null;
  
  return (
    <div className="container mx-auto p-6">
      <DashboardHeader
        heading={`${getStrategyTypeName(strategy.type)} Strategy`}
        text={`Managed by ${strategy.agents?.name || "Unknown Agent"} on ${getChainName(strategy.chain_id)}`}
      >
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => router.push("/dashboard/defi/strategies")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <Button
            variant="outline"
            onClick={handleRefreshStrategy}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          
          {strategy.status === StrategyExecutionStatus.PENDING && (
            <Button
              onClick={handleExecuteStrategy}
              disabled={refreshing}
            >
              <Hammer className="mr-2 h-4 w-4" />
              Execute
            </Button>
          )}
          
          {(strategy.status === StrategyExecutionStatus.ACTIVE || 
           strategy.status === StrategyExecutionStatus.PAUSED) && (
            <Button
              variant={strategy.status === StrategyExecutionStatus.PAUSED ? "default" : "outline"}
              onClick={handleTogglePause}
              disabled={refreshing}
            >
              {strategy.status === StrategyExecutionStatus.PAUSED ? (
                <>Play</> 
              ) : (
                <>Pause</>
              )}
            </Button>
          )}
          
          {strategy.status !== StrategyExecutionStatus.COMPLETED && (
            <Button
              variant="destructive"
              onClick={handleCloseStrategy}
              disabled={refreshing}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Close
            </Button>
          )}
        </div>
      </DashboardHeader>
      
      {/* Strategy Status Banner */}
      <div className="flex items-center gap-2 mt-2 mb-4">
        <Badge variant="outline" className={`${getStatusColor(strategy.status)} text-white`}>
          {strategy.status}
        </Badge>
        
        {strategy.chain_id && (
          <Badge variant="outline">
            {getChainName(strategy.chain_id)}
          </Badge>
        )}
        
        {position?.health_factor && (
          <Badge variant={
            parseFloat(formatHealthFactor(position.health_factor)) < 1.1 ? "destructive" : 
            parseFloat(formatHealthFactor(position.health_factor)) < 1.5 ? "warning" : "success"
          }>
            Health Factor: {formatHealthFactor(position.health_factor)}
          </Badge>
        )}
      </div>
      
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="actions">
            <Clock className="h-4 w-4 mr-2" />
            Actions Log
          </TabsTrigger>
          <TabsTrigger value="health">
            <Shield className="h-4 w-4 mr-2" />
            Health Metrics
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Hammer className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Position Details</CardTitle>
                <CardDescription>
                  Current state of your lending position
                </CardDescription>
              </CardHeader>
              <CardContent>
                {position ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">Collateral</div>
                        <div className="text-2xl font-bold">
                          {formatAmount(position.collateral_amount)} {getTokenSymbol(strategy.collateral_asset)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {strategy.collateral_asset}
                        </div>
                      </div>
                      
                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">Borrowed</div>
                        <div className="text-2xl font-bold">
                          {formatAmount(position.borrow_amount)} {getTokenSymbol(strategy.borrow_asset)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {strategy.borrow_asset}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">Current LTV</div>
                        <div className="text-2xl font-bold">
                          {position.ltv.toFixed(2)}%
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Target: {strategy.target_ltv}%
                        </div>
                        <Progress
                          value={(position.ltv / strategy.target_ltv) * 100}
                          className="h-1 mt-2"
                        />
                      </div>
                      
                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">Health Factor</div>
                        <div className={`text-2xl font-bold ${
                          parseFloat(formatHealthFactor(position.health_factor)) < 1.1 ? "text-red-500" : 
                          parseFloat(formatHealthFactor(position.health_factor)) < 1.5 ? "text-yellow-500" : 
                          "text-green-500"
                        }`}>
                          {formatHealthFactor(position.health_factor)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Target: {strategy.target_health_factor}
                        </div>
                        <Progress
                          value={Math.min(
                            (parseFloat(formatHealthFactor(position.health_factor)) / strategy.target_health_factor) * 100,
                            100
                          )}
                          className="h-1 mt-2"
                          indicatorClassName={
                            parseFloat(formatHealthFactor(position.health_factor)) < 1.1 ? "bg-red-500" : 
                            parseFloat(formatHealthFactor(position.health_factor)) < 1.5 ? "bg-yellow-500" : 
                            "bg-green-500"
                          }
                        />
                      </div>
                    </div>
                    
                    {position.apy && (
                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">Net APY</div>
                        <div className="text-2xl font-bold">
                          {position.apy > 0 ? "+" : ""}{position.apy.toFixed(2)}%
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No position data</AlertTitle>
                    <AlertDescription>
                      {strategy.status === StrategyExecutionStatus.PENDING
                        ? "This strategy has not been executed yet. Click 'Execute' to start."
                        : "No position data available for this strategy."
                      }
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Strategy Configuration</CardTitle>
                <CardDescription>
                  Current settings for this strategy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Strategy Type</span>
                    <span>{getStrategyTypeName(strategy.type)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Target LTV</span>
                    <span>{strategy.target_ltv}%</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Target Health Factor</span>
                    <span>{strategy.target_health_factor}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Liquidation Protection</span>
                    <span>{strategy.liquidation_protection ? "Enabled" : "Disabled"}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Auto Rebalancing</span>
                    <span>{strategy.auto_rebalancing ? "Enabled" : "Disabled"}</span>
                  </div>
                  
                  {strategy.type === LendingStrategyType.RECURSIVE_LOOP && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Max Iterations</span>
                        <span>{strategy.max_iterations}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Batch Processing</span>
                        <span>{strategy.batch_processing ? "Enabled" : "Disabled"}</span>
                      </div>
                    </>
                  )}
                  
                  {strategy.type === LendingStrategyType.SELF_REPAYING && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Repayment Interval</span>
                        <span>{strategy.repayment_interval} days</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Repayment Threshold</span>
                        <span>{strategy.repayment_threshold}</span>
                      </div>
                    </>
                  )}
                  
                  {strategy.type === LendingStrategyType.DYNAMIC_LTV && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">LTV Range</span>
                        <span>{strategy.ltv_range[0]}% - {strategy.ltv_range[1]}%</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Rebalance Interval</span>
                        <span>{strategy.rebalance_interval} days</span>
                      </div>
                    </>
                  )}
                  
                  <div className="pt-2">
                    <div className="text-sm text-muted-foreground mb-1">Safe Address</div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-mono">{strategy.safe_address}</span>
                      <a 
                        href={`${getBlockExplorerUrl(strategy.chain_id)}/address/${strategy.safe_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-1 md:col-span-3">
              <CardHeader>
                <CardTitle>Recent Actions</CardTitle>
                <CardDescription>
                  Latest activity for this strategy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StrategyActions 
                  actions={actions.slice(0, 5)} 
                  chainId={strategy.chain_id}
                  showViewAll={actions.length > 5}
                  onViewAll={() => {
                    document.querySelector('[data-value="actions"]')?.click();
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="actions">
          <StrategyActions 
            actions={actions}
            chainId={strategy.chain_id}
            showPagination={true}
          />
        </TabsContent>
        
        <TabsContent value="health">
          <StrategyHealthMetrics 
            strategyId={params.id}
            position={position}
            strategy={strategy}
          />
        </TabsContent>
        
        <TabsContent value="settings">
          <StrategySettingsPanel 
            strategy={strategy}
            onUpdate={handleRefreshStrategy}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper functions
const getStrategyTypeName = (type: string) => {
  switch (type) {
    case LendingStrategyType.BASIC_SUPPLY_BORROW:
      return "Basic Supply & Borrow";
    case LendingStrategyType.RECURSIVE_LOOP:
      return "Recursive Loop";
    case LendingStrategyType.SELF_REPAYING:
      return "Self-Repaying Loan";
    case LendingStrategyType.DYNAMIC_LTV:
      return "Dynamic LTV Management";
    default:
      return type;
  }
};

const formatAmount = (amount: string) => {
  try {
    return parseFloat(formatEther(amount || "0")).toFixed(4);
  } catch (error) {
    return "0.0000";
  }
};

const getTokenSymbol = (address: string) => {
  // This would be replaced with a proper token lookup in a real implementation
  const symbols: Record<string, string> = {
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": "WETH",
    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599": "WBTC",
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": "USDC",
    "0x6B175474E89094C44Da98b954EedeAC495271d0F": "DAI",
    "0xdAC17F958D2ee523a2206206994597C13D831ec7": "USDT",
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1": "WETH",
    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f": "WBTC",
    "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8": "USDC",
    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1": "DAI",
    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9": "USDT",
    "0x4200000000000000000000000000000000000006": "WETH",
    "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA": "USDbC",
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913": "USDC",
    "0x5300000000000000000000000000000000000004": "WETH",
    "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4": "USDC",
  };
  
  return symbols[address] || "TOKEN";
};

const getBlockExplorerUrl = (chainId: number) => {
  switch (chainId) {
    case 1:
      return "https://etherscan.io";
    case 42161:
      return "https://arbiscan.io";
    case 8453:
      return "https://basescan.org";
    case 10254:
      return "https://explorer.sonic.io";
    default:
      return "https://etherscan.io";
  }
};
