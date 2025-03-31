'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Clock, TrendingDown, TrendingUp, Activity, Zap, AlertCircle } from 'lucide-react';

interface OrderExecutionMetrics {
  slippage: number;
  marketImpact: number;
  executionSpeed: number;
  opportunityCost: number;
  timingScore: number;
  priceImprovement: number;
  volumeParticipation: number;
  volatilityAtExecution: number;
  overallScore: number;
}

interface OrderTimeline {
  timestamp: string;
  event: string;
  price?: number;
  quantity?: number;
  details?: string;
}

interface PricePoint {
  timestamp: string;
  price: number;
  volume?: number;
  orderPrice?: number;
}

interface MarketCondition {
  name: string;
  value: number;
  threshold: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

interface OrderExecutionQualityProps {
  orderId: string;
  symbol: string;
  orderType: string;
  side: 'buy' | 'sell';
  quantity: number;
  filledQuantity: number;
  price?: number;
  averageFilledPrice: number;
  createdAt: string;
  filledAt?: string;
  executionMetrics: OrderExecutionMetrics;
  marketPriceData: PricePoint[];
  orderTimeline: OrderTimeline[];
  marketConditions: MarketCondition[];
}

export default function ExecutionQualityAnalysis({
  orderId,
  symbol,
  orderType,
  side,
  quantity,
  filledQuantity,
  price,
  averageFilledPrice,
  createdAt,
  filledAt,
  executionMetrics,
  marketPriceData,
  orderTimeline,
  marketConditions,
}: OrderExecutionQualityProps) {
  const [activeTab, setActiveTab] = React.useState('overview');

  // Calculate the execution quality score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Format percentage with sign
  const formatPercentWithSign = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Determine if the execution was good based on the side
  const isGoodExecution = () => {
    const slippage = executionMetrics.slippage;
    return (side === 'buy' && slippage <= 0) || (side === 'sell' && slippage >= 0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center justify-between">
            <span>Execution Quality Analysis</span>
            <Badge 
              variant="outline" 
              className={`text-lg px-3 py-1 ${getScoreColor(executionMetrics.overallScore)}`}
            >
              Score: {executionMetrics.overallScore}/100
            </Badge>
          </CardTitle>
          <CardDescription>
            Detailed analysis of order execution quality for {symbol} {side.toUpperCase()} order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metrics">Detailed Metrics</TabsTrigger>
              <TabsTrigger value="timeline">Execution Timeline</TabsTrigger>
              <TabsTrigger value="marketConditions">Market Conditions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Order Summary</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-sm text-muted-foreground">Symbol:</div>
                      <div className="text-sm font-medium">{symbol}</div>
                      
                      <div className="text-sm text-muted-foreground">Order Type:</div>
                      <div className="text-sm font-medium">{orderType}</div>
                      
                      <div className="text-sm text-muted-foreground">Side:</div>
                      <div className="text-sm font-medium">
                        <span className={side === 'buy' ? 'text-green-600' : 'text-red-600'}>
                          {side.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">Quantity:</div>
                      <div className="text-sm font-medium">{quantity}</div>
                      
                      <div className="text-sm text-muted-foreground">Filled:</div>
                      <div className="text-sm font-medium">
                        {filledQuantity} ({((filledQuantity / quantity) * 100).toFixed(1)}%)
                      </div>
                      
                      <div className="text-sm text-muted-foreground">Requested Price:</div>
                      <div className="text-sm font-medium">
                        {price ? `$${price.toFixed(2)}` : 'Market Order'}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">Average Fill Price:</div>
                      <div className="text-sm font-medium">${averageFilledPrice.toFixed(2)}</div>
                      
                      <div className="text-sm text-muted-foreground">Slippage:</div>
                      <div className={`text-sm font-medium ${isGoodExecution() ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentWithSign(executionMetrics.slippage)}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">Execution Time:</div>
                      <div className="text-sm font-medium">
                        {filledAt 
                          ? `${((new Date(filledAt).getTime() - new Date(createdAt).getTime()) / 1000).toFixed(1)}s` 
                          : 'Not fully executed'}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium">Execution Assessment</h3>
                    <div className="mt-2 p-3 rounded-md bg-muted">
                      <p className="text-sm">
                        {executionMetrics.overallScore >= 80 ? (
                          <>
                            <span className="font-medium text-green-600">Excellent execution</span>. 
                            This order was executed with minimal slippage and good market timing.
                          </>
                        ) : executionMetrics.overallScore >= 60 ? (
                          <>
                            <span className="font-medium text-yellow-600">Average execution</span>. 
                            The order was executed with some slippage but within acceptable ranges.
                          </>
                        ) : (
                          <>
                            <span className="font-medium text-red-600">Poor execution</span>. 
                            This order experienced significant slippage and suboptimal timing.
                          </>
                        )}
                      </p>
                      
                      <div className="mt-3 space-y-2">
                        <p className="text-sm">Key factors affecting execution:</p>
                        <ul className="text-sm space-y-1">
                          {executionMetrics.slippage !== 0 && (
                            <li className="flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1 text-yellow-600" />
                              Price slippage of {formatPercentWithSign(executionMetrics.slippage)}
                            </li>
                          )}
                          
                          {executionMetrics.marketImpact > 0.5 && (
                            <li className="flex items-center">
                              <TrendingUp className="h-4 w-4 mr-1 text-red-600" />
                              High market impact ({executionMetrics.marketImpact.toFixed(2)}%)
                            </li>
                          )}
                          
                          {executionMetrics.executionSpeed > 5 && (
                            <li className="flex items-center">
                              <Clock className="h-4 w-4 mr-1 text-yellow-600" />
                              Slow execution time ({executionMetrics.executionSpeed.toFixed(1)}s)
                            </li>
                          )}
                          
                          {executionMetrics.volatilityAtExecution > 2 && (
                            <li className="flex items-center">
                              <Activity className="h-4 w-4 mr-1 text-yellow-600" />
                              High market volatility ({executionMetrics.volatilityAtExecution.toFixed(1)}%)
                            </li>
                          )}
                          
                          {executionMetrics.priceImprovement > 0 && (
                            <li className="flex items-center">
                              <Zap className="h-4 w-4 mr-1 text-green-600" />
                              Price improvement of {formatPercentWithSign(executionMetrics.priceImprovement)}
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="h-[300px]">
                  <h3 className="text-lg font-medium mb-2">Price Execution Chart</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={marketPriceData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tick={{fontSize: 12}}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                        }}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [`$${value}`, 'Price']}
                        labelFormatter={(label) => {
                          const date = new Date(label);
                          return date.toLocaleTimeString();
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#8884d8" 
                        name="Market Price" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="orderPrice" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Order Price" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="metrics" className="pt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Execution Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: 'Slippage', value: Math.abs(executionMetrics.slippage) },
                            { name: 'Market Impact', value: executionMetrics.marketImpact },
                            { name: 'Timing Score', value: executionMetrics.timingScore / 10 },
                            { name: 'Price Improvement', value: Math.abs(executionMetrics.priceImprovement) },
                            { name: 'Volatility', value: executionMetrics.volatilityAtExecution },
                          ]}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => [`${value.toFixed(2)}%`, 'Value']} />
                          <Legend />
                          <Bar dataKey="value" name="Value (%)" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Slippage</span>
                        <span className={`text-sm font-medium ${executionMetrics.slippage > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatPercentWithSign(executionMetrics.slippage)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Market Impact</span>
                        <span className={`text-sm font-medium ${executionMetrics.marketImpact > 1 ? 'text-red-600' : 'text-green-600'}`}>
                          {executionMetrics.marketImpact.toFixed(2)}%
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Execution Speed</span>
                        <span className={`text-sm font-medium ${executionMetrics.executionSpeed > 5 ? 'text-red-600' : 'text-green-600'}`}>
                          {executionMetrics.executionSpeed.toFixed(1)}s
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Opportunity Cost</span>
                        <span className={`text-sm font-medium ${executionMetrics.opportunityCost > 0.5 ? 'text-red-600' : 'text-green-600'}`}>
                          {executionMetrics.opportunityCost.toFixed(2)}%
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Timing Score</span>
                        <span className={`text-sm font-medium ${executionMetrics.timingScore > 50 ? 'text-green-600' : 'text-red-600'}`}>
                          {executionMetrics.timingScore}/100
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Price Improvement</span>
                        <span className={`text-sm font-medium ${executionMetrics.priceImprovement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercentWithSign(executionMetrics.priceImprovement)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Volume Participation</span>
                        <span className="text-sm font-medium">
                          {executionMetrics.volumeParticipation.toFixed(2)}%
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Volatility at Execution</span>
                        <span className={`text-sm font-medium ${executionMetrics.volatilityAtExecution > 2 ? 'text-red-600' : 'text-green-600'}`}>
                          {executionMetrics.volatilityAtExecution.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-muted rounded-md">
                  <h4 className="font-medium">Metric Definitions</h4>
                  <div className="mt-2 text-sm space-y-2">
                    <p><span className="font-medium">Slippage:</span> Difference between expected price and execution price.</p>
                    <p><span className="font-medium">Market Impact:</span> How much the order moved the market.</p>
                    <p><span className="font-medium">Execution Speed:</span> Time from order submission to completion.</p>
                    <p><span className="font-medium">Opportunity Cost:</span> Potential lost profit due to execution timing.</p>
                    <p><span className="font-medium">Timing Score:</span> How well the order was timed relative to market conditions.</p>
                    <p><span className="font-medium">Price Improvement:</span> Better price received compared to expected price.</p>
                    <p><span className="font-medium">Volume Participation:</span> Percentage of total market volume during execution.</p>
                    <p><span className="font-medium">Volatility:</span> Market price volatility during execution.</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="timeline" className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Execution Timeline</h3>
                
                <div className="border rounded-md">
                  {orderTimeline.map((event, index) => (
                    <div key={index} className="flex items-start p-3 border-b last:border-0">
                      <div className="mr-3 mt-1">
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-medium">{index + 1}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-medium">{event.event}</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <div className="mt-1 text-sm">
                          {event.price && <span className="mr-2">Price: ${event.price.toFixed(2)}</span>}
                          {event.quantity && <span className="mr-2">Qty: {event.quantity}</span>}
                          {event.details && <p className="mt-1 text-muted-foreground">{event.details}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="marketConditions" className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Market Conditions During Execution</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {marketConditions.map((condition, index) => (
                    <div key={index} className="border rounded-md p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{condition.name}</span>
                        <Badge 
                          variant="outline" 
                          className={
                            condition.impact === 'positive' 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : condition.impact === 'negative'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                          }
                        >
                          {condition.impact.charAt(0).toUpperCase() + condition.impact.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="mt-2 flex items-center">
                        <span className="text-2xl font-bold mr-2">
                          {condition.value.toFixed(1)}%
                        </span>
                        <span className="text-sm text-muted-foreground">
                          (Threshold: {condition.threshold}%)
                        </span>
                      </div>
                      
                      <p className="mt-2 text-sm text-muted-foreground">
                        {condition.description}
                      </p>
                    </div>
                  ))}
                </div>
                
                <div className="bg-muted p-4 rounded-md text-sm space-y-2">
                  <p><span className="font-medium">Note:</span> Market conditions are analyzed relative to typical conditions for this asset.</p>
                  <p>Conditions that significantly deviate from normal patterns are highlighted as they may have affected execution quality.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
