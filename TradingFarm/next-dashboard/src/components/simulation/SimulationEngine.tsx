"use client";

import React, { useState } from "react";
import { SimulationControls } from "./SimulationControls";
import { MarketDataChart } from "./MarketDataChart";
import { AgentPerformanceMetrics } from "./AgentPerformanceMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Play, Pause, Save, Upload, Download, AlertTriangle, Share2, 
  Activity, BarChart2, BookOpen, Bookmark, RefreshCw
} from "lucide-react";

interface SimulationEngineProps {
  onSaveSimulation?: (data: any) => void;
  onExportResults?: (data: any) => void;
  initialAgentId?: string;
  initialScenario?: string;
}

export function SimulationEngine({
  onSaveSimulation,
  onExportResults,
  initialAgentId,
  initialScenario
}: SimulationEngineProps) {
  // Simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(5);
  const [dataSource, setDataSource] = useState("historical");
  const [timeframe, setTimeframe] = useState("1h");
  const [progress, setProgress] = useState(0);
  const [selectedAgentId, setSelectedAgentId] = useState(initialAgentId || "agent-1");
  const [selectedSymbol, setSelectedSymbol] = useState("BTC/USD");
  const [simulationCompleted, setSimulationCompleted] = useState(false);
  
  // Mock scenario data
  const availableScenarios = [
    { id: "scenario-1", name: "Bull Market (2020-2021)", description: "Bullish market conditions with steady uptrend" },
    { id: "scenario-2", name: "Market Crash (March 2020)", description: "Extreme volatility with sharp decline" },
    { id: "scenario-3", name: "Sideways Market (2018-2019)", description: "Low volatility with range-bound price action" },
    { id: "scenario-4", name: "Recovery Phase (2019)", description: "Gradual recovery after prolonged downtrend" },
    { id: "scenario-5", name: "Flash Crash", description: "Rapid price decline followed by quick recovery" }
  ];
  
  // Mock agent data
  const availableAgents = [
    { id: "agent-1", name: "Momentum Trader", description: "Follows market trends and momentum indicators", strategy: "Momentum Trading" },
    { id: "agent-2", name: "Mean Reversion Specialist", description: "Capitalizes on price reversions to the mean", strategy: "Mean Reversion" },
    { id: "agent-3", name: "Volatility Harvester", description: "Thrives in volatile market conditions", strategy: "Volatility Trading" },
    { id: "agent-4", name: "Breakout Hunter", description: "Identifies and trades price breakouts", strategy: "Breakout Trading" },
    { id: "agent-5", name: "Reinforcement Learner", description: "Self-improving agent using RL techniques", strategy: "Adaptive Learning" }
  ];
  
  // Selected agent and scenario
  const [selectedScenarioId, setSelectedScenarioId] = useState(initialScenario || "scenario-1");
  const selectedAgent = availableAgents.find(agent => agent.id === selectedAgentId);
  const selectedScenario = availableScenarios.find(scenario => scenario.id === selectedScenarioId);
  
  // Mock candle data for the MarketDataChart
  const [marketData, setMarketData] = useState([]);
  
  // Simulation controls handlers
  const handleStart = () => {
    setIsRunning(true);
    setSimulationCompleted(false);
    // Start progress timer for demo
    let currentProgress = progress;
    const interval = setInterval(() => {
      currentProgress += (1 * simulationSpeed / 20);
      if (currentProgress >= 100) {
        clearInterval(interval);
        setProgress(100);
        setIsRunning(false);
        setSimulationCompleted(true);
      } else {
        setProgress(currentProgress);
      }
    }, 200);
  };
  
  const handlePause = () => {
    setIsRunning(false);
  };
  
  const handleReset = () => {
    setIsRunning(false);
    setProgress(0);
    setSimulationCompleted(false);
  };
  
  const handleSpeedChange = (speed: number) => {
    setSimulationSpeed(speed);
  };
  
  const handleDataSourceChange = (source: string) => {
    setDataSource(source);
  };
  
  const handleTimeframeChange = (tf: string) => {
    setTimeframe(tf);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Market Simulation Engine</h2>
          <p className="text-muted-foreground">
            Test agent performance in simulated market environments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!simulationCompleted}>
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
          <Button variant="outline" size="sm" disabled={!simulationCompleted}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Simulation
          </Button>
          <Button variant="default" size="sm" disabled={!simulationCompleted}>
            <Save className="h-4 w-4 mr-2" />
            Save Simulation
          </Button>
        </div>
      </div>
      
      {/* Configuration Section */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Simulation Configuration</CardTitle>
          <CardDescription>
            Configure market conditions, agent selection, and simulation parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Select Trading Agent</label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Trading Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAgents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAgent && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p>{selectedAgent.description}</p>
                    <div className="mt-1">
                      <Badge variant="outline">{selectedAgent.strategy}</Badge>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Market Symbol</label>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Market Symbol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTC/USD">BTC/USD</SelectItem>
                    <SelectItem value="ETH/USD">ETH/USD</SelectItem>
                    <SelectItem value="SOL/USD">SOL/USD</SelectItem>
                    <SelectItem value="XRP/USD">XRP/USD</SelectItem>
                    <SelectItem value="AAPL">AAPL (Apple Inc.)</SelectItem>
                    <SelectItem value="MSFT">MSFT (Microsoft)</SelectItem>
                    <SelectItem value="EUR/USD">EUR/USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Market Scenario</label>
                <Select value={selectedScenarioId} onValueChange={setSelectedScenarioId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Market Scenario" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableScenarios.map(scenario => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedScenario && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p>{selectedScenario.description}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Configuration
                </Button>
                <Button>
                  <Play className="h-4 w-4 mr-2" />
                  Initialize Simulation
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Simulation progress */}
      {progress > 0 && (
        <div className="space-y-2 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Simulation Progress</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
      
      {/* Main simulation interface */}
      <div className="grid grid-cols-3 gap-6">
        <SimulationControls
          onStart={handleStart}
          onPause={handlePause}
          onReset={handleReset}
          onSpeedChange={handleSpeedChange}
          onDataSourceChange={handleDataSourceChange}
          onTimeframeChange={handleTimeframeChange}
          isRunning={isRunning}
          currentSpeed={simulationSpeed}
          currentDataSource={dataSource}
          currentTimeframe={timeframe}
        />
        
        <MarketDataChart
          symbol={selectedSymbol}
          data={[]}
        />
      </div>
      
      <div className="grid grid-cols-3 gap-6 mt-6">
        <div className="col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Agent Actions</CardTitle>
              <CardDescription>
                Real-time trading decisions made by the agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {Array.from({ length: 8 }).map((_, i) => {
                  const actionTypes = ['BUY', 'SELL', 'HOLD', 'CLOSE'];
                  const actionReasons = [
                    'RSI oversold', 
                    'Price breakout', 
                    'MACD crossover', 
                    'Take profit target', 
                    'Stop loss triggered',
                    'Trend reversal detected'
                  ];
                  const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
                  const actionReason = actionReasons[Math.floor(Math.random() * actionReasons.length)];
                  
                  return (
                    <div 
                      key={i} 
                      className={`p-2 rounded-md text-xs ${
                        actionType === 'BUY' ? 'bg-green-100 dark:bg-green-900/20 border-l-2 border-green-500' : 
                        actionType === 'SELL' ? 'bg-red-100 dark:bg-red-900/20 border-l-2 border-red-500' : 
                        actionType === 'CLOSE' ? 'bg-orange-100 dark:bg-orange-900/20 border-l-2 border-orange-500' : 
                        'bg-muted border-l-2 border-muted-foreground'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {actionType === 'BUY' && 'Buy Entry'} 
                          {actionType === 'SELL' && 'Sell Entry'} 
                          {actionType === 'CLOSE' && 'Close Position'} 
                          {actionType === 'HOLD' && 'Hold Position'}
                        </span>
                        <span className="text-muted-foreground">10:3{i}:21</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-muted-foreground">{actionReason}</span>
                      </div>
                      {(actionType === 'BUY' || actionType === 'SELL') && (
                        <div className="mt-1 flex justify-between">
                          <span className="text-muted-foreground">Size: 0.{Math.floor(Math.random() * 100 + 10)} BTC</span>
                          <span className="text-muted-foreground">@ $47,{Math.floor(Math.random() * 1000 + 100)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="col-span-2">
          <AgentPerformanceMetrics 
            agentId={selectedAgentId}
            simulationId={selectedScenarioId}
          />
        </div>
      </div>
      
      {/* Simulation events and logs */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Simulation Events</CardTitle>
          <CardDescription>
            Important events and logs from the simulation run
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="events">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="trades">Trades</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>
            <TabsContent value="events" className="mt-2 max-h-[200px] overflow-y-auto">
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => {
                  const eventTypes = [
                    'Market Event', 
                    'Agent Action', 
                    'Performance Alert', 
                    'System Event'
                  ];
                  const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
                  const eventDescriptions = [
                    'Price spike detected on BTC/USD',
                    'Agent detected a potential reversal pattern',
                    'Drawdown exceeds warning threshold (8%)',
                    'New market data loaded for simulation',
                    'Simulation speed adjusted automatically',
                    'High volatility detected in current market'
                  ];
                  const eventDescription = eventDescriptions[Math.floor(Math.random() * eventDescriptions.length)];
                  
                  return (
                    <div key={i} className="flex items-start gap-2 p-2 text-sm border-b border-border">
                      <div className={`mt-0.5 h-2 w-2 rounded-full ${
                        eventType === 'Market Event' ? 'bg-blue-500' : 
                        eventType === 'Agent Action' ? 'bg-green-500' : 
                        eventType === 'Performance Alert' ? 'bg-amber-500' : 
                        'bg-purple-500'
                      }`} />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-medium">{eventType}</span>
                          <span className="text-xs text-muted-foreground">10:3{i}:2{i}</span>
                        </div>
                        <p className="text-muted-foreground text-xs mt-1">{eventDescription}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
            <TabsContent value="trades" className="mt-2">
              <div className="text-sm text-muted-foreground text-center py-8">
                Trade history will appear here during the simulation
              </div>
            </TabsContent>
            <TabsContent value="metrics" className="mt-2">
              <div className="text-sm text-muted-foreground text-center py-8">
                Real-time metrics will be tracked during simulation
              </div>
            </TabsContent>
            <TabsContent value="logs" className="mt-2">
              <div className="text-sm text-muted-foreground text-center py-8">
                System logs will appear here during the simulation
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
