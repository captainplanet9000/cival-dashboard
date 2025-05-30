"use client";

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, ArrowDown, ArrowUp, BarChart4, Brain, Info, LineChart, TrendingDown, TrendingUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Area,
  AreaChart,
  ComposedChart,
  Bar
} from 'recharts';
import { createBrowserClient } from '@/utils/supabase/client';
import { format } from 'date-fns';

// Define types for AI models and predictions
interface AIPredictionModel {
  id: string;
  name: string;
  model_type: string;
  training_status: string;
  last_trained_at: string;
  description: string;
}

interface MarketPrediction {
  id: string;
  symbol: string;
  timeframe: string;
  prediction_type: string;
  prediction_value: number;
  confidence_score: number;
  prediction_time: string;
  target_time: string;
  actual_value: number | null;
  accuracy: number | null;
}

interface SentimentData {
  id: string;
  symbol: string;
  source: string;
  sentiment_score: number;
  sentiment_magnitude: number;
  article_count: number;
  social_mentions: number;
  time_period: string;
  analyzed_at: string;
}

interface TradingSignal {
  id: string;
  symbol: string;
  timeframe: string;
  signal_type: string;
  direction: string;
  strength: number;
  entry_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  risk_reward_ratio: number | null;
  confidence_score: number;
  chart_pattern: string | null;
  generated_at: string;
  expires_at: string | null;
  status: string;
}

interface AIPredictionPanelProps {
  userId: string;
  symbols?: string[];
  onSignalSelected?: (signal: TradingSignal) => void;
}

