"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, Cell
} from "recharts";
import {
  ThumbsUp, ThumbsDown, Info, AlertTriangle, CheckCircle, Award,
  HelpCircle, User, Brain, Sparkles, Users, ChevronRight, ArrowUpRight,
  ArrowDownRight, LineChart, BarChart2, Clock, ArrowRight, X, Check
} from "lucide-react";

interface DecisionAugmentationInterfaceProps {
  farmId?: string;
}

interface AgentRecommendation {
  id: string;
  type: 'buy' | 'sell' | 'hold' | 'adjust';
  symbol: string;
  confidence: number;
  explanation: string;
  timestamp: string;
  agent_id: string;
  agent_name: string;
  agent_type: string;
  reasoning: string[];
  supporting_data: {
    metrics: Record<string, number>;
    signals: {
      name: string;
      value: string;
      type: 'positive' | 'negative' | 'neutral';
    }[];
    key_factors: string[];
  };
}

export function DecisionAugmentationInterface({ farmId }: DecisionAugmentationInterfaceProps) {
  const [activeTab, setActiveTab] = useState("current");
  const [selectedRecId, setSelectedRecId] = useState<string | null>("rec-1"); // Default selection
  const [showReasoning, setShowReasoning] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  
  // Mock data for agent recommendations
  const recommendations: AgentRecommendation[] = [
    {
      id: "rec-1",
      type: "buy",
      symbol: "BTC/USD",
      confidence: 87,
      explanation: "Strong buy signal based on technical breakout and positive sentiment analysis.",
      timestamp: "2025-04-12T14:30:22Z",
      agent_id: "agent-1",
      agent_name: "Market Analyzer Alpha",
      agent_type: "technical",
      reasoning: [
        "Price action has broken above the descending trendline that was acting as resistance.",
        "Volume is increasing on bullish candles, indicating buying pressure.",
        "RSI has moved out of oversold territory with a bullish divergence.",
        "Multiple timeframe analysis shows alignment of support levels."
      ],
      supporting_data: {
        metrics: {
          rsi: 62,
          momentum: 78,
          volume_change: 35,
          price_strength: 72
        },
        signals: [
          { name: "Trendline Breakout", value: "Confirmed", type: "positive" },
          { name: "Volume Profile", value: "Increasing", type: "positive" },
          { name: "Support Test", value: "Successful", type: "positive" },
          { name: "Momentum", value: "Rising", type: "positive" }
        ],
        key_factors: [
          "Moving average crossover on 4h timeframe",
          "RSI showing strength at 62",
          "Previous resistance now acting as support",
          "Increasing buy volume"
        ]
      }
    },
    {
      id: "rec-2",
      type: "adjust",
      symbol: "ETH/USD",
      confidence: 64,
      explanation: "Consider adjusting position size based on increased volatility metrics.",
      timestamp: "2025-04-12T13:15:45Z",
      agent_id: "agent-3",
      agent_name: "Risk Manager Beta",
      agent_type: "risk",
      reasoning: [
        "Recent volatility has increased beyond 30-day average.",
        "Current position sizing may be too aggressive given market conditions.",
        "Risk-reward ratio has shifted and requires position adjustment.",
        "Portfolio exposure to this asset class exceeds recommended thresholds."
      ],
      supporting_data: {
        metrics: {
          volatility: 42,
          risk_ratio: 1.8,
          exposure: 22,
          expected_drawdown: 15
        },
        signals: [
          { name: "Volatility", value: "Increasing", type: "negative" },
          { name: "Risk-Reward", value: "Declining", type: "negative" },
          { name: "Portfolio Exposure", value: "High", type: "negative" },
          { name: "Expected Value", value: "Moderate", type: "neutral" }
        ],
        key_factors: [
          "30-day volatility increased by 40%",
          "Position exceeds 5% of portfolio value",
          "Recent correlations with other holdings have increased",
          "Expected drawdown exceeds comfort threshold"
        ]
      }
    },
    {
      id: "rec-3",
      type: "sell",
      symbol: "XRP/USD",
      confidence: 72,
      explanation: "Recommend taking profits as price approaches major resistance zone.",
      timestamp: "2025-04-12T10:45:12Z",
      agent_id: "agent-2",
      agent_name: "Strategy Optimizer",
      agent_type: "strategy",
      reasoning: [
        "Price is approaching a major resistance level that has rejected price 3 times previously.",
        "The risk-reward ratio for maintaining the position has degraded significantly.",
        "Profit taking at this level aligns with the trading plan objectives.",
        "Technical indicators showing weakening momentum as price approaches resistance."
      ],
      supporting_data: {
        metrics: {
          proximity_to_resistance: 97,
          profit_percentage: 24,
          risk_reward: 0.8,
          momentum_strength: 45
        },
        signals: [
          { name: "Resistance Zone", value: "Approaching", type: "negative" },
          { name: "Momentum", value: "Weakening", type: "negative" },
          { name: "Profit Target", value: "Reached", type: "positive" },
          { name: "Historical Rejection", value: "Likely", type: "negative" }
        ],
        key_factors: [
          "Price within 3% of major resistance at $0.62",
          "Current position showing 24% profit",
          "RSI showing bearish divergence on 4h chart",
          "Volume declining on recent advances"
        ]
      }
    }
  ];
  
  // Get selected recommendation
  const selectedRec = recommendations.find(rec => rec.id === selectedRecId);
  
  // Helper function to get type badge
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'buy':
        return (
          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
            <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
            Buy
          </Badge>
        );
      case 'sell':
        return (
          <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20">
            <ArrowDownRight className="h-3.5 w-3.5 mr-1" />
            Sell
          </Badge>
        );
      case 'hold':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="h-3.5 w-3.5 mr-1" />
            Hold
          </Badge>
        );
      case 'adjust':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-100/50">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Adjust
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };
  
  // Helper for confidence level color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-amber-600";
    return "text-red-600";
  };
  
  // Helper for signal type badge
  const getSignalBadge = (type: string) => {
    switch (type) {
      case 'positive':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Positive</Badge>;
      case 'negative':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Negative</Badge>;
      case 'neutral':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Neutral</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };
  
  // Handle user decision (accept/reject)
  const handleDecision = (accepted: boolean) => {
    if (!selectedRec) return;
    
    // Implementation would trigger appropriate actions based on decision
    console.log(`Decision ${accepted ? 'accepted' : 'rejected'} for ${selectedRec.id}`);
    
    // Update UI or navigate to next recommendation
    const currentIndex = recommendations.findIndex(r => r.id === selectedRecId);
    const nextIndex = (currentIndex + 1) % recommendations.length;
    setSelectedRecId(recommendations[nextIndex].id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Decision Augmentation</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2">
            <Switch id="auto-mode" checked={autoMode} onCheckedChange={setAutoMode} />
            <Label htmlFor="auto-mode">Auto Mode</Label>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Decision Augmentation provides AI-powered recommendations while keeping you in control.
                  Turn on Auto Mode to automatically execute high-confidence recommendations.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recommendations</CardTitle>
              <CardDescription>
                Agent-generated trading insights
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {recommendations.map((rec) => (
                  <div 
                    key={rec.id}
                    className={`p-4 cursor-pointer hover:bg-accent/20 ${
                      selectedRecId === rec.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setSelectedRecId(rec.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {getTypeBadge(rec.type)}
                        <span className="font-medium">{rec.symbol}</span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`${getConfidenceColor(rec.confidence)}`}
                      >
                        {rec.confidence}% Confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {rec.explanation}
                    </p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[10px]">
                            {rec.agent_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{rec.agent_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{new Date(rec.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Decision Stats</CardTitle>
              <CardDescription>
                Your augmented decision metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="h-[160px] w-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Accepted', value: 24, color: '#10b981' },
                            { name: 'Rejected', value: 8, color: '#ef4444' },
                            { name: 'Modified', value: 12, color: '#f59e0b' },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {[
                            { name: 'Accepted', value: 24, color: '#10b981' },
                            { name: 'Rejected', value: 8, color: '#ef4444' },
                            { name: 'Modified', value: 12, color: '#f59e0b' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/50 p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">Success Rate</div>
                    <div className="font-medium">82%</div>
                  </div>
                  <div className="bg-muted/50 p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">Avg. Return</div>
                    <div className="font-medium">3.2%</div>
                  </div>
                  <div className="bg-muted/50 p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">Decisions</div>
                    <div className="font-medium">44</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2 space-y-4">
          {selectedRec ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      {getTypeBadge(selectedRec.type)}
                      <CardTitle>{selectedRec.symbol}</CardTitle>
                    </div>
                    <CardDescription>{selectedRec.explanation}</CardDescription>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`${getConfidenceColor(selectedRec.confidence)}`}
                  >
                    {selectedRec.confidence}% Confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedRec.agent_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selectedRec.agent_name}</div>
                    <div className="text-sm text-muted-foreground">
                      <span className="capitalize">{selectedRec.agent_type}</span> Analysis Agent
                    </div>
                  </div>
                </div>
                
                <div>
                  <Button 
                    variant="link" 
                    className="h-auto p-0 text-sm"
                    onClick={() => setShowReasoning(!showReasoning)}
                  >
                    {showReasoning ? "Hide" : "Show"} Agent Reasoning
                    <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${showReasoning ? 'rotate-90' : ''}`} />
                  </Button>
                  
                  {showReasoning && (
                    <div className="mt-2 p-4 bg-muted/30 rounded-md">
                      <h4 className="font-medium mb-2 text-sm">Reasoning Process</h4>
                      <ul className="space-y-2">
                        {selectedRec.reasoning.map((reason, index) => (
                          <li key={index} className="flex gap-2 text-sm">
                            <ChevronRight className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium mb-3">Supporting Signals</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedRec.supporting_data.signals.map((signal, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted/30 rounded-md">
                        <div className="text-sm">{signal.name}</div>
                        <div className="flex items-center gap-2">
                          <span className={signal.type === 'positive' ? 'text-green-600' : signal.type === 'negative' ? 'text-red-600' : 'text-blue-600'}>
                            {signal.value}
                          </span>
                          {getSignalBadge(signal.type)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Key Metrics</h4>
                    <div className="space-y-3">
                      {Object.entries(selectedRec.supporting_data.metrics).map(([key, value], index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">{key.replace('_', ' ')}</span>
                            <span className="font-medium">{value}</span>
                          </div>
                          <Progress value={value} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-3">Key Factors</h4>
                    <ul className="space-y-1">
                      {selectedRec.supporting_data.key_factors.map((factor, index) => (
                        <li key={index} className="text-sm flex gap-2 items-start">
                          <Check className="h-3.5 w-3.5 text-green-600 mt-0.5" />
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t flex justify-between pt-4">
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => handleDecision(false)}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="lg">
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Accept
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Decision</DialogTitle>
                      <DialogDescription>
                        You are about to {selectedRec.type} {selectedRec.symbol}. This action will be executed according to your strategy settings.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-md mb-4">
                        <div className="font-medium">{selectedRec.type.toUpperCase()} {selectedRec.symbol}</div>
                        <Badge>{selectedRec.confidence}% Confidence</Badge>
                      </div>
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Position Details</AlertTitle>
                        <AlertDescription>
                          This action will be executed using your predefined risk management settings.
                        </AlertDescription>
                      </Alert>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => handleDecision(false)}>Cancel</Button>
                      <Button onClick={() => handleDecision(true)}>Confirm {selectedRec.type}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ) : (
            <Card className="h-[400px] flex items-center justify-center">
              <div className="text-center">
                <Brain className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                <h3 className="text-lg font-medium mb-2">No Recommendation Selected</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select a recommendation from the list to view details.
                </p>
              </div>
            </Card>
          )}
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Decision Performance</CardTitle>
              <CardDescription>
                Historical performance of augmented decisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { category: 'Buy Decisions', augmented: 15.4, manual: 8.2 },
                      { category: 'Sell Decisions', augmented: 12.8, manual: 7.3 },
                      { category: 'Hold Decisions', augmented: 5.2, manual: 3.9 },
                      { category: 'Adjust Decisions', augmented: 9.7, manual: 6.1 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis dataKey="category" />
                    <YAxis label={{ value: '% Return', angle: -90, position: 'insideLeft' }} />
                    <RechartsTooltip formatter={(value) => [`${value}%`, '']} />
                    <Legend />
                    <Bar dataKey="augmented" name="AI Augmented" fill="#2563eb" />
                    <Bar dataKey="manual" name="Manual Only" fill="#9ca3af" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
