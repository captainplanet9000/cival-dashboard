import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RiskLevel } from "@/types/cross-chain-position.types";
import { PositionSizeRecommendation } from "@/services/risk/risk-management-service";
import { formatCurrency } from "@/lib/utils";
import { Calculator, DollarSign, Percent, Scale, Shield, TrendingDown } from "lucide-react";

interface PositionSizeCalculatorProps {
  initialCapital?: number;
  riskLevel?: RiskLevel;
  onCalculate?: (result: PositionSizeRecommendation) => void;
  defaultMaxRiskPercent?: number;
  className?: string;
}

export function PositionSizeCalculator({
  initialCapital = 10000,
  riskLevel = 2,
  onCalculate,
  defaultMaxRiskPercent = 2,
  className = ''
}: PositionSizeCalculatorProps) {
  const [capital, setCapital] = useState<number>(initialCapital);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<RiskLevel>(riskLevel);
  const [maxRiskPercent, setMaxRiskPercent] = useState<number>(defaultMaxRiskPercent);
  const [volatility, setVolatility] = useState<number>(1);
  const [result, setResult] = useState<PositionSizeRecommendation | null>(null);
  
  // Recalculate when inputs change
  useEffect(() => {
    calculatePositionSize();
  }, [selectedRiskLevel, capital, maxRiskPercent, volatility]);
  
  const calculatePositionSize = () => {
    // This is a simplified version of the calculation in the RiskManagementService
    
    // Apply risk level multiplier
    const riskMultiplier = 1 + ((selectedRiskLevel - 1) * 0.5);
    
    // Apply volatility adjustment
    const volatilityThresholds = {
      1: 0.5, // Low risk - reduce position size by 50% in high volatility
      2: 0.7, // Medium risk - reduce position size by 30% in high volatility
      3: 0.9, // High risk - reduce position size by 10% in high volatility
      4: 1.0, // Very high risk - no reduction
    };
    
    const adjustedVolatilityMultiplier = volatility * volatilityThresholds[selectedRiskLevel];
    
    // Calculate risk-adjusted size
    const maxRiskAmount = capital * (maxRiskPercent / 100);
    const maxSize = capital * 0.8; // Never use more than 80% of capital
    const baseSize = capital * (selectedRiskLevel * 0.1); // Size increases with risk level
    const riskAdjustedSize = baseSize * riskMultiplier * adjustedVolatilityMultiplier;
    
    // Recommended size should not exceed max size or risk too little
    const recommendedSize = Math.min(maxSize, Math.max(capital * 0.1, riskAdjustedSize));
    
    // Calculate stop loss level if applicable
    const initialStopLoss = selectedRiskLevel <= 3 ? maxRiskAmount / recommendedSize * 100 : null;
    
    // Calculate take profit levels based on risk/reward ratio
    const takeProfitLevels = selectedRiskLevel <= 3 ? 
      [initialStopLoss ? initialStopLoss * 1.5 : null, initialStopLoss ? initialStopLoss * 3 : null].filter(Boolean) as number[] : 
      null;
    
    const newResult = {
      recommendedSize,
      maxSize,
      minSize: capital * 0.05, // Minimum position size is 5% of capital
      riskAdjustedSize,
      initialStopLoss,
      takeProfitLevels
    };
    
    setResult(newResult);
    
    if (onCalculate) {
      onCalculate(newResult);
    }
  };
  
  const handleCapitalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setCapital(value);
    }
  };
  
  // Helper to format percentages with 1 decimal place
  const formatPercent = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${value.toFixed(1)}%`;
  };
  
  // Helper to get risk level label and color
  const getRiskLevelInfo = (level: number): { label: string; color: string } => {
    switch (level) {
      case 1:
        return { label: 'Low Risk', color: 'bg-green-500' };
      case 2:
        return { label: 'Medium Risk', color: 'bg-blue-500' };
      case 3:
        return { label: 'High Risk', color: 'bg-orange-500' };
      case 4:
        return { label: 'Very High Risk', color: 'bg-red-500' };
      default:
        return { label: 'Custom Risk', color: 'bg-gray-500' };
    }
  };
  
  const riskInfo = getRiskLevelInfo(selectedRiskLevel);
  
  return (
    <Card className={`shadow-sm ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl flex items-center">
              <Calculator className="mr-2 h-5 w-5 text-primary" /> 
              Position Size Calculator
            </CardTitle>
            <CardDescription>
              Calculate optimal position size based on risk parameters
            </CardDescription>
          </div>
          <Badge 
            variant="outline"
            className={`px-2 py-1 ${riskInfo.color.replace('bg-', 'border-')} ${riskInfo.color.replace('bg-', 'text-')}`}
          >
            {riskInfo.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="capital">Available Capital</Label>
            <div className="relative">
              <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="capital"
                type="number"
                value={capital}
                onChange={handleCapitalChange}
                className="pl-8"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Risk Level</Label>
              <span className="text-xs text-muted-foreground">{riskInfo.label}</span>
            </div>
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger 
                value="1"
                onClick={() => setSelectedRiskLevel(1)}
                className={selectedRiskLevel === 1 ? "bg-green-100 text-green-800" : ""}
              >
                Low
              </TabsTrigger>
              <TabsTrigger 
                value="2"
                onClick={() => setSelectedRiskLevel(2)}
                className={selectedRiskLevel === 2 ? "bg-blue-100 text-blue-800" : ""}
              >
                Medium
              </TabsTrigger>
              <TabsTrigger 
                value="3"
                onClick={() => setSelectedRiskLevel(3)}
                className={selectedRiskLevel === 3 ? "bg-orange-100 text-orange-800" : ""}
              >
                High
              </TabsTrigger>
              <TabsTrigger 
                value="4"
                onClick={() => setSelectedRiskLevel(4)}
                className={selectedRiskLevel === 4 ? "bg-red-100 text-red-800" : ""}
              >
                Very High
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Max Risk Per Trade (%)</Label>
              <span className="text-xs text-muted-foreground">{maxRiskPercent}%</span>
            </div>
            <Slider
              value={[maxRiskPercent]}
              min={0.5}
              max={10}
              step={0.5}
              onValueChange={(values) => setMaxRiskPercent(values[0])}
            />
            <p className="text-xs text-muted-foreground">
              Maximum percentage of capital you're willing to risk on a single trade
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Market Volatility Multiplier</Label>
              <span className="text-xs text-muted-foreground">
                {volatility < 0.7 ? "Low" : volatility < 1 ? "Moderate" : "High"} ({volatility.toFixed(1)}x)
              </span>
            </div>
            <Slider
              value={[volatility]}
              min={0.5}
              max={1.5}
              step={0.1}
              onValueChange={(values) => setVolatility(values[0])}
            />
            <p className="text-xs text-muted-foreground">
              Reduce position size in high volatility markets
            </p>
          </div>
          
          <Separator />
          
          {result && (
            <div className="space-y-4">
              <h3 className="text-md font-medium flex items-center">
                <Scale className="mr-2 h-4 w-4 text-primary" />
                Position Size Results
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-xs text-muted-foreground">Recommended Size</div>
                  <div className="text-xl font-bold">{formatCurrency(result.recommendedSize)}</div>
                  <div className="text-xs text-muted-foreground">
                    {((result.recommendedSize / capital) * 100).toFixed(1)}% of capital
                  </div>
                </div>
                
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-xs text-muted-foreground">Position Range</div>
                  <div className="text-md font-medium">
                    {formatCurrency(result.minSize)} - {formatCurrency(result.maxSize)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Min and max recommended sizes
                  </div>
                </div>
                
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-xs text-muted-foreground">Risk Amount</div>
                  <div className="text-md font-medium">
                    {formatCurrency(capital * (maxRiskPercent / 100))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Maximum risk exposure
                  </div>
                </div>
              </div>
              
              {result.initialStopLoss && (
                <div className="p-3 border border-dashed rounded-md">
                  <h4 className="text-sm font-medium flex items-center mb-2">
                    <TrendingDown className="mr-2 h-4 w-4 text-red-500" />
                    Risk Management Levels
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Stop Loss</div>
                      <div className="text-md font-medium">
                        {formatPercent(result.initialStopLoss)}
                      </div>
                    </div>
                    
                    {result.takeProfitLevels && result.takeProfitLevels.length > 0 && (
                      <>
                        <div>
                          <div className="text-xs text-muted-foreground">Take Profit 1</div>
                          <div className="text-md font-medium text-green-600">
                            {formatPercent(result.takeProfitLevels[0])}
                          </div>
                        </div>
                        
                        {result.takeProfitLevels.length > 1 && (
                          <div>
                            <div className="text-xs text-muted-foreground">Take Profit 2</div>
                            <div className="text-md font-medium text-green-600">
                              {formatPercent(result.takeProfitLevels[1])}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2 bg-muted/40">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            setCapital(initialCapital);
            setSelectedRiskLevel(riskLevel);
            setMaxRiskPercent(defaultMaxRiskPercent);
            setVolatility(1);
          }}
          className="text-xs"
        >
          Reset
        </Button>
        
        <Button
          variant="default"
          size="sm"
          onClick={calculatePositionSize}
          className="text-xs"
        >
          <Calculator className="mr-1 h-3.5 w-3.5" />
          Calculate
        </Button>
      </CardFooter>
    </Card>
  );
}
