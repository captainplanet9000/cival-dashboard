"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleAlert,
  Clock,
  Lock,
  Save,
  Settings,
  Shield,
  ShieldAlert,
  Terminal,
  ToggleLeft,
  TrendingDown,
  Wallet
} from "lucide-react";

interface RiskManagementConsoleProps {
  onUpdateRiskParameters?: (params: any) => void;
}

export function RiskManagementConsole({
  onUpdateRiskParameters
}: RiskManagementConsoleProps) {
  // Risk management state
  const [activeTab, setActiveTab] = useState("limits");
  
  // Risk limits state
  const [dailyLossLimit, setDailyLossLimit] = useState(2500);
  const [weeklyLossLimit, setWeeklyLossLimit] = useState(5000);
  const [monthlyLossLimit, setMonthlyLossLimit] = useState(10000);
  const [maxPositionSize, setMaxPositionSize] = useState(5);
  const [maxLeverage, setMaxLeverage] = useState(3);
  const [maxDrawdown, setMaxDrawdown] = useState(15);
  
  // Position sizing state
  const [positionSizingMethod, setPositionSizingMethod] = useState("fixed");
  const [fixedRiskPercentage, setFixedRiskPercentage] = useState(1);
  const [dynamicPositionSizing, setDynamicPositionSizing] = useState(true);
  const [volatilityAdjustment, setVolatilityAdjustment] = useState(true);
  
  // Circuit breakers state
  const [circuitBreakers, setCircuitBreakers] = useState([
    {
      id: "cb1",
      name: "Daily Loss Limit",
      description: "Halt trading if daily loss exceeds threshold",
      threshold: "$2,500",
      enabled: true,
      status: "normal", // normal, warning, triggered
      lastTriggered: null
    },
    {
      id: "cb2",
      name: "Rapid Drawdown",
      description: "Halt trading on sudden equity decrease",
      threshold: "5% in 1 hour",
      enabled: true,
      status: "normal",
      lastTriggered: "2025-03-28T09:42:15Z"
    },
    {
      id: "cb3",
      name: "Excessive Trading",
      description: "Halt when trading frequency exceeds normal patterns",
      threshold: "20 trades/hour",
      enabled: false,
      status: "normal",
      lastTriggered: null
    },
    {
      id: "cb4",
      name: "Market Volatility",
      description: "Reduce position sizes during high volatility",
      threshold: "VIX > 30",
      enabled: true,
      status: "warning",
      lastTriggered: "2025-04-10T14:22:33Z"
    },
    {
      id: "cb5",
      name: "Exchange API Issues",
      description: "Halt trading when exchange API errors exceed threshold",
      threshold: "5+ errors in 10 minutes",
      enabled: true,
      status: "normal",
      lastTriggered: null
    }
  ]);
  
  // Alert logs
  const [alertLogs, setAlertLogs] = useState([
    {
      id: "alert1",
      level: "warning",
      message: "Market volatility circuit breaker approaching threshold",
      timestamp: "2025-04-12T15:45:22Z",
      acknowledged: false
    },
    {
      id: "alert2",
      level: "info",
      message: "Daily loss limit updated from $2,000 to $2,500",
      timestamp: "2025-04-12T10:12:05Z",
      acknowledged: true
    },
    {
      id: "alert3",
      level: "critical",
      message: "Rapid drawdown circuit breaker triggered, trading halted for 30 minutes",
      timestamp: "2025-03-28T09:42:15Z",
      acknowledged: true
    },
    {
      id: "alert4",
      level: "warning",
      message: "BTC/USD position size exceeds 4% of portfolio, approaching limit",
      timestamp: "2025-04-11T14:33:18Z",
      acknowledged: true
    },
    {
      id: "alert5",
      level: "info",
      message: "Risk parameters synced with all active trading agents",
      timestamp: "2025-04-12T09:00:05Z",
      acknowledged: true
    }
  ]);
  
  // Toggle circuit breaker
  const toggleCircuitBreaker = (id: string) => {
    setCircuitBreakers(prev => 
      prev.map(cb => 
        cb.id === id ? { ...cb, enabled: !cb.enabled } : cb
      )
    );
  };
  
  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Acknowledge alert
  const acknowledgeAlert = (id: string) => {
    setAlertLogs(prev => 
      prev.map(alert => 
        alert.id === id ? { ...alert, acknowledged: true } : alert
      )
    );
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "normal":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Normal</Badge>;
      case "warning":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Warning</Badge>;
      case "triggered":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Triggered</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Get alert level badge
  const getAlertBadge = (level: string) => {
    switch (level) {
      case "info":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Info</Badge>;
      case "warning":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Warning</Badge>;
      case "critical":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Critical</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };
  
  // Save risk parameters
  const saveRiskParameters = () => {
    const riskParams = {
      limits: {
        dailyLossLimit,
        weeklyLossLimit,
        monthlyLossLimit,
        maxPositionSize,
        maxLeverage,
        maxDrawdown
      },
      positionSizing: {
        method: positionSizingMethod,
        fixedRiskPercentage,
        dynamicPositionSizing,
        volatilityAdjustment
      },
      circuitBreakers: circuitBreakers.map(cb => ({
        id: cb.id,
        enabled: cb.enabled,
        threshold: cb.threshold
      }))
    };
    
    // Add log entry
    setAlertLogs(prev => [
      {
        id: `alert${Date.now()}`,
        level: "info",
        message: "Risk parameters updated and saved",
        timestamp: new Date().toISOString(),
        acknowledged: false
      },
      ...prev
    ]);
    
    if (onUpdateRiskParameters) {
      onUpdateRiskParameters(riskParams);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Risk Management Console</h2>
          <p className="text-muted-foreground">
            Configure risk parameters and safety mechanisms for live trading
          </p>
        </div>
        
        <Button onClick={saveRiskParameters}>
          <Save className="h-4 w-4 mr-2" />
          Save Risk Configuration
        </Button>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <Card className={dailyLossLimit < 3000 ? "border-green-500/50" : dailyLossLimit >= 5000 ? "border-red-500/50" : "border-amber-500/50"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Loss Limit</CardTitle>
            <CardDescription>Maximum allowed loss per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dailyLossLimit.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">1.0% of portfolio</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Max Position Size</CardTitle>
            <CardDescription>Per single position</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maxPositionSize}%</div>
            <div className="text-sm text-muted-foreground">of portfolio value</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Max Leverage</CardTitle>
            <CardDescription>Across all positions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maxLeverage}x</div>
            <div className="text-sm text-muted-foreground">multiplier</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Circuit Breakers</CardTitle>
            <CardDescription>Safety mechanisms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{circuitBreakers.filter(cb => cb.enabled).length}/{circuitBreakers.length}</div>
            <div className="text-sm text-muted-foreground">active breakers</div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="limits" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="limits">
            <Wallet className="h-4 w-4 mr-2" />
            Risk Limits
          </TabsTrigger>
          <TabsTrigger value="position-sizing">
            <ArrowRight className="h-4 w-4 mr-2" />
            Position Sizing
          </TabsTrigger>
          <TabsTrigger value="circuit-breakers">
            <ShieldAlert className="h-4 w-4 mr-2" />
            Circuit Breakers
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Terminal className="h-4 w-4 mr-2" />
            Alert Logs
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="limits" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading Limits & Risk Thresholds</CardTitle>
              <CardDescription>
                Configure maximum exposure and loss limits to protect your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-base font-medium">Loss Limits</h3>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="daily-loss-limit">Daily Loss Limit ($)</Label>
                      <span className="text-sm">${dailyLossLimit.toLocaleString()}</span>
                    </div>
                    <Slider
                      id="daily-loss-limit"
                      value={[dailyLossLimit]}
                      min={500}
                      max={10000}
                      step={100}
                      onValueChange={(value) => setDailyLossLimit(value[0])}
                      className={dailyLossLimit < 3000 ? "text-green-500" : dailyLossLimit >= 5000 ? "text-red-500" : "text-amber-500"}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>$500</span>
                      <span>$10,000</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="weekly-loss-limit">Weekly Loss Limit ($)</Label>
                      <span className="text-sm">${weeklyLossLimit.toLocaleString()}</span>
                    </div>
                    <Slider
                      id="weekly-loss-limit"
                      value={[weeklyLossLimit]}
                      min={1000}
                      max={20000}
                      step={500}
                      onValueChange={(value) => setWeeklyLossLimit(value[0])}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>$1,000</span>
                      <span>$20,000</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="monthly-loss-limit">Monthly Loss Limit ($)</Label>
                      <span className="text-sm">${monthlyLossLimit.toLocaleString()}</span>
                    </div>
                    <Slider
                      id="monthly-loss-limit"
                      value={[monthlyLossLimit]}
                      min={2000}
                      max={50000}
                      step={1000}
                      onValueChange={(value) => setMonthlyLossLimit(value[0])}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>$2,000</span>
                      <span>$50,000</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-base font-medium">Position & Leverage Limits</h3>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="max-position-size">Max Position Size (% of portfolio)</Label>
                      <span className="text-sm">{maxPositionSize}%</span>
                    </div>
                    <Slider
                      id="max-position-size"
                      value={[maxPositionSize]}
                      min={1}
                      max={20}
                      step={1}
                      onValueChange={(value) => setMaxPositionSize(value[0])}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1%</span>
                      <span>20%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="max-leverage">Max Leverage (x multiplier)</Label>
                      <span className="text-sm">{maxLeverage}x</span>
                    </div>
                    <Slider
                      id="max-leverage"
                      value={[maxLeverage]}
                      min={1}
                      max={20}
                      step={1}
                      onValueChange={(value) => setMaxLeverage(value[0])}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1x</span>
                      <span>20x</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="max-drawdown">Max Drawdown (% from peak)</Label>
                      <span className="text-sm">{maxDrawdown}%</span>
                    </div>
                    <Slider
                      id="max-drawdown"
                      value={[maxDrawdown]}
                      min={5}
                      max={30}
                      step={1}
                      onValueChange={(value) => setMaxDrawdown(value[0])}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>5%</span>
                      <span>30%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button variant="outline">Restore Defaults</Button>
              <Button onClick={saveRiskParameters}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="position-sizing" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Position Sizing Rules</CardTitle>
              <CardDescription>
                Configure how trading positions are sized based on risk parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-base font-medium">Position Sizing Method</h3>
                
                <div className="space-y-4">
                  <div className="space-x-4">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="fixed-percent" 
                        name="sizing-method" 
                        checked={positionSizingMethod === "fixed"} 
                        onChange={() => setPositionSizingMethod("fixed")} 
                      />
                      <Label htmlFor="fixed-percent">Fixed Percentage</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="risk-based" 
                        name="sizing-method" 
                        checked={positionSizingMethod === "risk"} 
                        onChange={() => setPositionSizingMethod("risk")} 
                      />
                      <Label htmlFor="risk-based">Risk-Based Sizing</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="kelly-criterion" 
                        name="sizing-method" 
                        checked={positionSizingMethod === "kelly"} 
                        onChange={() => setPositionSizingMethod("kelly")} 
                      />
                      <Label htmlFor="kelly-criterion">Kelly Criterion</Label>
                    </div>
                  </div>
                  
                  {positionSizingMethod === "fixed" && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="fixed-risk-percentage">Fixed Risk Percentage</Label>
                        <span className="text-sm">{fixedRiskPercentage}%</span>
                      </div>
                      <Slider
                        id="fixed-risk-percentage"
                        value={[fixedRiskPercentage]}
                        min={0.1}
                        max={5}
                        step={0.1}
                        onValueChange={(value) => setFixedRiskPercentage(value[0])}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0.1%</span>
                        <span>5%</span>
                      </div>
                    </div>
                  )}
                  
                  {positionSizingMethod === "risk" && (
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm">
                        Risk-based sizing calculates position size based on the distance to stop loss,
                        ensuring consistent risk exposure across different market conditions.
                      </p>
                    </div>
                  )}
                  
                  {positionSizingMethod === "kelly" && (
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm">
                        Kelly Criterion optimizes position sizes based on win rate and risk-reward ratio,
                        maximizing the long-term growth rate of your portfolio.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-base font-medium">Advanced Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="dynamic-sizing">Dynamic Position Sizing</Label>
                      <div className="text-sm text-muted-foreground">
                        Automatically adjust position size based on recent performance
                      </div>
                    </div>
                    <Switch
                      id="dynamic-sizing"
                      checked={dynamicPositionSizing}
                      onCheckedChange={setDynamicPositionSizing}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="volatility-adjustment">Volatility Adjustment</Label>
                      <div className="text-sm text-muted-foreground">
                        Reduce position sizes during high market volatility
                      </div>
                    </div>
                    <Switch
                      id="volatility-adjustment"
                      checked={volatilityAdjustment}
                      onCheckedChange={setVolatilityAdjustment}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="correlation-limits">Correlation Limits</Label>
                      <div className="text-sm text-muted-foreground">
                        Limit exposure to correlated assets
                      </div>
                    </div>
                    <Switch
                      id="correlation-limits"
                      checked={true}
                      disabled
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button variant="outline">Restore Defaults</Button>
              <Button onClick={saveRiskParameters}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="circuit-breakers" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Circuit Breakers</CardTitle>
              <CardDescription>
                Automatic safety mechanisms that trigger when risk thresholds are exceeded
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead>Circuit Breaker</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Last Triggered</TableHead>
                    <TableHead className="text-right">Enabled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {circuitBreakers.map((breaker) => (
                    <TableRow key={breaker.id}>
                      <TableCell>
                        {breaker.status === "normal" && <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">●</Badge>}
                        {breaker.status === "warning" && <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">●</Badge>}
                        {breaker.status === "triggered" && <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">●</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{breaker.name}</div>
                        <div className="text-xs text-muted-foreground">{breaker.description}</div>
                      </TableCell>
                      <TableCell>
                        {breaker.threshold}
                      </TableCell>
                      <TableCell>
                        {formatDate(breaker.lastTriggered)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={breaker.enabled}
                          onCheckedChange={() => toggleCircuitBreaker(breaker.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="mt-6 p-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/30 rounded-md flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">Circuit Breaker Information</p>
                  <p className="mt-1">
                    Circuit breakers automatically halt or modify trading when risk thresholds are exceeded.
                    Disabling them may expose your account to unexpected losses. We recommend keeping all
                    circuit breakers enabled during live trading.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button variant="outline">Restore Defaults</Button>
              <Button onClick={saveRiskParameters}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="logs" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Alert Logs</CardTitle>
              <CardDescription>
                Historical record of risk alerts and circuit breaker activations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {alertLogs.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-3 rounded-md border flex items-start gap-3 ${
                      alert.acknowledged ? 'opacity-70' : 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/30'
                    }`}
                  >
                    {alert.level === "info" && <Clock className="h-5 w-5 text-blue-500 mt-0.5" />}
                    {alert.level === "warning" && <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />}
                    {alert.level === "critical" && <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5" />}
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getAlertBadge(alert.level)}
                          <span className="font-medium">{formatDate(alert.timestamp)}</span>
                        </div>
                        {!alert.acknowledged && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                      </div>
                      <p className="text-sm">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
