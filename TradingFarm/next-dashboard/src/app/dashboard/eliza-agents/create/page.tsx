'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Bot, Loader2 } from 'lucide-react';
import { useElizaAgentManager } from '@/hooks/useElizaAgentManager';
import { mockFarms, mockMarkets } from '@/services/mock-data-service';

/**
 * Simple Agent Creator Page
 * This is a standalone page for creating ElizaOS agents with minimal dependencies
 */
export default function SimpleElizaAgentCreator() {
  const router = useRouter();
  const { createAgent, usingMockData } = useElizaAgentManager();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [farmId, setFarmId] = React.useState(1);
  const [strategyType, setStrategyType] = React.useState('trend_following');
  const [markets, setMarkets] = React.useState<string[]>(['BTC/USD']);
  
  // Handle agent creation
  // Handle form submission using our comprehensive hook
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      toast({
        title: 'Error',
        description: 'Please enter a name for your agent',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create agent using our comprehensive hook
      const agent = await createAgent({
        name,
        description: description || '',
        config: {
          agentType: 'elizaos',
          farmId,
          riskLevel: 'medium',
          strategyType,
          markets,
          tools: ['market_analysis', 'news_sentiment'],
          apiAccess: false,
          tradingPermissions: 'read',
          autoRecovery: true,
          initialInstructions: '',
        }
      });
      
      toast({
        title: 'Success!',
        description: `Agent "${name}" has been created successfully`,
      });
      
      // Navigate back to agents page
      router.push('/dashboard/eliza-agents');
      
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create agent',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/eliza-agents')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Agents
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Create ElizaOS Agent
          </CardTitle>
          <CardDescription>
            Create a new AI-powered agent with default configurations
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {usingMockData && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <h3 className="font-medium text-amber-800">Demo Mode Active</h3>
              <p className="text-sm text-amber-700 mt-1">
                Using example data because you're not authenticated or the server connection failed.
                The agent will be saved to temporary storage only.
              </p>
            </div>
          )}
          
          <form onSubmit={handleCreateAgent} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  placeholder="Enter a name for your agent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="What will this agent do?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="farm">Trading Farm</Label>
                <Select value={farmId.toString()} onValueChange={(value) => setFarmId(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a farm" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockFarms.map(farm => (
                      <SelectItem key={farm.id} value={farm.id.toString()}>
                        {farm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="strategy">Strategy Type</Label>
                <Select value={strategyType} onValueChange={setStrategyType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trend_following">Trend Following</SelectItem>
                    <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                    <SelectItem value="momentum">Momentum</SelectItem>
                    <SelectItem value="breakout">Breakout</SelectItem>
                    <SelectItem value="market_making">Market Making</SelectItem>
                    <SelectItem value="arbitrage">Arbitrage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="markets">Markets</Label>
                <Select 
                  value={markets[0]} 
                  onValueChange={(value) => setMarkets([value])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a market" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockMarkets.map(market => (
                      <SelectItem key={market.symbol} value={market.symbol}>
                        {market.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/eliza-agents')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Agent'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
