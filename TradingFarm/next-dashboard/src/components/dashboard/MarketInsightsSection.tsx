import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Minimize2 } from 'lucide-react';
import { aiService } from '@/services/serviceFactory';

interface MarketInsightsSectionProps {
  marketId: string;
}

export function MarketInsightsSection({ marketId }: MarketInsightsSectionProps) {
  const [sentiment, setSentiment] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMarketInsights() {
      setLoading(true);
      setError(null);
      
      try {
        // Parallel fetch both insights
        const [sentimentData, predictionData] = await Promise.all([
          aiService.analyzeMarketSentiment(marketId),
          aiService.predictPriceMovement(marketId, '24h')
        ]);
        
        setSentiment(sentimentData);
        setPrediction(predictionData);
      } catch (err) {
        console.error('Failed to fetch market insights:', err);
        setError('Unable to load market insights. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchMarketInsights();
  }, [marketId]);

  // Helper to format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Helper to get trend icon based on sentiment
  const getSentimentIcon = (sentimentType: string) => {
    switch (sentimentType.toLowerCase()) {
      case 'bullish':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'bearish':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'neutral':
        return <Minimize2 className="h-5 w-5 text-amber-500" />;
      default:
        return null;
    }
  };

  // Helper to get color based on confidence
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-green-500';
    if (confidence >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Insights</CardTitle>
          <CardDescription>AI-powered market analysis</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Insights</CardTitle>
          <CardDescription>AI-powered market analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const priceChange = prediction ? 
    ((prediction.predictedPrice - prediction.currentPrice) / prediction.currentPrice) * 100 : 0;
  const isPriceUp = priceChange >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Insights</CardTitle>
        <CardDescription>AI-powered market analysis for {marketId}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Market Sentiment Section */}
          {sentiment && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Market Sentiment</h3>
              <div className="flex items-center gap-2 my-3">
                {getSentimentIcon(sentiment.sentiment)}
                <Badge 
                  className={`
                    ${sentiment.sentiment === 'bullish' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                    ${sentiment.sentiment === 'bearish' ? 'bg-red-100 text-red-800 border-red-200' : ''}
                    ${sentiment.sentiment === 'neutral' ? 'bg-amber-100 text-amber-800 border-amber-200' : ''}
                  `}
                >
                  {sentiment.sentiment.toUpperCase()}
                </Badge>
                <span className={`ml-2 ${getConfidenceColor(sentiment.score)}`}>
                  {sentiment.score.toFixed(1)}% confidence
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {sentiment.analysis}
              </p>
              {sentiment.sources && sentiment.sources.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    Based on data from: {sentiment.sources.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Price Prediction Section */}
          {prediction && (
            <div className="space-y-2 pt-4 border-t">
              <h3 className="text-lg font-medium">24h Price Prediction</h3>
              <div className="grid grid-cols-2 gap-4 my-3">
                <div>
                  <p className="text-sm text-muted-foreground">Current Price</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(prediction.currentPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Predicted Price</p>
                  <p className={`text-lg font-semibold flex items-center gap-1 ${isPriceUp ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(prediction.predictedPrice)}
                    {isPriceUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className={`text-sm ${isPriceUp ? 'text-green-600' : 'text-red-600'}`}>
                  {isPriceUp ? '+' : ''}{priceChange.toFixed(2)}% in next 24h
                </p>
                <p className={`text-sm ${getConfidenceColor(prediction.confidence)}`}>
                  {prediction.confidence.toFixed(1)}% confidence
                </p>
              </div>
              {prediction.factors && prediction.factors.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">
                    Key factors: {prediction.factors.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
