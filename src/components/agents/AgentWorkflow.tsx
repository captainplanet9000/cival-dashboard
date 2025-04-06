import React, { useState, useEffect } from 'react';
import { FarmAgent } from '@/services/farm/farm-service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkflowStep } from '@/services/agent-workflow';
import { WorkflowTemplates } from './WorkflowTemplates';

// Workflow types
export type WorkflowType = 'MARKET_ANALYSIS' | 'TRADE_EXECUTION' | 'RISK_ASSESSMENT' | 'PORTFOLIO_REBALANCE';

// Tool types that can be used by the agent
type ToolType = {
  id: string;
  name: string;
  description: string;
  category: 'EXCHANGE' | 'ANALYTICS' | 'LLM' | 'DEFI';
  isAvailable: boolean;
};

// Available workflow definition
type WorkflowDefinition = {
  id: string;
  name: string;
  type: WorkflowType;
};

interface AgentWorkflowProps {
  agent: FarmAgent;
}

// Error handler function
const handleWorkflowError = (err: any, setError: (error: string | null) => void) => {
  const errorMessage = err?.message || err?.error || String(err);
  console.error('Workflow error:', errorMessage);
  setError(errorMessage || 'An unexpected error occurred');
};

export const AgentWorkflow: React.FC<AgentWorkflowProps> = ({ agent }) => {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [availableTools, setAvailableTools] = useState<ToolType[]>([]);
  const [availableWorkflows, setAvailableWorkflows] = useState<WorkflowDefinition[]>([]);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeInputTab, setActiveInputTab] = useState<'manual' | 'templates'>('manual');

  // Fetch available workflows for this agent
  useEffect(() => {
    const fetchWorkflows = async () => {
      if (!agent.id) return;
      
      setIsLoadingWorkflows(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/agents/${agent.id}/workflows`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch workflows: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data?.workflows) {
          setAvailableWorkflows(data.data.workflows);
        } else {
          throw new Error(data.error || 'Failed to fetch available workflows');
        }
      } catch (err: any) {
        handleWorkflowError(err, setError);
      } finally {
        setIsLoadingWorkflows(false);
      }
    };
    
    fetchWorkflows();
  }, [agent.id]);

  // Initialize available tools based on agent type
  useEffect(() => {
    // In a real implementation, we would fetch the tools from the backend
    // For now, we'll use default tools based on agent type
    const DEFAULT_TOOLS: ToolType[] = [
      { id: 'exchange_data', name: 'Exchange Data', description: 'Fetch data from exchanges', category: 'EXCHANGE', isAvailable: true },
      { id: 'price_analysis', name: 'Price Analysis', description: 'Analyze asset prices', category: 'ANALYTICS', isAvailable: true },
      { id: 'market_sentiment', name: 'Market Sentiment', description: 'Analyze market sentiment', category: 'LLM', isAvailable: true },
      { id: 'trade_execution', name: 'Trade Execution', description: 'Execute trades', category: 'EXCHANGE', isAvailable: true },
      { id: 'defi_swap', name: 'DeFi Swap', description: 'Execute DeFi swaps', category: 'DEFI', isAvailable: true }
    ];
    
    let filteredTools = [...DEFAULT_TOOLS];
    
    if (agent.type?.toUpperCase() === 'ANALYST') {
      filteredTools = DEFAULT_TOOLS.filter(tool => 
        ['ANALYTICS', 'LLM', 'EXCHANGE'].includes(tool.category));
    } else if (agent.type?.toUpperCase() === 'TRADER') {
      filteredTools = DEFAULT_TOOLS.filter(tool => 
        ['EXCHANGE', 'DEFI', 'ANALYTICS'].includes(tool.category));
    } else if (agent.type?.toUpperCase() === 'MONITOR') {
      filteredTools = DEFAULT_TOOLS.filter(tool => 
        ['ANALYTICS', 'LLM'].includes(tool.category));
    }
    
    setAvailableTools(filteredTools);
  }, [agent.type]);

  // Handle workflow selection
  const handleWorkflowChange = (value: string) => {
    setSelectedWorkflowId(value);
    // Reset workflow state
    setWorkflowSteps([]);
    setUserInput('');
    setFinalResult(null);
    setError(null);
  };

  // Handle user input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInput(e.target.value);
  };

  // Handle template selection
  const handleTemplateSelected = (templateId: string, generatedPrompt: string) => {
    // Find corresponding workflow type
    const selectedWorkflow = availableWorkflows.find(w => 
      w.type === generatedPrompt.split(' ')[0] || // Try to match first word to workflow type
      (generatedPrompt.includes('market') && w.type === 'MARKET_ANALYSIS') ||
      (generatedPrompt.includes('trade') && w.type === 'TRADE_EXECUTION') ||
      (generatedPrompt.includes('risk') && w.type === 'RISK_ASSESSMENT') ||
      (generatedPrompt.includes('portfolio') && w.type === 'PORTFOLIO_REBALANCE')
    );
    
    if (selectedWorkflow) {
      setSelectedWorkflowId(selectedWorkflow.id);
    }
    
    setUserInput(generatedPrompt);
    setActiveInputTab('manual'); // Switch back to manual tab to show the generated prompt
  };

  // Execute the selected workflow
  const executeWorkflow = async () => {
    if (!selectedWorkflowId || !userInput.trim() || !agent.id) {
      setError('Please select a workflow and provide input');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setWorkflowSteps([]);
    setFinalResult(null);

    try {
      // Get the selected workflow type
      const selectedWorkflow = availableWorkflows.find(w => w.id === selectedWorkflowId);
      
      if (!selectedWorkflow) {
        throw new Error('Invalid workflow selected');
      }
      
      // Make API call to execute the workflow
      const response = await fetch(`/api/agents/${agent.id}/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowId: selectedWorkflowId,
          workflowType: selectedWorkflow.type,
          input: userInput
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to execute workflow' }));
        throw new Error(errorData.error || `Failed to execute workflow (${response.status})`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setWorkflowSteps(result.data.steps);
        setFinalResult(result.data.finalResult);
      } else {
        throw new Error(result.error || 'Failed to execute workflow');
      }
    } catch (err: any) {
      handleWorkflowError(err, setError);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Agent Workflows</CardTitle>
        <CardDescription>
          Execute predefined workflows for your {agent.type} agent
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workflow">Select Workflow</Label>
          {isLoadingWorkflows ? (
            <div className="flex items-center space-x-2">
              <Spinner className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">Loading workflows...</span>
            </div>
          ) : (
            <Select 
              value={selectedWorkflowId} 
              onValueChange={handleWorkflowChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a workflow..." />
              </SelectTrigger>
              <SelectContent>
                {availableWorkflows.map(workflow => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <Tabs value={activeInputTab} onValueChange={value => setActiveInputTab(value as 'manual' | 'templates')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Input</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-2">
            <Label htmlFor="input">Workflow Input</Label>
            <Textarea
              id="input"
              value={userInput}
              onChange={handleInputChange}
              placeholder="Enter parameters, target assets, or instructions..."
              className="min-h-[100px]"
              disabled={isExecuting || !selectedWorkflowId}
            />
          </TabsContent>
          
          <TabsContent value="templates">
            <WorkflowTemplates 
              agent={agent} 
              onSelectTemplate={handleTemplateSelected}
            />
          </TabsContent>
        </Tabs>
        
        {error && (
          <div className="text-sm font-medium text-destructive mt-2">
            {error}
          </div>
        )}
        
        {workflowSteps.length > 0 && (
          <div className="space-y-2 mt-4">
            <Label>Workflow Progress</Label>
            <ScrollArea className="h-[240px] border rounded-md p-4">
              <div className="space-y-4">
                {workflowSteps.map(step => (
                  <div key={step.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          step.status === 'COMPLETED' ? 'default' : 
                          step.status === 'RUNNING' ? 'outline' :
                          step.status === 'FAILED' ? 'destructive' : 
                          'secondary'
                        }
                      >
                        {step.order}. {step.status}
                      </Badge>
                      <span className="font-medium">{step.description}</span>
                      {step.status === 'RUNNING' && <Spinner className="h-4 w-4 ml-2" />}
                      {step.toolUsed && (
                        <Badge variant="outline" className="ml-auto">
                          Tool: {availableTools.find(t => t.id === step.toolUsed)?.name || step.toolUsed}
                        </Badge>
                      )}
                    </div>
                    
                    {step.result && (
                      <div className="ml-6 p-2 bg-muted rounded text-sm">
                        {step.result}
                      </div>
                    )}
                    
                    {step.error && (
                      <div className="ml-6 p-2 bg-destructive/10 text-destructive rounded text-sm">
                        {step.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        
        {finalResult && (
          <div className="space-y-2 mt-4">
            <Label>Final Result</Label>
            <div className="p-4 border rounded-md bg-muted/50">
              <p className="text-sm">{finalResult}</p>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Available Tools: </span>
          {availableTools.slice(0, 3).map(tool => (
            <Badge key={tool.id} variant="outline" className="text-xs">
              {tool.name}
            </Badge>
          ))}
          {availableTools.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{availableTools.length - 3} more
            </Badge>
          )}
        </div>
        
        <Button 
          onClick={executeWorkflow} 
          disabled={isExecuting || !selectedWorkflowId || !userInput.trim()}
        >
          {isExecuting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Executing...
            </>
          ) : (
            'Execute Workflow'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}; 