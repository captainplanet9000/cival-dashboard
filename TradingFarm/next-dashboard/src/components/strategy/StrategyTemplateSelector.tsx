"use client";

import { useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, Check, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  parameters: Record<string, any>;
  code: string;
}

interface StrategyTemplateSelectorProps {
  onSelect: () => void;
}

// Mock templates - in a real application, these would be fetched from the database
const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: "template-sma-crossover",
    name: "SMA Crossover Strategy",
    description: "A simple moving average crossover strategy that generates buy signals when a faster moving average crosses above a slower one, and sell signals when it crosses below.",
    type: "trend_following",
    difficulty: "beginner",
    parameters: {
      fastPeriod: 10,
      slowPeriod: 30,
      positionSize: 1.0,
      symbols: ["BTC/USDT"]
    },
    code: `function initialize() {
  this.fastPeriod = this.params.fastPeriod || 10;
  this.slowPeriod = this.params.slowPeriod || 30;
  this.positionSize = this.params.positionSize || 1.0;
  this.symbolsToTrade = this.params.symbols || ["BTC/USDT"];
}

function onTick(tick) {
  if (!this.symbolsToTrade.includes(tick.symbol)) return;
  
  const prices = this.getPriceHistory(tick.symbol, this.slowPeriod + 10);
  if (prices.length < this.slowPeriod) return;
  
  const fastSMA = calculateSMA(prices, this.fastPeriod);
  const slowSMA = calculateSMA(prices, this.slowPeriod);
  
  const prevPrices = prices.slice(0, -1);
  const prevFastSMA = calculateSMA(prevPrices, this.fastPeriod);
  const prevSlowSMA = calculateSMA(prevPrices, this.slowPeriod);
  
  if (prevFastSMA <= prevSlowSMA && fastSMA > slowSMA) {
    this.signal("entry", tick.symbol, tick.price, this.positionSize);
  }
  
  if (prevFastSMA >= prevSlowSMA && fastSMA < slowSMA) {
    this.signal("exit", tick.symbol, tick.price, this.positionSize);
  }
}

function calculateSMA(prices, period) {
  if (prices.length < period) return 0;
  const sum = prices.slice(-period).reduce((total, price) => total + price, 0);
  return sum / period;
}`
  },
  {
    id: "template-rsi-mean-reversion",
    name: "RSI Mean Reversion Strategy",
    description: "A mean reversion strategy that uses the Relative Strength Index (RSI) indicator to identify overbought and oversold conditions for trading signals.",
    type: "mean_reversion",
    difficulty: "intermediate",
    parameters: {
      rsiPeriod: 14,
      oversoldThreshold: 30,
      overboughtThreshold: 70,
      positionSize: 1.0,
      symbols: ["ETH/USDT"]
    },
    code: `function initialize() {
  this.rsiPeriod = this.params.rsiPeriod || 14;
  this.oversoldThreshold = this.params.oversoldThreshold || 30;
  this.overboughtThreshold = this.params.overboughtThreshold || 70;
  this.positionSize = this.params.positionSize || 1.0;
  this.symbolsToTrade = this.params.symbols || ["ETH/USDT"];
}

function onTick(tick) {
  if (!this.symbolsToTrade.includes(tick.symbol)) return;
  
  const prices = this.getPriceHistory(tick.symbol, this.rsiPeriod + 10);
  if (prices.length < this.rsiPeriod + 1) return;
  
  const rsi = calculateRSI(prices, this.rsiPeriod);
  
  if (rsi < this.oversoldThreshold) {
    this.signal("entry", tick.symbol, tick.price, this.positionSize);
  }
  
  if (rsi > this.overboughtThreshold) {
    this.signal("exit", tick.symbol, tick.price, this.positionSize);
  }
}`
  },
  {
    id: "template-grid-trading",
    name: "Grid Trading Strategy",
    description: "A grid trading strategy that places buy orders at regular intervals below the current price and sell orders above it, profiting from price oscillations.",
    type: "grid_trading",
    difficulty: "intermediate",
    parameters: {
      gridLevels: 10,
      gridSpacing: 0.5,
      totalAllocation: 100,
      symbols: ["BTC/USDT"]
    },
    code: `function initialize() {
  this.gridLevels = this.params.gridLevels || 10;
  this.gridSpacing = this.params.gridSpacing || 0.5;
  this.totalAllocation = this.params.totalAllocation || 100;
  this.symbolsToTrade = this.params.symbols || ["BTC/USDT"];
  this.grids = {};
}

function onTick(tick) {
  if (!this.symbolsToTrade.includes(tick.symbol)) return;
  
  if (!this.grids[tick.symbol]) {
    // Initialize grid for this symbol
    this.setupGrid(tick.symbol, tick.price);
  } else {
    // Check for grid level hits
    this.checkGridLevels(tick.symbol, tick.price);
  }
}`
  },
  {
    id: "template-breakout-strategy",
    name: "Volatility Breakout Strategy",
    description: "A strategy that identifies price breakouts from periods of low volatility, entering positions in the direction of the breakout.",
    type: "breakout",
    difficulty: "advanced",
    parameters: {
      breakoutPeriod: 20,
      volumeThreshold: 1.5,
      positionSize: 1.0,
      symbols: ["BTC/USDT"]
    },
    code: `function initialize() {
  this.breakoutPeriod = this.params.breakoutPeriod || 20;
  this.volumeThreshold = this.params.volumeThreshold || 1.5;
  this.positionSize = this.params.positionSize || 1.0;
  this.symbolsToTrade = this.params.symbols || ["BTC/USDT"];
}

function onTick(tick) {
  if (!this.symbolsToTrade.includes(tick.symbol)) return;
  
  const prices = this.getPriceHistory(tick.symbol, this.breakoutPeriod + 10);
  const volumes = this.getVolumeHistory(tick.symbol, this.breakoutPeriod + 10);
  
  if (prices.length < this.breakoutPeriod || volumes.length < this.breakoutPeriod) return;
  
  // Check for price breakout with volume confirmation
  // Implementation details here
}`
  }
];

