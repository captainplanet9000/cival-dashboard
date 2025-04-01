"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { 
  BarChart3, 
  PieChart, 
  TrendingDown, 
  AlertTriangle, 
  Activity, 
  BarChart, 
  PieChart as PieChartIcon, 
  Download, 
  RefreshCw,
  Info,
  HelpCircle
} from "lucide-react";

// Mock data for risk metrics
const riskMetrics = {
  portfolioRisk: {
    value: 0.68,
    trend: "down",
    change: -0.05,
    maxDrawdown: 0.12,
    sharpeRatio: 1.75,
    volatility: 0.14,
    var95: 0.08,
    var99: 0.12,
    stressTestLoss: 0.18
  },
  riskByAsset: [
    { name: "BTC", risk: 0.82, allocation: 0.25, contribution: 0.31 },
    { name: "ETH", risk: 0.75, allocation: 0.20, contribution: 0.22 },
    { name: "SOL", risk: 0.88, allocation: 0.15, contribution: 0.20 },
    { name: "ADA", risk: 0.62, allocation: 0.10, contribution: 0.09 },
    { name: "DOT", risk: 0.71, allocation: 0.10, contribution: 0.11 },
    { name: "Other", risk: 0.54, allocation: 0.20, contribution: 0.07 }
  ],
  riskByStrategy: [
    { name: "Momentum", risk: 0.72, allocation: 0.35, contribution: 0.35 },
    { name: "Mean Reversion", risk: 0.64, allocation: 0.25, contribution: 0.22 },
    { name: "Arbitrage", risk: 0.45, allocation: 0.15, contribution: 0.09 },
    { name: "Market Making", risk: 0.58, allocation: 0.15, contribution: 0.12 },
    { name: "Grid Trading", risk: 0.70, allocation: 0.10, contribution: 0.10 }
  ],
  correlationMatrix: [
    [1.00, 0.82, 0.78, 0.65, 0.60],
    [0.82, 1.00, 0.75, 0.68, 0.55],
    [0.78, 0.75, 1.00, 0.70, 0.62],
    [0.65, 0.68, 0.70, 1.00, 0.58],
    [0.60, 0.55, 0.62, 0.58, 1.00]
  ],
  riskEvents: [
    { type: "High Volatility", asset: "BTC", level: "warning", timestamp: "2025-03-28T14:23:15Z", message: "Unusual volatility detected in BTC markets" },
    { type: "Correlation Shift", assets: ["ETH", "SOL"], level: "info", timestamp: "2025-03-29T08:45:22Z", message: "Correlation pattern shifting between ETH and SOL" },
    { type: "Liquidity Risk", asset: "DOT", level: "critical", timestamp: "2025-03-30T16:12:05Z", message: "Significant decrease in DOT market liquidity" },
    { type: "Flash Crash Risk", exchange: "Binance", level: "warning", timestamp: "2025-03-31T10:34:12Z", message: "Market conditions suggest increased flash crash probability" },
    { type: "Counterparty Risk", entity: "Exchange C", level: "critical", timestamp: "2025-04-01T06:18:45Z", message: "Elevated counterparty risk with Exchange C" }
  ],
  stressTests: [
    { scenario: "Market Crash -20%", impact: -0.14, survivability: 0.92 },
    { scenario: "Flash Crash -35%", impact: -0.22, survivability: 0.85 },
    { scenario: "Regulatory Event", impact: -0.18, survivability: 0.88 },
    { scenario: "Liquidity Crisis", impact: -0.25, survivability: 0.78 },
    { scenario: "Crypto Winter", impact: -0.32, survivability: 0.70 }
  ]
};

