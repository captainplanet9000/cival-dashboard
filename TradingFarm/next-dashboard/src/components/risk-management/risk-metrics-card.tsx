"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { dashboardService } from "@/services/dashboard-service";
import { Badge } from '@/components/ui/badge';
import { BarChart, Percent, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, BarChart2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Risk metrics data interface
interface RiskMetricsData {
  portfolioValue: number;
  totalRisk: number;
  riskCapacityUsed: number;
  maxDrawdown: number;
  currentDrawdown: number;
  sharpeRatio: number;
  dailyVaR: number;
  dailyVaRPercentage: number;
  stressTestLoss: number;
  stressTestLossPercentage: number;
  valueAtRisk: number;
  valueAtRiskPercentage: number;
  marginUsagePercentage: number;
  leverageRatio: number;
  riskRewardRatio: number;
  riskPerTrade: number;
  concentrationRisk: number;
  riskExposureByAsset: Array<{
    symbol: string;
    exposure: number;
    riskContribution: number;
  }>;
  riskExposureByStrategy: Array<{
    strategy: string;
    exposure: number;
    riskContribution: number;
  }>;
  riskProfile: {
    id: string;
    name: string;
    risk_level: "low" | "moderate" | "high";
  };
  riskLimits: {
    maxPositionSize: number;
    maxPositionSizePercentage: number;
    maxDrawdownPercentage: number;
    maxDailyLossPercentage: number;
  };
  breachedLimits: Array<{
    limit: string;
    currentValue: number;
    maxValue: number;
    percentageOver: number;
  }>;
  largestDrawdowns: Array<{
    startDate: string;
    endDate: string;
    durationDays: number;
    drawdownPercentage: number;
    recovered: boolean;
  }>;
}

interface RiskMetricsCardProps {
  farmId?: string;
  metrics?: RiskMetricsData;
}

export default function RiskMetricsCard({ farmId = "1", metrics: initialMetrics }: RiskMetricsCardProps) {
  const [metrics, setMetrics] = React.useState<RiskMetricsData | null>(initialMetrics || null);
  const [loading, setLoading] = React.useState(!initialMetrics);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  // Fetch risk metrics if not provided
  React.useEffect(() => {
    if (initialMetrics) {
      setMetrics(initialMetrics);
      return;
    }

    const fetchRiskMetrics = async () => {
      try {
        setLoading(true);
        const response = await dashboardService.getRiskMetrics(farmId);
        
        if (response.error) {
          console.error("Error fetching risk metrics:", response.error);
          setError("Failed to load risk metrics. Please try again later.");
          toast({
            title: "Error",
            description: "Failed to load risk metrics. Please try again later.",
            variant: "destructive",
          });
          return;
        }
        
        setMetrics(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching risk metrics:", err);
        setError("Failed to load risk metrics. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchRiskMetrics();
  }, [farmId, initialMetrics, toast]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk Management</CardTitle>
          <CardDescription>Loading risk metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-24 bg-muted rounded"></div>
            <div className="h-24 bg-muted rounded"></div>
            <div className="h-24 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk Management</CardTitle>
          <CardDescription>Risk assessment and monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10">
            <p className="text-destructive">
              {error || "Could not load risk metrics. Please try again later."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format currency values
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  // Format percentage values
  const formatPercentage = (value: number) => {
    return `${value.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}%`;
  };

  // Determine risk status
  const getRiskStatus = () => {
    if (metrics.riskCapacityUsed > 90) {
      return {
        label: 'Critical',
        color: 'bg-red-500 text-white',
        icon: <AlertTriangle className="h-4 w-4" />
      };
    } else if (metrics.riskCapacityUsed > 75) {
      return {
        label: 'High',
        color: 'bg-orange-500 text-white',
        icon: <TrendingUp className="h-4 w-4" />
      };
    } else if (metrics.riskCapacityUsed > 50) {
      return {
        label: 'Moderate',
        color: 'bg-yellow-500 text-black',
        icon: <BarChart className="h-4 w-4" />
      };
    } else {
      return {
        label: 'Low',
        color: 'bg-green-500 text-white',
        icon: <CheckCircle className="h-4 w-4" />
      };
    }
  };
  
  // Get risk capacity progress color
  const getRiskCapacityColor = () => {
    if (metrics.riskCapacityUsed > 90) return "bg-red-500";
    if (metrics.riskCapacityUsed > 75) return "bg-orange-500";
    if (metrics.riskCapacityUsed > 50) return "bg-yellow-500";
    return "bg-green-500";
  };
  
  // Get risk level badge style based on risk profile
  const getRiskLevelBadge = () => {
    switch (metrics.riskProfile.risk_level) {
      case 'conservative':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Conservative</Badge>;
      case 'moderate':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Moderate</Badge>;
      case 'aggressive':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Aggressive</Badge>;
      case 'custom':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Custom</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };
  
  const riskStatus = getRiskStatus();
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Risk Overview</CardTitle>
          <CardDescription>Current risk exposure and key risk metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/40 p-4 rounded-lg">
              <p className="text-sm font-medium mb-1">Portfolio Value</p>
              <p className="text-2xl font-bold">{formatCurrency(metrics.portfolioValue)}</p>
            </div>
            <div className="bg-muted/40 p-4 rounded-lg">
              <p className="text-sm font-medium mb-1">Risk Capacity Used</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold">{formatPercentage(metrics.riskCapacityUsed)}</p>
                <div className="w-full bg-muted rounded-full h-2 mb-1">
                  <div
                    className={`h-2 rounded-full ${
                      metrics.riskCapacityUsed > 80
                        ? "bg-destructive"
                        : metrics.riskCapacityUsed > 60
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${metrics.riskCapacityUsed}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="bg-muted/40 p-4 rounded-lg">
              <p className="text-sm font-medium mb-1">Value at Risk (Daily)</p>
              <p className="text-2xl font-bold">
                {formatCurrency(metrics.dailyVaR)} ({formatPercentage(metrics.dailyVaRPercentage)})
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold">Key Risk Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="border p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                <p className="text-xl font-bold">{metrics.sharpeRatio.toFixed(2)}</p>
              </div>
              <div className="border p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Maximum Drawdown</p>
                <p className="text-xl font-bold">{formatPercentage(metrics.maxDrawdown)}</p>
              </div>
              <div className="border p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Current Drawdown</p>
                <p className="text-xl font-bold">{formatPercentage(metrics.currentDrawdown)}</p>
              </div>
              <div className="border p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Leverage Ratio</p>
                <p className="text-xl font-bold">{metrics.leverageRatio.toFixed(1)}x</p>
              </div>
              <div className="border p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Risk/Reward Ratio</p>
                <p className="text-xl font-bold">{metrics.riskRewardRatio.toFixed(1)}</p>
              </div>
              <div className="border p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Risk per Trade</p>
                <p className="text-xl font-bold">{formatPercentage(metrics.riskPerTrade)}</p>
              </div>
            </div>
          </div>

          {metrics.breachedLimits.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-destructive mb-2">Breached Risk Limits</h3>
              <div className="border border-destructive bg-destructive/5 rounded-lg">
                <div className="p-4 divide-y divide-destructive/20">
                  {metrics.breachedLimits.map((breach, index) => (
                    <div key={index} className={index > 0 ? "pt-3 mt-3" : ""}>
                      <p className="font-medium">{breach.limit}</p>
                      <div className="flex justify-between text-sm mt-1">
                        <span>Current: {breach.currentValue}%</span>
                        <span>Limit: {breach.maxValue}%</span>
                        <span className="text-destructive">
                          {breach.percentageOver.toFixed(1)}% over limit
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Asset Exposure</CardTitle>
            <CardDescription>Risk distribution across assets</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {metrics.riskExposureByAsset.map((asset, index) => (
                <li key={index} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{asset.symbol}</span>
                    <span>{formatCurrency(asset.exposure)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${asset.riskContribution}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Risk: {asset.riskContribution}%</span>
                    <span>{((asset.exposure / metrics.portfolioValue) * 100).toFixed(1)}% of portfolio</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Strategy Exposure</CardTitle>
            <CardDescription>Risk distribution across strategies</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {metrics.riskExposureByStrategy.map((strategy, index) => (
                <li key={index} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{strategy.strategy}</span>
                    <span>{formatCurrency(strategy.exposure)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${strategy.riskContribution}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Risk: {strategy.riskContribution}%</span>
                    <span>{((strategy.exposure / metrics.portfolioValue) * 100).toFixed(1)}% of portfolio</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t pt-4">
              <p className="font-medium mb-2">Risk Profile: {metrics.riskProfile.name}</p>
              <p className="text-sm text-muted-foreground">
                Risk Level:{" "}
                <span
                  className={
                    metrics.riskProfile.risk_level === "high"
                      ? "text-destructive font-medium"
                      : metrics.riskProfile.risk_level === "moderate"
                      ? "text-amber-500 font-medium"
                      : "text-emerald-500 font-medium"
                  }
                >
                  {metrics.riskProfile.risk_level.charAt(0).toUpperCase() + metrics.riskProfile.risk_level.slice(1)}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Drawdown History</CardTitle>
          <CardDescription>Historical drawdown events and recovery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-medium p-2">Start Date</th>
                  <th className="text-left font-medium p-2">End Date</th>
                  <th className="text-left font-medium p-2">Duration</th>
                  <th className="text-left font-medium p-2">Drawdown</th>
                  <th className="text-left font-medium p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics.largestDrawdowns.map((drawdown, index) => {
                  const startDate = new Date(drawdown.startDate);
                  const endDate = new Date(drawdown.endDate);
                  
                  return (
                    <tr key={index} className={index < metrics.largestDrawdowns.length - 1 ? "border-b" : ""}>
                      <td className="p-2">{startDate.toLocaleDateString()}</td>
                      <td className="p-2">{endDate.toLocaleDateString()}</td>
                      <td className="p-2">{drawdown.durationDays} days</td>
                      <td className="p-2 font-medium">{formatPercentage(drawdown.drawdownPercentage)}</td>
                      <td className="p-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            drawdown.recovered
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}
                        >
                          {drawdown.recovered ? "Recovered" : "In Progress"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
