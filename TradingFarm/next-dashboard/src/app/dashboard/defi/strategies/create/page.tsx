"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, ChevronLeft, HelpCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useToast } from "@/components/ui/use-toast";
import { 
  LendingStrategyType, 
  InterestRateMode,
  StrategyExecutionStatus,
  StrategyConfig 
} from "@/types/defi-lending.types";
import defiLendingService from "@/services/defi-lending.service";

// Token lists per chain
const tokenLists: Record<string, Array<{symbol: string, address: string}>> = {
  "1": [ // Ethereum
    { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" },
    { symbol: "WBTC", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" },
    { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
    { symbol: "DAI", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F" },
    { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" },
  ],
  "42161": [ // Arbitrum
    { symbol: "WETH", address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" },
    { symbol: "WBTC", address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f" },
    { symbol: "USDC", address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8" },
    { symbol: "DAI", address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" },
    { symbol: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" },
  ],
  "8453": [ // Base
    { symbol: "WETH", address: "0x4200000000000000000000000000000000000006" },
    { symbol: "USDbC", address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" },
    { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
  ],
  "10254": [ // Sonic
    { symbol: "WETH", address: "0x5300000000000000000000000000000000000004" },
    { symbol: "USDC", address: "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4" }
  ]
};

export default function CreateStrategyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserClient();
  const { toast } = useToast();
  
  // Get params from URL
  const agentId = searchParams.get("agent") || "";
  const strategyType = searchParams.get("type") || LendingStrategyType.BASIC_SUPPLY_BORROW;
  const chainId = searchParams.get("chain") || "1";
  
  const [loading, setLoading] = useState(false);
  const [agent, setAgent] = useState<any>(null);
  const [safeAddresses, setSafeAddresses] = useState<string[]>([]);
  
  // Strategy configuration
  const [config, setConfig] = useState<Partial<StrategyConfig>>({
    agentId,
    type: strategyType as LendingStrategyType,
    chainId: parseInt(chainId),
    collateralAsset: "",
    borrowAsset: "",
    initialCollateralAmount: "",
    targetLtv: 50, // 50%
    targetHealthFactor: 1.5,
    liquidationProtection: true,
    autoRebalancing: true,
    maxIterations: strategyType === LendingStrategyType.RECURSIVE_LOOP ? 3 : undefined,
    batchProcessing: true,
    repaymentInterval: strategyType === LendingStrategyType.SELF_REPAYING ? 7 : undefined, // 7 days
    repaymentThreshold: strategyType === LendingStrategyType.SELF_REPAYING ? "0.1" : undefined,
    ltvRange: strategyType === LendingStrategyType.DYNAMIC_LTV ? [40, 60] : undefined,
    rebalanceInterval: strategyType === LendingStrategyType.DYNAMIC_LTV ? 3 : undefined, // 3 days
    interestRateMode: InterestRateMode.VARIABLE,
    safeAddress: ""
  });
  
  // Fetch agent and safe addresses
  useEffect(() => {
    const fetchData = async () => {
      if (!agentId) {
        toast({
          title: "Error",
          description: "No agent selected. Please go back and select an agent.",
          variant: "destructive"
        });
        return;
      }
      
      try {
        // Fetch agent details
        const { data: agentData, error: agentError } = await supabase
          .from("agents")
          .select("*")
          .eq("id", agentId)
          .single();
        
        if (agentError) throw agentError;
        setAgent(agentData);
        
        // Fetch existing Safe addresses for this agent and chain
        const { data: safesData, error: safesError } = await supabase
          .from("agent_safes")
          .select("safe_address")
          .eq("agent_id", agentId)
          .eq("chain_id", chainId);
        
        if (safesError) throw safesError;
        
        const addresses = safesData?.map(s => s.safe_address) || [];
        setSafeAddresses(addresses);
        
        // If there's an existing safe address, use it
        if (addresses.length > 0) {
          setConfig(prev => ({ ...prev, safeAddress: addresses[0] }));
        }
        
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load agent data",
          variant: "destructive"
        });
      }
    };
    
    fetchData();
  }, [agentId, chainId, supabase, toast]);
  
  // Update configuration
  const updateConfig = (key: keyof StrategyConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };
  
  // Handle safe creation if needed
  const handleCreateSafe = async () => {
    try {
      setLoading(true);
      // Call service to create a new Safe
      const safeAddress = await defiLendingService.createSafe(
        parseInt(chainId),
        agentId
      );
      
      // Update the configuration
      setConfig(prev => ({ ...prev, safeAddress }));
      
      // Update the safe addresses list
      setSafeAddresses(prev => [...prev, safeAddress]);
      
      toast({
        title: "Success",
        description: `New Safe wallet created at ${safeAddress}`
      });
    } catch (error) {
      console.error("Error creating Safe:", error);
      toast({
        title: "Error",
        description: "Failed to create Safe wallet",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Create strategy
  const handleCreateStrategy = async () => {
    // Validate configuration
    if (!config.collateralAsset) {
      toast({
        title: "Error",
        description: "Please select a collateral asset",
        variant: "destructive"
      });
      return;
    }
    
    if (!config.borrowAsset) {
      toast({
        title: "Error",
        description: "Please select a borrow asset",
        variant: "destructive"
      });
      return;
    }
    
    if (!config.initialCollateralAmount) {
      toast({
        title: "Error",
        description: "Please enter an initial collateral amount",
        variant: "destructive"
      });
      return;
    }
    
    if (!config.safeAddress) {
      toast({
        title: "Error",
        description: "Please create or select a Safe wallet",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Create the strategy
      const strategyId = await defiLendingService.createStrategy({
        ...config as StrategyConfig,
        status: StrategyExecutionStatus.PENDING
      });
      
      toast({
        title: "Success",
        description: "Strategy created successfully"
      });
      
      // Navigate to the strategy details page
      router.push(`/dashboard/defi/strategies/${strategyId}`);
    } catch (error) {
      console.error("Error creating strategy:", error);
      toast({
        title: "Error",
        description: "Failed to create strategy",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const renderStrategyHelp = () => {
    switch (config.type) {
      case LendingStrategyType.BASIC_SUPPLY_BORROW:
        return (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Basic Supply & Borrow Strategy</AlertTitle>
            <AlertDescription>
              This strategy supplies collateral to Aave and borrows against it. It maintains the target LTV ratio and health factor,
              allowing you to earn interest on your collateral while gaining liquidity through borrowing.
            </AlertDescription>
          </Alert>
        );
      case LendingStrategyType.RECURSIVE_LOOP:
        return (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Recursive Loop Strategy</AlertTitle>
            <AlertDescription>
              This leveraged strategy repeatedly supplies and borrows the same asset to amplify your position.
              Each iteration increases your exposure, potentially increasing returns but also increasing risk.
              Carefully monitor the health factor as this strategy is more volatile.
            </AlertDescription>
          </Alert>
        );
      case LendingStrategyType.SELF_REPAYING:
        return (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Self-Repaying Loan Strategy</AlertTitle>
            <AlertDescription>
              This strategy automatically repays a portion of the borrowed amount based on the specified interval and threshold.
              It's designed for loans that gradually reduce over time, helping you manage debt without manual intervention.
            </AlertDescription>
          </Alert>
        );
      case LendingStrategyType.DYNAMIC_LTV:
        return (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Dynamic LTV Management Strategy</AlertTitle>
            <AlertDescription>
              This strategy adjusts your LTV ratio based on market conditions within the specified range.
              It automatically rebalances your position to maintain optimal capital efficiency while managing risk.
            </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="container mx-auto p-6">
      <DashboardHeader
        heading="Create Lending Strategy"
        text={`Configure a new ${getStrategyTypeName(config.type as LendingStrategyType)} for ${agent?.name || "your agent"}`}
      >
        <Button variant="outline" onClick={() => router.push("/dashboard/defi/strategies")}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Strategies
        </Button>
      </DashboardHeader>
      
      {renderStrategyHelp()}
      
      <div className="grid grid-cols-1 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Configuration</CardTitle>
            <CardDescription>
              Configure the essential parameters for your lending strategy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Chain
                  <InfoTooltip content="The blockchain network where this strategy will be deployed" />
                </Label>
                <Select
                  disabled={true}
                  value={config.chainId?.toString()}
                  onValueChange={value => updateConfig("chainId", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select chain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Ethereum</SelectItem>
                    <SelectItem value="42161">Arbitrum</SelectItem>
                    <SelectItem value="8453">Base</SelectItem>
                    <SelectItem value="10254">Sonic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>
                  Safe Wallet
                  <InfoTooltip content="The Safe wallet that will be used to execute this strategy" />
                </Label>
                <div className="flex space-x-2">
                  <Select
                    value={config.safeAddress}
                    onValueChange={value => updateConfig("safeAddress", value)}
                    disabled={safeAddresses.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={safeAddresses.length === 0 ? "No Safe wallets available" : "Select Safe wallet"} />
                    </SelectTrigger>
                    <SelectContent>
                      {safeAddresses.map(address => (
                        <SelectItem key={address} value={address}>
                          {shortenAddress(address)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleCreateSafe} disabled={loading}>
                    {safeAddresses.length === 0 ? "Create Safe" : "New Safe"}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>
                  Collateral Asset
                  <InfoTooltip content="The asset you'll supply to Aave as collateral" />
                </Label>
                <Select
                  value={config.collateralAsset}
                  onValueChange={value => updateConfig("collateralAsset", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select collateral asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokenLists[chainId]?.map(token => (
                      <SelectItem key={token.address} value={token.address}>
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>
                  Initial Collateral Amount
                  <InfoTooltip content="The amount of collateral to initially supply" />
                </Label>
                <Input
                  type="text"
                  placeholder="0.0"
                  value={config.initialCollateralAmount}
                  onChange={e => updateConfig("initialCollateralAmount", e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>
                  Borrow Asset
                  <InfoTooltip content="The asset you'll borrow from Aave" />
                </Label>
                <Select
                  value={config.borrowAsset}
                  onValueChange={value => updateConfig("borrowAsset", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select borrow asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokenLists[chainId]?.map(token => (
                      <SelectItem key={token.address} value={token.address}>
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>
                  Interest Rate Mode
                  <InfoTooltip content="Variable rates fluctuate with market conditions, while stable rates remain more consistent" />
                </Label>
                <Select
                  value={config.interestRateMode}
                  onValueChange={value => updateConfig("interestRateMode", value as InterestRateMode)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select interest rate mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={InterestRateMode.VARIABLE}>Variable Rate</SelectItem>
                    <SelectItem value={InterestRateMode.STABLE}>Stable Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Risk Parameters</CardTitle>
            <CardDescription>
              Configure risk management settings to protect your position
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>
                  Target LTV Ratio
                  <InfoTooltip content="Loan-to-Value ratio determines how much you can borrow against your collateral" />
                </Label>
                <span className="text-sm font-medium">{config.targetLtv}%</span>
              </div>
              <Slider
                value={[config.targetLtv || 50]}
                min={0}
                max={75}
                step={1}
                onValueChange={value => updateConfig("targetLtv", value[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Conservative (0%)</span>
                <span>Aggressive (75%)</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>
                  Target Health Factor
                  <InfoTooltip content="Health factor below 1.0 will result in liquidation. Higher values are safer." />
                </Label>
                <span className="text-sm font-medium">{config.targetHealthFactor}</span>
              </div>
              <Slider
                value={[config.targetHealthFactor || 1.5]}
                min={1.05}
                max={3}
                step={0.05}
                onValueChange={value => updateConfig("targetHealthFactor", value[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Risky (1.05)</span>
                <span>Very Safe (3.0)</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="liquidation-protection"
                checked={config.liquidationProtection}
                onCheckedChange={value => updateConfig("liquidationProtection", value)}
              />
              <Label htmlFor="liquidation-protection" className="cursor-pointer">
                Enable Liquidation Protection
                <InfoTooltip content="Automatically adjusts positions when health factor becomes too low" />
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-rebalancing"
                checked={config.autoRebalancing}
                onCheckedChange={value => updateConfig("autoRebalancing", value)}
              />
              <Label htmlFor="auto-rebalancing" className="cursor-pointer">
                Enable Auto-Rebalancing
                <InfoTooltip content="Periodically adjusts positions to maintain target LTV ratio" />
              </Label>
            </div>
          </CardContent>
        </Card>
        
        {/* Strategy-specific settings */}
        {config.type === LendingStrategyType.RECURSIVE_LOOP && (
          <Card>
            <CardHeader>
              <CardTitle>Recursive Loop Settings</CardTitle>
              <CardDescription>
                Configure specific parameters for recursive leveraged positions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>
                    Maximum Iterations
                    <InfoTooltip content="Number of supply-borrow cycles to execute" />
                  </Label>
                  <span className="text-sm font-medium">{config.maxIterations || 3}</span>
                </div>
                <Slider
                  value={[config.maxIterations || 3]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={value => updateConfig("maxIterations", value[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low Leverage (1)</span>
                  <span>High Leverage (10)</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="batch-processing"
                  checked={config.batchProcessing}
                  onCheckedChange={value => updateConfig("batchProcessing", value)}
                />
                <Label htmlFor="batch-processing" className="cursor-pointer">
                  Batch Process Transactions
                  <InfoTooltip content="Execute all iterations in a single transaction to save gas fees" />
                </Label>
              </div>
            </CardContent>
          </Card>
        )}
        
        {config.type === LendingStrategyType.SELF_REPAYING && (
          <Card>
            <CardHeader>
              <CardTitle>Self-Repaying Loan Settings</CardTitle>
              <CardDescription>
                Configure automatic loan repayment parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Repayment Interval (Days)
                  <InfoTooltip content="How often repayments are made" />
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={config.repaymentInterval}
                  onChange={e => updateConfig("repaymentInterval", parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>
                  Repayment Threshold
                  <InfoTooltip content="Minimum amount to repay each interval" />
                </Label>
                <Input
                  type="text"
                  placeholder="0.1"
                  value={config.repaymentThreshold}
                  onChange={e => updateConfig("repaymentThreshold", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}
        
        {config.type === LendingStrategyType.DYNAMIC_LTV && (
          <Card>
            <CardHeader>
              <CardTitle>Dynamic LTV Settings</CardTitle>
              <CardDescription>
                Configure LTV range and rebalancing parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>
                    LTV Range
                    <InfoTooltip content="The minimum and maximum LTV for this strategy" />
                  </Label>
                  <span className="text-sm font-medium">
                    {config.ltvRange?.[0] || 40}% - {config.ltvRange?.[1] || 60}%
                  </span>
                </div>
                <Slider
                  value={config.ltvRange || [40, 60]}
                  min={0}
                  max={75}
                  step={1}
                  onValueChange={value => updateConfig("ltvRange", [value[0], value[1]])}
                />
              </div>
              
              <div className="space-y-2">
                <Label>
                  Rebalance Interval (Days)
                  <InfoTooltip content="How often the position is rebalanced" />
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={config.rebalanceInterval}
                  onChange={e => updateConfig("rebalanceInterval", parseInt(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        )}
        
        <CardFooter className="flex justify-end space-x-4 pt-6">
          <Button 
            variant="outline" 
            onClick={() => router.push("/dashboard/defi/strategies")}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateStrategy}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Strategy"}
          </Button>
        </CardFooter>
      </div>
    </div>
  );
}

// Helper components
const InfoTooltip = ({ content }: { content: string }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-4 w-4 ml-1 inline-block text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{content}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// Helper functions
const getStrategyTypeName = (type: LendingStrategyType) => {
  switch (type) {
    case LendingStrategyType.BASIC_SUPPLY_BORROW:
      return "Basic Supply & Borrow Strategy";
    case LendingStrategyType.RECURSIVE_LOOP:
      return "Recursive Loop Strategy";
    case LendingStrategyType.SELF_REPAYING:
      return "Self-Repaying Loan Strategy";
    case LendingStrategyType.DYNAMIC_LTV:
      return "Dynamic LTV Management Strategy";
    default:
      return "Lending Strategy";
  }
};

const shortenAddress = (address: string) => {
  if (!address) return "-";
  return address.substr(0, 6) + "..." + address.substr(-4);
};
