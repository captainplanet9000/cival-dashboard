"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { 
  BarChart, 
  LineChart,
  PieChart,
  RadarChart,
  HeatMap,
  ResponsiveContainer 
} from '../ui/charts';
import { 
  AgentPerformanceAnalysis, 
  StrategyPrediction, 
  PortfolioAnalytics,
  AnalyticsInsight
} from '@/types/analytics';
import { analyticsService } from '@/data-access/services/analytics-service';
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { InfoIcon, AlertTriangle, TrendingUp, BarChart3Icon, Activity } from "lucide-react";

interface PerformanceAnalysisDashboardProps {
  agentId?: string;
  strategyId?: string;
}

export default function PerformanceAnalysisDashboard({ 
  agentId, 
  strategyId 
}: PerformanceAnalysisDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [agentAnalysis, setAgentAnalysis] = useState<AgentPerformanceAnalysis | null>(null);
  const [strategyPrediction, setStrategyPrediction] = useState<StrategyPrediction | null>(null);
  const [portfolioAnalytics, setPortfolioAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get analytics insights
        const fetchedInsights = await analyticsService.getAnalyticsInsights();
        setInsights(fetchedInsights);
        
        // Get portfolio analytics
        const portfolio = await analyticsService.analyzePortfolio();
        setPortfolioAnalytics(portfolio);
        
        // Get agent performance analysis if agentId is provided
        if (agentId) {
          const analysis = await analyticsService.analyzeAgentPerformance(agentId, timeframe);
          setAgentAnalysis(analysis);
        }
        
        // Get strategy prediction if strategyId is provided
        if (strategyId) {
          const prediction = await analyticsService.predictStrategyPerformance(strategyId, '30 days');
          setStrategyPrediction(prediction);
        }
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [agentId, strategyId, timeframe]);
  
  const handleDismissInsight = async (insightId: string) => {
    await analyticsService.dismissInsight(insightId);
    setInsights(insights.filter(i => i.id !== insightId));
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Advanced Analytics Dashboard</CardTitle>
              <CardDescription>AI-powered performance analysis and predictive insights</CardDescription>
            </div>
            <div className="flex space-x-2">
              <div className="flex space-x-1 rounded-md border bg-background p-1">
                <Button 
                  variant={timeframe === 'day' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setTimeframe('day')}
                >
                  Day
                </Button>
                <Button 
                  variant={timeframe === 'week' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setTimeframe('week')}
                >
                  Week
                </Button>
                <Button 
                  variant={timeframe === 'month' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setTimeframe('month')}
                >
                  Month
                </Button>
              </div>
              <Button variant="outline" size="sm">
                <Activity className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
              <TabsTrigger value="predictions">Predictive Analytics</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i}>
                        <CardHeader className="pb-2">
                          <Skeleton className="h-4 w-[120px]" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-8 w-[60px] mb-2" />
                          <Skeleton className="h-3 w-[140px]" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-[180px]" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <Card className={`${agentAnalysis?.improvementScore && agentAnalysis.improvementScore >= 70 ? 'border-green-500' : agentAnalysis?.improvementScore && agentAnalysis.improvementScore <= 40 ? 'border-red-500' : ''}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{agentAnalysis?.improvementScore || 'N/A'}/100</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {agentAnalysis?.improvementScore && agentAnalysis.improvementScore >= 70 
                            ? 'Excellent performance' 
                            : agentAnalysis?.improvementScore && agentAnalysis.improvementScore <= 40 
                              ? 'Needs improvement' 
                              : 'Average performance'}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {agentAnalysis?.metrics.winRate 
                            ? `${(agentAnalysis.metrics.winRate * 100).toFixed(1)}%` 
                            : 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {agentAnalysis?.comparisonToBaseline?.find(c => c.metric === 'Win Rate')?.percentageDifference 
                            ? `${agentAnalysis.comparisonToBaseline.find(c => c.metric === 'Win Rate')?.percentageDifference.toFixed(1)}% vs baseline` 
                            : ''}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {agentAnalysis?.metrics.sharpeRatio.toFixed(2) || 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {agentAnalysis?.metrics.sortinoRatio 
                            ? `Sortino: ${agentAnalysis.metrics.sortinoRatio.toFixed(2)}` 
                            : ''}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart 
                            data={[
                              {
                                metric: 'Win Rate',
                                value: agentAnalysis?.metrics.winRate || 0,
                                baseline: 0.5
                              },
                              {
                                metric: 'Profit Factor',
                                value: Math.min(agentAnalysis?.metrics.profitFactor || 0, 3) / 3,
                                baseline: 1.5 / 3
                              },
                              {
                                metric: 'Sharpe Ratio',
                                value: Math.min(agentAnalysis?.metrics.sharpeRatio || 0, 3) / 3,
                                baseline: 1 / 3
                              },
                              {
                                metric: 'Recovery',
                                value: Math.min(agentAnalysis?.metrics.recoveryFactor || 0, 5) / 5,
                                baseline: 2 / 5
                              },
                              {
                                metric: 'Low Drawdown',
                                value: agentAnalysis?.metrics.maxDrawdown 
                                  ? 1 - Math.min(agentAnalysis.metrics.maxDrawdown / 0.5, 1) 
                                  : 0,
                                baseline: 0.6
                              }
                            ]} 
                          />
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Asset Allocation</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart 
                            data={portfolioAnalytics?.allocations.map(a => ({
                              name: a.assetClass,
                              value: a.percentage
                            })) || []} 
                          />
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Daily Returns</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={Array.from({ length: 30 }).map((_, i) => ({
                            name: `Day ${i + 1}`,
                            value: (Math.random() * 2 - 1) * (Math.random() * 0.05)
                          }))} 
                        />
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">AI Insights</h3>
                    {insights.slice(0, 3).map(insight => (
                      <Alert key={insight.id} className="flex items-start">
                        <div className="flex-shrink-0 mr-2">
                          {insight.severity === 'high' || insight.severity === 'critical' ? (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          ) : insight.category === 'opportunity' ? (
                            <TrendingUp className="h-5 w-5 text-green-500" />
                          ) : (
                            <InfoIcon className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-grow">
                          <AlertTitle className="flex items-center">
                            <span>{insight.title}</span>
                            <Badge className="ml-2" variant={
                              insight.severity === 'high' || insight.severity === 'critical' 
                                ? 'destructive' 
                                : insight.category === 'opportunity' 
                                  ? 'default' 
                                  : 'secondary'
                            }>
                              {insight.severity}
                            </Badge>
                          </AlertTitle>
                          <AlertDescription>
                            {insight.description}
                          </AlertDescription>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-shrink-0 ml-2"
                          onClick={() => handleDismissInsight(insight.id)}
                        >
                          Dismiss
                        </Button>
                      </Alert>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="performance">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-[400px] w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-[200px] w-full" />
                    <Skeleton className="h-[200px] w-full" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Trading Performance Analysis</CardTitle>
                      <CardDescription>
                        {agentAnalysis?.agentName ? `Agent: ${agentAnalysis.agentName}` : 'Portfolio-wide performance'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <h3 className="font-medium mb-2">Trading Metrics</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Trades</p>
                              <p className="text-xl font-semibold">{agentAnalysis?.metrics.totalTrades || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Win Rate</p>
                              <p className="text-xl font-semibold">{agentAnalysis?.metrics.winRate ? `${(agentAnalysis.metrics.winRate * 100).toFixed(1)}%` : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Profit Factor</p>
                              <p className="text-xl font-semibold">{agentAnalysis?.metrics.profitFactor?.toFixed(2) || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Avg Win/Loss</p>
                              <p className="text-xl font-semibold">
                                {agentAnalysis?.metrics.averageWin && agentAnalysis?.metrics.averageLoss
                                  ? `${(Math.abs(agentAnalysis.metrics.averageWin / agentAnalysis.metrics.averageLoss)).toFixed(2)}`
                                  : 'N/A'}
                              </p>
                            </div>
                          </div>
                          
                          <h3 className="font-medium mt-4 mb-2">Risk Metrics</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Max Drawdown</p>
                              <p className="text-xl font-semibold">
                                {agentAnalysis?.metrics.maxDrawdown 
                                  ? `${(agentAnalysis.metrics.maxDrawdown / (agentAnalysis.metrics.totalPnL > 0 ? agentAnalysis.metrics.totalPnL : 1) * 100).toFixed(1)}%` 
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Recovery Factor</p>
                              <p className="text-xl font-semibold">{agentAnalysis?.metrics.recoveryFactor?.toFixed(2) || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                              <p className="text-xl font-semibold">{agentAnalysis?.metrics.sharpeRatio?.toFixed(2) || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Sortino Ratio</p>
                              <p className="text-xl font-semibold">{agentAnalysis?.metrics.sortinoRatio?.toFixed(2) || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-medium mb-2">AI Analysis</h3>
                          <div className="mb-4">
                            <div className="mb-2 flex items-center">
                              <h4 className="text-sm font-medium">Strengths</h4>
                              <Badge className="ml-2" variant="outline">{agentAnalysis?.strengths.length || 0}</Badge>
                            </div>
                            <ul className="space-y-1 text-sm">
                              {agentAnalysis?.strengths.map((strength, i) => (
                                <li key={i} className="flex items-start">
                                  <span className="text-green-500 mr-2">•</span>
                                  <span>{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="mb-4">
                            <div className="mb-2 flex items-center">
                              <h4 className="text-sm font-medium">Weaknesses</h4>
                              <Badge className="ml-2" variant="outline">{agentAnalysis?.weaknesses.length || 0}</Badge>
                            </div>
                            <ul className="space-y-1 text-sm">
                              {agentAnalysis?.weaknesses.map((weakness, i) => (
                                <li key={i} className="flex items-start">
                                  <span className="text-red-500 mr-2">•</span>
                                  <span>{weakness}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <div className="mb-2 flex items-center">
                              <h4 className="text-sm font-medium">Recommendations</h4>
                              <Badge className="ml-2" variant="outline">{agentAnalysis?.aiRecommendations.length || 0}</Badge>
                            </div>
                            <ul className="space-y-1 text-sm">
                              {agentAnalysis?.aiRecommendations.map((rec, i) => (
                                <li key={i} className="flex items-start">
                                  <span className="text-blue-500 mr-2">→</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <h3 className="font-medium mb-3">Performance Comparison to Baseline</h3>
                        <div className="h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={agentAnalysis?.comparisonToBaseline?.map(c => ({
                                name: c.metric,
                                value: c.percentageDifference,
                                baseline: 0
                              })) || []} 
                            />
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="predictions">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-[400px] w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-[200px] w-full" />
                    <Skeleton className="h-[200px] w-full" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Strategy Prediction Analysis</CardTitle>
                      <CardDescription>
                        {strategyPrediction?.strategyName 
                          ? `Strategy: ${strategyPrediction.strategyName} | Timeframe: ${strategyPrediction.predictionTimeframe}`
                          : 'Portfolio-wide projections'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <h3 className="font-medium">Expected Performance</h3>
                              <p className="text-sm text-muted-foreground">
                                Confidence Level: {strategyPrediction?.confidenceLevel 
                                  ? `${(strategyPrediction.confidenceLevel * 100).toFixed(0)}%` 
                                  : 'N/A'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">
                                {strategyPrediction?.expectedReturn 
                                  ? `${(strategyPrediction.expectedReturn * 100).toFixed(2)}%` 
                                  : 'N/A'}
                              </p>
                              <Badge variant={
                                strategyPrediction?.expectedReturn && strategyPrediction.expectedReturn > 0 
                                  ? 'default' 
                                  : 'destructive'
                              }>
                                {strategyPrediction?.expectedReturn && strategyPrediction.expectedReturn > 0 
                                  ? 'Positive' 
                                  : 'Negative'}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="h-[200px] mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart 
                                data={strategyPrediction?.probabilityDistribution.map((p, i) => ({
                                  name: (p.returnLevel * 100).toFixed(1) + '%',
                                  value: p.probability
                                })) || []} 
                              />
                            </ResponsiveContainer>
                          </div>
                          
                          <h3 className="font-medium mb-2">Risk Assessment</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Expected Drawdown</p>
                              <p className="text-xl font-semibold">
                                {strategyPrediction?.riskAssessment.expectedDrawdown 
                                  ? `${(strategyPrediction.riskAssessment.expectedDrawdown * 100).toFixed(1)}%` 
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Value at Risk (95%)</p>
                              <p className="text-xl font-semibold">
                                {strategyPrediction?.riskAssessment.varLevel95 
                                  ? `${(strategyPrediction.riskAssessment.varLevel95 * 100).toFixed(1)}%` 
                                  : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-medium mb-2">Market Scenario Analysis</h3>
                          <div className="h-[150px] mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart 
                                data={strategyPrediction?.marketConditions.map(m => ({
                                  name: m.scenario,
                                  value: m.expectedPerformance * 100
                                })) || []} 
                              />
                            </ResponsiveContainer>
                          </div>
                          
                          <h3 className="font-medium mb-2">Stress Test Results</h3>
                          <div className="h-[150px] mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart 
                                data={strategyPrediction?.riskAssessment.stressTestResults.map(s => ({
                                  name: s.scenario,
                                  value: s.impact * 100
                                })) || []} 
                              />
                            </ResponsiveContainer>
                          </div>
                          
                          <h3 className="font-medium mb-2">AI Recommendations</h3>
                          <ul className="space-y-2">
                            {strategyPrediction?.recommendations.map((rec, i) => (
                              <li key={i} className="flex items-start p-2 rounded-md border">
                                <Badge className="mt-0.5 mr-2" variant={
                                  rec.priority === 'high' 
                                    ? 'destructive' 
                                    : rec.priority === 'medium' 
                                      ? 'default' 
                                      : 'outline'
                                }>
                                  {rec.priority}
                                </Badge>
                                <div>
                                  <p className="font-medium">{rec.action}</p>
                                  <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="insights">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-[120px] w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-900 mb-4">
                        <InfoIcon className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-medium">No insights available</h3>
                      <p className="text-muted-foreground">Check back later for AI-generated insights.</p>
                    </div>
                  ) : (
                    insights.map(insight => (
                      <Card key={insight.id} className={
                        insight.severity === 'critical' 
                          ? 'border-red-500' 
                          : insight.severity === 'high' 
                            ? 'border-orange-500' 
                            : insight.category === 'opportunity' 
                              ? 'border-green-500' 
                              : ''
                      }>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center">
                              {insight.category === 'performance' ? (
                                <BarChart3Icon className="h-5 w-5 mr-2 text-blue-500" />
                              ) : insight.category === 'risk' ? (
                                <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                              ) : insight.category === 'opportunity' ? (
                                <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                              ) : (
                                <InfoIcon className="h-5 w-5 mr-2 text-gray-500" />
                              )}
                              <CardTitle className="text-base">{insight.title}</CardTitle>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={
                                insight.severity === 'critical' || insight.severity === 'high' 
                                  ? 'destructive' 
                                  : insight.severity === 'medium' 
                                    ? 'default' 
                                    : 'secondary'
                              }>
                                {insight.severity}
                              </Badge>
                              <Badge variant="outline">
                                {new Date(insight.timestamp).toLocaleTimeString()}
                              </Badge>
                            </div>
                          </div>
                          <CardDescription>{insight.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="pb-3">
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-sm font-medium mb-1">Recommendations</h4>
                              <ul className="space-y-1 text-sm">
                                {insight.recommendations.map((rec, i) => (
                                  <li key={i} className="flex items-start">
                                    <span className="text-blue-500 mr-2">→</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            {insight.relatedEntities?.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-1">Related</h4>
                                <div className="flex flex-wrap gap-2">
                                  {insight.relatedEntities.map((entity, i) => (
                                    <Badge key={i} variant="outline">
                                      {entity.type}: {entity.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {insight.visualizations && insight.visualizations.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-1">Visualization</h4>
                                <div className="h-[150px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    {insight.visualizations[0].type === 'line_chart' ? (
                                      <LineChart data={insight.visualizations[0].data} />
                                    ) : insight.visualizations[0].type === 'bar_chart' ? (
                                      <BarChart data={insight.visualizations[0].data} />
                                    ) : (
                                      <PieChart data={insight.visualizations[0].data} />
                                    )}
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex justify-between items-center pt-2">
                              <p className="text-xs text-muted-foreground">
                                AI confidence: {(insight.aiConfidence * 100).toFixed(0)}%
                              </p>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDismissInsight(insight.id)}
                              >
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 