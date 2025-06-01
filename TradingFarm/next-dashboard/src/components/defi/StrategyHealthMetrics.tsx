import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChartConfig,
  LineChart
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertCircle, 
  AlertTriangle, 
  ArrowDown, 
  ArrowUp, 
  RefreshCw 
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { createBrowserClient } from '@/utils/supabase/client';
import { formatUnits } from 'ethers/lib/utils';
import { useToast } from '../ui/use-toast';
import defiLendingService from '@/services/defi-lending.service';

interface HealthMetricsProps {
  strategyId: string;
  position: any;
  strategy: any;
}

export default function StrategyHealthMetrics({ strategyId, position, strategy }: HealthMetricsProps) {
  const supabase = createBrowserClient();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [simulations, setSimulations] = useState({
    collateralIncrease: null as any,
    collateralDecrease: null as any,
    borrowIncrease: null as any,
    borrowDecrease: null as any
  });
  
  // Format health factor for display
  const formatHealthFactor = (healthFactor: string) => {
    const value = parseFloat(formatUnits(healthFactor || "0", 18));
    return value.toFixed(2);
  };
  
  // Get health factor color based on value
  const getHealthFactorColor = (healthFactor: number) => {
    if (healthFactor < 1.1) return "text-red-500";
    if (healthFactor < 1.5) return "text-yellow-500";
    return "text-green-500";
  };
  
  // Get progress color based on health factor
  const getProgressColor = (healthFactor: number) => {
    if (healthFactor < 1.1) return "bg-red-500";
    if (healthFactor < 1.5) return "bg-yellow-500";
    return "bg-green-500";
  };
  
  // Fetch historical health metrics
  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        setLoading(true);
        
        // Query historical positions from strategy_actions table where we have before_state and after_state
        const { data, error } = await supabase
          .from("strategy_actions")
          .select("*")
          .eq("strategy_id", strategyId)
          .not("after_state", "is", null)
          .order("timestamp", { ascending: true });
        
        if (error) throw error;
        
        // Format data for chart
        const formattedData = data.map(action => {
          // Extract health factor and ltv from after_state
          const healthFactor = action.after_state?.healthFactor 
            ? parseFloat(formatHealthFactor(action.after_state.healthFactor))
            : null;
          
          const ltv = action.after_state?.ltv || null;
          
          return {
            timestamp: new Date(action.timestamp).getTime(),
            date: new Date(action.timestamp).toLocaleDateString(),
            healthFactor,
            ltv,
            action: action.action_type
          };
        }).filter(item => item.healthFactor !== null);
        
        setHistoricalData(formattedData);
      } catch (error) {
        console.error("Error fetching historical data:", error);
        toast({
          title: "Error",
          description: "Failed to load historical metrics",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (strategyId) {
      fetchHistoricalData();
    }
  }, [strategyId, supabase, toast]);
  
  // Run health factor simulations
  const runSimulations = async () => {
    if (!position) return;
    
    try {
      setSimulationLoading(true);
      
      // Get current values
      const collateralAmount = position.collateral_amount;
      const borrowAmount = position.borrow_amount;
      
      // Define simulation scenarios (10% changes)
      const scenarios = [
        {
          type: 'collateralIncrease',
          collateralChange: 0.1, // +10%
          borrowChange: 0
        },
        {
          type: 'collateralDecrease',
          collateralChange: -0.1, // -10%
          borrowChange: 0
        },
        {
          type: 'borrowIncrease',
          collateralChange: 0,
          borrowChange: 0.1 // +10%
        },
        {
          type: 'borrowDecrease',
          collateralChange: 0,
          borrowChange: -0.1 // -10%
        }
      ];
      
      // Run simulations for each scenario
      const results: any = {};
      
      for (const scenario of scenarios) {
        // Calculate new amounts
        const newCollateralAmount = BigInt(collateralAmount) * BigInt(100 + scenario.collateralChange * 100) / BigInt(100);
        const newBorrowAmount = BigInt(borrowAmount) * BigInt(100 + scenario.borrowChange * 100) / BigInt(100);
        
        // Call service to simulate
        const simulationResult = await defiLendingService.simulatePosition(
          strategy.chain_id,
          strategy.safe_address,
          strategy.collateral_asset,
          newCollateralAmount.toString(),
          strategy.borrow_asset,
          newBorrowAmount.toString()
        );
        
        results[scenario.type] = {
          healthFactor: parseFloat(formatHealthFactor(simulationResult.healthFactor)),
          ltv: simulationResult.ltv,
          safetyBuffer: (parseFloat(formatHealthFactor(simulationResult.healthFactor)) - 1) * 100, // percentage buffer before liquidation
          change: scenario
        };
      }
      
      setSimulations({
        collateralIncrease: results.collateralIncrease,
        collateralDecrease: results.collateralDecrease,
        borrowIncrease: results.borrowIncrease,
        borrowDecrease: results.borrowDecrease
      });
      
      setSimulationData(results);
    } catch (error) {
      console.error("Error running simulations:", error);
      toast({
        title: "Error",
        description: "Failed to run health factor simulations",
        variant: "destructive"
      });
    } finally {
      setSimulationLoading(false);
    }
  };
  
  // Chart configuration for health factor history
  const healthFactorChartConfig: ChartConfig = {
    options: {
      chart: {
        id: 'health-factor-chart',
        type: 'line',
        toolbar: {
          show: false
        },
        zoom: {
          enabled: false
        }
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      xaxis: {
        type: 'datetime',
        labels: {
          datetimeUTC: false,
          format: 'dd MMM'
        }
      },
      yaxis: {
        min: 0,
        labels: {
          formatter: (value: number) => value.toFixed(2)
        }
      },
      dataLabels: {
        enabled: false
      },
      tooltip: {
        x: {
          format: 'dd MMM yyyy'
        }
      },
      markers: {
        size: 4
      },
      grid: {
        show: true,
        borderColor: '#90A4AE',
        strokeDashArray: 4,
        xaxis: {
          lines: {
            show: true
          }
        }
      },
      annotations: {
        yaxis: [{
          y: 1,
          borderColor: '#FF4560',
          label: {
            borderColor: '#FF4560',
            style: {
              color: '#fff',
              background: '#FF4560'
            },
            text: 'Liquidation'
          }
        }]
      }
    },
    series: [
      {
        name: 'Health Factor',
        data: historicalData.map(item => ({
          x: item.timestamp,
          y: item.healthFactor
        }))
      }
    ]
  };
  
  // Chart configuration for LTV history
  const ltvChartConfig: ChartConfig = {
    options: {
      chart: {
        id: 'ltv-chart',
        type: 'line',
        toolbar: {
          show: false
        },
        zoom: {
          enabled: false
        }
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      xaxis: {
        type: 'datetime',
        labels: {
          datetimeUTC: false,
          format: 'dd MMM'
        }
      },
      yaxis: {
        labels: {
          formatter: (value: number) => `${value.toFixed(2)}%`
        }
      },
      dataLabels: {
        enabled: false
      },
      tooltip: {
        x: {
          format: 'dd MMM yyyy'
        }
      },
      markers: {
        size: 4
      },
      grid: {
        show: true,
        borderColor: '#90A4AE',
        strokeDashArray: 4,
        xaxis: {
          lines: {
            show: true
          }
        }
      },
      annotations: {
        yaxis: [{
          y: strategy?.target_ltv,
          borderColor: '#00E396',
          label: {
            borderColor: '#00E396',
            style: {
              color: '#fff',
              background: '#00E396'
            },
            text: 'Target LTV'
          }
        }]
      }
    },
    series: [
      {
        name: 'LTV (%)',
        data: historicalData.map(item => ({
          x: item.timestamp,
          y: item.ltv
        }))
      }
    ]
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Health Factor Analysis</CardTitle>
          <CardDescription>
            Monitor and analyze your position's health factor over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-[300px] w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              {position ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Current Health Factor</div>
                        <div className={`text-2xl font-bold ${
                          getHealthFactorColor(parseFloat(formatHealthFactor(position.health_factor)))
                        }`}>
                          {formatHealthFactor(position.health_factor)}
                        </div>
                        <Progress
                          value={Math.min(
                            (parseFloat(formatHealthFactor(position.health_factor)) / strategy.target_health_factor) * 100,
                            100
                          )}
                          className="h-1 mt-2"
                          indicatorClassName={
                            getProgressColor(parseFloat(formatHealthFactor(position.health_factor)))
                          }
                        />
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Current LTV</div>
                        <div className="text-2xl font-bold">
                          {position.ltv?.toFixed(2)}%
                        </div>
                        <Progress
                          value={(position.ltv / strategy.target_ltv) * 100}
                          className="h-1 mt-2"
                        />
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Target Health Factor</div>
                        <div className="text-2xl font-bold">
                          {strategy.target_health_factor}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Liquidation Buffer</div>
                        <div className={`text-2xl font-bold ${
                          parseFloat(formatHealthFactor(position.health_factor)) < 1.1 
                            ? "text-red-500" 
                            : parseFloat(formatHealthFactor(position.health_factor)) < 1.5 
                              ? "text-yellow-500" 
                              : "text-green-500"
                        }`}>
                          {((parseFloat(formatHealthFactor(position.health_factor)) - 1) * 100).toFixed(2)}%
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Tabs defaultValue="health">
                    <TabsList>
                      <TabsTrigger value="health">Health Factor History</TabsTrigger>
                      <TabsTrigger value="ltv">LTV History</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="health">
                      {historicalData.length > 1 ? (
                        <div className="h-[300px]">
                          <LineChart 
                            config={healthFactorChartConfig}
                          />
                        </div>
                      ) : (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Insufficient Data</AlertTitle>
                          <AlertDescription>
                            Not enough historical data points to display a chart. More data will be collected as your strategy operates.
                          </AlertDescription>
                        </Alert>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="ltv">
                      {historicalData.length > 1 ? (
                        <div className="h-[300px]">
                          <LineChart 
                            config={ltvChartConfig}
                          />
                        </div>
                      ) : (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Insufficient Data</AlertTitle>
                          <AlertDescription>
                            Not enough historical data points to display a chart. More data will be collected as your strategy operates.
                          </AlertDescription>
                        </Alert>
                      )}
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No position data</AlertTitle>
                  <AlertDescription>
                    No active position found for this strategy. Execute the strategy to see health metrics.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {position && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Risk Simulation</CardTitle>
                <CardDescription>
                  Simulate how changes to your position would affect your health factor
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={runSimulations}
                disabled={simulationLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${simulationLoading ? "animate-spin" : ""}`} />
                {simulationLoading ? "Simulating..." : "Run Simulation"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {simulationData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SimulationCard
                  title="Collateral +10%"
                  icon={<ArrowUp className="h-4 w-4 text-green-500" />}
                  color="border-green-200"
                  data={simulations.collateralIncrease}
                  baseline={{
                    healthFactor: parseFloat(formatHealthFactor(position.health_factor)),
                    ltv: position.ltv
                  }}
                />
                
                <SimulationCard
                  title="Collateral -10%"
                  icon={<ArrowDown className="h-4 w-4 text-red-500" />}
                  color="border-red-200"
                  data={simulations.collateralDecrease}
                  baseline={{
                    healthFactor: parseFloat(formatHealthFactor(position.health_factor)),
                    ltv: position.ltv
                  }}
                />
                
                <SimulationCard
                  title="Borrow +10%"
                  icon={<ArrowUp className="h-4 w-4 text-blue-500" />}
                  color="border-blue-200"
                  data={simulations.borrowIncrease}
                  baseline={{
                    healthFactor: parseFloat(formatHealthFactor(position.health_factor)),
                    ltv: position.ltv
                  }}
                />
                
                <SimulationCard
                  title="Borrow -10%"
                  icon={<ArrowDown className="h-4 w-4 text-purple-500" />}
                  color="border-purple-200"
                  data={simulations.borrowDecrease}
                  baseline={{
                    healthFactor: parseFloat(formatHealthFactor(position.health_factor)),
                    ltv: position.ltv
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Click "Run Simulation" to see how changes would affect your position</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Simulation card component
interface SimulationCardProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  data: any;
  baseline: {
    healthFactor: number;
    ltv: number;
  };
}

function SimulationCard({ title, icon, color, data, baseline }: SimulationCardProps) {
  if (!data) {
    return (
      <div className={`border ${color} rounded-lg p-4`}>
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <h3 className="font-medium">{title}</h3>
        </div>
        <Skeleton className="h-[100px] w-full" />
      </div>
    );
  }
  
  const healthFactorChange = data.healthFactor - baseline.healthFactor;
  const ltvChange = data.ltv - baseline.ltv;
  
  return (
    <div className={`border ${color} rounded-lg p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="font-medium">{title}</h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Health Factor</span>
          <div className="flex items-center gap-1">
            <span className={`font-medium ${
              data.healthFactor < 1.1 ? "text-red-500" : 
              data.healthFactor < 1.5 ? "text-yellow-500" : 
              "text-green-500"
            }`}>
              {data.healthFactor.toFixed(2)}
            </span>
            <span className={`text-xs ${
              healthFactorChange > 0 ? "text-green-500" : 
              healthFactorChange < 0 ? "text-red-500" : 
              "text-gray-500"
            }`}>
              ({healthFactorChange > 0 ? "+" : ""}{healthFactorChange.toFixed(2)})
            </span>
          </div>
        </div>
        
        <Progress
          value={Math.min((data.healthFactor / 3) * 100, 100)}
          className="h-1"
          indicatorClassName={
            data.healthFactor < 1.1 ? "bg-red-500" : 
            data.healthFactor < 1.5 ? "bg-yellow-500" : 
            "bg-green-500"
          }
        />
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">LTV</span>
          <div className="flex items-center gap-1">
            <span className="font-medium">
              {data.ltv.toFixed(2)}%
            </span>
            <span className={`text-xs ${
              ltvChange > 0 ? "text-red-500" : 
              ltvChange < 0 ? "text-green-500" : 
              "text-gray-500"
            }`}>
              ({ltvChange > 0 ? "+" : ""}{ltvChange.toFixed(2)}%)
            </span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Liquidation Buffer</span>
          <span className={`font-medium ${
            data.safetyBuffer < 10 ? "text-red-500" : 
            data.safetyBuffer < 50 ? "text-yellow-500" : 
            "text-green-500"
          }`}>
            {data.safetyBuffer.toFixed(2)}%
          </span>
        </div>
        
        {data.healthFactor < 1.03 && (
          <Alert variant="destructive" className="py-2 px-3 mt-2">
            <AlertTriangle className="h-3 w-3" />
            <AlertTitle className="text-xs">Liquidation Risk!</AlertTitle>
          </Alert>
        )}
      </div>
    </div>
  );
}
