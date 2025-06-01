import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { YieldStrategy } from "@/types/yield-strategy.types";
import { RiskAssessment } from "@/services/risk/risk-management-service";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Shield, 
  TrendingDown, 
  BarChart, 
  Percent, 
  ArrowDownRight, 
  Shuffle, 
  ChevronRight 
} from "lucide-react";

interface RiskDashboardProps {
  strategy: YieldStrategy;
  riskAssessment?: RiskAssessment;
  isLoading?: boolean;
  onRebalance?: () => void;
  onUpdateRiskLevel?: (level: number) => void;
}

export function RiskDashboard({ 
  strategy, 
  riskAssessment, 
  isLoading = false,
  onRebalance,
  onUpdateRiskLevel 
}: RiskDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Helper to get risk level label and color
  const getRiskLevelInfo = (level: number): { label: string; color: string } => {
    switch (level) {
      case 1:
        return { label: 'Low Risk', color: 'bg-green-500' };
      case 2:
        return { label: 'Medium Risk', color: 'bg-blue-500' };
      case 3:
        return { label: 'High Risk', color: 'bg-orange-500' };
      case 4:
        return { label: 'Very High Risk', color: 'bg-red-500' };
      default:
        return { label: 'Custom Risk', color: 'bg-gray-500' };
    }
  };
  
  // Get risk level display info
  const riskInfo = getRiskLevelInfo(strategy.riskLevel);
  
  // Determine overall risk status
  const getRiskStatus = () => {
    if (!riskAssessment) return null;
    
    if (riskAssessment.riskScore < 0.3) {
      return (
        <div className="flex items-center">
          <CheckCircle className="text-green-500 mr-2 h-5 w-5" />
          <span className="font-medium">Low Risk</span>
        </div>
      );
    } else if (riskAssessment.riskScore < 0.6) {
      return (
        <div className="flex items-center">
          <Info className="text-blue-500 mr-2 h-5 w-5" />
          <span className="font-medium">Moderate Risk</span>
        </div>
      );
    } else if (riskAssessment.riskScore < 0.75) {
      return (
        <div className="flex items-center">
          <AlertTriangle className="text-orange-500 mr-2 h-5 w-5" />
          <span className="font-medium">High Risk</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center">
          <AlertCircle className="text-red-500 mr-2 h-5 w-5" />
          <span className="font-medium">Very High Risk</span>
        </div>
      );
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk Assessment</CardTitle>
          <CardDescription>Analyzing strategy risk factors...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl flex items-center">
              <Shield className="mr-2 h-5 w-5 text-primary" /> 
              Risk Management
            </CardTitle>
            <CardDescription>
              Analysis and management of yield strategy risk factors
            </CardDescription>
          </div>
          <Badge 
            variant="outline"
            className={`px-2 py-1 ${riskInfo.color.replace('bg-', 'border-')} ${riskInfo.color.replace('bg-', 'text-')}`}
          >
            {riskInfo.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        {riskAssessment ? (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Risk Score</span>
              <span className="text-sm font-medium">{Math.round(riskAssessment.riskScore * 100)}%</span>
            </div>
            <Progress 
              value={riskAssessment.riskScore * 100} 
              max={100} 
              className="h-2 mb-4"
              // Color changes based on risk level
              indicatorClassName={
                riskAssessment.riskScore < 0.3 ? "bg-green-500" :
                riskAssessment.riskScore < 0.6 ? "bg-blue-500" :
                riskAssessment.riskScore < 0.75 ? "bg-orange-500" : "bg-red-500"
              }
            />
            
            {riskAssessment.warnings.length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Risk Warnings</AlertTitle>
                <AlertDescription>
                  <ul className="ml-6 mt-2 list-disc text-sm">
                    {riskAssessment.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="allocation">Allocation</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-0">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <TrendingDown className="mr-2 h-4 w-4 text-red-500" />
                        Max Drawdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 px-3">
                      <div className="text-2xl font-bold">
                        {riskAssessment.maxDrawdown.toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Historical maximum loss from peak
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <BarChart className="mr-2 h-4 w-4 text-blue-500" />
                        Volatility
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 px-3">
                      <div className="text-2xl font-bold">
                        {(riskAssessment.volatilityScore * 100).toFixed(0)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Relative price volatility score
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <Percent className="mr-2 h-4 w-4 text-green-500" />
                        Recommended Max
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 px-3">
                      <div className="text-2xl font-bold">
                        {formatCurrency(riskAssessment.recommendedMaxAllocation)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Suggested maximum allocation
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Risk Status</h3>
                  <div className="p-3 bg-muted rounded-md">
                    {getRiskStatus()}
                    <p className="text-sm text-muted-foreground mt-1">
                      Overall risk assessment based on multiple factors including volatility, concentration, and historical performance.
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="allocation" className="mt-0">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Chain Allocation</h3>
                    <div className="space-y-2">
                      {Object.entries(strategy.chainAllocations || {}).map(([chainId, percentage]) => (
                        <div key={chainId} className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <span>{getChainName(chainId)}</span>
                            {percentage > 40 && strategy.riskLevel < 3 && (
                              <Badge variant="outline" className="ml-2 text-orange-700">High Concentration</Badge>
                            )}
                          </div>
                          <span className="font-medium">{percentage.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                    <Progress 
                      value={riskAssessment.concentrationRisk * 100} 
                      max={100} 
                      className="h-2 mt-2"
                      indicatorClassName={
                        riskAssessment.concentrationRisk < 0.4 ? "bg-green-500" :
                        riskAssessment.concentrationRisk < 0.7 ? "bg-orange-500" : "bg-red-500"
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Concentration Risk: {(riskAssessment.concentrationRisk * 100).toFixed(0)}%
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Protocol Allocation</h3>
                    <div className="space-y-2">
                      {strategy.allocations?.map((allocation) => (
                        <div key={allocation.id} className="flex items-center justify-between text-sm">
                          <span>{allocation.protocol?.name || allocation.protocolId}</span>
                          <span className="font-medium">{allocation.allocationPercent.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="recommendations" className="mt-0">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center">
                      <Info className="mr-2 h-4 w-4 text-blue-500" />
                      Suggested Actions
                    </h3>
                    <ul className="space-y-2 ml-6 list-disc text-sm">
                      {riskAssessment.suggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {strategy.riskLevel > 1 && (
                    <div className="p-3 bg-muted rounded-md">
                      <h3 className="text-sm font-medium mb-1 flex items-center">
                        <ArrowDownRight className="mr-2 h-4 w-4 text-green-500" />
                        Reduce Risk Level
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Lowering the risk level will rebalance toward more conservative allocations.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onUpdateRiskLevel?.(strategy.riskLevel - 1)}
                      >
                        Lower to {getRiskLevelInfo(strategy.riskLevel - 1).label}
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-4">
            <AlertTriangle className="h-10 w-10 text-orange-500 mx-auto mb-2" />
            <h3 className="text-lg font-medium">Risk Data Unavailable</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Unable to load risk assessment data for this strategy.
            </p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2 bg-muted/40">
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs"
        >
          <Shield className="mr-1 h-3.5 w-3.5" />
          View Risk Report
        </Button>
        
        {onRebalance && (
          <Button
            variant="default"
            size="sm"
            className="text-xs"
            onClick={onRebalance}
          >
            <Shuffle className="mr-1 h-3.5 w-3.5" />
            Rebalance For Risk
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// Helper function to get chain name from ID
function getChainName(chainId: string): string {
  const chainMap: Record<string, string> = {
    '1': 'Ethereum',
    '10': 'Optimism',
    '56': 'BSC',
    '137': 'Polygon',
    '42161': 'Arbitrum',
    '43114': 'Avalanche',
    '250': 'Fantom',
    '1101': 'Polygon zkEVM',
  };
  
  return chainMap[chainId] || `Chain ${chainId}`;
}
