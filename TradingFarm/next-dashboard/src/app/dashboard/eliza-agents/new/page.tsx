'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Bot } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useElizaAgentsWithFallback } from '@/hooks/useElizaAgentsWithFallback';
import { mockFarms } from '@/services/mock-data-service';

/**
 * Simple Standalone ElizaOS Agent Creation Page
 * This page provides a direct way to create ElizaOS agents without
 * relying on complex components that might have auth issues.
 */
export default function NewElizaAgentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const { createAgent, usingMockData } = useElizaAgentsWithFallback();

  // Simple handler for agent creation
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast({
        title: 'Error',
        description: 'Agent name is required',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Use farm ID 1 as default when using mock data
      const agent = await createAgent({
        name,
        description,
        config: {
          agentType: 'elizaos',
          farmId: 1, // Default to first farm
          riskLevel: 'medium',
          strategyType: 'trend_following',
          markets: ['BTC/USD'],
          tools: ['market_analysis', 'news_sentiment'],
          apiAccess: false,
          tradingPermissions: 'read',
          autoRecovery: true,
          initialInstructions: '',
        }
      });
      
      toast({
        title: 'Agent Created',
        description: `${name} has been created successfully.`,
      });
      
      router.push('/dashboard/eliza-agents');
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create agent',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/eliza-agents');
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={handleCancel} 
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
            Create a new AI-powered autonomous trading agent
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
                  placeholder="Enter agent name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  placeholder="Enter agent description (optional)" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
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
