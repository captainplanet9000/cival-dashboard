import React from 'react';
import { Metadata } from 'next';
import { createServerClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Home, 
  ArrowLeft, 
  BarChart2, 
  Brain,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart,
  Activity,
  PieChart,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ExecutionQualityAnalysis from '@/components/orders/execution-quality-analysis';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

export const generateMetadata = async ({ params }: { params: { id: string } }): Promise<Metadata> => {
  return {
    title: `Order Analysis | Trading Farm`,
    description: 'Detailed analysis of order execution quality',
  };
};

// Function to get order details
async function getOrderDetails(orderId: string) {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      farms:farm_id(name),
      agents:agent_id(name),
      strategies:strategy_id(name)
    `)
    .eq('id', orderId)
    .single();
  
  if (error || !data) {
    console.error('Error fetching order details:', error);
    return null;
  }
  
  return data;
}

// Function to get order execution data
async function getOrderExecutionData(orderId: string) {
  const supabase = await createServerClient();
  
  // First, check if there's execution data available
  const { data: executions, error: executionsError } = await supabase
    .from('order_executions')
    .select('*')
    .eq('order_id', orderId)
    .order('timestamp', { ascending: true });
  
  if (executionsError) {
    console.error('Error fetching order executions:', executionsError);
    return null;
  }
  
  // No executions means the order hasn't been filled
  if (!executions || executions.length === 0) {
    return null;
  }
  
  // Get execution metrics
  const { data: metrics, error: metricsError } = await supabase
    .rpc('get_order_execution_metrics', { p_order_id: orderId });
  
  if (metricsError) {
    console.error('Error fetching execution metrics:', metricsError);
    return null;
  }
  
  // Get market data around the execution time
  const { data: marketData, error: marketDataError } = await supabase
    .from('market_data')
    .select('timestamp, price, volume')
    .eq('symbol', executions[0].symbol)
    .gte('timestamp', executions[0].timestamp)
    .lte('timestamp', executions[executions.length - 1].timestamp || executions[0].timestamp)
    .order('timestamp', { ascending: true });
  
  if (marketDataError) {
    console.error('Error fetching market data:', marketDataError);
  }
  
  // Get market conditions
  const { data: marketConditions, error: marketConditionsError } = await supabase
    .rpc('get_market_conditions', {
      p_symbol: executions[0].symbol,
      p_timestamp: executions[0].timestamp
    });
  
  if (marketConditionsError) {
    console.error('Error fetching market conditions:', marketConditionsError);
  }
  
  // Format the data for the execution quality analysis component
  const formattedMarketData = (marketData || []).map(data => ({
    timestamp: data.timestamp,
    price: data.price,
    volume: data.volume,
    orderPrice: executions.find(e => e.timestamp === data.timestamp)?.price
  }));
  
  // Format order timeline
  const orderTimeline = [
    {
      timestamp: executions[0].order_timestamp,
      event: 'Order Created',
      details: 'Order submitted to the exchange'
    },
    ...executions.map(exec => ({
      timestamp: exec.timestamp,
      event: `Order ${exec.type === 'fill' ? 'Fill' : exec.type}`,
      price: exec.price,
      quantity: exec.quantity,
      details: exec.details || ''
    }))
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  return {
    executions,
    metrics: metrics || {
      slippage: 0,
      marketImpact: 0,
      executionSpeed: 0,
      opportunityCost: 0,
      timingScore: 0,
      priceImprovement: 0,
      volumeParticipation: 0,
      volatilityAtExecution: 0,
      overallScore: 0
    },
    marketPriceData: formattedMarketData,
    orderTimeline,
    marketConditions: marketConditions || []
  };
}

// Function to get historical orders for comparison
async function getHistoricalOrders(params: {
  farm_id: string;
  symbol: string;
  side: string;
  order_type: string;
  limit: number;
}) {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('farm_id', params.farm_id)
    .eq('symbol', params.symbol)
    .eq('side', params.side)
    .eq('order_type', params.order_type)
    .eq('status', 'filled')
    .order('created_at', { ascending: false })
    .limit(params.limit);
  
  if (error) {
    console.error('Error fetching historical orders:', error);
    return [];
  }
  
  return data || [];
}

// Function to get AI-powered recommendations
async function getOrderRecommendations(orderId: string) {
  // In a real implementation, this would call the ElizaOS API
  // For now, we'll return mock data
  
  return {
    executionImprovements: [
      {
        id: 1,
        title: "Use TWAP for Better Price Execution",
        description: "Consider using Time-Weighted Average Price (TWAP) for orders of this size to minimize market impact.",
        impact: "high",
        category: "order_type"
      },
      {
        id: 2,
        title: "Adjust Execution Time",
        description: "Historical data suggests executing this order 1-2 hours earlier could reduce slippage by up to 15%.",
        impact: "medium",
        category: "timing"
      },
      {
        id: 3,
        title: "Split Order Into Smaller Chunks",
        description: "Breaking this order into 3-5 smaller orders could reduce overall market impact.",
        impact: "medium",
        category: "sizing"
      }
    ],
    marketInsights: [
      {
        id: 1,
        title: "Increased Volatility",
        description: "This asset has shown 35% higher than average volatility during your execution window.",
        relevance: "high"
      },
      {
        id: 2,
        title: "Liquidity Pattern",
        description: "Liquidity typically improves by 25% approximately 30 minutes after your execution time.",
        relevance: "medium"
      }
    ],
    similarOrdersAnalysis: {
      count: 24,
      avgSlippage: -0.12,
      avgExecutionTime: 3.5,
      bestPractices: [
        "Execution during lower volatility periods",
        "Use of iceberg orders for large quantities",
        "Targeting execution during peak liquidity windows"
      ]
    }
  };
}

export default async function OrderAnalysisPage({ params }: { params: { id: string } }) {
  const orderId = params.id;
  
  // Fetch order details
  const order = await getOrderDetails(orderId);
  
  if (!order) {
    return notFound();
  }
  
  // Make sure the order has been filled
  if (order.status !== 'filled' && order.status !== 'partial_fill') {
    // Redirect to the order detail page with an error message
    // In a real implementation, we would use redirect() with query params
    return notFound();
  }
  
  // Fetch order execution data
  const executionData = await getOrderExecutionData(orderId);
  
  if (!executionData) {
    return notFound();
  }
  
  // Fetch historical orders for comparison
  const historicalOrders = await getHistoricalOrders({
    farm_id: order.farm_id,
    symbol: order.symbol,
    side: order.side,
    order_type: order.order_type,
    limit: 10
  });
  
  // Get AI-powered recommendations
  const recommendations = await getOrderRecommendations(orderId);
  
  // Format order type for display
  const formatOrderType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };
  
  // Generate comparison data for charts
  const generateComparisonData = () => {
    if (historicalOrders.length === 0) return [];
    
    return historicalOrders.map(histOrder => ({
      id: histOrder.id.slice(0, 8),
      slippage: histOrder.slippage || 0,
      executionTime: histOrder.execution_time || 0,
      marketImpact: histOrder.market_impact || 0,
      date: new Date(histOrder.created_at).toLocaleDateString(),
      fillRate: histOrder.filled_quantity / histOrder.quantity * 100,
      isCurrentOrder: histOrder.id === orderId
    }));
  };
  
  const comparisonData = generateComparisonData();
  
  return (
    <main className="flex flex-col space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">
              <Home className="h-4 w-4" />
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="/trading">Trading</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="/trading/orders">Orders</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href={`/trading/orders/${orderId}`}>
              <div className="truncate max-w-[200px]" title={orderId}>
                {orderId}
              </div>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>Analysis</BreadcrumbItem>
        </Breadcrumb>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/trading/orders/${orderId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Order
            </a>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl flex items-center">
              <BarChart2 className="h-5 w-5 mr-2" />
              Execution Analysis
            </CardTitle>
            <CardDescription>
              Detailed analysis of execution quality for {order.symbol} {order.side.toUpperCase()} order
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="execution">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="execution">Execution Quality</TabsTrigger>
                <TabsTrigger value="comparison">Historical Comparison</TabsTrigger>
                <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="execution" className="pt-6">
                <ExecutionQualityAnalysis 
                  orderId={orderId}
                  symbol={order.symbol}
                  orderType={formatOrderType(order.order_type)}
                  side={order.side}
                  quantity={order.quantity}
                  filledQuantity={order.filled_quantity}
                  price={order.price}
                  averageFilledPrice={order.avg_fill_price || 0}
                  createdAt={order.created_at}
                  filledAt={order.last_fill_time}
                  executionMetrics={executionData.metrics}
                  marketPriceData={executionData.marketPriceData}
                  orderTimeline={executionData.orderTimeline}
                  marketConditions={executionData.marketConditions}
                />
              </TabsContent>
              
              <TabsContent value="comparison" className="pt-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Slippage Comparison
                        </CardTitle>
                        <CardDescription>
                          Comparing slippage with similar orders
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {comparisonData.length > 0 ? (
                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={comparisonData}
                                margin={{
                                  top: 5,
                                  right: 30,
                                  left: 20,
                                  bottom: 5,
                                }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="id" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar 
                                  dataKey="slippage" 
                                  name="Slippage (%)" 
                                  fill={(entry) => entry.isCurrentOrder ? "#8884d8" : "#82ca9d"}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-[300px]">
                            <p className="text-muted-foreground">No historical data available</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          Execution Time Comparison
                        </CardTitle>
                        <CardDescription>
                          Comparing execution speed with similar orders
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {comparisonData.length > 0 ? (
                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={comparisonData}
                                margin={{
                                  top: 5,
                                  right: 30,
                                  left: 20,
                                  bottom: 5,
                                }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="id" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar 
                                  dataKey="executionTime" 
                                  name="Execution Time (s)" 
                                  fill={(entry) => entry.isCurrentOrder ? "#8884d8" : "#82ca9d"}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-[300px]">
                            <p className="text-muted-foreground">No historical data available</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Activity className="h-4 w-4 mr-2" />
                        Performance Over Time
                      </CardTitle>
                      <CardDescription>
                        Tracking execution quality metrics over time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {comparisonData.length > 0 ? (
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={comparisonData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())}
                              margin={{
                                top: 5,
                                right: 30,
                                left: 20,
                                bottom: 5,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="slippage" 
                                name="Slippage (%)" 
                                stroke="#8884d8" 
                                activeDot={{ r: 8 }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="marketImpact" 
                                name="Market Impact (%)" 
                                stroke="#82ca9d" 
                              />
                              <Line 
                                type="monotone" 
                                dataKey="fillRate" 
                                name="Fill Rate (%)" 
                                stroke="#ffc658" 
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-[300px]">
                          <p className="text-muted-foreground">No historical data available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <div className="bg-muted p-4 rounded-md">
                    <h3 className="font-medium mb-2">Historical Analysis Summary</h3>
                    <p className="text-sm text-muted-foreground">
                      This analysis compares your current order execution with {historicalOrders.length} similar {order.symbol} {order.side.toUpperCase()} orders using the same order type.
                      {historicalOrders.length > 0 && (
                        <>
                          {' '}Your current order's execution quality ranks {
                            comparisonData.sort((a, b) => Math.abs(a.slippage) - Math.abs(b.slippage))
                              .findIndex(o => o.isCurrentOrder) + 1
                          } out of {comparisonData.length} in terms of slippage.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="recommendations" className="pt-6">
                <div className="space-y-6">
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Brain className="h-4 w-4 mr-2" />
                        ElizaOS AI-Powered Recommendations
                      </CardTitle>
                      <CardDescription>
                        Intelligent analysis and suggestions to improve execution quality
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <h3 className="font-medium">Key Insights</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-background p-4 rounded-md border">
                            <div className="flex items-center text-primary mb-2">
                              <BarChart className="h-4 w-4 mr-2" />
                              <span className="font-medium">Execution Strategy</span>
                            </div>
                            <p className="text-sm">
                              Your execution scored {executionData.metrics.overallScore}/100, which is 
                              {executionData.metrics.overallScore > 75 ? ' above' : ' below'} the average
                              of {recommendations.similarOrdersAnalysis.count} similar orders.
                            </p>
                          </div>
                          
                          <div className="bg-background p-4 rounded-md border">
                            <div className="flex items-center text-primary mb-2">
                              <Activity className="h-4 w-4 mr-2" />
                              <span className="font-medium">Market Conditions</span>
                            </div>
                            <p className="text-sm">
                              Execution happened during 
                              {executionData.metrics.volatilityAtExecution > 2 ? ' high' : ' normal'} volatility,
                              which {executionData.metrics.volatilityAtExecution > 2 ? 'negatively' : 'positively'} impacted slippage.
                            </p>
                          </div>
                          
                          <div className="bg-background p-4 rounded-md border">
                            <div className="flex items-center text-primary mb-2">
                              <Calendar className="h-4 w-4 mr-2" />
                              <span className="font-medium">Timing Analysis</span>
                            </div>
                            <p className="text-sm">
                              Execution timing scored {executionData.metrics.timingScore}/100,
                              suggesting {executionData.metrics.timingScore > 75 ? 'good' : 'suboptimal'} market entry.
                            </p>
                          </div>
                        </div>
                        
                        <h3 className="font-medium mt-6">Improvement Recommendations</h3>
                        <div className="space-y-3">
                          {recommendations.executionImprovements.map((improvement) => (
                            <div key={improvement.id} className="bg-background p-4 rounded-md border">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{improvement.title}</div>
                                <Badge 
                                  variant="outline" 
                                  className={
                                    improvement.impact === 'high' 
                                      ? 'bg-green-50 text-green-700 border-green-200' 
                                      : improvement.impact === 'medium'
                                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                  }
                                >
                                  {improvement.impact.charAt(0).toUpperCase() + improvement.impact.slice(1)} Impact
                                </Badge>
                              </div>
                              <p className="text-sm mt-2">{improvement.description}</p>
                            </div>
                          ))}
                        </div>
                        
                        <h3 className="font-medium mt-6">Market Insights</h3>
                        <div className="space-y-3">
                          {recommendations.marketInsights.map((insight) => (
                            <div key={insight.id} className="bg-background p-4 rounded-md border">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{insight.title}</div>
                                <Badge 
                                  variant="outline" 
                                  className={
                                    insight.relevance === 'high' 
                                      ? 'bg-green-50 text-green-700 border-green-200' 
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                  }
                                >
                                  {insight.relevance.charAt(0).toUpperCase() + insight.relevance.slice(1)} Relevance
                                </Badge>
                              </div>
                              <p className="text-sm mt-2">{insight.description}</p>
                            </div>
                          ))}
                        </div>
                        
                        <div className="bg-muted p-4 rounded-md mt-6">
                          <h3 className="font-medium mb-2">Best Practices from Similar Orders</h3>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {recommendations.similarOrdersAnalysis.bestPractices.map((practice, index) => (
                              <li key={index}>{practice}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
