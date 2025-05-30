import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpIcon, ArrowDownIcon, BarChart2Icon, TrendingUpIcon, ActivityIcon, RefreshCcwIcon } from 'lucide-react';

interface MarketAnalysisCardProps {
  symbol: string;
  onRecommendationSelect?: (recommendation: any) => void;
}

export function MarketAnalysisCard({ symbol, onRecommendationSelect }: MarketAnalysisCardProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('1d');
  
  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/mcp/market-analysis?symbol=${symbol}&includeTechnical=true&includeSentiment=true&includePrice=true&timeframe=${timeframe}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch market analysis');
      }
      
      const data = await response.json();
      setAnalysis(data);
    } catch (err: any) {
      console.error('Error fetching market analysis:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAnalysis();
  }, [symbol, timeframe]);
  
  const handleRefresh = () => {
    fetchAnalysis();
  };
  
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{symbol} Analysis</span>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCcwIcon className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardTitle>
          <CardDescription className="text-red-500">Error: {error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{symbol} Analysis</CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[90px]">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="4h">4h</SelectItem>
                <SelectItem value="1d">1d</SelectItem>
                <SelectItem value="1w">1w</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCcwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {analysis?.sentiment && (
          <div className="flex items-center space-x-2 mt-2">
            <Badge 
              variant={
                analysis.sentiment.overall === 'positive' ? 'success' : 
                analysis.sentiment.overall === 'negative' ? 'destructive' : 
                'secondary'
              }
            >
              {analysis.sentiment.overall} sentiment
            </Badge>
            <Badge variant="outline">
              F&G: {analysis.sentiment.fearAndGreed}
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-[25px] w-[120px]" />
            <Skeleton className="h-[20px] w-[100px]" />
            <Skeleton className="h-[100px] w-full" />
            <Skeleton className="h-[20px] w-full" />
            <Skeleton className="h-[20px] w-full" />
          </div>
        ) : (
          <div>
            {analysis?.price && (
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-2xl font-bold">${analysis.price.current.toFixed(2)}</h3>
                  <div className={`flex items-center ${analysis.price.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {analysis.price.change24h >= 0 ? <ArrowUpIcon className="h-4 w-4 mr-1" /> : <ArrowDownIcon className="h-4 w-4 mr-1" />}
                    <span>{analysis.price.change24h.toFixed(2)}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">24h Volume</div>
                  <div>${(analysis.price.volume24h / 1000000).toFixed(2)}M</div>
                </div>
              </div>
            )}
            
            <Tabs defaultValue="technical">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="technical">Technical</TabsTrigger>
                <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
                <TabsTrigger value="recommendations">Actions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="technical" className="space-y-4">
                {analysis?.technical ? (
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">RSI (14)</span>
                          <span 
                            className={
                              analysis.technical.rsi > 70 ? 'text-red-500' : 
                              analysis.technical.rsi < 30 ? 'text-green-500' : ''
                            }
                          >
                            {analysis.technical.rsi.toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              analysis.technical.rsi > 70 ? 'bg-red-500' : 
                              analysis.technical.rsi < 30 ? 'bg-green-500' : 
                              'bg-blue-500'
                            }`} 
                            style={{ width: `${analysis.technical.rsi}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">MACD Histogram</span>
                          <span 
                            className={
                              analysis.technical.macd.histogram > 0 ? 'text-green-500' : 
                              'text-red-500'
                            }
                          >
                            {analysis.technical.macd.histogram.toFixed(4)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs">Signal: {analysis.technical.macd.signal.toFixed(4)}</span>
                          <span className="text-xs">MACD: {analysis.technical.macd.macd.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Bollinger Bands</h4>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center">
                          <div className="text-muted-foreground">Upper</div>
                          <div>{analysis.technical.bollingerBands.upper.toFixed(2)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">Middle</div>
                          <div>{analysis.technical.bollingerBands.middle.toFixed(2)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">Lower</div>
                          <div>{analysis.technical.bollingerBands.lower.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="flex items-center">
                        <BarChart2Icon className="h-4 w-4 mr-2" />
                        <span>Signal: <span className={
                          analysis.technical.signals.overall === 'buy' ? 'text-green-500 font-medium' : 
                          analysis.technical.signals.overall === 'sell' ? 'text-red-500 font-medium' : 
                          'font-medium'
                        }>
                          {analysis.technical.signals.overall.toUpperCase()}
                        </span> ({analysis.technical.signals.strength.toFixed(2)})</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">Technical data not available</div>
                )}
              </TabsContent>
              
              <TabsContent value="sentiment">
                {analysis?.sentiment ? (
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-3">
                        <h3 className="text-sm font-medium mb-2">News Sentiment</h3>
                        <Badge 
                          variant={
                            analysis.sentiment.news === 'positive' ? 'success' : 
                            analysis.sentiment.news === 'negative' ? 'destructive' : 
                            'secondary'
                          }
                        >
                          {analysis.sentiment.news}
                        </Badge>
                      </div>
                      
                      <div className="rounded-lg border p-3">
                        <h3 className="text-sm font-medium mb-2">Social Media</h3>
                        <Badge 
                          variant={
                            analysis.sentiment.social === 'positive' ? 'success' : 
                            analysis.sentiment.social === 'negative' ? 'destructive' : 
                            'secondary'
                          }
                        >
                          {analysis.sentiment.social}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="rounded-lg border p-3">
                      <h3 className="text-sm font-medium mb-2">Whale Activity</h3>
                      <Badge 
                        variant={
                          analysis.sentiment.whaleActivity === 'buying' ? 'success' : 
                          analysis.sentiment.whaleActivity === 'selling' ? 'destructive' : 
                          'secondary'
                        }
                      >
                        {analysis.sentiment.whaleActivity}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-2">
                        Large holders are currently {analysis.sentiment.whaleActivity} {symbol}
                      </p>
                    </div>
                    
                    <div className="rounded-lg border p-3">
                      <h3 className="text-sm font-medium mb-2">Fear & Greed Index</h3>
                      <div className="w-full bg-secondary rounded-full h-2.5 mb-2">
                        <div 
                          className={`h-2.5 rounded-full ${
                            analysis.sentiment.fearAndGreed >= 75 ? 'bg-green-500' : 
                            analysis.sentiment.fearAndGreed >= 50 ? 'bg-blue-500' : 
                            analysis.sentiment.fearAndGreed >= 25 ? 'bg-orange-500' : 
                            'bg-red-500'
                          }`} 
                          style={{ width: `${analysis.sentiment.fearAndGreed}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Extreme Fear</span>
                        <span>Extreme Greed</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">Sentiment data not available</div>
                )}
              </TabsContent>
              
              <TabsContent value="recommendations">
                {analysis?.recommendations && analysis.recommendations.length > 0 ? (
                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-medium">Recommended Actions</h3>
                    {analysis.recommendations.map((rec: any, index: number) => (
                      <div key={index} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Badge 
                              variant={rec.action === 'buy' ? 'success' : rec.action === 'sell' ? 'destructive' : 'outline'}
                              className="mr-2"
                            >
                              {rec.action.toUpperCase()}
                            </Badge>
                            <span className="text-sm">{rec.timeframe}</span>
                          </div>
                          <span className="text-sm">Confidence: {(rec.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <p className="text-sm mt-2">{rec.reason}</p>
                        {onRecommendationSelect && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full mt-2"
                            onClick={() => onRecommendationSelect(rec)}
                          >
                            <TrendingUpIcon className="h-4 w-4 mr-2" />
                            Execute {rec.action}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    No recommendations available at this time
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="text-xs text-muted-foreground">
        <div className="flex items-center">
          <ActivityIcon className="h-3 w-3 mr-1" />
          Last updated: {analysis ? new Date(analysis.timestamp).toLocaleTimeString() : 'Loading...'}
        </div>
      </CardFooter>
    </Card>
  );
}
