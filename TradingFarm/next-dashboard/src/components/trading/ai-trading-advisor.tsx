'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, TrendingUp, TrendingDown, BarChart3, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '@/i18n/i18n-provider';
import { useToast } from '@/hooks/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';

interface TradingRecommendation {
  id: string;
  symbol: string;
  direction: 'buy' | 'sell' | 'hold';
  confidence: number;
  price: number;
  reason: string;
  timestamp: string;
  timeframe: string;
  potentialProfit: number;
  riskLevel: 'low' | 'medium' | 'high';
  technicalIndicators: {
    name: string;
    value: string;
    signal: 'bullish' | 'bearish' | 'neutral';
  }[];
}

/**
 * AI Trading Advisor component
 * Provides AI-powered trading recommendations and insights
 */
export function AITradingAdvisor() {
  const [recommendations, setRecommendations] = useState<TradingRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('all');
  const [expandedRecs, setExpandedRecs] = useState<string[]>([]);
  const { t, formatCurrency, formatPercentage } = useI18n();
  const { toast } = useToast();

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      
      try {
        // In a real implementation, this would call an AI model API endpoint
        // For this demo, we'll simulate AI recommendations
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Sample recommendation data (would come from backend ML model)
        const mockRecommendations: TradingRecommendation[] = [
          {
            id: '1',
            symbol: 'BTC/USD',
            direction: 'buy',
            confidence: 76,
            price: 62150.25,
            reason: 'Bullish divergence on RSI with support at $60,000. Recent institutional buying patterns suggest continued upward momentum.',
            timestamp: new Date().toISOString(),
            timeframe: '4h',
            potentialProfit: 5.2,
            riskLevel: 'medium',
            technicalIndicators: [
              { name: 'RSI', value: '42', signal: 'bullish' },
              { name: 'MACD', value: 'Crossing', signal: 'bullish' },
              { name: 'MA 200', value: 'Above', signal: 'bullish' },
              { name: 'Bollinger', value: 'Lower band', signal: 'bullish' }
            ]
          },
          {
            id: '2',
            symbol: 'ETH/USD',
            direction: 'hold',
            confidence: 65,
            price: 3045.80,
            reason: 'Consolidating in range before next leg up. Wait for clear breakout above $3,200 for confirmation of trend continuation.',
            timestamp: new Date().toISOString(),
            timeframe: '1d',
            potentialProfit: 3.8,
            riskLevel: 'low',
            technicalIndicators: [
              { name: 'RSI', value: '52', signal: 'neutral' },
              { name: 'MACD', value: 'Flat', signal: 'neutral' },
              { name: 'MA 200', value: 'Above', signal: 'bullish' },
              { name: 'Bollinger', value: 'Middle band', signal: 'neutral' }
            ]
          },
          {
            id: '3',
            symbol: 'SOL/USD',
            direction: 'sell',
            confidence: 72,
            price: 145.32,
            reason: 'Bearish divergence on volume with increased selling pressure at $150 resistance zone. Consider taking profits.',
            timestamp: new Date().toISOString(),
            timeframe: '4h',
            potentialProfit: 4.5,
            riskLevel: 'high',
            technicalIndicators: [
              { name: 'RSI', value: '71', signal: 'bearish' },
              { name: 'MACD', value: 'Diverging', signal: 'bearish' },
              { name: 'MA 50', value: 'Below', signal: 'bearish' },
              { name: 'Bollinger', value: 'Upper band', signal: 'bearish' }
            ]
          }
        ];
        
        setRecommendations(mockRecommendations);
        
        // Store recommendations in Supabase for persistence (in a real app)
        // const supabase = createBrowserClient();
        // const { data: { session } } = await supabase.auth.getSession();
        // if (session) {
        //   // Store recommendations for this user
        // }
      } catch (error) {
        console.error('Error fetching AI recommendations:', error);
        toast({
          title: t('errors.error'),
          description: t('errors.aiRecommendationsError'),
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [t, toast]);

  const toggleRecommendationExpand = (id: string) => {
    setExpandedRecs(prev => 
      prev.includes(id) 
        ? prev.filter(recId => recId !== id) 
        : [...prev, id]
    );
  };

  const filteredRecommendations = recommendations.filter(rec => {
    if (currentTab === 'all') return true;
    if (currentTab === 'buy' && rec.direction === 'buy') return true;
    if (currentTab === 'sell' && rec.direction === 'sell') return true;
    if (currentTab === 'hold' && rec.direction === 'hold') return true;
    return false;
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('trading.aiAdvisor')}
            </CardTitle>
            <CardDescription>
              {t('trading.aiAdvisorDescription')}
            </CardDescription>
          </div>
          
          <Button size="sm" variant="outline" onClick={() => setIsLoading(true)}>
            {t('trading.refreshRecommendations')}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="all" value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
            <TabsTrigger value="buy">{t('trading.buy')}</TabsTrigger>
            <TabsTrigger value="sell">{t('trading.sell')}</TabsTrigger>
            <TabsTrigger value="hold">{t('trading.hold')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <Sparkles className="h-8 w-8 animate-pulse text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                </div>
              </div>
            ) : filteredRecommendations.length === 0 ? (
              <div className="flex justify-center py-8">
                <p className="text-muted-foreground">{t('common.noData')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRecommendations.map((rec) => (
                  <div key={rec.id} className="border rounded-lg overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleRecommendationExpand(rec.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          rec.direction === 'buy' ? 'default' : 
                          rec.direction === 'sell' ? 'destructive' : 'outline'
                        }>
                          {rec.direction === 'buy' && <TrendingUp className="h-3.5 w-3.5 mr-1" />}
                          {rec.direction === 'sell' && <TrendingDown className="h-3.5 w-3.5 mr-1" />}
                          {rec.direction === 'hold' && <BarChart3 className="h-3.5 w-3.5 mr-1" />}
                          {t(`trading.${rec.direction}`)}
                        </Badge>
                        <span className="font-medium">{rec.symbol}</span>
                        <Badge variant="outline" className="font-mono">
                          {formatCurrency(rec.price)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">
                          {rec.confidence}% {t('trading.confidence')}
                        </Badge>
                        
                        <div className="flex items-center">
                          <Badge variant={
                            rec.riskLevel === 'low' ? 'outline' : 
                            rec.riskLevel === 'medium' ? 'default' : 
                            'destructive'
                          } className="mr-2">
                            {t(`trading.risk${rec.riskLevel.charAt(0).toUpperCase() + rec.riskLevel.slice(1)}`)}
                          </Badge>
                          
                          {expandedRecs.includes(rec.id) ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {expandedRecs.includes(rec.id) && (
                      <div className="p-4 border-t bg-muted/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="text-sm font-medium mb-2">{t('trading.analysis')}</h4>
                            <p className="text-sm text-muted-foreground">{rec.reason}</p>
                            
                            <div className="mt-4">
                              <h4 className="text-sm font-medium mb-2">{t('trading.potentialOutcome')}</h4>
                              <div className="flex gap-4">
                                <div>
                                  <span className="text-sm text-muted-foreground">{t('trading.potentialProfit')}:</span>
                                  <span className="ml-1 text-sm font-medium text-green-500">+{formatPercentage(rec.potentialProfit)}</span>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">{t('trading.timeframe')}:</span>
                                  <span className="ml-1 text-sm font-medium">{rec.timeframe}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium mb-2">{t('trading.technicalIndicators')}</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {rec.technicalIndicators.map((indicator, i) => (
                                <div key={i} className="flex justify-between items-center p-2 rounded bg-muted">
                                  <span className="text-xs font-medium">{indicator.name}</span>
                                  <Badge variant={
                                    indicator.signal === 'bullish' ? 'default' : 
                                    indicator.signal === 'bearish' ? 'destructive' : 
                                    'outline'
                                  } className="text-xs">
                                    {indicator.value}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end gap-2 mt-4">
                          <Button variant="outline" size="sm">
                            {t('trading.createAlert')}
                          </Button>
                          <Button size="sm">
                            {rec.direction === 'buy' ? t('trading.createBuyOrder') : 
                             rec.direction === 'sell' ? t('trading.createSellOrder') : 
                             t('trading.viewDetails')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="buy" className="mt-0">
            {/* Same content structure as 'all' tab */}
          </TabsContent>
          
          <TabsContent value="sell" className="mt-0">
            {/* Same content structure as 'all' tab */}
          </TabsContent>
          
          <TabsContent value="hold" className="mt-0">
            {/* Same content structure as 'all' tab */}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="border-t px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
          <p>{t('trading.aiDisclaimer')}</p>
        </div>
      </CardFooter>
    </Card>
  );
}
