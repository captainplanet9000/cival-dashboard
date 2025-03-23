"use client";

// Direct named imports for React hooks
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Zap, ArrowUp, CheckCircle, AlertCircle, PauseCircle, RefreshCw, Plus, MoreVertical, Info, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FarmDropdown } from "@/components/farm-dropdown-menu";
import { io } from '@/services/socket-simulator';
import { TRADING_EVENTS, COMMAND_TYPES } from '@/constants/events';

// Define farm types
type FarmStatus = "active" | "paused" | "error";

type FarmPair = {
  pair: string;
  allocation: number;
  color: string;
};

type Farm = {
  id: string;
  name: string;
  status: FarmStatus;
  totalValue: number;
  yield: {
    value: number;
    trend: "up" | "down";
  };
  pairs: FarmPair[];
  isLoading?: boolean;
};

type ElizaInsight = {
  id: string;
  type: "recommendation" | "alert" | "insight";
  content: string;
  farmId?: string;
  timestamp: Date;
};

// Create a custom Skeleton component since it might not exist in the project
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-secondary ${className || ""}`}></div>;
}

// Mock data
const initialFarms: Farm[] = [
  {
    id: "farm1",
    name: "Bitcoin Yield Farm",
    status: "active",
    totalValue: 82450.27,
    yield: {
      value: 5.8,
      trend: "up",
    },
    pairs: [
      { pair: "BTC-USD", allocation: 70, color: "bg-blue-500" },
      { pair: "BTC-EUR", allocation: 30, color: "bg-purple-500" },
    ],
  },
  {
    id: "farm2",
    name: "Ethereum Yield Farm",
    status: "active",
    totalValue: 42389.15,
    yield: {
      value: 7.2,
      trend: "up",
    },
    pairs: [
      { pair: "ETH-USD", allocation: 60, color: "bg-blue-500" },
      { pair: "ETH-EUR", allocation: 40, color: "bg-purple-500" },
    ],
  },
  {
    id: "farm3",
    name: "DeFi Basket",
    status: "paused",
    totalValue: 28521.90,
    yield: {
      value: 3.5,
      trend: "down",
    },
    pairs: [
      { pair: "UNI-USD", allocation: 25, color: "bg-pink-500" },
      { pair: "AAVE-USD", allocation: 35, color: "bg-indigo-500" },
      { pair: "SNX-USD", allocation: 40, color: "bg-yellow-500" },
    ],
  },
  {
    id: "farm4",
    name: "Stablecoin Farm",
    status: "error",
    totalValue: 15788.42,
    yield: {
      value: 2.1,
      trend: "up",
    },
    pairs: [
      { pair: "USDC-USD", allocation: 50, color: "bg-blue-500" },
      { pair: "DAI-USD", allocation: 50, color: "bg-green-500" },
    ],
  },
];

// Mock ElizaOS insights
const mockElizaInsights: ElizaInsight[] = [
  {
    id: "insight1",
    type: "recommendation",
    content: "Consider increasing Bitcoin allocation in the Bitcoin Yield Farm to capitalize on current market trends.",
    farmId: "farm1",
    timestamp: new Date(),
  },
  {
    id: "insight2",
    type: "alert",
    content: "Stablecoin Farm is experiencing liquidity issues due to market volatility. Consider pausing operations.",
    farmId: "farm4",
    timestamp: new Date(),
  },
  {
    id: "insight3",
    type: "insight",
    content: "Ethereum yield has increased 12% this week. The current allocation is performing optimally.",
    farmId: "farm2",
    timestamp: new Date(),
  },
  {
    id: "insight4",
    type: "recommendation",
    content: "The DeFi Basket farm underperformance is temporary. Market analysis suggests improvements within 48 hours.",
    farmId: "farm3",
    timestamp: new Date(),
  },
  {
    id: "insight5",
    type: "insight",
    content: "Based on historical data, now is an optimal time to create a new Solana-based yield farm.",
    timestamp: new Date(),
  },
];

export default function FarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [elizaInsights, setElizaInsights] = useState<ElizaInsight[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [showInsights, setShowInsights] = useState(true);

  // Connect to socket
  useEffect(() => {
    // Initialize socket
    const socket = io;
    
    // For demo purposes, we'll simulate socket events with mock data
    setTimeout(() => {
      setIsConnected(true);
      setFarms(initialFarms);
      setElizaInsights(mockElizaInsights);
      setIsLoading(false);
    }, 1000);

    // In an actual implementation, we would set up event listeners like this:
    // socket.on('connect', () => {
    //   setIsConnected(true);
    //   // Initialize with data
    // });
    //
    // socket.on(TRADING_EVENTS.FARM_UPDATE, (updatedFarm) => {
    //   setFarms(currentFarms => 
    //     currentFarms.map(farm => 
    //       farm.id === updatedFarm.id ? { ...updatedFarm, isLoading: false } : farm
    //     )
    //   );
    // });

    return () => {
      // Clean up
    };
  }, []);

  // Refresh farms data
  const refreshFarms = () => {
    setIsLoading(true);
    // In a real app, we would emit an event to request fresh data
    // Here we'll just simulate it with a timeout
    setTimeout(() => {
      setFarms(initialFarms);
      setIsLoading(false);
    }, 1000);
  };

  // Request ElizaOS analysis
  const requestElizaAnalysis = () => {
    // In a real app, we would emit a knowledge query event
    // Here we'll simulate it:
    
    // Simulate response
    setTimeout(() => {
      const newInsight: ElizaInsight = {
        id: `insight${Date.now()}`,
        type: "insight",
        content: "Analysis shows that yield farming strategies with more diverse asset allocation are currently outperforming single-asset strategies by 8.3% on average.",
        timestamp: new Date()
      };
      setElizaInsights((prev: ElizaInsight[]) => [newInsight, ...prev]);
    }, 1500);
  };

  // Handle farm action (pause/resume)
  const handleFarmAction = (farmId: string, action: "pause" | "resume" | "delete") => {
    // Mark the farm as loading to show feedback
    setFarms((currentFarms: Farm[]) => 
      currentFarms.map((farm: Farm) => 
        farm.id === farmId ? { ...farm, isLoading: true } : farm
      )
    );

    // In a real app, we would emit an event to the server
    // Here we'll just simulate it with a timeout
    setTimeout(() => {
      if (action === "delete") {
        setFarms((currentFarms: Farm[]) => currentFarms.filter((farm: Farm) => farm.id !== farmId));
      } else {
        const newStatus: FarmStatus = action === "pause" ? "paused" : "active";
        setFarms((currentFarms: Farm[]) => 
          currentFarms.map((farm: Farm) => 
            farm.id === farmId ? { ...farm, status: newStatus, isLoading: false } : farm
          )
        );
      }
    }, 500);
  };

  // Filter farms based on the active tab
  const filteredFarms = farms.filter((farm: Farm) => {
    if (activeTab === "all") return true;
    return farm.status === activeTab;
  });

  // Filter insights based on farm visibility
  const filteredInsights = elizaInsights.filter((insight: ElizaInsight) => {
    if (!insight.farmId) return true; // Global insights
    const farm = farms.find((f: Farm) => f.id === insight.farmId);
    if (!farm) return false;
    return activeTab === "all" || farm.status === activeTab;
  });

  // Count farms by status
  const activeFarmsCount = farms.filter((farm: Farm) => farm.status === "active").length;
  const totalFarmsCount = farms.length;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-8 w-32" />
                    </div>
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-8 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-24 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Trading Farms</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border rounded-md px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Active Farms:</span>
            <span className="flex items-center gap-1.5">
              <span className="status-indicator status-active"></span>
              <span className="text-sm font-medium">{activeFarmsCount}/{totalFarmsCount}</span>
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={refreshFarms}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowInsights(!showInsights)}>
            <Brain className="h-4 w-4 mr-2" />
            {showInsights ? "Hide Insights" : "Show Insights"}
          </Button>
          <Button variant="outline" size="sm" onClick={requestElizaAnalysis}>
            <Info className="h-4 w-4 mr-2" />
            ElizaOS Analysis
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Farm
          </Button>
        </div>
      </div>

      {showInsights && filteredInsights.length > 0 && (
        <Card className="bg-slate-900 border-slate-800 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Brain className="mr-2 h-5 w-5 text-indigo-400" />
              <span className="text-indigo-300">ElizaOS Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredInsights.slice(0, 3).map((insight: ElizaInsight) => (
                <div
                  key={insight.id}
                  className={`p-3 rounded-md ${
                    insight.type === "alert" 
                      ? "bg-red-950/40 border border-red-800/40" 
                      : insight.type === "recommendation" 
                        ? "bg-amber-950/30 border border-amber-800/40" 
                        : "bg-slate-800/50 border border-slate-700/40"
                  }`}
                >
                  <div className="flex items-start">
                    <div 
                      className={`mt-0.5 mr-2 p-1 rounded-full ${
                        insight.type === "alert" 
                          ? "bg-red-800/50 text-red-400" 
                          : insight.type === "recommendation" 
                            ? "bg-amber-800/50 text-amber-400" 
                            : "bg-slate-700/50 text-blue-400"
                      }`}
                    >
                      {insight.type === "alert" ? (
                        <AlertCircle className="h-3 w-3" />
                      ) : insight.type === "recommendation" ? (
                        <Info className="h-3 w-3" />
                      ) : (
                        <Brain className="h-3 w-3" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-200">{insight.content}</p>
                      {insight.farmId && (
                        <div className="mt-1">
                          <Badge variant="outline" className="text-xs font-normal bg-slate-800/50">
                            {farms.find((f: Farm) => f.id === insight.farmId)?.name || "Farm"}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredInsights.length > 3 && (
                <Button variant="link" className="text-xs text-slate-400 w-full mt-1">
                  Show {filteredInsights.length - 3} more insights
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Farms</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="paused">Paused</TabsTrigger>
          <TabsTrigger value="error">Error</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          <FarmsList farms={filteredFarms} onAction={handleFarmAction} />
        </TabsContent>
        <TabsContent value="active" className="mt-6">
          <FarmsList farms={filteredFarms} onAction={handleFarmAction} />
        </TabsContent>
        <TabsContent value="paused" className="mt-6">
          <FarmsList farms={filteredFarms} onAction={handleFarmAction} />
        </TabsContent>
        <TabsContent value="error" className="mt-6">
          <FarmsList farms={filteredFarms} onAction={handleFarmAction} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type FarmsListProps = {
  farms: Farm[];
  onAction: (farmId: string, action: "pause" | "resume" | "delete") => void;
};

function FarmsList({ farms, onAction }: FarmsListProps) {
  if (farms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Building className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium">No farms found</h3>
        <p className="text-muted-foreground mt-2">There are no farms matching the current filter.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {farms.map((farm) => {
        return (
          <FarmCard
            key={farm.id}
            farm={farm}
            onAction={onAction}
          />
        );
      })}
    </div>
  );
}

interface FarmCardProps {
  farm: Farm;
  onAction: (farmId: string, action: "pause" | "resume" | "delete") => void;
  key?: string; // This lets TypeScript know that key is a valid prop for JSX
}

function FarmCard({ farm, onAction }: FarmCardProps) {
  // Status badge component
  const StatusBadge = ({ status }: { status: FarmStatus }) => {
    if (status === "active") {
      return (
        <Badge variant="default">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>Active</span>
          </div>
        </Badge>
      );
    } else if (status === "paused") {
      return (
        <Badge variant="secondary">
          <div className="flex items-center gap-1">
            <PauseCircle className="h-3 w-3" />
            <span>Paused</span>
          </div>
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <div className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            <span>Error</span>
          </div>
        </Badge>
      );
    }
  };

  return (
    <Card className={farm.isLoading ? "opacity-70" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            {farm.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <StatusBadge status={farm.status} />
            {/* Use our custom farm dropdown component instead */}
            <FarmDropdown 
              isActive={farm.status === "active"}
              onPause={() => onAction(farm.id, "pause")}
              onResume={() => onAction(farm.id, "resume")}
              onDelete={() => onAction(farm.id, "delete")}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-xl font-bold">${farm.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Yield</p>
              <p className={`text-xl font-bold ${farm.yield.trend === "up" ? "text-green-500" : "text-red-500"}`}>
                {farm.yield.trend === "up" ? "+" : "-"}{farm.yield.value}% APY
              </p>
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-2">Farm Composition</p>
            {farm.pairs.map((pair, index) => (
              <div key={index} className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${pair.color}`}></div>
                  <span className="text-sm">{pair.pair}</span>
                </div>
                <span className="text-sm">{pair.allocation}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