export default function RiskAnalyticsPage() {
  const [timeframe, setTimeframe] = useState("30d");
  const [riskView, setRiskView] = useState("overall");
  const [loading, setLoading] = useState(false);

  const refreshData = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  };

  // Calculate risk score from 0-100
  const calculateRiskScore = () => {
    // Portfolio risk value * 100
    const baseScore = riskMetrics.portfolioRisk.value * 100;
    
    // Factor in other risk metrics
    const maxDrawdownFactor = riskMetrics.portfolioRisk.maxDrawdown * 100;
    const varFactor = riskMetrics.portfolioRisk.var99 * 100;
    
    // Calculate weighted score
    const score = (baseScore * 0.5) + (maxDrawdownFactor * 0.3) + (varFactor * 0.2);
    
    return Math.round(score);
  };

  const riskScore = calculateRiskScore();
  
  // Determine risk level based on score
  const getRiskLevel = (score) => {
    if (score < 30) return { level: "Low", color: "text-green-500" };
    if (score < 60) return { level: "Moderate", color: "text-yellow-500" };
    if (score < 80) return { level: "High", color: "text-orange-500" };
    return { level: "Extreme", color: "text-red-500" };
  };

  const riskLevel = getRiskLevel(riskScore);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive risk analysis and monitoring for your trading portfolio
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Time frame selector */}
      <div className="mb-6">
        <Select
          value={timeframe}
          onValueChange={setTimeframe}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overall risk score card */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Portfolio Risk Score</CardTitle>
          <CardDescription>
            Composite risk assessment based on multiple factors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative w-28 h-28 flex items-center justify-center rounded-full border-8" style={{ borderColor: `${riskScore < 30 ? 'rgb(34, 197, 94)' : riskScore < 60 ? 'rgb(234, 179, 8)' : riskScore < 80 ? 'rgb(249, 115, 22)' : 'rgb(239, 68, 68)'}` }}>
                <span className="text-3xl font-bold">{riskScore}</span>
                <span className="absolute -bottom-6 font-medium text-sm">/ 100</span>
              </div>
              <div>
                <h3 className={`text-xl font-semibold ${riskLevel.color}`}>
                  {riskLevel.level} Risk
                </h3>
                <p className="text-gray-500 mt-1">
                  {riskMetrics.portfolioRisk.trend === "down" ? (
                    <span className="flex items-center text-green-500">
                      <TrendingDown className="h-4 w-4 mr-1" />
                      {Math.abs(riskMetrics.portfolioRisk.change * 100).toFixed(1)}% decrease
                    </span>
                  ) : (
                    <span className="flex items-center text-red-500">
                      <TrendingDown className="h-4 w-4 mr-1 rotate-180" />
                      {Math.abs(riskMetrics.portfolioRisk.change * 100).toFixed(1)}% increase
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-2">Compared to previous {timeframe}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full lg:max-w-2xl">
              <div className="flex flex-col p-3 border rounded-md">
                <span className="text-sm text-gray-500 flex items-center">
                  Max Drawdown
                  <HelpCircle className="h-3 w-3 ml-1 text-gray-400" />
                </span>
                <span className="text-xl font-medium">
                  {(riskMetrics.portfolioRisk.maxDrawdown * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex flex-col p-3 border rounded-md">
                <span className="text-sm text-gray-500 flex items-center">
                  Sharpe Ratio
                  <HelpCircle className="h-3 w-3 ml-1 text-gray-400" />
                </span>
                <span className="text-xl font-medium">
                  {riskMetrics.portfolioRisk.sharpeRatio.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col p-3 border rounded-md">
                <span className="text-sm text-gray-500 flex items-center">
                  VaR (95%)
                  <HelpCircle className="h-3 w-3 ml-1 text-gray-400" />
                </span>
                <span className="text-xl font-medium">
                  {(riskMetrics.portfolioRisk.var95 * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex flex-col p-3 border rounded-md">
                <span className="text-sm text-gray-500 flex items-center">
                  VaR (99%)
                  <HelpCircle className="h-3 w-3 ml-1 text-gray-400" />
                </span>
                <span className="text-xl font-medium">
                  {(riskMetrics.portfolioRisk.var99 * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk breakdown tabs */}
      <Tabs defaultValue="by-asset" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="by-asset">Risk by Asset</TabsTrigger>
          <TabsTrigger value="by-strategy">Risk by Strategy</TabsTrigger>
          <TabsTrigger value="events">Risk Events</TabsTrigger>
          <TabsTrigger value="stress-tests">Stress Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="by-asset">
          <Card>
            <CardHeader>
              <CardTitle>Asset-Level Risk Analysis</CardTitle>
              <CardDescription>
                Breakdown of risk contribution by asset
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {riskMetrics.riskByAsset.map((asset, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="font-medium">{asset.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({(asset.allocation * 100).toFixed(1)}% allocation)
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className={`font-medium ${getRiskLevel(asset.risk * 100).color}`}>
                          {getRiskLevel(asset.risk * 100).level}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({(asset.contribution * 100).toFixed(1)}% contribution)
                        </span>
                      </div>
                    </div>
                    <Progress value={asset.risk * 100} className="h-2" />
                  </div>
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <div className="text-center max-w-md">
                  <div className="flex justify-center items-center">
                    <PieChartIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Risk contribution visualization available in the full report
                  </p>
                  <Button variant="outline" className="mt-4">
                    Generate Full Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-strategy">
          <Card>
            <CardHeader>
              <CardTitle>Strategy-Level Risk Analysis</CardTitle>
              <CardDescription>
                Breakdown of risk contribution by trading strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {riskMetrics.riskByStrategy.map((strategy, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="font-medium">{strategy.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({(strategy.allocation * 100).toFixed(1)}% allocation)
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className={`font-medium ${getRiskLevel(strategy.risk * 100).color}`}>
                          {getRiskLevel(strategy.risk * 100).level}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({(strategy.contribution * 100).toFixed(1)}% contribution)
                        </span>
                      </div>
                    </div>
                    <Progress value={strategy.risk * 100} className="h-2" />
                  </div>
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <div className="text-center max-w-md">
                  <div className="flex justify-center items-center">
                    <BarChart className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Strategy correlation analysis available in the full report
                  </p>
                  <Button variant="outline" className="mt-4">
                    Generate Full Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Risk Events</CardTitle>
              <CardDescription>
                Recent events that may impact your portfolio risk
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {riskMetrics.riskEvents.map((event, index) => (
                  <div key={index} className="border rounded-md p-4 flex">
                    <div className="mr-4">
                      <div className={`rounded-full p-2 ${
                        event.level === "critical" ? "bg-red-100 text-red-600" :
                        event.level === "warning" ? "bg-yellow-100 text-yellow-600" :
                        "bg-blue-100 text-blue-600"
                      }`}>
                        {event.level === "critical" ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : event.level === "warning" ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : (
                          <Info className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className="font-medium">{event.type}</h4>
                        <span className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 mt-1">{event.message}</p>
                      <div className="mt-2">
                        {event.asset && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                            Asset: {event.asset}
                          </span>
                        )}
                        {event.assets && event.assets.map((asset, i) => (
                          <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                            Asset: {asset}
                          </span>
                        ))}
                        {event.exchange && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                            Exchange: {event.exchange}
                          </span>
                        )}
                        {event.entity && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                            Entity: {event.entity}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.level === "critical" ? "bg-red-100 text-red-800" :
                          event.level === "warning" ? "bg-yellow-100 text-yellow-800" :
                          "bg-blue-100 text-blue-800"
                        }`}>
                          {event.level.charAt(0).toUpperCase() + event.level.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stress-tests">
          <Card>
            <CardHeader>
              <CardTitle>Stress Test Scenarios</CardTitle>
              <CardDescription>
                Portfolio survivability under extreme market conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {riskMetrics.stressTests.map((test, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="font-medium">{test.scenario}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium text-red-500">
                          {(test.impact * 100).toFixed(1)}% impact
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mr-3">
                        <div 
                          className="bg-green-500 h-2.5 rounded-full" 
                          style={{ width: `${test.survivability * 100}%` }}>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 min-w-[100px]">
                        {(test.survivability * 100).toFixed(0)}% survivability
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 border-t pt-6">
                <h4 className="font-medium mb-2">Risk Mitigation Recommendations</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    Increase diversification across uncorrelated assets to reduce overall portfolio risk
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    Implement automatic stop-loss mechanisms for high-risk assets (DOT, SOL)
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    Reduce exposure to Exchange C due to elevated counterparty risk
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    Consider hedging strategies to protect against market-wide downturns
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Integration with ElizaOS */}
      <Card>
        <CardHeader>
          <CardTitle>ElizaOS Risk Intelligence</CardTitle>
          <CardDescription>
            AI-powered risk insights from ElizaOS knowledge engine
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-md bg-gray-50">
            <div className="flex items-start">
              <Activity className="mr-3 h-5 w-5 text-indigo-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Risk Analysis Summary</h4>
                <p className="text-sm text-gray-700 mt-1">
                  Your portfolio is currently exposed to medium-high risk levels, primarily driven by 
                  concentration in higher volatility assets (SOL, BTC) and market-wide uncertainty. 
                  Recent correlation shifts between ETH and SOL suggest changing market dynamics 
                  that may require strategy adjustments.
                </p>
                <p className="text-sm text-gray-700 mt-3">
                  The most concerning risk factor is the elevated counterparty risk with Exchange C, 
                  which should be addressed promptly. Consider reducing exposure or transitioning 
                  assets to more secure exchanges.
                </p>
                <div className="mt-4">
                  <Link href="/dashboard/eliza-command" className="text-indigo-600 text-sm hover:underline">
                    Ask ElizaOS for a detailed risk analysis
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