export function AIPredictionPanel({ userId, symbols = [], onSignalSelected }: AIPredictionPanelProps) {
  const [predictiveModels, setPredictiveModels] = useState<AIPredictionModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [predictions, setPredictions] = useState<MarketPrediction[]>([]);
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [tradingSignals, setTradingSignals] = useState<TradingSignal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(symbols[0] || 'BTC/USDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1d');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(70);
  const [showHistoricalPredictions, setShowHistoricalPredictions] = useState<boolean>(true);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  // Load AI prediction models
  useEffect(() => {
    async function loadPredictiveModels() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('ai_prediction_models')
          .select('*')
          .order('last_trained_at', { ascending: false });

        if (error) throw error;
        
        setPredictiveModels(data || []);
        if (data && data.length > 0) {
          setSelectedModel(data[0].id);
        }
      } catch (error) {
        console.error('Error loading AI models:', error);
        toast({
          title: 'Error',
          description: 'Failed to load prediction models. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadPredictiveModels();
  }, [supabase, toast]);

  // Load predictions when model or symbol changes
  useEffect(() => {
    if (!selectedModel || !selectedSymbol) return;

    async function loadPredictions() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('market_predictions')
          .select('*')
          .eq('model_id', selectedModel)
          .eq('symbol', selectedSymbol)
          .eq('timeframe', selectedTimeframe)
          .order('prediction_time', { ascending: false })
          .limit(100);

        if (error) throw error;
        
        setPredictions(data || []);
      } catch (error) {
        console.error('Error loading predictions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load predictions. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadPredictions();
  }, [selectedModel, selectedSymbol, selectedTimeframe, supabase, toast]);

  // Load sentiment data when symbol changes
  useEffect(() => {
    if (!selectedSymbol) return;

    async function loadSentimentData() {
      try {
        const { data, error } = await supabase
          .from('market_sentiment')
          .select('*')
          .eq('symbol', selectedSymbol)
          .order('analyzed_at', { ascending: false })
          .limit(30);

        if (error) throw error;
        
        setSentimentData(data || []);
      } catch (error) {
        console.error('Error loading sentiment data:', error);
      }
    }

    loadSentimentData();
  }, [selectedSymbol, supabase]);

  // Load trading signals
  useEffect(() => {
    if (!selectedModel || !selectedSymbol) return;

    async function loadTradingSignals() {
      try {
        const { data, error } = await supabase
          .from('ai_trading_signals')
          .select('*')
          .eq('model_id', selectedModel)
          .eq('symbol', selectedSymbol)
          .eq('timeframe', selectedTimeframe)
          .gte('confidence_score', confidenceThreshold)
          .eq('status', 'active')
          .order('generated_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        
        setTradingSignals(data || []);
      } catch (error) {
        console.error('Error loading trading signals:', error);
      }
    }

    loadTradingSignals();
  }, [selectedModel, selectedSymbol, selectedTimeframe, confidenceThreshold, supabase]);

  // Calculate model accuracy metrics
  const accuracyMetrics = useMemo(() => {
    if (!predictions || predictions.length === 0) return null;
    
    const completedPredictions = predictions.filter(p => p.actual_value !== null);
    if (completedPredictions.length === 0) return null;

    const totalPredictions = completedPredictions.length;
    const correctPredictions = completedPredictions.filter(p => (p.accuracy || 0) > 70).length;
    const averageAccuracy = completedPredictions.reduce((sum, p) => sum + (p.accuracy || 0), 0) / totalPredictions;
    
    return {
      totalPredictions,
      correctPredictions,
      averageAccuracy,
      successRate: (correctPredictions / totalPredictions) * 100
    };
  }, [predictions]);

  // Prepare price prediction chart data
  const predictionChartData = useMemo(() => {
    if (!predictions || predictions.length === 0) return [];
    
    return predictions
      .filter(p => p.prediction_type === 'price' && (showHistoricalPredictions || p.actual_value === null))
      .map(p => ({
        time: format(new Date(p.prediction_time), 'MM/dd HH:mm'),
        targetTime: format(new Date(p.target_time), 'MM/dd HH:mm'),
        predictedPrice: p.prediction_value,
        actualPrice: p.actual_value || null,
        confidence: p.confidence_score
      }))
      .reverse();
  }, [predictions, showHistoricalPredictions]);

  // Prepare sentiment chart data
  const sentimentChartData = useMemo(() => {
    if (!sentimentData || sentimentData.length === 0) return [];
    
    return sentimentData
      .map(s => ({
        date: format(new Date(s.analyzed_at), 'MM/dd'),
        sentimentScore: s.sentiment_score,
        magnitude: s.sentiment_magnitude,
        mentions: s.social_mentions || 0
      }))
      .reverse();
  }, [sentimentData]);

  // Handle signal selection
  const handleSignalSelect = (signal: TradingSignal) => {
    if (onSignalSelected) {
      onSignalSelected(signal);
    }
  };

  // Render confidence badge with appropriate color
  const renderConfidenceBadge = (score: number) => {
    let color = '';
    if (score >= 90) color = 'bg-green-100 text-green-800';
    else if (score >= 70) color = 'bg-blue-100 text-blue-800';
    else if (score >= 50) color = 'bg-yellow-100 text-yellow-800';
    else color = 'bg-red-100 text-red-800';
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {score.toFixed(0)}%
      </span>
    );
  };

  // Render direction indicator
  const renderDirectionIndicator = (direction: string) => {
    if (direction === 'buy' || direction === 'long') {
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    } else if (direction === 'sell' || direction === 'short') {
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Brain className="h-5 w-5" /> 
                AI Market Predictions
              </CardTitle>
              <CardDescription>
                Machine learning-powered market analysis and trading signals
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Select symbol" />
                </SelectTrigger>
                <SelectContent>
                  {symbols.length > 0 ? (
                    symbols.map(symbol => (
                      <SelectItem key={symbol} value={symbol}>
                        {symbol}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                      <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                      <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">15m</SelectItem>
                  <SelectItem value="1h">1h</SelectItem>
                  <SelectItem value="4h">4h</SelectItem>
                  <SelectItem value="1d">1d</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="predictions" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="predictions">Price Predictions</TabsTrigger>
              <TabsTrigger value="signals">Trading Signals</TabsTrigger>
              <TabsTrigger value="sentiment">Market Sentiment</TabsTrigger>
            </TabsList>
            
            <TabsContent value="predictions" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select prediction model" />
                    </SelectTrigger>
                    <SelectContent>
                      {predictiveModels.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name} ({model.model_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {accuracyMetrics && (
                    <Badge variant="outline" className="text-xs">
                      Accuracy: {accuracyMetrics.averageAccuracy.toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-historical"
                    checked={showHistoricalPredictions}
                    onCheckedChange={setShowHistoricalPredictions}
                  />
                  <Label htmlFor="show-historical">Show historical</Label>
                </div>
              </div>
              
              <div className="h-[300px] w-full">
                {predictionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={predictionChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="predictedPrice"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Predicted Price"
                      />
                      <Line
                        type="monotone"
                        dataKey="actualPrice"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Actual Price"
                      />
                      <Bar
                        dataKey="confidence"
                        fill="#ccc"
                        opacity={0.3}
                        name="Confidence (%)"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-muted-foreground">No prediction data available.</p>
                  </div>
                )}
              </div>
              
              {accuracyMetrics && (
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {accuracyMetrics.successRate.toFixed(1)}%
                        </div>
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {accuracyMetrics.averageAccuracy.toFixed(1)}%
                        </div>
                        <p className="text-sm text-muted-foreground">Avg. Accuracy</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {accuracyMetrics.correctPredictions}
                        </div>
                        <p className="text-sm text-muted-foreground">Correct Predictions</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {accuracyMetrics.totalPredictions}
                        </div>
                        <p className="text-sm text-muted-foreground">Total Predictions</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="signals" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="confidence-threshold">Min. Confidence:</Label>
                  <Slider
                    id="confidence-threshold"
                    min={0}
                    max={100}
                    step={5}
                    defaultValue={[confidenceThreshold]}
                    onValueChange={(values) => setConfidenceThreshold(values[0])}
                    className="w-[150px]"
                  />
                  <span className="text-sm font-medium">{confidenceThreshold}%</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => 
                  toast({
                    title: "Signals refreshed",
                    description: "Trading signals have been updated.",
                  })
                }>
                  Refresh Signals
                </Button>
              </div>
              
              {tradingSignals.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {tradingSignals.map(signal => (
                    <Card key={signal.id} className={`border-l-4 ${
                      signal.direction === 'buy' || signal.direction === 'long'
                        ? 'border-l-green-500'
                        : 'border-l-red-500'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {renderDirectionIndicator(signal.direction)}
                            <span className="font-semibold">
                              {signal.signal_type.toUpperCase()} Signal: {signal.direction.toUpperCase()}
                            </span>
                            <Badge variant="outline">{signal.symbol}</Badge>
                            <Badge variant="secondary">{signal.timeframe}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              Confidence:
                            </span>
                            {renderConfidenceBadge(signal.confidence_score)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Entry Price</p>
                            <p className="font-medium">${signal.entry_price.toFixed(2)}</p>
                          </div>
                          {signal.stop_loss && (
                            <div>
                              <p className="text-sm text-muted-foreground">Stop Loss</p>
                              <p className="font-medium">${signal.stop_loss.toFixed(2)}</p>
                            </div>
                          )}
                          {signal.take_profit && (
                            <div>
                              <p className="text-sm text-muted-foreground">Take Profit</p>
                              <p className="font-medium">${signal.take_profit.toFixed(2)}</p>
                            </div>
                          )}
                          {signal.risk_reward_ratio && (
                            <div>
                              <p className="text-sm text-muted-foreground">Risk/Reward</p>
                              <p className="font-medium">{signal.risk_reward_ratio.toFixed(2)}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center mt-3">
                          <div className="text-sm text-muted-foreground">
                            {signal.chart_pattern && (
                              <span className="inline-flex items-center">
                                <BarChart4 className="h-3 w-3 mr-1" />
                                Pattern: {signal.chart_pattern}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Generated: {format(new Date(signal.generated_at), 'MMM dd, yyyy HH:mm')}
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleSignalSelect(signal)}
                          >
                            Trade Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <Info className="h-10 w-10 text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">No trading signals available</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    There are no active AI trading signals matching your criteria.
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="sentiment" className="space-y-4">
              <div className="h-[250px] w-full">
                {sentimentChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={sentimentChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="sentimentScore"
                        stroke="#8884d8"
                        name="Sentiment Score"
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="mentions"
                        fill="#82ca9d"
                        name="Social Mentions"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-muted-foreground">No sentiment data available.</p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-4 mt-4">
                <div className="rounded-lg border p-4">
                  <h3 className="text-sm font-medium mb-2">Sentiment Analysis</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sentiment analysis uses natural language processing to evaluate market sentiment from news articles, social media, and other sources.
                  </p>
                  
                  {sentimentData.length > 0 ? (
                    <div className="space-y-3">
                      {sentimentData.slice(0, 3).map(sentiment => (
                        <div key={sentiment.id} className="flex justify-between items-center py-2 border-b">
                          <div>
                            <p className="font-medium text-sm">{sentiment.source}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(sentiment.analyzed_at), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {sentiment.sentiment_score > 0.25 ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Bullish</Badge>
                            ) : sentiment.sentiment_score < -0.25 ? (
                              <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Bearish</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Neutral</Badge>
                            )}
                            <span className="text-xs">
                              Score: {sentiment.sentiment_score.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No sentiment data available.</p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-xs text-muted-foreground">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            AI predictions are not financial advice. Always conduct your own research.
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            toast({
              title: "AI models updated",
              description: "Prediction models have been refreshed with latest data.",
            });
          }}>
            <Brain className="h-4 w-4 mr-2" /> Retrain Models
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
