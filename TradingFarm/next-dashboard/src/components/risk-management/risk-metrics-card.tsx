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
  metrics: RiskMetrics;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function RiskMetricsCard({ 
  metrics, 
  isLoading = false,
  onRefresh
}: RiskMetricsCardProps) {
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
            value={metrics.riskCapacityUsed}
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
            <div className="text-xs text-muted-foreground">Portfolio Value</div>
            <div className="text-lg font-bold">{formatCurrency(metrics.portfolioValue)}</div>
          </div>
          
          <div className="bg-muted p-3 rounded-md">
            <div className="text-xs text-muted-foreground">Value at Risk (Daily)</div>
            <div className="text-lg font-bold text-amber-600">{formatCurrency(metrics.valueAtRisk)}</div>
            <div className="text-xs">{formatPercentage(metrics.valueAtRiskPercentage)}</div>
          </div>
          
          <div className="bg-muted p-3 rounded-md">
            <div className="text-xs text-muted-foreground">Current Drawdown</div>
            <div className="text-lg font-bold">{formatPercentage(metrics.currentDrawdown)}</div>
            <div className="text-xs">Max: {formatPercentage(metrics.maxDrawdown)}</div>
          </div>
          
          <div className="bg-muted p-3 rounded-md">
            <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
            <div className="text-lg font-bold">{metrics.sharpeRatio.toFixed(2)}</div>
          </div>
        </div>
        
        {/* Risk Limit Alerts */}
        {metrics.breachedLimits.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Risk Limits Breached</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-1">
                {metrics.breachedLimits.map((breach, index) => (
                  <li key={index} className="text-sm flex justify-between">
                    <span>{breach.limit}</span>
                    <span className="font-medium">
                      {breach.currentValue.toFixed(2)} / {breach.maxValue.toFixed(2)} 
                      ({breach.percentageOver > 0 ? '+' : ''}{breach.percentageOver.toFixed(2)}%)
                    </span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        <Separator />
        
        {/* Risk Exposure By Asset */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium flex items-center">
            <BarChart2 className="h-4 w-4 mr-1" />
            Risk Exposure by Asset
          </h3>
          
          <div className="space-y-3">
            {metrics.riskExposureByAsset.slice(0, 4).map((asset, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{asset.symbol}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-medium">
                          {formatCurrency(asset.exposure)} ({formatPercentage(asset.riskContribution)})
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          This asset contributes {formatPercentage(asset.riskContribution)} to your overall portfolio risk
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Progress value={asset.riskContribution} className="h-1" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Risk Concentration Warning */}
        {metrics.concentrationRisk > 50 && (
          <div className="p-3 border rounded-md bg-amber-50 border-amber-200">
            <div className="flex items-start">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 mr-2" />
              <div>
                <div className="text-sm font-medium text-amber-800">Concentration Risk Warning</div>
                <p className="text-xs text-amber-700">
                  Your portfolio has a high concentration risk ({formatPercentage(metrics.concentrationRisk)}). 
                  Consider diversifying your assets to reduce risk.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Largest Drawdowns */}
        {metrics.largestDrawdowns.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center">
              <TrendingDown className="h-4 w-4 mr-1" />
              Largest Drawdowns
            </h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-2 py-1 text-left">Period</th>
                    <th className="px-2 py-1 text-left">Duration</th>
                    <th className="px-2 py-1 text-right">Drawdown</th>
                    <th className="px-2 py-1 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metrics.largestDrawdowns.map((drawdown, index) => (
                    <tr key={index}>
                      <td className="px-2 py-1 text-left">
                        <span className="text-xs">
                          {new Date(drawdown.startDate).toLocaleDateString()} - {' '}
                          {drawdown.recovered ? new Date(drawdown.endDate).toLocaleDateString() : 'Now'}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-left">
                        <span className="text-xs">{drawdown.durationDays} days</span>
                      </td>
                      <td className="px-2 py-1 text-right font-medium text-red-600">
                        {formatPercentage(drawdown.drawdownPercentage)}
                      </td>
                      <td className="px-2 py-1 text-center">
                        {drawdown.recovered ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Recovered
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Active
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
