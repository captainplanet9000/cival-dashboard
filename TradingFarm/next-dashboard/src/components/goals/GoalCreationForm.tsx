/**
 * Goal Creation Form Component
 * Allows users to create new trading goals for ElizaOS agents
 */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertCircle, Target, CalendarClock, TrendingUp, BarChart, 
  Brain, Bot, Briefcase, Wallet, ChevronRight
} from 'lucide-react';
import { farmCoordinationService } from '@/services/farm-coordination-service';
import { acquisitionGoalService } from '@/services/acquisition-goal-service';
import { agentService } from '@/services/agent-service';

interface GoalCreationFormProps {
  farmId?: string;
  onGoalCreated?: (goalId: string) => void;
}

export function GoalCreationForm({ farmId, onGoalCreated }: GoalCreationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  // Form states for all goal types
  const [goalType, setGoalType] = useState<'acquisition' | 'profit' | 'portfolio' | 'risk_management' | 'custom'>('acquisition');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [useElizaOS, setUseElizaOS] = useState(true);
  
  // Acquisition goal specific states
  const [targetAsset, setTargetAsset] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetMinPrice, setTargetMinPrice] = useState('');
  const [targetMaxPrice, setTargetMaxPrice] = useState('');
  const [timelineDays, setTimelineDays] = useState('');
  const [sourceAssets, setSourceAssets] = useState<string[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState('');
  
  // State for agent selection
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  
  // Other states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [assets, setAssets] = useState([
    'BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'BNB', 'XRP', 'ADA', 'AVAX', 'DOGE'
  ]);

  // Load agents for farm
  useEffect(() => {
    if (farmId) {
      loadAgents();
      loadStrategies();
    }
  }, [farmId]);

  const loadAgents = async () => {
    try {
      const response = await agentService.getElizaAgents();
      if (response.success && response.data) {
        // Filter for active agents only
        const activeAgents = response.data.filter(agent => 
          agent.status === 'active' || agent.status === 'inactive'
        );
        setAvailableAgents(activeAgents);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadStrategies = async () => {
    try {
      // This would be replaced with actual strategy loading
      // For now we'll use mock data
      setStrategies([
        { id: 'dca', name: 'Dollar Cost Averaging' },
        { id: 'limit', name: 'Limit Order Strategy' },
        { id: 'grid', name: 'Grid Trading' },
        { id: 'ai-adaptive', name: 'AI Adaptive Trading' },
      ]);
    } catch (error) {
      console.error('Error loading strategies:', error);
    }
  };

  const handleAssetToggle = (asset: string) => {
    if (sourceAssets.includes(asset)) {
      setSourceAssets(sourceAssets.filter(a => a !== asset));
    } else {
      setSourceAssets([...sourceAssets, asset]);
    }
  };

  const handleAgentToggle = (agentId: string) => {
    if (selectedAgentIds.includes(agentId)) {
      setSelectedAgentIds(selectedAgentIds.filter(id => id !== agentId));
    } else {
      setSelectedAgentIds([...selectedAgentIds, agentId]);
    }
  };

  const validateForm = () => {
    setError(null);

    if (!name.trim()) {
      setError('Goal name is required');
      return false;
    }

    if (goalType === 'acquisition') {
      if (!targetAsset) {
        setError('Target asset is required');
        return false;
      }
      if (!targetAmount || isNaN(Number(targetAmount)) || Number(targetAmount) <= 0) {
        setError('Valid target amount is required');
        return false;
      }
      if (targetMinPrice && (isNaN(Number(targetMinPrice)) || Number(targetMinPrice) < 0)) {
        setError('Min price must be a valid number');
        return false;
      }
      if (targetMaxPrice && (isNaN(Number(targetMaxPrice)) || Number(targetMaxPrice) < 0)) {
        setError('Max price must be a valid number');
        return false;
      }
      if (targetMinPrice && targetMaxPrice && Number(targetMinPrice) > Number(targetMaxPrice)) {
        setError('Min price cannot be greater than max price');
        return false;
      }
      if (timelineDays && (isNaN(Number(timelineDays)) || Number(timelineDays) <= 0)) {
        setError('Timeline days must be a valid positive number');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create acquisition goal
      if (goalType === 'acquisition') {
        const response = await acquisitionGoalService.createAcquisitionGoal({
          name,
          description,
          targetAsset,
          targetAmount: Number(targetAmount),
          targetPriceRange: targetMinPrice || targetMaxPrice ? {
            min: targetMinPrice ? Number(targetMinPrice) : undefined,
            max: targetMaxPrice ? Number(targetMaxPrice) : undefined
          } : undefined,
          timelineDays: timelineDays ? Number(timelineDays) : undefined,
          sourceAssets: sourceAssets.length > 0 ? sourceAssets : undefined,
          strategyId: selectedStrategy || undefined,
          priority,
          farmId: farmId || undefined,
          executionParameters: {
            useElizaOS,
            selectedAgentIds
          }
        });

        if (response.success && response.data) {
          toast({
            title: 'Goal Created',
            description: 'Your trading goal has been created successfully',
          });
          
          // If agents were selected, assign them to the goal
          if (selectedAgentIds.length > 0) {
            const goalId = response.data.tradingGoal.id;
            
            // Assign agents to goal steps (first agent to first step, etc.)
            const { data: goal } = await acquisitionGoalService.getAcquisitionGoal(goalId);
            
            if (goal && goal.steps) {
              for (let i = 0; i < Math.min(selectedAgentIds.length, goal.steps.length); i++) {
                await acquisitionGoalService.assignAgentToStep(goal.steps[i].id, selectedAgentIds[i]);
              }
            }
          }
          
          // Call the callback if provided
          if (onGoalCreated) {
            onGoalCreated(response.data.tradingGoal.id);
          } else {
            // Navigate to the goal detail page
            router.push(`/goals/${response.data.tradingGoal.id}`);
          }
        } else {
          setError(response.error || 'Failed to create goal');
          toast({
            variant: 'destructive',
            title: 'Error',
            description: response.error || 'Failed to create goal',
          });
        }
      }
      // Other goal types would be handled here
    } catch (error: any) {
      console.error('Error creating goal:', error);
      setError(error.message || 'An unexpected error occurred');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Trading Goal</CardTitle>
          <CardDescription>
            Define a trading objective for your ElizaOS agents to achieve
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goalType">Goal Type</Label>
                <Select
                  value={goalType}
                  onValueChange={(value: any) => setGoalType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acquisition">Asset Acquisition</SelectItem>
                    <SelectItem value="profit">Profit Target</SelectItem>
                    <SelectItem value="portfolio">Portfolio Optimization</SelectItem>
                    <SelectItem value="risk_management">Risk Management</SelectItem>
                    <SelectItem value="custom">Custom Goal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Goal Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter goal name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the goal objectives"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(value: any) => setPriority(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="useElizaOS"
                    checked={useElizaOS}
                    onCheckedChange={setUseElizaOS}
                  />
                  <Label htmlFor="useElizaOS" className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Use ElizaOS AI Agents
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {goalType === 'acquisition' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Acquisition Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetAsset">Target Asset</Label>
                    <Select
                      value={targetAsset}
                      onValueChange={setTargetAsset}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset" />
                      </SelectTrigger>
                      <SelectContent>
                        {assets.map((asset) => (
                          <SelectItem key={asset} value={asset}>
                            {asset}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetAmount">Target Amount</Label>
                    <Input
                      id="targetAmount"
                      placeholder="Amount to acquire"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      type="number"
                      step="any"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetMinPrice">Target Price Range (Optional)</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          id="targetMinPrice"
                          placeholder="Min price"
                          value={targetMinPrice}
                          onChange={(e) => setTargetMinPrice(e.target.value)}
                          type="number"
                          step="any"
                          min="0"
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          id="targetMaxPrice"
                          placeholder="Max price"
                          value={targetMaxPrice}
                          onChange={(e) => setTargetMaxPrice(e.target.value)}
                          type="number"
                          step="any"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timelineDays">Timeline (Days)</Label>
                    <Input
                      id="timelineDays"
                      placeholder="Number of days"
                      value={timelineDays}
                      onChange={(e) => setTimelineDays(e.target.value)}
                      type="number"
                      min="1"
                      step="1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Source Assets (Optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {assets.map((asset) => (
                      <Button
                        key={asset}
                        type="button"
                        variant={sourceAssets.includes(asset) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleAssetToggle(asset)}
                      >
                        {asset}
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select assets that can be used to acquire the target
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strategy">Trading Strategy (Optional)</Label>
                  <Select
                    value={selectedStrategy}
                    onValueChange={setSelectedStrategy}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-strategy">No Specific Strategy</SelectItem>
                      {strategies.map((strategy) => (
                        <SelectItem key={strategy.id} value={strategy.id}>
                          {strategy.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {useElizaOS && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Agent Assignment (Optional)</Label>
                      <Dialog open={isAgentDialogOpen} onOpenChange={setIsAgentDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            <span>Select Agents</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Select ElizaOS Agents</DialogTitle>
                            <DialogDescription>
                              Choose agents to assign to this goal
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="py-4">
                            <div className="space-y-4 max-h-[400px] overflow-y-auto">
                              {availableAgents.length === 0 ? (
                                <div className="text-center p-4 border rounded-md">
                                  <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                  <p className="text-muted-foreground">No agents available</p>
                                </div>
                              ) : (
                                availableAgents.map((agent) => (
                                  <div 
                                    key={agent.id}
                                    className={`p-3 border rounded-md flex items-center gap-3 cursor-pointer hover:bg-accent/50 ${
                                      selectedAgentIds.includes(agent.id) ? 'bg-primary/10 border-primary/30' : ''
                                    }`}
                                    onClick={() => handleAgentToggle(agent.id)}
                                  >
                                    <div className={`h-2 w-2 rounded-full ${
                                      agent.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                                    }`} />
                                    <div className="flex-1">
                                      <p className="font-medium">{agent.name}</p>
                                      <p className="text-sm text-muted-foreground line-clamp-1">
                                        {agent.description || `ElizaOS ${agent.model} Agent`}
                                      </p>
                                    </div>
                                    <input 
                                      type="checkbox" 
                                      checked={selectedAgentIds.includes(agent.id)}
                                      onChange={() => {}}
                                      className="h-4 w-4"
                                    />
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                          
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAgentDialogOpen(false)}>
                              Done
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    {selectedAgentIds.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedAgentIds.map((agentId, index) => {
                          const agent = availableAgents.find(a => a.id === agentId);
                          return agent ? (
                            <div key={agentId} className="flex items-center gap-1 p-1 pl-2 bg-primary/10 rounded-md">
                              <span className="text-sm">{agent.name}</span>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-5 w-5 rounded-full"
                                onClick={() => handleAgentToggle(agentId)}
                              >
                                <AlertCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No agents selected. ElizaOS will auto-assign agents if available.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex gap-2 items-center"
          >
            {isSubmitting ? 'Creating...' : 'Create Goal'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
