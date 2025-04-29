"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RiskDashboard } from '@/components/risk/risk-dashboard';
import { PositionSizeCalculator } from '@/components/risk/position-size-calculator';
import { useYieldStrategies } from '@/hooks/use-yield-strategies';
import { createServerClient } from '@/utils/supabase/server';
import { formatCurrency } from '@/lib/utils';
import { 
  Shield, 
  AlertCircle, 
  AlertTriangle, 
  ChevronRight, 
  BarChart3, 
  PieChart, 
  Shuffle, 
  Gauge, 
  LucideShield
} from 'lucide-react';
import type { RiskAssessment } from '@/services/risk/risk-management-service';

export default function RiskManagementPage() {
  const params = useParams();
  const farmId = params.id as string;
  
  // Fetch yield strategies for this farm
  const { 
    strategies: yieldStrategies, 
    loading,
    error
  } = useYieldStrategies(parseInt(farmId));

  // State for risk assessments
  const [riskAssessments, setRiskAssessments] = useState<Record<string, RiskAssessment>>({});
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('exposure');
  
  // Calculate total value and risk exposure
  const totalValue = yieldStrategies.reduce((sum, strategy) => sum + strategy.totalValueUsd, 0);
  const highRiskValue = yieldStrategies
    .filter(s => s.riskLevel >= 3)
    .reduce((sum, strategy) => sum + strategy.totalValueUsd, 0);
  const riskExposurePercent = totalValue > 0 ? (highRiskValue / totalValue) * 100 : 0;
  
  // Fetch risk assessments for strategies
  useEffect(() => {
    const fetchRiskAssessments = async () => {
      if (!yieldStrategies.length) return;
      
      setLoadingAssessments(true);
      
      try {
        // In a real implementation, this would call the risk management service
        // Here we'll simulate risk assessments with mock data
        const assessments: Record<string, RiskAssessment> = {};
        
        for (const strategy of yieldStrategies) {
          // Simulate risk score based on risk level and strategy complexity
          const baseRiskScore = (strategy.riskLevel / 4) * 0.5;
          const complexityFactor = Object.keys(strategy.chainAllocations || {}).length / 10;
          const volatilityFactor = Math.random() * 0.3;
          
          const riskScore = Math.min(1, baseRiskScore + complexityFactor + volatilityFactor);
          
          // Generate warnings based on strategy properties
          const warnings: string[] = [];
          
          if (Object.keys(strategy.chainAllocations || {}).length > 3 && strategy.riskLevel < 3) {
            warnings.push(`Strategy uses ${Object.keys(strategy.chainAllocations || {}).length} chains which exceeds the recommended maximum for this risk level.`);
          }
          
          // Check for high concentration
          const allocations = Object.values(strategy.protocolAllocations || {});
          if (allocations.length > 0) {
            const highestAllocation = Math.max(...allocations);
            if (highestAllocation > 40 && strategy.riskLevel < 3) {
              warnings.push(`Highest protocol allocation (${highestAllocation.toFixed(1)}%) exceeds the recommended maximum for this risk level.`);
            }
          }
          
          // Generate suggestions
          const suggestions: string[] = [];
          if (warnings.length > 0) {
            suggestions.push('Consider rebalancing to better match your risk profile.');
          }
          
          if (strategy.riskLevel >= 3) {
            suggestions.push('High risk strategies should be limited to a small portion of your portfolio.');
          }
          
          if (!strategy.autoRebalance) {
            suggestions.push('Enable auto-rebalancing to maintain your desired risk levels.');
          }
          
          assessments[strategy.id] = {
            riskScore,
            riskLevel: strategy.riskLevel,
            maxDrawdown: 5 + (strategy.riskLevel * 2.5),
            volatilityScore: 0.3 + (strategy.riskLevel * 0.15),
            concentrationRisk: Object.keys(strategy.chainAllocations || {}).length === 1 ? 1 : 
                               Math.min(0.8, 0.3 + (Math.random() * 0.5)),
            recommendedMaxAllocation: strategy.totalValueUsd * (1 - (strategy.riskLevel * 0.1)),
            warnings,
            suggestions
          };
        }
        
        setRiskAssessments(assessments);
        
        // Select the first strategy by default if none selected
        if (!selectedStrategyId && yieldStrategies.length > 0) {
          setSelectedStrategyId(yieldStrategies[0].id);
        }
      } catch (err) {
        console.error('Error fetching risk assessments:', err);
      } finally {
        setLoadingAssessments(false);
      }
    };
    
    fetchRiskAssessments();
  }, [yieldStrategies]);
  
  // Helper to get risk level badge
  const getRiskBadge = (level: number) => {
    switch (level) {
      case 1:
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Low Risk</Badge>;
      case 2:
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Medium Risk</Badge>;
      case 3:
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">High Risk</Badge>;
      case 4:
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Very High Risk</Badge>;
      default:
        return <Badge variant="outline">Custom Risk</Badge>;
    }
  };
  
  // Get selected strategy and its risk assessment
  const selectedStrategy = selectedStrategyId 
    ? yieldStrategies.find(s => s.id === selectedStrategyId) 
    : null;
  
  const selectedRiskAssessment = selectedStrategyId && riskAssessments[selectedStrategyId] 
    ? riskAssessments[selectedStrategyId] 
    : null;
  
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Risk Management</h2>
            <p className="text-muted-foreground">Monitor and control risk across your strategies</p>
          </div>
        </div>
        
        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Risk Management</h2>
            <p className="text-muted-foreground">Monitor and control risk across your strategies</p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load risk management data. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Risk Management</h2>
          <p className="text-muted-foreground">Monitor and control risk across your strategies</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {}}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Export Risk Report
          </Button>
        </div>
      </div>
      
      {/* Risk Overview Cards */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Shield className="mr-2 h-5 w-5 text-primary" />
              Portfolio Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {riskExposurePercent.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">
              High risk exposure ({formatCurrency(highRiskValue)} of {formatCurrency(totalValue)})
            </p>
            
            <div className="h-2 w-full bg-muted rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full ${riskExposurePercent > 40 ? 'bg-red-500' : riskExposurePercent > 20 ? 'bg-orange-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, riskExposurePercent)}%` }}
              ></div>
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground">
              {riskExposurePercent <= 20 ? (
                <span className="text-green-600 font-medium flex items-center">
                  <Shield className="mr-1 h-3 w-3" /> Conservative
                </span>
              ) : riskExposurePercent <= 40 ? (
                <span className="text-orange-600 font-medium flex items-center">
                  <AlertTriangle className="mr-1 h-3 w-3" /> Moderate
                </span>
              ) : (
                <span className="text-red-600 font-medium flex items-center">
                  <AlertCircle className="mr-1 h-3 w-3" /> Aggressive
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <PieChart className="mr-2 h-5 w-5 text-primary" />
              Strategy Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4].map(level => {
                const levelStrategies = yieldStrategies.filter(s => s.riskLevel === level);
                const levelValue = levelStrategies.reduce((sum, s) => sum + s.totalValueUsd, 0);
                const levelPercent = totalValue > 0 ? (levelValue / totalValue) * 100 : 0;
                
                return (
                  <div key={level} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      {getRiskBadge(level)}
                    </div>
                    <div className="font-medium">{levelPercent.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
            
            <Separator className="my-2" />
            
            <div className="text-xs text-muted-foreground mt-2">
              {yieldStrategies.length} active strategies across {yieldStrategies.reduce((chains, s) => {
                Object.keys(s.chainAllocations || {}).forEach(chain => chains.add(chain));
                return chains;
              }, new Set()).size} chains
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Gauge className="mr-2 h-5 w-5 text-primary" />
              Risk Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                  <span className="ml-2">Circuit Breakers</span>
                </div>
                <div>{yieldStrategies.filter(s => s.riskLevel < 4).length}</div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                  <span className="ml-2">Stop Loss</span>
                </div>
                <div>{yieldStrategies.filter(s => s.riskLevel < 3).length}</div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                  <span className="ml-2">Auto-Rebalance</span>
                </div>
                <div>{yieldStrategies.filter(s => s.autoRebalance).length}</div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Attention</Badge>
                  <span className="ml-2">High Risk Positions</span>
                </div>
                <div>{yieldStrategies.filter(s => s.riskLevel >= 3).length}</div>
              </div>
            </div>
            
            <Button variant="outline" size="sm" className="w-full mt-4">
              <Shield className="mr-2 h-4 w-4" />
              Configure Risk Controls
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Risk Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="exposure">Risk Exposure</TabsTrigger>
          <TabsTrigger value="strategies">Strategy Analysis</TabsTrigger>
          <TabsTrigger value="calculator">Position Sizing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="exposure" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Risk Exposure</CardTitle>
              <CardDescription>
                Overview of risk exposure across all strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Warnings</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yieldStrategies.map(strategy => (
                    <TableRow key={strategy.id}>
                      <TableCell className="font-medium">{strategy.name}</TableCell>
                      <TableCell>{getRiskBadge(strategy.riskLevel)}</TableCell>
                      <TableCell>{formatCurrency(strategy.totalValueUsd)}</TableCell>
                      <TableCell>
                        {riskAssessments[strategy.id] ? (
                          <div className="flex items-center">
                            <div 
                              className={`h-2 w-16 rounded-full overflow-hidden bg-muted mr-2`}
                            >
                              <div 
                                className={`h-full ${
                                  riskAssessments[strategy.id].riskScore < 0.3 ? 'bg-green-500' : 
                                  riskAssessments[strategy.id].riskScore < 0.6 ? 'bg-blue-500' :
                                  riskAssessments[strategy.id].riskScore < 0.75 ? 'bg-orange-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${riskAssessments[strategy.id].riskScore * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs">
                              {Math.round(riskAssessments[strategy.id].riskScore * 100)}%
                            </span>
                          </div>
                        ) : (
                          <Skeleton className="h-2 w-16" />
                        )}
                      </TableCell>
                      <TableCell>
                        {riskAssessments[strategy.id] ? (
                          riskAssessments[strategy.id].warnings.length > 0 ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              {riskAssessments[strategy.id].warnings.length} Warning(s)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              No Warnings
                            </Badge>
                          )
                        ) : (
                          <Skeleton className="h-5 w-24" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedStrategyId(strategy.id)}
                          className="h-8 px-2 lg:px-3"
                        >
                          Analyze
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="strategies" className="mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Strategies by Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {yieldStrategies.map(strategy => (
                      <div 
                        key={strategy.id}
                        className={`p-3 rounded-md cursor-pointer hover:bg-muted/70 ${selectedStrategyId === strategy.id ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedStrategyId(strategy.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{strategy.name}</div>
                          {getRiskBadge(strategy.riskLevel)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatCurrency(strategy.totalValueUsd)} • {strategy.currentApy ? `${strategy.currentApy.toFixed(2)}% APY` : 'APY N/A'}
                        </div>
                        
                        {riskAssessments[strategy.id] && riskAssessments[strategy.id].warnings.length > 0 && (
                          <div className="mt-2 flex items-center text-xs text-red-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {riskAssessments[strategy.id].warnings.length} risk warning(s)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2 space-y-6">
              {selectedStrategy && selectedRiskAssessment ? (
                <RiskDashboard 
                  strategy={selectedStrategy}
                  riskAssessment={selectedRiskAssessment}
                  onRebalance={() => {
                    // Implementation for rebalance action
                    alert(`Rebalancing strategy: ${selectedStrategy.name}`);
                  }}
                  onUpdateRiskLevel={(level) => {
                    // Implementation for updating risk level
                    alert(`Updating risk level to ${level} for strategy: ${selectedStrategy.name}`);
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium">Select a strategy to view risk assessment</p>
                    <p className="text-muted-foreground mt-1">
                      Choose a strategy from the list to see detailed risk analysis
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="calculator" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <PositionSizeCalculator
              initialCapital={totalValue}
              riskLevel={2}
              className="md:col-span-1"
            />
            
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Position Sizing Guidelines</CardTitle>
                <CardDescription>
                  Best practices for managing position sizes based on risk profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted rounded-md">
                  <h3 className="font-medium">Conservative Approach (Low Risk)</h3>
                  <ul className="mt-2 space-y-1 text-sm ml-5 list-disc">
                    <li>Limit individual positions to 5-10% of portfolio</li>
                    <li>Maintain at least 25% in stable assets</li>
                    <li>Use stop-loss orders set at 5-8%</li>
                    <li>Take profit at 1.5-2x potential loss</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-muted rounded-md">
                  <h3 className="font-medium">Balanced Approach (Medium Risk)</h3>
                  <ul className="mt-2 space-y-1 text-sm ml-5 list-disc">
                    <li>Limit individual positions to 10-15% of portfolio</li>
                    <li>Maintain 15-20% in stable assets</li>
                    <li>Use stop-loss orders set at 8-12%</li>
                    <li>Take profit at 1.5-2.5x potential loss</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-muted rounded-md">
                  <h3 className="font-medium">Growth Approach (High Risk)</h3>
                  <ul className="mt-2 space-y-1 text-sm ml-5 list-disc">
                    <li>Limit individual positions to 15-25% of portfolio</li>
                    <li>Maintain 10% in stable assets</li>
                    <li>Use stop-loss orders set at 12-20%</li>
                    <li>Take profit at 2-3x potential loss</li>
                  </ul>
                </div>
                
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    These are general guidelines. Always adjust position sizes based on market conditions, volatility, and your personal risk tolerance.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
