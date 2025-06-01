/**
 * AI Strategy Advisor Component
 * Provides AI-powered trading strategy recommendations and insights
 */

"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAIServices } from '@/services/ai';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { StrategyRecommendationParams } from '@/services/ai/trading-strategy-service';

// Temporary type for demo purposes
type AIResult = {
  strategy?: {
    name: string;
    description: string;
    timeframe: string;
    riskLevel: string;
  };
  execution?: {
    entryConditions: string[];
    exitConditions: string[];
    positionSizing: string;
    riskManagement: string[];
  };
  marketOutlook?: {
    sentiment: string;
    keyFactors: string[];
    potentialRisks: string[];
  };
  expectedPerformance?: {
    potentialReturn: string;
    timeToTarget: string;
    confidenceLevel: string;
  };
  summary?: string;
  recommendations?: Array<{
    symbol: string;
    currentAllocation: number;
    recommendedAllocation: number;
    action: string;
    rationale: string;
  }>;
};

export function AIStrategyAdvisor() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('strategy');
  const [apiKey, setApiKey] = useState('');
  const [marketSymbol, setMarketSymbol] = useState('BTC/USD');
  const [initialCapital, setInitialCapital] = useState(10000);
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [timeframe, setTimeframe] = useState<'short' | 'medium' | 'long'>('medium');
  const [tradingExperience, setTradingExperience] = useState<'beginner' | 'intermediate' | 'expert'>('intermediate');
  const [marketConditions, setMarketConditions] = useState('');
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to generate a strategy recommendation
  const generateStrategyRecommendation = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!apiKey) {
        throw new Error('API key is required');
      }
      
      // Create AI services with the provided API key
      const { tradingStrategyService } = createAIServices({
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey,
      });
      
      // Prepare strategy params
      const params: StrategyRecommendationParams = {
        marketSymbol,
        initialCapital,
        riskTolerance,
        preferredTimeframe: timeframe,
        tradingExperience,
        marketConditions: marketConditions || undefined,
      };
      
      // Generate the recommendation
      const recommendation = await tradingStrategyService.generateStrategyRecommendation(params);
      setResult(recommendation as unknown as AIResult);
    } catch (err) {
      console.error('Error generating strategy recommendation:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to generate a risk analysis
  const generateRiskAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!apiKey) {
        throw new Error('API key is required');
      }
      
      // Create AI services with the provided API key
      const { tradingStrategyService } = createAIServices({
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey,
      });
      
      // Generate a risk analysis (for demo purposes we'll create a simple summary)
      const strategyDescription = `Trading ${marketSymbol} with ${riskTolerance} risk tolerance and ${timeframe} term timeframe.`;
      const riskAnalysis = await tradingStrategyService.analyzeStrategyRisk(strategyDescription, marketSymbol);
      
      setResult({
        summary: riskAnalysis,
      });
    } catch (err) {
      console.error('Error generating risk analysis:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to generate a portfolio recommendation (simplified for demo)
  const generatePortfolioRecommendation = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!apiKey) {
        throw new Error('API key is required');
      }
      
      // This would normally call portfolioOptimizationService.optimizePortfolio
      // For demo, we'll use a hardcoded response
      setTimeout(() => {
        setResult({
          summary: `Portfolio optimization for a ${riskTolerance} risk profile with ${timeframe} term investment horizon. Recommended allocations are designed to improve risk-adjusted returns while maintaining alignment with your investment goals.`,
          recommendations: [
            {
              symbol: 'BTC',
              currentAllocation: 40,
              recommendedAllocation: 35,
              action: 'decrease',
              rationale: 'Reduce BTC exposure to lower overall portfolio volatility.',
            },
            {
              symbol: 'ETH',
              currentAllocation: 25,
              recommendedAllocation: 30,
              action: 'increase',
              rationale: 'Increase ETH allocation due to strong development activity and potential upside.',
            },
            {
              symbol: 'SOL',
              currentAllocation: 15,
              recommendedAllocation: 20,
              action: 'increase',
              rationale: 'Increase allocation to benefit from growing ecosystem and lower correlation to BTC.',
            },
            {
              symbol: 'USDC',
              currentAllocation: 20,
              recommendedAllocation: 15,
              action: 'decrease',
              rationale: 'Reduce stablecoin allocation to increase overall returns while maintaining some safety.',
            },
          ],
        });
        setIsLoading(false);
      }, 2000);
    } catch (err) {
      console.error('Error generating portfolio recommendation:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">AI Strategy Advisor</CardTitle>
        <CardDescription>
          Get AI-powered trading strategy recommendations and portfolio insights
        </CardDescription>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 max-w-md mx-auto">
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
        </TabsList>
        
        <CardContent className="pt-6">
          <div className="mb-6">
            <Label htmlFor="apiKey">OpenAI API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="max-w-lg"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Required for AI-powered recommendations
            </p>
          </div>
          
          <TabsContent value="strategy" className="m-0">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="marketSymbol">Market Symbol</Label>
                  <Input
                    id="marketSymbol"
                    value={marketSymbol}
                    onChange={(e) => setMarketSymbol(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="initialCapital">Initial Capital (USD)</Label>
                  <Input
                    id="initialCapital"
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="riskTolerance">Risk Tolerance</Label>
                  <Select value={riskTolerance} onValueChange={(value: any) => setRiskTolerance(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk tolerance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="timeframe">Timeframe</Label>
                  <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short Term</SelectItem>
                      <SelectItem value="medium">Medium Term</SelectItem>
                      <SelectItem value="long">Long Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="tradingExperience">Experience Level</Label>
                  <Select value={tradingExperience} onValueChange={(value: any) => setTradingExperience(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="marketConditions">Market Conditions (Optional)</Label>
                <Textarea
                  id="marketConditions"
                  value={marketConditions}
                  onChange={(e) => setMarketConditions(e.target.value)}
                  placeholder="Describe current market conditions or relevant news..."
                  rows={3}
                />
              </div>
            </div>
            
            <Button onClick={generateStrategyRecommendation} disabled={isLoading} className="mt-2">
              {isLoading ? <LoadingSpinner className="mr-2" /> : null}
              Generate Strategy Recommendation
            </Button>
          </TabsContent>
          
          <TabsContent value="risk" className="m-0">
            <div className="grid gap-4 py-4">
              <p className="text-sm text-muted-foreground">
                Analyze the risks associated with trading {marketSymbol} based on your risk profile.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="riskTolerance-risk">Risk Tolerance</Label>
                  <Select value={riskTolerance} onValueChange={(value: any) => setRiskTolerance(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk tolerance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="timeframe-risk">Timeframe</Label>
                  <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short Term</SelectItem>
                      <SelectItem value="medium">Medium Term</SelectItem>
                      <SelectItem value="long">Long Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="marketSymbol-risk">Market Symbol</Label>
                <Input
                  id="marketSymbol-risk"
                  value={marketSymbol}
                  onChange={(e) => setMarketSymbol(e.target.value)}
                />
              </div>
            </div>
            
            <Button onClick={generateRiskAnalysis} disabled={isLoading} className="mt-2">
              {isLoading ? <LoadingSpinner className="mr-2" /> : null}
              Generate Risk Analysis
            </Button>
          </TabsContent>
          
          <TabsContent value="portfolio" className="m-0">
            <div className="grid gap-4 py-4">
              <p className="text-sm text-muted-foreground">
                Get AI-powered portfolio optimization recommendations to improve risk-adjusted returns.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="riskTolerance-portfolio">Risk Profile</Label>
                  <Select value={riskTolerance} onValueChange={(value: any) => setRiskTolerance(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk profile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="timeframe-portfolio">Investment Horizon</Label>
                  <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select investment horizon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short Term</SelectItem>
                      <SelectItem value="medium">Medium Term</SelectItem>
                      <SelectItem value="long">Long Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Current Portfolio (Demo)</p>
                <div className="bg-secondary p-3 rounded-md">
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>BTC: 40%</div>
                    <div>ETH: 25%</div>
                    <div>SOL: 15%</div>
                    <div>USDC: 20%</div>
                  </div>
                </div>
              </div>
            </div>
            
            <Button onClick={generatePortfolioRecommendation} disabled={isLoading} className="mt-2">
              {isLoading ? <LoadingSpinner className="mr-2" /> : null}
              Generate Portfolio Recommendation
            </Button>
          </TabsContent>
          
          {/* Results Display */}
          {result && (
            <div className="mt-8 border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">AI Recommendation</h3>
              
              {result.strategy && (
                <div className="mb-6">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-md font-semibold">{result.strategy.name}</h4>
                    <Badge variant={
                      result.strategy.riskLevel === 'low' ? 'secondary' : 
                      result.strategy.riskLevel === 'medium' ? 'default' : 'destructive'
                    }>
                      {result.strategy.riskLevel.charAt(0).toUpperCase() + result.strategy.riskLevel.slice(1)} Risk
                    </Badge>
                  </div>
                  <p className="text-sm mb-3">{result.strategy.description}</p>
                  <div className="text-sm text-muted-foreground">
                    Timeframe: {result.strategy.timeframe.replace('_', ' ')}
                  </div>
                </div>
              )}
              
              {result.execution && (
                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Entry Conditions</h4>
                    <ul className="text-sm list-disc list-inside space-y-1">
                      {result.execution.entryConditions.map((condition, i) => (
                        <li key={i}>{condition}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Exit Conditions</h4>
                    <ul className="text-sm list-disc list-inside space-y-1">
                      {result.execution.exitConditions.map((condition, i) => (
                        <li key={i}>{condition}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {result.marketOutlook && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold mb-2">Market Outlook</h4>
                  <Badge className="mb-2" variant={
                    result.marketOutlook.sentiment === 'bullish' ? 'success' :
                    result.marketOutlook.sentiment === 'neutral' ? 'secondary' : 'destructive'
                  }>
                    {result.marketOutlook.sentiment.charAt(0).toUpperCase() + result.marketOutlook.sentiment.slice(1)}
                  </Badge>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-xs font-medium mb-1">Key Factors</h5>
                      <ul className="text-sm list-disc list-inside space-y-1">
                        {result.marketOutlook.keyFactors.map((factor, i) => (
                          <li key={i}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-medium mb-1">Potential Risks</h5>
                      <ul className="text-sm list-disc list-inside space-y-1">
                        {result.marketOutlook.potentialRisks.map((risk, i) => (
                          <li key={i}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {result.expectedPerformance && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-2">Expected Performance</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Potential Return:</span>{' '}
                      <span className="font-medium">{result.expectedPerformance.potentialReturn}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time to Target:</span>{' '}
                      <span className="font-medium">{result.expectedPerformance.timeToTarget}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Confidence:</span>{' '}
                      <span className="font-medium">{result.expectedPerformance.confidenceLevel}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {result.summary && !result.strategy && (
                <div className="mb-6">
                  <p className="text-sm whitespace-pre-line">{result.summary}</p>
                </div>
              )}
              
              {result.recommendations && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold mb-2">Portfolio Recommendations</h4>
                  <p className="text-sm mb-3">{result.summary}</p>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Asset</th>
                          <th className="text-right py-2 font-medium">Current</th>
                          <th className="text-right py-2 font-medium">Recommended</th>
                          <th className="text-left py-2 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.recommendations.map((rec, i) => (
                          <tr key={i} className="border-b">
                            <td className="py-2">{rec.symbol}</td>
                            <td className="text-right py-2">{rec.currentAllocation.toFixed(1)}%</td>
                            <td className="text-right py-2">{rec.recommendedAllocation.toFixed(1)}%</td>
                            <td className="py-2">
                              <Badge variant={
                                rec.action === 'increase' ? 'success' : 
                                rec.action === 'decrease' ? 'destructive' : 'secondary'
                              }>
                                {rec.action.charAt(0).toUpperCase() + rec.action.slice(1)}
                              </Badge>
                              <div className="text-xs text-muted-foreground mt-1">{rec.rationale}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-3 bg-destructive/15 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Tabs>
      
      <CardFooter className="flex justify-between border-t pt-5">
        <div className="text-xs text-muted-foreground">
          Powered by LangChain.js and {activeTab === 'strategy' ? 'Trading Strategy AI' : 
                                      activeTab === 'risk' ? 'Risk Assessment AI' : 'Portfolio Optimization AI'}
        </div>
      </CardFooter>
    </Card>
  );
}

export default AIStrategyAdvisor;
