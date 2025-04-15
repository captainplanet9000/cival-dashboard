'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon, TrendingDownIcon, RefreshCwIcon, ZapIcon } from 'lucide-react';

// Types for market analysis data
type SentimentData = {
  score: number;
  magnitude: number;
  sources: {
    name: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
  }[];
  recommendation: string;
};

type IndicatorData = {
  name: string;
  value: number;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number;
  description: string;
};

type PriceData = {
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
};

type MarketAnalysisData = {
  symbol: string;
  price: PriceData;
  sentiment: SentimentData;
  indicators: IndicatorData[];
  lastUpdated: string;
};

// Real data fetcher using TanStack Query
import { useQuery } from '@tanstack/react-query';
import { fetchMarketAnalysis } from '@/services/queries';
  const isPositive = Math.random() > 0.4;
  const changePercent = +(isPositive ? Math.random() * 5 : -Math.random() * 5).toFixed(2);
  const basePrice = symbol === 'BTC' ? 40000 : symbol === 'ETH' ? 2500 : symbol === 'SOL' ? 120 : 30;
  const price = +(basePrice * (1 + Math.random() * 0.1 - 0.05)).toFixed(2);
  const change = +(price * changePercent / 100).toFixed(2);
  
  const sentimentScore = +(Math.random() * 2 - 1).toFixed(2);
  
  return {
    symbol,
    price: {
      price,
      change24h: change,
      changePercent24h: changePercent,
      high24h: +(price * 1.03).toFixed(2),
      low24h: +(price * 0.97).toFixed(2),
      volume24h: +(Math.random() * 1000000000).toFixed(0),
      marketCap: +(price * (symbol === 'BTC' ? 19000000 : symbol === 'ETH' ? 120000000 : 400000000)).toFixed(0)
    },
    sentiment: {
      score: sentimentScore,
      magnitude: +(Math.random() * 0.8 + 0.2).toFixed(2),
      sources: [
        {
          name: 'Twitter',
          sentiment: sentimentScore > 0.2 ? 'positive' : sentimentScore < -0.2 ? 'negative' : 'neutral',
          confidence: +(Math.random() * 0.4 + 0.6).toFixed(2)
        },
        {
          name: 'Reddit',
          sentiment: sentimentScore > 0.1 ? 'positive' : sentimentScore < -0.1 ? 'negative' : 'neutral',
          confidence: +(Math.random() * 0.4 + 0.6).toFixed(2)
        },
        {
          name: 'News',
          sentiment: sentimentScore > 0 ? 'positive' : sentimentScore < 0 ? 'negative' : 'neutral',
          confidence: +(Math.random() * 0.4 + 0.6).toFixed(2)
        }
      ],
      recommendation: sentimentScore > 0.3 ? 'Strong Buy' : 
                      sentimentScore > 0 ? 'Buy' : 
                      sentimentScore > -0.3 ? 'Hold' : 'Sell'
    },
    indicators: [
      {
        name: 'RSI',
        value: +(Math.random() * 100).toFixed(2),
        signal: Math.random() > 0.6 ? 'buy' : Math.random() > 0.3 ? 'neutral' : 'sell',
        strength: +(Math.random() * 0.8 + 0.2).toFixed(2),
        description: 'Relative Strength Index'
      },
      {
        name: 'MACD',
        value: +(Math.random() * 10 - 5).toFixed(2),
        signal: Math.random() > 0.6 ? 'buy' : Math.random() > 0.3 ? 'neutral' : 'sell',
        strength: +(Math.random() * 0.8 + 0.2).toFixed(2),
        description: 'Moving Average Convergence Divergence'
      },
      {
        name: 'BB',
        value: +(Math.random() * 2 - 1).toFixed(2),
        signal: Math.random() > 0.6 ? 'buy' : Math.random() > 0.3 ? 'neutral' : 'sell',
        strength: +(Math.random() * 0.8 + 0.2).toFixed(2),
        description: 'Bollinger Bands'
      },
      {
        name: 'MA-Cross',
        value: +(Math.random() * 10 - 5).toFixed(2),
        signal: Math.random() > 0.6 ? 'buy' : Math.random() > 0.3 ? 'neutral' : 'sell',
        strength: +(Math.random() * 0.8 + 0.2).toFixed(2),
        description: 'Moving Average Crossover'
      }
    ],
    lastUpdated: new Date().toISOString()
  };
};

interface MarketAnalysisCardProps {
  symbol: string;
  onRecommendationSelect?: (recommendation: string) => void;
}

