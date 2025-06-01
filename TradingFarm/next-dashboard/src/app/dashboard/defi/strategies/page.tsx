"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Info, MoreVertical, Plus, RefreshCw, Trash2 } from "lucide-react";
import defiLendingService from "@/services/defi-lending.service";
import { formatEther, formatUnits } from "ethers/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  LendingStrategyType, 
  StrategyExecutionStatus 
} from "@/types/defi-lending.types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useToast } from "@/components/ui/use-toast";

// Helper function to format health factor
const formatHealthFactor = (healthFactor: string) => {
  const value = parseFloat(formatUnits(healthFactor || "0", 18));
  return value.toFixed(2);
};

// Helper to determine status color
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

// Helper for health factor color
const getHealthFactorColor = (healthFactor: number) => {
  if (healthFactor < 1.1) return "text-red-500";
  if (healthFactor < 1.5) return "text-yellow-500";
  return "text-green-500";
};

export default function DefiStrategiesPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const { toast } = useToast();
  
  const [strategies, setStrategies] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [selectedStrategyType, setSelectedStrategyType] = useState(LendingStrategyType.BASIC_SUPPLY_BORROW);
  const [chainId, setChainId] = useState("1"); // Default to Ethereum
  
  // Fetch strategies and agents on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch agents
        const { data: agentData, error: agentError } = await supabase
          .from("agents")
          .select("*");
        
        if (agentError) throw agentError;
        setAgents(agentData || []);
        
        // Fetch strategies
        const { data: strategyData, error: strategyError } = await supabase
          .from("lending_strategies")
          .select(`
            *,
            strategy_positions (*),
            agents (id, name, description)
          `);
        
        if (strategyError) throw strategyError;
        setStrategies(strategyData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load strategies",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up real-time subscription
    const strategySubscription = supabase
      .channel("lending_strategies_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lending_strategies" },
        (payload) => {
          // Refresh strategies when changes occur
          fetchData();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(strategySubscription);
    };
  }, [supabase, toast]);
  
  // Handle strategy creation
  const handleCreateStrategy = () => {
    if (!selectedAgent) {
      toast({
        title: "Error",
        description: "Please select an agent",
        variant: "destructive",
      });
      return;
    }
    
    router.push(`/dashboard/defi/strategies/create?agent=${selectedAgent}&type=${selectedStrategyType}&chain=${chainId}`);
    setDialogOpen(false);
  };
  
  // Handle strategy refresh
  const handleRefreshStrategy = async (strategyId: string) => {
    try {
      setLoading(true);
      await defiLendingService.executeStrategy(strategyId);
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
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-6">
      <DashboardHeader
        heading="DeFi Lending Strategies"
        text="Manage your automated lending and borrowing strategies across multiple chains"
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Strategy
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Lending Strategy</DialogTitle>
              <DialogDescription>
                Configure a new automated lending strategy for your agent
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="agent" className="col-span-1">
                  Agent
                </Label>
                <Select
                  value={selectedAgent}
                  onValueChange={setSelectedAgent}
                >
                  <SelectTrigger id="agent" className="col-span-3">
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="strategyType" className="col-span-1">
                  Strategy Type
                </Label>
                <Select
                  value={selectedStrategyType}
                  onValueChange={(value: any) => setSelectedStrategyType(value)}
                >
                  <SelectTrigger id="strategyType" className="col-span-3">
                    <SelectValue placeholder="Select strategy type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LendingStrategyType.BASIC_SUPPLY_BORROW}>
                      Basic Supply & Borrow
                    </SelectItem>
                    <SelectItem value={LendingStrategyType.RECURSIVE_LOOP}>
                      Recursive Loop (Leveraged)
                    </SelectItem>
                    <SelectItem value={LendingStrategyType.SELF_REPAYING}>
                      Self-Repaying Loan
                    </SelectItem>
                    <SelectItem value={LendingStrategyType.DYNAMIC_LTV}>
                      Dynamic LTV Management
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="chain" className="col-span-1">
                  Blockchain
                </Label>
                <Select
                  value={chainId}
                  onValueChange={setChainId}
                >
                  <SelectTrigger id="chain" className="col-span-3">
                    <SelectValue placeholder="Select blockchain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Ethereum</SelectItem>
                    <SelectItem value="42161">Arbitrum</SelectItem>
                    <SelectItem value="8453">Base</SelectItem>
                    <SelectItem value="10254">Sonic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateStrategy}>Continue</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardHeader>
      
      <Tabs defaultValue="active" className="mt-6">
        <TabsList>
          <TabsTrigger value="active">Active Strategies</TabsTrigger>
          <TabsTrigger value="all">All Strategies</TabsTrigger>
          <TabsTrigger value="risk">Risk Monitor</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : strategies.filter(s => s.status === StrategyExecutionStatus.ACTIVE).length === 0 ? (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No active strategies</AlertTitle>
              <AlertDescription>
                You don't have any active lending strategies. Create one to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {strategies
                .filter(s => s.status === StrategyExecutionStatus.ACTIVE)
                .map(strategy => (
                  <Card key={strategy.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge variant="outline" className={`${getStatusColor(strategy.status)} text-white mb-2`}>
                            {strategy.status}
                          </Badge>
                          <CardTitle className="text-lg">
                            {getStrategyTypeName(strategy.type)}
                          </CardTitle>
                          <CardDescription>
                            Agent: {strategy.agents?.name || "Unknown"}
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/defi/strategies/${strategy.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRefreshStrategy(strategy.id)}>
                              Refresh
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-500">
                              Close Strategy
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-2">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Chain:</span>
                          <span>{getChainName(strategy.chain_id)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Collateral:</span>
                          <span>
                            {shortenAddress(strategy.collateral_asset)} 
                            {strategy.strategy_positions?.[0]?.collateral_amount 
                              ? ` (${formatAmount(strategy.strategy_positions[0].collateral_amount)})`
                              : ''}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Borrowed:</span>
                          <span>
                            {shortenAddress(strategy.borrow_asset)}
                            {strategy.strategy_positions?.[0]?.borrow_amount 
                              ? ` (${formatAmount(strategy.strategy_positions[0].borrow_amount)})`
                              : ''}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Target LTV:</span>
                          <span>{strategy.target_ltv}%</span>
                        </div>
                        
                        {strategy.strategy_positions?.[0]?.health_factor && (
                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-muted-foreground">Health Factor:</span>
                              <span className={`font-medium ${getHealthFactorColor(parseFloat(formatHealthFactor(strategy.strategy_positions[0].health_factor)))}`}>
                                {formatHealthFactor(strategy.strategy_positions[0].health_factor)}
                              </span>
                            </div>
                            <HealthFactorBar healthFactor={parseFloat(formatHealthFactor(strategy.strategy_positions[0].health_factor))} />
                          </div>
                        )}
                      </div>
                    </CardContent>
                    
                    <CardFooter className="pt-2">
                      <Button variant="outline" className="w-full" onClick={() => router.push(`/dashboard/defi/strategies/${strategy.id}`)}>
                        View Details
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="all">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : strategies.length === 0 ? (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No strategies found</AlertTitle>
              <AlertDescription>
                You don't have any lending strategies. Create one to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Strategy Type</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Chain</TableHead>
                    <TableHead>Collateral</TableHead>
                    <TableHead>Borrowed</TableHead>
                    <TableHead>Health Factor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {strategies.map(strategy => (
                    <TableRow key={strategy.id}>
                      <TableCell className="font-medium">
                        {getStrategyTypeName(strategy.type)}
                      </TableCell>
                      <TableCell>{strategy.agents?.name || "Unknown"}</TableCell>
                      <TableCell>{getChainName(strategy.chain_id)}</TableCell>
                      <TableCell>{shortenAddress(strategy.collateral_asset)}</TableCell>
                      <TableCell>{shortenAddress(strategy.borrow_asset)}</TableCell>
                      <TableCell>
                        {strategy.strategy_positions?.[0]?.health_factor ? (
                          <span className={getHealthFactorColor(parseFloat(formatHealthFactor(strategy.strategy_positions[0].health_factor)))}>
                            {formatHealthFactor(strategy.strategy_positions[0].health_factor)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${getStatusColor(strategy.status)} text-white`}>
                          {strategy.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/dashboard/defi/strategies/${strategy.id}`)}
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRefreshStrategy(strategy.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="risk">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Overview</CardTitle>
                  <CardDescription>
                    Monitor your lending positions and risk metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {strategies
                      .filter(s => s.status === StrategyExecutionStatus.ACTIVE && s.strategy_positions?.[0])
                      .sort((a, b) => {
                        const hfA = parseFloat(formatHealthFactor(a.strategy_positions[0]?.health_factor || "0"));
                        const hfB = parseFloat(formatHealthFactor(b.strategy_positions[0]?.health_factor || "0"));
                        return hfA - hfB; // Sort by health factor ascending (riskiest first)
                      })
                      .map(strategy => (
                        <div key={strategy.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <h3 className="font-medium">{getStrategyTypeName(strategy.type)}</h3>
                              <p className="text-sm text-muted-foreground">
                                {strategy.agents?.name || "Unknown"} on {getChainName(strategy.chain_id)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Health Factor</p>
                              <p className={`font-medium ${getHealthFactorColor(parseFloat(formatHealthFactor(strategy.strategy_positions[0].health_factor)))}`}>
                                {formatHealthFactor(strategy.strategy_positions[0].health_factor)}
                              </p>
                            </div>
                          </div>
                          
                          <HealthFactorBar healthFactor={parseFloat(formatHealthFactor(strategy.strategy_positions[0].health_factor))} />
                          
                          <div className="mt-2 text-sm flex justify-between">
                            <span>
                              LTV: {strategy.strategy_positions[0].ltv}% / {strategy.target_ltv}% (target)
                            </span>
                            <Link href={`/dashboard/defi/strategies/${strategy.id}`} className="text-primary hover:underline">
                              View Details
                            </Link>
                          </div>
                        </div>
                      ))}
                    
                    {strategies.filter(s => 
                      s.status === StrategyExecutionStatus.ACTIVE && 
                      s.strategy_positions?.[0]
                    ).length === 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>No active positions</AlertTitle>
                        <AlertDescription>
                          You don't have any active lending positions to monitor.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Health Factor Bar Component
const HealthFactorBar = ({ healthFactor }: { healthFactor: number }) => {
  const getProgressValue = () => {
    if (healthFactor <= 1) return 0;
    if (healthFactor >= 2) return 100;
    return ((healthFactor - 1) / 1) * 100;
  };
  
  const getProgressColor = () => {
    if (healthFactor < 1.1) return "bg-red-500";
    if (healthFactor < 1.5) return "bg-yellow-500";
    return "bg-green-500";
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full">
            <Progress 
              value={getProgressValue()} 
              className="h-2" 
              indicatorClassName={getProgressColor()} 
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {healthFactor < 1 ? "Liquidation Risk!" : 
             healthFactor < 1.1 ? "Critical" :
             healthFactor < 1.5 ? "Warning" : "Safe"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Helper functions
const getStrategyTypeName = (type: string) => {
  switch (type) {
    case LendingStrategyType.BASIC_SUPPLY_BORROW:
      return "Basic Supply & Borrow";
    case LendingStrategyType.RECURSIVE_LOOP:
      return "Recursive Loop (Leveraged)";
    case LendingStrategyType.SELF_REPAYING:
      return "Self-Repaying Loan";
    case LendingStrategyType.DYNAMIC_LTV:
      return "Dynamic LTV Management";
    default:
      return type;
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

const shortenAddress = (address: string) => {
  if (!address) return "-";
  return address.substr(0, 6) + "..." + address.substr(-4);
};

const formatAmount = (amount: string) => {
  try {
    // Simple formatting for demo purposes
    // In production, you'd need to handle different token decimals
    return parseFloat(formatEther(amount)).toFixed(4);
  } catch (error) {
    return amount;
  }
};