export function StrategyTemplateSelector({ onSelect }: StrategyTemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<StrategyTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  
  const { toast } = useToast();
  const supabase = createBrowserClient();
  
  // Filter templates based on search query
  const filteredTemplates = STRATEGY_TEMPLATES.filter(template => {
    if (searchQuery === "") return true;
    
    return (
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });
  
  // Create strategy from template
  const createFromTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error("No template selected");
      
      const name = templateName || `${selectedTemplate.name} (copy)`;
      
      const { data, error } = await supabase
        .from('strategies')
        .insert({
          name: name,
          description: selectedTemplate.description,
          type: selectedTemplate.type,
          version: "1.0.0",
          parameters: selectedTemplate.parameters,
          is_active: false,
          is_deployed: false,
          content: selectedTemplate.code
        })
        .select('id')
        .single();
        
      if (error) throw error;
      
      return data;
    },
    onSuccess: () => {
      onSelect();
      toast({
        title: "Strategy Created",
        description: "Strategy has been created from template",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create strategy from template",
        variant: "destructive",
      });
    }
  });
  
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {filteredTemplates.map(template => (
          <Card 
            key={template.id}
            className={`cursor-pointer transition-all ${selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
            onClick={() => {
              setSelectedTemplate(template);
              setTemplateName(`${template.name} (copy)`);
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <Badge variant="outline" className="capitalize">
                  {template.type}
                </Badge>
              </div>
              <CardDescription>
                {template.description.length > 120 
                  ? `${template.description.substring(0, 120)}...` 
                  : template.description}
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-2 flex justify-between">
              <Badge variant={
                template.difficulty === "beginner" ? "default" : 
                template.difficulty === "intermediate" ? "secondary" : 
                "destructive"
              }>
                {template.difficulty}
              </Badge>
              {selectedTemplate?.id === template.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {selectedTemplate && (
        <div className="border rounded-lg p-4 mt-4">
          <h3 className="text-lg font-medium mb-2">Customize Template</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Strategy Name</label>
              <Input 
                value={templateName} 
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter strategy name"
              />
            </div>
            
            <Button 
              className="w-full"
              onClick={() => createFromTemplateMutation.mutate()}
              disabled={!templateName.trim() || createFromTemplateMutation.isPending}
            >
              {createFromTemplateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Strategy...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Create From Template
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
