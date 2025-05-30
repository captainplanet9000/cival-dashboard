'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Percent, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, BarChart2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Types for risk metrics
export interface RiskMetrics {
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
  riskExposureByAsset: {
    symbol: string;
    exposure: number;
    riskContribution: number;
  }[];
  riskExposureByStrategy: {
    strategy: string;
    exposure: number;
    riskContribution: number;
  }[];
  riskProfile: {
    id: string;
    name: string;
    risk_level: 'conservative' | 'moderate' | 'aggressive' | 'custom';
  };
  riskLimits: {
    maxPositionSize: number;
    maxPositionSizePercentage: number;
    maxDrawdownPercentage: number;
    maxDailyLossPercentage: number;
  };
  breachedLimits: {
    limit: string;
    currentValue: number;
    maxValue: number;
    percentageOver: number;
  }[];
  largestDrawdowns: {
    startDate: string;
    endDate: string;
    durationDays: number;
    drawdownPercentage: number;
    recovered: boolean;
  }[];
}

interface RiskMetricsCardProps {
  metrics?: RiskMetrics;
  data?: RiskMetrics;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function RiskMetricsCard({ 
  metrics, 
  data,
  isLoading = false,
  onRefresh
}: RiskMetricsCardProps) {
  // Use metrics prop if provided, otherwise use data prop
  const riskData = metrics || data;

  if (!riskData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Risk Metrics</CardTitle>
          <CardDescription>
            Real-time risk analysis for your portfolio
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-56">
          <p className="text-muted-foreground">No risk data available</p>
        </CardContent>
      </Card>
    );
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };
  
  // Determine risk status
  const getRiskStatus = () => {
    if (riskData.riskCapacityUsed > 90) {
      return {
        label: 'Critical',
        color: 'bg-red-500 text-white',
        icon: <AlertTriangle className="h-4 w-4" />
      };
    } else if (riskData.riskCapacityUsed > 75) {
      return {
        label: 'High',
        color: 'bg-orange-500 text-white',
        icon: <TrendingUp className="h-4 w-4" />
      };
    } else if (riskData.riskCapacityUsed > 50) {
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
    if (riskData.riskCapacityUsed > 90) return "bg-red-500";
    if (riskData.riskCapacityUsed > 75) return "bg-orange-500";
    if (riskData.riskCapacityUsed > 50) return "bg-yellow-500";
    return "bg-green-500";
  };
  
  // Get risk level badge style based on risk profile
  const getRiskLevelBadge = () => {
    switch (riskData.riskProfile.risk_level) {
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
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">Risk Metrics</CardTitle>
            <CardDescription>
              Real-time risk analysis for your portfolio
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            {getRiskLevelBadge()}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              disabled={isLoading}
            >
              <TrendingUp className={`h-4 w-4 mr-2 ${isLoading ? 'animate-pulse' : ''}`} />
              {isLoading ? 'Updating...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Risk Capacity Gauge */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Risk Capacity Used</span>
            <Badge className={`${riskStatus.color} flex items-center`}>
              {riskStatus.icon}
              <span className="ml-1">{riskStatus.label}</span>
            </Badge>
          </div>
          
          <Progress
            value={riskData.riskCapacityUsed}
            className="h-2.5"
            indicatorClassName={getRiskCapacityColor()}
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
        
        {/* Key Risk Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted p-3 rounded-md">
            <div className="text-xs text-muted-foreground mb-1">Portfolio Value</div>
            <div className="text-lg font-bold">{formatCurrency(riskData.portfolioValue)}</div>
          </div>
          
          <div className="bg-muted p-3 rounded-md">
            <div className="text-xs text-muted-foreground mb-1">Value at Risk (VaR)</div>
            <div className="text-lg font-bold">{formatCurrency(riskData.valueAtRisk)}</div>
            <div className="text-xs text-muted-foreground">{formatPercentage(riskData.valueAtRiskPercentage)} of portfolio</div>
          </div>
          
          <div className="bg-muted p-3 rounded-md">
            <div className="text-xs text-muted-foreground mb-1">Current Drawdown</div>
            <div className="text-lg font-bold">{formatPercentage(riskData.currentDrawdown)}</div>
            <div className="text-xs text-muted-foreground">Max: {formatPercentage(riskData.maxDrawdown)}</div>
          </div>
          
          <div className="bg-muted p-3 rounded-md">
            <div className="text-xs text-muted-foreground mb-1">Sharpe Ratio</div>
            <div className="text-lg font-bold">{riskData.sharpeRatio.toFixed(2)}</div>
            <div className="flex items-center text-xs">
              {riskData.sharpeRatio > 1 ? (
                <span className="text-green-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" /> Good
                </span>
              ) : (
                <span className="text-red-500 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-1" /> Poor
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Risk Breakdown */}
        <div>
          <h3 className="text-sm font-medium mb-3">Risk Exposure by Asset</h3>
          <div className="space-y-3">
            {riskData.riskExposureByAsset.map((asset, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span>{asset.symbol}</span>
                  <span className="font-medium">{formatCurrency(asset.exposure)}</span>
                </div>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block text-muted-foreground">
                        {asset.riskContribution}% of risk
                      </span>
                    </div>
                  </div>
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      style={{ width: `${asset.riskContribution}%` }}
                      className="bg-primary"
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* Breached Limits Alerts */}
        {riskData.breachedLimits.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3">Risk Limit Breaches</h3>
            <div className="space-y-2">
              {riskData.breachedLimits.map((breach, index) => (
                <Alert key={index} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{breach.limit} Exceeded</AlertTitle>
                  <AlertDescription>
                    Current: {breach.currentValue}, Limit: {breach.maxValue} ({breach.percentageOver}% over limit)
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}
        
        {/* Risk Profile Information */}
        <div className="bg-muted p-4 rounded-md">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium">Risk Profile: {riskData.riskProfile.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Leverage: {riskData.leverageRatio}x | Margin Usage: {formatPercentage(riskData.marginUsagePercentage)}
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">
                    Risk Limits
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs space-y-1">
                    <p>Max Position Size: {formatCurrency(riskData.riskLimits.maxPositionSize)}</p>
                    <p>Max Position Size: {riskData.riskLimits.maxPositionSizePercentage}% of portfolio</p>
                    <p>Max Drawdown: {riskData.riskLimits.maxDrawdownPercentage}%</p>
                    <p>Max Daily Loss: {riskData.riskLimits.maxDailyLossPercentage}%</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
