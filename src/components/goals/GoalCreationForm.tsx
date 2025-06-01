'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { CalendarIcon, Target } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { createBrowserClient } from '@/utils/supabase/client';
import { CreateGoalRequest, ExtendedGoal, GoalType, MetricCalculation } from '@/types/goals';
import { format } from 'date-fns';

interface GoalCreationFormProps {
  onGoalCreated: (goal: ExtendedGoal) => void;
  initialValues?: Partial<CreateGoalRequest>;
  farmId?: string;
  agentId?: string;
}

export default function GoalCreationForm({ 
  onGoalCreated, 
  initialValues = {}, 
  farmId, 
  agentId 
}: GoalCreationFormProps) {
  // State for form fields
  const [formData, setFormData] = useState<CreateGoalRequest>({
    name: initialValues.name || '',
    description: initialValues.description || '',
    target_value: initialValues.target_value || 0,
    start_date: initialValues.start_date || new Date().toISOString(),
    target_date: initialValues.target_date || '',
    goal_type: initialValues.goal_type || 'profit',
    metric_calculation: initialValues.metric_calculation || 'absolute',
    farm_id: farmId || initialValues.farm_id || '',
    agent_id: agentId || initialValues.agent_id || '',
    parent_goal_id: initialValues.parent_goal_id || '',
    metadata: initialValues.metadata || {},
  });

  // Loading and error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [farms, setFarms] = useState<{ id: string; name: string }[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [parentGoals, setParentGoals] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const { toast } = useToast();

  // Load farms, agents, and parent goals
  useEffect(() => {
    const fetchOptions = async () => {
      setIsLoadingOptions(true);
      try {
        const supabase = createBrowserClient();
        
        // Fetch farms
        const { data: farmsData, error: farmsError } = await supabase
          .from('farms')
          .select('id, name')
          .order('name');
        
        if (farmsError) throw farmsError;
        setFarms(farmsData || []);
        
        // Fetch agents
        const { data: agentsData, error: agentsError } = await supabase
          .from('agents')
          .select('id, name')
          .order('name');
        
        if (agentsError) throw agentsError;
        setAgents(agentsData || []);
        
        // Fetch parent goals
        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select('id, name')
          .is('parent_goal_id', null)
          .eq('archived', false)
          .order('name');
        
        if (goalsError) throw goalsError;
        setParentGoals(goalsData || []);
      } catch (error) {
        console.error('Error fetching options:', error);
        toast({
          title: 'Error',
          description: 'Failed to load form options. Some selections may be unavailable.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingOptions(false);
      }
    };
    
    fetchOptions();
  }, [toast]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name: string, date: Date | null) => {
    setFormData((prev) => ({ 
      ...prev, 
      [name]: date ? date.toISOString() : '' 
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Make sure we have either farm_id or agent_id
      if (!formData.farm_id && !formData.agent_id && !formData.parent_goal_id) {
        throw new Error('A goal must be associated with a farm, agent, or parent goal');
      }

      // Submit to API
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create goal');
      }

      const createdGoal = await response.json();
      
      // Clear form
      setFormData({
        name: '',
        description: '',
        target_value: 0,
        start_date: new Date().toISOString(),
        target_date: '',
        goal_type: 'profit',
        metric_calculation: 'absolute',
        farm_id: farmId || '',
        agent_id: agentId || '',
        parent_goal_id: '',
        metadata: {},
      });
      
      toast({
        title: 'Goal Created',
        description: 'New goal has been created successfully.',
      });
      
      // Notify parent component
      onGoalCreated(createdGoal);
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create goal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="mr-2 h-5 w-5" />
          Create New Goal
        </CardTitle>
        <CardDescription>
          Define a new trading objective for your farm or agent
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Goal Name*</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Monthly Profit Target"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the purpose and strategy for this goal"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal_type">Goal Type*</Label>
                <Select 
                  value={formData.goal_type} 
                  onValueChange={(value) => handleSelectChange('goal_type', value)}
                  required
                >
                  <SelectTrigger id="goal_type">
                    <SelectValue placeholder="Select goal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profit">Profit Target</SelectItem>
                    <SelectItem value="roi">ROI</SelectItem>
                    <SelectItem value="trade_count">Trade Count</SelectItem>
                    <SelectItem value="win_rate">Win Rate</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="metric_calculation">Calculation Method</Label>
                <Select 
                  value={formData.metric_calculation} 
                  onValueChange={(value) => handleSelectChange('metric_calculation', value)}
                >
                  <SelectTrigger id="metric_calculation">
                    <SelectValue placeholder="Select calculation method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="absolute">Absolute Value</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="ratio">Ratio</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="target_value">Target Value*</Label>
              <Input
                id="target_value"
                name="target_value"
                type="number"
                value={formData.target_value.toString()}
                onChange={handleNumberChange}
                placeholder="e.g., 5000 for profit or 10 for trade count"
                required
                step="any"
              />
              <p className="text-sm text-muted-foreground">
                Set your target value. For percentages, use decimal form (e.g., 0.05 for 5%).
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <div className="relative">
                  <DatePicker
                    selected={formData.start_date ? new Date(formData.start_date) : undefined}
                    onSelect={(date) => handleDateChange('start_date', date)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="target_date">Target Date</Label>
                <div className="relative">
                  <DatePicker
                    selected={formData.target_date ? new Date(formData.target_date) : undefined}
                    onSelect={(date) => handleDateChange('target_date', date)}
                  />
                </div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <h3 className="text-md font-medium">Association</h3>
              <p className="text-sm text-muted-foreground">
                Connect this goal to a farm, agent, or make it a sub-goal
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="farm_id">Farm</Label>
                  <Select 
                    value={formData.farm_id} 
                    onValueChange={(value) => handleSelectChange('farm_id', value)}
                    disabled={isLoadingOptions || !!formData.agent_id || !!formData.parent_goal_id}
                  >
                    <SelectTrigger id="farm_id">
                      <SelectValue placeholder="Select a farm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Farm</SelectItem>
                      {farms.map((farm) => (
                        <SelectItem key={farm.id} value={farm.id}>
                          {farm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="agent_id">Agent</Label>
                  <Select 
                    value={formData.agent_id} 
                    onValueChange={(value) => handleSelectChange('agent_id', value)}
                    disabled={isLoadingOptions || !!formData.farm_id || !!formData.parent_goal_id}
                  >
                    <SelectTrigger id="agent_id">
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Agent</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="parent_goal_id">Parent Goal</Label>
                <Select 
                  value={formData.parent_goal_id} 
                  onValueChange={(value) => handleSelectChange('parent_goal_id', value)}
                  disabled={isLoadingOptions || !!formData.farm_id || !!formData.agent_id}
                >
                  <SelectTrigger id="parent_goal_id">
                    <SelectValue placeholder="Make this a sub-goal of..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Parent Goal (Top-Level)</SelectItem>
                    {parentGoals.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <CardFooter className="px-0 pt-4 pb-0 flex justify-end space-x-2">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              variant="default"
            >
              {isSubmitting ? 'Creating...' : 'Create Goal'}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
} 