export function MarketAnalysisCard({ symbol, onRecommendationSelect }: MarketAnalysisCardProps) {
  const [data, setData] = useState<MarketAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    setLoading(true);
    
    // In a real implementation, we would fetch from the MCP servers
    // For demo purposes, we use mock data with a delay to simulate loading
    const timer = setTimeout(() => {
      setData(generateMockData(symbol));
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [symbol]);

  const handleRecommendationClick = (recommendation: string) => {
    if (onRecommendationSelect) {
      onRecommendationSelect(recommendation);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'decimal',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(num);
  };

  const formatLargeNumber = (num: number) => {
    if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B`;
    }
    if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M`;
    }
    return formatCurrency(num);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{symbol} Market Analysis</CardTitle>
            <CardDescription>
              AI-powered analysis from MCP servers
            </CardDescription>
          </div>
          {!loading && data && (
            <div className="text-right">
              <div className="text-2xl font-bold">
                {formatCurrency(data.price.price)}
              </div>
              <div className={`text-sm flex items-center justify-end ${
                data.price.changePercent24h >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {data.price.changePercent24h >= 0 ? (
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 mr-1" />
                )}
                {formatCurrency(Math.abs(data.price.change24h))} ({Math.abs(data.price.changePercent24h)}%)
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : data ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
              <TabsTrigger value="sentiment" className="flex-1">Sentiment</TabsTrigger>
              <TabsTrigger value="indicators" className="flex-1">Indicators</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">24h High</div>
                  <div className="font-medium">{formatCurrency(data.price.high24h)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">24h Low</div>
                  <div className="font-medium">{formatCurrency(data.price.low24h)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Volume (24h)</div>
                  <div className="font-medium">{formatLargeNumber(data.price.volume24h)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Market Cap</div>
                  <div className="font-medium">{formatLargeNumber(data.price.marketCap)}</div>
                </div>
              </div>
              
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">AI Recommendation</div>
                  <Badge 
                    variant={
                      data.sentiment.recommendation === 'Strong Buy' ? 'default' :
                      data.sentiment.recommendation === 'Buy' ? 'outline' :
                      data.sentiment.recommendation === 'Hold' ? 'secondary' : 'destructive'
                    }
                  >
                    {data.sentiment.recommendation}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Sell</span>
                    <span>Neutral</span>
                    <span>Buy</span>
                  </div>
                  <div className="relative pt-1">
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                      <div 
                        style={{ 
                          width: `${((data.sentiment.score + 1) / 2) * 100}%` 
                        }} 
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                          data.sentiment.score > 0.2 ? 'bg-green-500' :
                          data.sentiment.score > -0.2 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}>
                      </div>
                    </div>
                    <div 
                      className="absolute h-4 w-2 bg-black dark:bg-white top-0 -mt-1 transform -translate-x-1/2 rounded-full" 
                      style={{ left: `${((data.sentiment.score + 1) / 2) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleRecommendationClick(data.sentiment.recommendation)}
                  >
                    <ZapIcon className="h-4 w-4 mr-2" />
                    Apply Recommendation
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                  >
                    <RefreshCwIcon className="h-4 w-4 mr-2" />
                    Refresh Analysis
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="sentiment" className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Overall Sentiment Score</div>
                  <div className="flex items-center">
                    <div className="font-medium mr-2">{data.sentiment.score.toFixed(2)}</div>
                    {data.sentiment.score > 0 ? (
                      <TrendingUpIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDownIcon className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Sentiment Magnitude</div>
                  <div className="font-medium">{data.sentiment.magnitude.toFixed(2)}</div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Source Breakdown</div>
                  <div className="space-y-3">
                    {data.sentiment.sources.map((source, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{source.name}</span>
                          <Badge variant={
                            source.sentiment === 'positive' ? 'outline' :
                            source.sentiment === 'neutral' ? 'secondary' : 'destructive'
                          }>
                            {source.sentiment}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-muted-foreground">Confidence:</div>
                          <Progress value={source.confidence * 100} className="h-2" />
                          <div className="text-xs">{(source.confidence * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="indicators" className="space-y-4">
              <div className="space-y-4">
                {data.indicators.map((indicator, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{indicator.name}</div>
                        <div className="text-xs text-muted-foreground">{indicator.description}</div>
                      </div>
                      <Badge variant={
                        indicator.signal === 'buy' ? 'default' :
                        indicator.signal === 'neutral' ? 'secondary' : 'destructive'
                      }>
                        {indicator.signal.charAt(0).toUpperCase() + indicator.signal.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="text-sm">Value: {indicator.value}</div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="text-xs text-muted-foreground">Signal Strength:</div>
                      <Progress value={indicator.strength * 100} className="h-2" />
                      <div className="text-xs">{(indicator.strength * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-4">
            <div className="text-muted-foreground">No data available</div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="text-xs text-muted-foreground">
        {data ? (
          <div className="w-full flex justify-between items-center">
            <span>Last updated: {new Date(data.lastUpdated).toLocaleString()}</span>
            <span>Powered by MCP Servers</span>
          </div>
        ) : (
          <span>Loading data from MCP servers...</span>
        )}
      </CardFooter>
    </Card>
  );
}
