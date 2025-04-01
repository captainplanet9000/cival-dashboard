"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, AlertTriangle, TrendingUp, BarChart3Icon, Activity } from "lucide-react";
import { 
  BarChart, 
  LineChart,
  PieChart,
  RadarChart,
  HeatMap,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Line,
  Bar,
  Pie
} from '@/components/ui/charts';
import { 
  AgentPerformanceAnalysis, 
  StrategyPrediction, 
  PortfolioAnalytics,
  AnalyticsInsight
} from '@/types/analytics';
import { analyticsService } from '@/data-access/services/analytics-service';

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
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [insightsData, portfolioData] = await Promise.all([
          analyticsService.getAnalyticsInsights(),
          analyticsService.analyzePortfolio()
        ]);
        
        setInsights(insightsData);
        setPortfolioAnalytics(portfolioData);
        
        if (agentId) {
          const analysis = await analyticsService.analyzeAgentPerformance(agentId, timeframe);
          setAgentAnalysis(analysis);
        }
        
        if (strategyId) {
          const prediction = await analyticsService.predictStrategyPerformance(strategyId, '30 days');
          setStrategyPrediction(prediction);
        }
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        setError('Failed to fetch analytics data. Please try again.');
        // Implement exponential backoff for retries
        if (retryCount < 3) {
          const timeout = Math.pow(2, retryCount) * 1000;
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, timeout);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [agentId, strategyId, timeframe, retryCount]);
  
  const handleDismissInsight = async (insightId: string) => {
    await analyticsService.dismissInsight(insightId);
    setInsights(insights.filter(i => i.id !== insightId));
  };
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setRetryCount(prev => prev + 1)}
          className="mt-2"
        >
          Retry
        </Button>
      </Alert>
    );
  }
  
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
                  
                  <Card className={`${portfolioAnalytics?.healthScore >= 70 ? 'border-green-500' : portfolioAnalytics?.healthScore <= 40 ? 'border-red-500' : ''}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Portfolio Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {portfolioAnalytics?.healthScore.toFixed(1) || 'N/A'}/100
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {portfolioAnalytics?.riskLevel} risk level
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="performance" className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-[400px] w-full" />
                  <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-[200px] w-full" />
                    <Skeleton className="h-[200px] w-full" />
                    <Skeleton className="h-[200px] w-full" />
                  </div>
                </div>
              ) : agentAnalysis ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                      <CardDescription>Detailed analysis of trading performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Returns</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Total Return</span>
                              <span className="font-medium">{(agentAnalysis.metrics.totalReturn * 100).toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Average Return</span>
                              <span className="font-medium">{(agentAnalysis.metrics.averageReturn * 100).toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Annualized Return</span>
                              <span className="font-medium">{(agentAnalysis.metrics.annualizedReturn * 100).toFixed(2)}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-2">Risk Metrics</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Volatility</span>
                              <span className="font-medium">{(agentAnalysis.metrics.volatility * 100).toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Max Drawdown</span>
                              <span className="font-medium">{(agentAnalysis.metrics.maxDrawdown * 100).toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Value at Risk</span>
                              <span className="font-medium">{(agentAnalysis.metrics.valueAtRisk * 100).toFixed(2)}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-2">Trading Statistics</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Win Rate</span>
                              <span className="font-medium">{(agentAnalysis.metrics.winRate * 100).toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Profit Factor</span>
                              <span className="font-medium">{agentAnalysis.metrics.profitFactor.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                              <span className="font-medium">{agentAnalysis.metrics.sharpeRatio.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Trade Distribution</CardTitle>
                        <CardDescription>Analysis of trade outcomes and patterns</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={agentAnalysis.tradeDistribution}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="range" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="count" fill="#8884d8" name="Number of Trades" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Attribution</CardTitle>
                        <CardDescription>Breakdown of performance factors</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Tooltip />
                              <Legend />
                              <Pie
                                data={agentAnalysis.performanceAttribution}
                                dataKey="value"
                                nameKey="factor"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                label
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {agentAnalysis.strengths.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Analysis</CardTitle>
                        <CardDescription>AI-generated insights about trading behavior</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-8">
                          <div>
                            <h4 className="font-medium mb-2">Strengths</h4>
                            <ul className="space-y-2">
                              {agentAnalysis.strengths.map((strength, index) => (
                                <li key={index} className="flex items-center text-sm">
                                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                                  {strength}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Areas for Improvement</h4>
                            <ul className="space-y-2">
                              {agentAnalysis.weaknesses.map((weakness, index) => (
                                <li key={index} className="flex items-center text-sm">
                                  <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                                  {weakness}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-[200px]">
                    <div className="text-center">
                      <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No Agent Selected</h3>
                      <p className="text-sm text-muted-foreground">
                        Select an agent to view performance metrics
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="predictions" className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-[400px] w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-[200px] w-full" />
                    <Skeleton className="h-[200px] w-full" />
                  </div>
                </div>
              ) : strategyPrediction ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Forecast</CardTitle>
                      <CardDescription>30-day prediction with {strategyPrediction.confidenceLevel}% confidence</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={strategyPrediction.forecastData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="expectedReturn" 
                              stroke="#8884d8" 
                              name="Expected Return" 
                            />
                            <Line 
                              type="monotone" 
                              dataKey="upperBound" 
                              stroke="#82ca9d" 
                              strokeDasharray="5 5" 
                              name="Upper Bound" 
                            />
                            <Line 
                              type="monotone" 
                              dataKey="lowerBound" 
                              stroke="#ff7300" 
                              strokeDasharray="5 5" 
                              name="Lower Bound" 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Risk Analysis</CardTitle>
                        <CardDescription>Predicted risk factors and exposure</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={strategyPrediction.riskAnalysis}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="factor" />
                              <PolarRadiusAxis />
                              <Radar 
                                name="Risk Score" 
                                dataKey="score" 
                                stroke="#8884d8" 
                                fill="#8884d8" 
                                fillOpacity={0.6} 
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Market Impact</CardTitle>
                        <CardDescription>Predicted market conditions and impact</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {strategyPrediction.marketImpact.map((impact, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">{impact.factor}</p>
                                <p className="text-sm text-muted-foreground">{impact.description}</p>
                              </div>
                              <Badge variant={impact.impact === 'positive' ? 'default' : impact.impact === 'negative' ? 'destructive' : 'secondary'}>
                                {impact.probability}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {strategyPrediction.recommendations.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>AI Recommendations</CardTitle>
                        <CardDescription>Strategy optimization suggestions based on predictions</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {strategyPrediction.recommendations.map((recommendation, index) => (
                            <div key={index} className="flex items-start space-x-4">
                              <div className="flex-shrink-0">
                                <Badge variant={recommendation.priority === 'high' ? 'destructive' : 'default'}>
                                  {recommendation.priority}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{recommendation.title}</p>
                                <p className="text-sm text-muted-foreground">{recommendation.description}</p>
                                {recommendation.actionItems && (
                                  <ul className="mt-2 space-y-1">
                                    {recommendation.actionItems.map((item, itemIndex) => (
                                      <li key={itemIndex} className="text-sm flex items-center">
                                        <span className="w-2 h-2 rounded-full bg-primary mr-2" />
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-[200px]">
                    <div className="text-center">
                      <BarChart3Icon className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No Strategy Selected</h3>
                      <p className="text-sm text-muted-foreground">
                        Select a strategy to view predictive analytics
                      </p>
                    </div>
                  </CardContent>
                </Card>
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