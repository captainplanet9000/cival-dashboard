'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { bybitTradingService } from '@/services/bybit-trading-service';
import { toast } from '@/components/ui/use-toast';
import { ExchangeCredentials } from '@/utils/exchange/types';
import { Calculator, Percent, DollarSign, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PositionSizerProps {
  accountBalance: number;
  exchangeId: string;
  symbol: string;
  onPositionCalculated?: (positionSize: number) => void;
}

export function PositionSizer({ 
  accountBalance, 
  exchangeId, 
  symbol, 
  onPositionCalculated 
}: PositionSizerProps) {
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [stopLossPrice, setStopLossPrice] = useState<number>(0);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [positionSize, setPositionSize] = useState<number>(0);
  const [riskAmount, setRiskAmount] = useState<number>(0);
  const [riskRewardRatio, setRiskRewardRatio] = useState<number>(2);
  const [takeProfitPrice, setTakeProfitPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate position size
  const calculatePosition = () => {
    try {
      if (!entryPrice || !stopLossPrice || riskPercent <= 0) {
        setError('Please enter valid entry price, stop loss, and risk percentage');
        return;
      }
      
      if (entryPrice === stopLossPrice) {
        setError('Entry price cannot be equal to stop loss price');
        return;
      }
      
      // Calculate position size using the trading service
      const calculatedSize = bybitTradingService.calculatePositionSize(
        accountBalance,
        riskPercent,
        entryPrice,
        stopLossPrice
      );
      
      // Calculate risk amount in USD
      const calculatedRiskAmount = (accountBalance * riskPercent) / 100;
      
      // Calculate take profit price based on risk:reward ratio
      const calculatedTakeProfit = bybitTradingService.calculateTakeProfit(
        entryPrice,
        stopLossPrice,
        riskRewardRatio
      );
      
      setPositionSize(calculatedSize);
      setRiskAmount(calculatedRiskAmount);
      setTakeProfitPrice(calculatedTakeProfit);
      setError(null);
      
      if (onPositionCalculated) {
        onPositionCalculated(calculatedSize);
      }
      
      toast({
        title: 'Position Size Calculated',
        description: `Calculated size: ${calculatedSize.toFixed(6)} with $${calculatedRiskAmount.toFixed(2)} at risk`,
      });
    } catch (error: any) {
      console.error('Error calculating position size:', error);
      setError(error.message || 'Error calculating position size');
    }
  };
  
  // Get current price for the symbol
  const getCurrentPrice = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get exchange credentials
      const credentialsResponse = await bybitTradingService.getCredentials(exchangeId);
      
      if (!credentialsResponse.success || !credentialsResponse.data) {
        throw new Error('Failed to get exchange credentials');
      }
      
      // Get latest price
      const marketResponse = await bybitTradingService.getMarketPrice(
        credentialsResponse.data,
        symbol
      );
      
      if (!marketResponse.success || !marketResponse.data) {
        throw new Error('Failed to get current price');
      }
      
      const price = parseFloat(marketResponse.data.price);
      setEntryPrice(price);
      
      toast({
        title: 'Price Retrieved',
        description: `Current price for ${symbol}: $${price.toFixed(2)}`,
      });
    } catch (error: any) {
      console.error('Error fetching current price:', error);
      setError(error.message || 'Error fetching current price');
      
      toast({
        title: 'Price Retrieval Failed',
        description: error.message || 'Failed to get current price',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Apply position size to parent component
  const applyPositionSize = () => {
    if (onPositionCalculated && positionSize > 0) {
      onPositionCalculated(positionSize);
      
      toast({
        title: 'Position Size Applied',
        description: `Applied position size: ${positionSize.toFixed(6)}`,
      });
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Position Size Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="entryPrice">Entry Price</Label>
            <div className="flex space-x-2">
              <Input
                id="entryPrice"
                type="number"
                step="0.00001"
                min="0"
                value={entryPrice || ''}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value))}
                placeholder="0.00"
              />
              <Button variant="outline" onClick={getCurrentPrice} disabled={loading}>
                {loading ? 'Loading...' : 'Get Price'}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="stopLossPrice">Stop Loss Price</Label>
            <Input
              id="stopLossPrice"
              type="number"
              step="0.00001"
              min="0"
              value={stopLossPrice || ''}
              onChange={(e) => setStopLossPrice(parseFloat(e.target.value))}
              placeholder="0.00"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="riskPercent">Risk Percentage: {riskPercent}%</Label>
            <span className="text-sm text-muted-foreground">${(accountBalance * riskPercent / 100).toFixed(2)}</span>
          </div>
          <Slider
            id="riskPercent"
            min={0.1}
            max={5}
            step={0.1}
            value={[riskPercent]}
            onValueChange={(values) => setRiskPercent(values[0])}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="riskRewardRatio">Risk:Reward Ratio: 1:{riskRewardRatio}</Label>
          </div>
          <Slider
            id="riskRewardRatio"
            min={1}
            max={5}
            step={0.5}
            value={[riskRewardRatio]}
            onValueChange={(values) => setRiskRewardRatio(values[0])}
          />
        </div>
        
        <Button onClick={calculatePosition} className="w-full" variant="default">
          <Calculator className="h-4 w-4 mr-2" />
          Calculate Position Size
        </Button>
        
        {positionSize > 0 && (
          <div className="rounded-md border p-4 space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Position Size:</p>
                <p className="text-lg font-bold">{positionSize.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Risk Amount:</p>
                <p className="text-lg font-bold">${riskAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stop Loss:</p>
                <p className="text-lg font-bold">${stopLossPrice.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Take Profit:</p>
                <p className="text-lg font-bold">${takeProfitPrice.toFixed(2)}</p>
              </div>
            </div>
            
            <Button onClick={applyPositionSize} className="w-full mt-2" variant="outline">
              Apply Position Size
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
