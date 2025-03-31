import React from 'react';
import { Metadata } from 'next';
import { createServerClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Home, 
  ArrowLeft, 
  Copy, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  BarChart2, 
  ClipboardCopy,
  CopyPlus,
  RotateCw,
  Activity
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import ExecutionQualityAnalysis from '@/components/orders/execution-quality-analysis';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { OrderType } from '@/services/advanced-order-service';

export const generateMetadata = async ({ params }: { params: { id: string } }): Promise<Metadata> => {
  return {
    title: `Order Details | Trading Farm`,
    description: 'View detailed information about your trading order',
  };
};

type OrderStatus = 'new' | 'open' | 'filled' | 'partial_fill' | 'canceled' | 'rejected' | 'expired';

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

// Function to get ElizaOS insights about the order
async function getOrderAiInsights(orderId: string) {
  const supabase = await createServerClient();
  
  // In a real implementation, this would call the ElizaOS API
  // For now we'll simulate the response
  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('reference_id', orderId)
    .eq('reference_type', 'order')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error fetching AI insights:', error);
    return [];
  }
  
  return data || [];
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const orderId = params.id;
  
  // Fetch order details
  const order = await getOrderDetails(orderId);
  
  if (!order) {
    return notFound();
  }
  
  // Fetch order execution data
  const executionData = await getOrderExecutionData(orderId);
  
  // Fetch AI insights
  const aiInsights = await getOrderAiInsights(orderId);
  
  // Format order type for display
  const formatOrderType = (type: OrderType) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };
  
  // Function to get the badge for order status
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="mr-1 h-3 w-3" />
            New
          </Badge>
        );
      case 'open':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="mr-1 h-3 w-3" />
            Open
          </Badge>
        );
      case 'filled':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Filled
          </Badge>
        );
      case 'partial_fill':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <BarChart2 className="mr-1 h-3 w-3" />
            Partial Fill
          </Badge>
        );
      case 'canceled':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <XCircle className="mr-1 h-3 w-3" />
            Canceled
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Clock className="mr-1 h-3 w-3" />
            Expired
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };
  
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
            <BreadcrumbLink href="/trading/orders/history">History</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <div className="truncate max-w-[200px]" title={orderId}>
              {orderId}
            </div>
          </BreadcrumbItem>
        </Breadcrumb>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/trading/orders/history">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </a>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl flex items-center">
                  <span className={order.side === 'buy' ? 'text-green-600' : 'text-red-600'}>
                    {order.side.toUpperCase()}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{order.symbol}</span>
                  <span className="mx-2">•</span>
                  <span>{formatOrderType(order.order_type)}</span>
                </CardTitle>
                <CardDescription className="flex items-center mt-1">
                  <span>Order ID: {orderId}</span>
                  <button 
                    className="ml-1 text-primary hover:text-primary/80"
                    onClick={() => navigator.clipboard.writeText(orderId)}
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </CardDescription>
              </div>
              
              <div className="flex flex-col items-end">
                {getStatusBadge(order.status)}
                <span className="text-sm text-muted-foreground mt-1">
                  {formatDistanceToNow(parseISO(order.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="details">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="details">Order Details</TabsTrigger>
                <TabsTrigger value="execution" disabled={!executionData}>
                  Execution Analysis
                </TabsTrigger>
                <TabsTrigger value="ai-insights">
                  ElizaOS Insights
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Farm</span>
                          <span className="font-medium">{order.farms?.name || '-'}</span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Agent</span>
                          <span className="font-medium">{order.agents?.name || '-'}</span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Strategy</span>
                          <span className="font-medium">{order.strategies?.name || '-'}</span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Exchange</span>
                          <span className="font-medium">{order.exchange}</span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Created At</span>
                          <span className="font-medium">{new Date(order.created_at).toLocaleString()}</span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Last Updated</span>
                          <span className="font-medium">{new Date(order.updated_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Order Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Side</span>
                          <span className={`font-medium ${order.side === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                            {order.side.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Type</span>
                          <span className="font-medium">{formatOrderType(order.order_type)}</span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Symbol</span>
                          <span className="font-medium">{order.symbol}</span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Quantity</span>
                          <span className="font-medium">{order.quantity}</span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Filled Quantity</span>
                          <span className="font-medium">
                            {order.filled_quantity} ({((order.filled_quantity / order.quantity) * 100).toFixed(1)}%)
                          </span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Time in Force</span>
                          <span className="font-medium">{order.time_in_force?.toUpperCase() || 'GTC'}</span>
                        </div>
                        
                        {order.price !== null && (
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">Price</span>
                            <span className="font-medium">${order.price}</span>
                          </div>
                        )}
                        
                        {order.stop_price !== null && (
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">Stop Price</span>
                            <span className="font-medium">${order.stop_price}</span>
                          </div>
                        )}
                        
                        {order.trail_value !== null && (
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">Trail Value</span>
                            <span className="font-medium">
                              {order.trail_value} {order.trail_type === 'percentage' ? '%' : ''}
                            </span>
                          </div>
                        )}
                        
                        {order.iceberg_qty !== null && (
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">Visible Quantity</span>
                            <span className="font-medium">{order.iceberg_qty}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Display order type specific fields */}
                    {(order.order_type === 'twap' || order.order_type === 'vwap') && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-lg font-medium mb-4">Algorithm Parameters</h3>
                          <div className="grid grid-cols-2 gap-4">
                            {order.start_time && (
                              <div className="flex flex-col">
                                <span className="text-sm text-muted-foreground">Start Time</span>
                                <span className="font-medium">{new Date(order.start_time).toLocaleString()}</span>
                              </div>
                            )}
                            
                            {order.end_time && (
                              <div className="flex flex-col">
                                <span className="text-sm text-muted-foreground">End Time</span>
                                <span className="font-medium">{new Date(order.end_time).toLocaleString()}</span>
                              </div>
                            )}
                            
                            {order.num_slices && (
                              <div className="flex flex-col">
                                <span className="text-sm text-muted-foreground">Number of Slices</span>
                                <span className="font-medium">{order.num_slices}</span>
                              </div>
                            )}
                            
                            {order.volume_profile && (
                              <div className="flex flex-col">
                                <span className="text-sm text-muted-foreground">Volume Profile</span>
                                <span className="font-medium">{order.volume_profile}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Execution Summary</h3>
                      {order.status === 'filled' || order.status === 'partial_fill' ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">Average Fill Price</span>
                            <span className="font-medium">
                              ${order.avg_fill_price?.toFixed(2) || '-'}
                            </span>
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">First Fill Time</span>
                            <span className="font-medium">
                              {order.first_fill_time ? new Date(order.first_fill_time).toLocaleString() : '-'}
                            </span>
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">Last Fill Time</span>
                            <span className="font-medium">
                              {order.last_fill_time ? new Date(order.last_fill_time).toLocaleString() : '-'}
                            </span>
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">Total Value</span>
                            <span className="font-medium">
                              ${(order.filled_quantity * (order.avg_fill_price || 0)).toFixed(2)}
                            </span>
                          </div>
                          
                          {executionData && (
                            <div className="flex flex-col">
                              <span className="text-sm text-muted-foreground">Number of Fills</span>
                              <span className="font-medium">
                                {executionData.executions.filter(e => e.type === 'fill').length}
                              </span>
                            </div>
                          )}
                          
                          {executionData?.metrics.slippage !== undefined && (
                            <div className="flex flex-col">
                              <span className="text-sm text-muted-foreground">Slippage</span>
                              <span className={`font-medium ${executionData.metrics.slippage > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {executionData.metrics.slippage > 0 ? '+' : ''}{executionData.metrics.slippage.toFixed(2)}%
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-muted rounded-md">
                          <p className="text-muted-foreground">
                            {order.status === 'new' || order.status === 'open' ? (
                              "This order hasn't been filled yet."
                            ) : order.status === 'canceled' ? (
                              "This order was canceled before it could be filled."
                            ) : order.status === 'rejected' ? (
                              "This order was rejected by the exchange."
                            ) : (
                              "This order has expired without being filled."
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <Separator />
                    
                    {/* Exchange response - if available */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Exchange Response</h3>
                      {order.exchange_order_id ? (
                        <div className="space-y-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">Exchange Order ID</span>
                            <div className="flex items-center">
                              <span className="font-medium truncate">{order.exchange_order_id}</span>
                              <button 
                                className="ml-1 text-primary hover:text-primary/80"
                                onClick={() => navigator.clipboard.writeText(order.exchange_order_id || '')}
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          
                          {order.exchange_response && (
                            <div className="flex flex-col">
                              <span className="text-sm text-muted-foreground">Full Response</span>
                              <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-auto max-h-[200px]">
                                {JSON.stringify(order.exchange_response, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-muted rounded-md">
                          <p className="text-muted-foreground">No exchange response data available.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end mt-6 space-x-2">
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(orderId)}>
                    <ClipboardCopy className="h-4 w-4 mr-2" />
                    Copy Order ID
                  </Button>
                  
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/trading/orders/create?copy_from=${orderId}`}>
                      <CopyPlus className="h-4 w-4 mr-2" />
                      Copy as New Order
                    </a>
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="execution" className="pt-6">
                {executionData ? (
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
                ) : (
                  <div className="p-6 bg-muted rounded-md text-center">
                    <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium">No Execution Data Available</h3>
                    <p className="text-muted-foreground mt-2">
                      This order hasn't been filled yet or execution data is not available.
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="ai-insights" className="pt-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">ElizaOS Trading Insights</h3>
                    <Button variant="outline" size="sm">
                      <RotateCw className="h-4 w-4 mr-2" />
                      Refresh Insights
                    </Button>
                  </div>
                  
                  {aiInsights.length > 0 ? (
                    <div className="space-y-4">
                      {aiInsights.map((insight, index) => (
                        <Card key={index}>
                          <CardHeader className="py-3">
                            <CardTitle className="text-lg font-medium">
                              {insight.title}
                            </CardTitle>
                            <CardDescription>
                              Generated {formatDistanceToNow(parseISO(insight.created_at), { addSuffix: true })}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p>{insight.content}</p>
                            
                            {insight.metrics && (
                              <div className="mt-4 grid grid-cols-2 gap-4">
                                {Object.entries(insight.metrics).map(([key, value]) => (
                                  <div key={key} className="flex justify-between items-center p-2 bg-muted rounded-md">
                                    <span className="text-sm">
                                      {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                    </span>
                                    <span className="font-medium">{value}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 bg-muted rounded-md text-center">
                      <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium">No AI Insights Available</h3>
                      <p className="text-muted-foreground mt-2">
                        ElizaOS hasn't generated any insights for this order yet.
                      </p>
                      <Button variant="default" className="mt-4">
                        Generate Insights
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
