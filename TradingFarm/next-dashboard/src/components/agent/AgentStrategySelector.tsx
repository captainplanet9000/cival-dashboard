'use client';

import * as React from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useStrategies } from '@/hooks/use-strategies';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrainCircuit, Zap, AlertTriangle, Settings, TrendingUp, LineChart, Percent, BookOpen } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface AgentStrategyProps {
  agentId: string;
  farmId: string;
  onStrategyAssigned?: (strategyId: string, agentId: string) => void;
}

interface AgentStrategyAssignment {
  id: string;
  agent_id: string;
  strategy_id: string;
  status: 'active' | 'paused' | 'draft';
  created_at: string;
  updated_at: string;
  parameters?: Record<string, any>;
}

export function AgentStrategySelector({ agentId, farmId, onStrategyAssigned }: AgentStrategyProps) {
  const [agent, setAgent] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [assigning, setAssigning] = React.useState(false);
  const [selectedStrategy, setSelectedStrategy] = React.useState<string>('');
  const [assignment, setAssignment] = React.useState<AgentStrategyAssignment | null>(null);
  const [parameters, setParameters] = React.useState<Record<string, any>>({
    maxPositionSize: 10,
    stopLossPercent: 2,
    takeProfitPercent: 5,
    useTrailingStop: false,
    riskLevel: 'medium'
  });
  
  const { strategies, loading: loadingStrategies } = useStrategies({ farmId });
  const { toast } = useToast();

  // Fetch agent and its current strategy assignment
  React.useEffect(() => {
    const fetchAgentData = async () => {
      try {
        setLoading(true);
        const supabase = createBrowserClient();
        
        // Fetch agent details
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('*')
          .eq('id', agentId)
          .single();
          
        if (agentError) throw agentError;
        setAgent(agentData);
        
        // Fetch current strategy assignment if any
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('agent_strategy_assignments')
          .select('*')
          .eq('agent_id', agentId)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (assignmentError) throw assignmentError;
        
        if (assignmentData && assignmentData.length > 0) {
          setAssignment(assignmentData[0]);
          setSelectedStrategy(assignmentData[0].strategy_id);
          
          // Load saved parameters if available
          if (assignmentData[0].parameters) {
            setParameters(assignmentData[0].parameters);
          }
        }
      } catch (error) {
        console.error('Error fetching agent data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load agent data.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (agentId) {
      fetchAgentData();
    }
  }, [agentId, farmId]);

  // Handle strategy assignment
  const handleAssignStrategy = async () => {
    if (!selectedStrategy) {
      toast({
        title: 'Selection Required',
        description: 'Please select a strategy first.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setAssigning(true);
      const supabase = createBrowserClient();
      
      const newAssignment = {
        agent_id: agentId,
        strategy_id: selectedStrategy,
        status: 'active' as const,
        parameters
      };
      
      const { data, error } = await supabase
        .from('agent_strategy_assignments')
        .upsert([newAssignment])
        .select()
        .single();
        
      if (error) throw error;
      
      setAssignment(data);
      
      toast({
        title: 'Strategy Assigned',
        description: 'The strategy has been successfully assigned to this agent.',
        variant: 'default'
      });
      
      if (onStrategyAssigned) {
        onStrategyAssigned(selectedStrategy, agentId);
      }
    } catch (error) {
      console.error('Error assigning strategy:', error);
      toast({
        title: 'Assignment Failed',
        description: 'Failed to assign strategy to agent.',
        variant: 'destructive'
      });
    } finally {
      setAssigning(false);
    }
  };

  // Render strategy selection form
  const renderStrategyForm = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="strategy">Trading Strategy</Label>
          <Select
            value={selectedStrategy}
            onValueChange={setSelectedStrategy}
            disabled={loadingStrategies}
          >
            <SelectTrigger id="strategy" className="w-full">
              <SelectValue placeholder="Select a strategy" />
            </SelectTrigger>
            <SelectContent>
              {strategies.map((strategy) => (
                <SelectItem key={strategy.id} value={strategy.id}>
                  <div className="flex items-center">
                    <span>{strategy.name}</span>
                    <Badge className="ml-2" variant={strategy.status === 'active' ? 'default' : 'outline'}>
                      {strategy.type}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedStrategy && (
          <>
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Strategy Parameters</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxPositionSize">Max Position Size (%)</Label>
                  <Select
                    value={parameters.maxPositionSize.toString()}
                    onValueChange={(value: string) => setParameters({...parameters, maxPositionSize: parseInt(value)})}
                  >
                    <SelectTrigger id="maxPositionSize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="25">25%</SelectItem>
                      <SelectItem value="50">50%</SelectItem>
                      <SelectItem value="100">100%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stopLoss">Stop Loss (%)</Label>
                  <Select
                    value={parameters.stopLossPercent.toString()}
                    onValueChange={(value: string) => setParameters({...parameters, stopLossPercent: parseFloat(value)})}
                  >
                    <SelectTrigger id="stopLoss">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1%</SelectItem>
                      <SelectItem value="2">2%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="takeProfit">Take Profit (%)</Label>
                  <Select
                    value={parameters.takeProfitPercent.toString()}
                    onValueChange={(value: string) => setParameters({...parameters, takeProfitPercent: parseFloat(value)})}
                  >
                    <SelectTrigger id="takeProfit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="riskLevel">Risk Level</Label>
                  <Select
                    value={parameters.riskLevel}
                    onValueChange={(value: string) => setParameters({...parameters, riskLevel: value})}
                  >
                    <SelectTrigger id="riskLevel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="trailingStop"
                  checked={parameters.useTrailingStop}
                  onCheckedChange={(checked) => setParameters({...parameters, useTrailingStop: checked})}
                />
                <Label htmlFor="trailingStop">Use trailing stop loss</Label>
              </div>
            </div>
            
            <Button
              onClick={handleAssignStrategy}
              disabled={assigning}
              className="w-full"
            >
              {assigning ? 'Assigning...' : 'Assign Strategy to Agent'}
            </Button>
          </>
        )}
      </div>
    );
  };

  // Render the current strategy assignment details
  const renderCurrentStrategy = () => {
    if (!assignment) {
      return (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <AlertTriangle className="h-10 w-10 text-yellow-500 mb-2" />
          <h3 className="font-medium">No Strategy Assigned</h3>
          <p className="text-sm text-muted-foreground mt-1">
            This agent doesn't have any trading strategy assigned yet.
          </p>
        </div>
      );
    }
    
    const strategy = strategies.find(s => s.id === assignment.strategy_id);
    
    if (!strategy) {
      return (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <AlertTriangle className="h-10 w-10 text-red-500 mb-2" />
          <h3 className="font-medium">Strategy Not Found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            The assigned strategy could not be found.
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Badge className="mr-2" variant={strategy.status === 'active' ? 'default' : 'outline'}>
              {strategy.type}
            </Badge>
            <h3 className="font-medium">{strategy.name}</h3>
          </div>
          <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'}>
            {assignment.status}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground">{strategy.description}</p>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="border rounded-md p-3">
            <div className="text-sm font-medium mb-1">Position Size</div>
            <div className="text-2xl font-bold">{assignment.parameters?.maxPositionSize || 10}%</div>
          </div>
          
          <div className="border rounded-md p-3">
            <div className="text-sm font-medium mb-1">Risk Level</div>
            <div className="text-2xl font-bold capitalize">{assignment.parameters?.riskLevel || 'Medium'}</div>
          </div>
          
          <div className="border rounded-md p-3">
            <div className="text-sm font-medium mb-1">Stop Loss</div>
            <div className="text-2xl font-bold">{assignment.parameters?.stopLossPercent || 2}%</div>
          </div>
          
          <div className="border rounded-md p-3">
            <div className="text-sm font-medium mb-1">Take Profit</div>
            <div className="text-2xl font-bold">{assignment.parameters?.takeProfitPercent || 5}%</div>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => setSelectedStrategy(assignment.strategy_id)}
            className="w-full"
          >
            <Settings className="mr-2 h-4 w-4" />
            Modify Strategy Parameters
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BrainCircuit className="h-5 w-5" />
          <span>Agent Trading Strategy</span>
        </CardTitle>
        <CardDescription>
          Assign and configure trading strategies for this agent
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin mr-2">
              <Zap className="h-5 w-5" />
            </div>
            <span>Loading agent data...</span>
          </div>
        ) : (
          <Tabs defaultValue={assignment ? "current" : "assign"}>
            <TabsList className="w-full">
              <TabsTrigger value="current">Current Strategy</TabsTrigger>
              <TabsTrigger value="assign">Assign Strategy</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="current" className="mt-4 space-y-4">
              {renderCurrentStrategy()}
            </TabsContent>
            
            <TabsContent value="assign" className="mt-4">
              {renderStrategyForm()}
            </TabsContent>
            
            <TabsContent value="performance" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Strategy Performance</h3>
                  <Badge variant="outline">Last 30 days</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-md p-3">
                    <div className="flex items-center text-sm font-medium mb-1">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      <span>Win Rate</span>
                    </div>
                    <div className="text-2xl font-bold">68%</div>
                  </div>
                  
                  <div className="border rounded-md p-3">
                    <div className="flex items-center text-sm font-medium mb-1">
                      <Percent className="h-4 w-4 mr-1" />
                      <span>Profit/Loss</span>
                    </div>
                    <div className="text-2xl font-bold text-green-500">+12.4%</div>
                  </div>
                  
                  <div className="border rounded-md p-3">
                    <div className="flex items-center text-sm font-medium mb-1">
                      <BookOpen className="h-4 w-4 mr-1" />
                      <span>Total Trades</span>
                    </div>
                    <div className="text-2xl font-bold">47</div>
                  </div>
                  
                  <div className="border rounded-md p-3">
                    <div className="flex items-center text-sm font-medium mb-1">
                      <LineChart className="h-4 w-4 mr-1" />
                      <span>Sharpe Ratio</span>
                    </div>
                    <div className="text-2xl font-bold">1.8</div>
                  </div>
                </div>
                
                <div className="mt-4 bg-muted rounded-md p-4">
                  <p className="text-sm text-muted-foreground">
                    Strategy performance data is simulated. Historical performance is not indicative of future results.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
