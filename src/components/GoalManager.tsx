import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Label } from './ui/label';
import { DatePicker } from './ui/date-picker';
import { ChevronRight, Plus, Target, CheckCircle2, Clock, Ban, Calendar, ArrowUpDown } from 'lucide-react';
import { api, handleApiError } from '@/lib/api';
import { Goal, GoalTemplate } from '@/types';

interface GoalManagerProps {
  farmId: string;
}

const GOAL_TYPES = [
  { value: 'profit', label: 'Profit Target' },
  { value: 'dca', label: 'Dollar Cost Average' },
  { value: 'rebalance', label: 'Portfolio Rebalance' },
  { value: 'risk_management', label: 'Risk Management' }
];

const GOAL_PRIORITIES = [
  { value: 0, label: 'Low' },
  { value: 5, label: 'Medium' },
  { value: 10, label: 'High' }
];

export function GoalManager({ farmId }: GoalManagerProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalTemplates, setGoalTemplates] = useState<GoalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('goals');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goal_type: '',
    target_value: '',
    target_asset: '',
    priority: 5,
    start_date: null as Date | null,
    end_date: null as Date | null,
    parameters: {}
  });

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    // Reset form when template changes
    if (selectedTemplate) {
      const template = goalTemplates.find(t => t.id === selectedTemplate);
      if (template) {
        setFormData({
          ...formData,
          name: template.name,
          description: template.description || '',
          goal_type: template.goal_type,
          parameters: template.parameters
        });
      }
    }
  }, [selectedTemplate, goalTemplates]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch goals and templates in parallel
        const [goalsData, templatesData] = await Promise.all([
          api.goals.getFarmGoals(farmId),
          api.goals.getTemplates()
        ]);
        
        setGoals(goalsData);
        setGoalTemplates(templatesData);
        setError(null);
        setLoading(false);
      } catch (error) {
        handleApiError(error, setError);
        setLoading(false);
      }
    };

    if (farmId) {
      fetchData();
    }
  }, [farmId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleDateChange = (name: string, date: Date | null) => {
    setFormData({
      ...formData,
      [name]: date
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      // Prepare data for API
      const goalData = {
        farm_id: farmId,
        template_id: selectedTemplate,
        name: formData.name,
        description: formData.description,
        goal_type: formData.goal_type,
        target_value: formData.target_value ? parseFloat(formData.target_value) : null,
        target_asset: formData.target_asset || null,
        priority: formData.priority,
        start_date: formData.start_date ? formData.start_date.toISOString() : null,
        end_date: formData.end_date ? formData.end_date.toISOString() : null,
        parameters: formData.parameters
      };
      
      // Create goal
      const newGoal = await api.goals.create(goalData);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        goal_type: '',
        target_value: '',
        target_asset: '',
        priority: 5,
        start_date: null,
        end_date: null,
        parameters: {}
      });
      setSelectedTemplate(null);
      
      // Add new goal to the list
      setGoals([newGoal, ...goals]);
      
      // Switch to goals tab
      setActiveTab('goals');
    } catch (error) {
      handleApiError(error, setError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoalClick = (goalId: string) => {
    router.push(`/farms/${farmId}/goals/${goalId}`);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'success';
      case 'failed':
        return 'destructive';
      case 'paused':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 mr-1" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 mr-1" />;
      case 'failed':
        return <Ban className="h-4 w-4 mr-1" />;
      case 'paused':
        return <Clock className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  const getFilteredGoals = () => {
    return goals.filter(goal => {
      const matchesStatus = statusFilter === 'all' || goal.status === statusFilter;
      const matchesType = typeFilter === 'all' || goal.goal_type === typeFilter;
      return matchesStatus && matchesType;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
        <p className="font-medium">Error loading goals</p>
        <p>{error}</p>
        <Button 
          variant="outline" 
          className="mt-2" 
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Goal Management</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="new">Create New Goal</TabsTrigger>
        </TabsList>
        
        <TabsContent value="goals">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="w-full md:w-1/2">
                <Label htmlFor="statusFilter">Status</Label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                  <SelectTrigger id="statusFilter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full md:w-1/2">
                <Label htmlFor="typeFilter">Goal Type</Label>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value)}>
                  <SelectTrigger id="typeFilter">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {GOAL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {getFilteredGoals().length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3 py-8">
                    <Target className="h-12 w-12 text-gray-400" />
                    <h3 className="text-lg font-medium">No goals found</h3>
                    <p className="text-sm text-gray-500">Get started by creating your first goal</p>
                    <Button onClick={() => setActiveTab('new')} className="mt-2">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Goal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {getFilteredGoals().map((goal) => (
                  <Card key={goal.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleGoalClick(goal.id)}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center">
                            <Target className="mr-2 h-5 w-5" />
                            {goal.name}
                          </CardTitle>
                          <CardDescription>{goal.description}</CardDescription>
                        </div>
                        <Badge 
                          variant={getStatusBadgeVariant(goal.status)}
                          className="ml-2 flex items-center"
                        >
                          {getStatusIcon(goal.status)}
                          {goal.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="outline" className="capitalize">
                            {GOAL_TYPES.find(t => t.value === goal.goal_type)?.label || goal.goal_type}
                          </Badge>
                          {goal.target_asset && (
                            <Badge variant="secondary">
                              Asset: {goal.target_asset}
                            </Badge>
                          )}
                          {goal.target_value && (
                            <Badge variant="secondary">
                              Target: {goal.target_value}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-col space-y-1">
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>Progress</span>
                            <span>{Math.round(goal.progress)}%</span>
                          </div>
                          <Progress value={goal.progress} className="h-2" />
                        </div>
                        
                        {(goal.start_date || goal.end_date) && (
                          <div className="flex items-center text-sm text-gray-500 mt-2">
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>
                              {goal.start_date ? new Date(goal.start_date).toLocaleDateString() : 'Open start'} 
                              {' '} to {' '}
                              {goal.end_date ? new Date(goal.end_date).toLocaleDateString() : 'Open end'}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>Create New Goal</CardTitle>
              <CardDescription>Set up a new goal for your trading farm</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goalTemplate">Goal Template (Optional)</Label>
                  <Select value={selectedTemplate || ''} onValueChange={(value) => setSelectedTemplate(value || null)}>
                    <SelectTrigger id="goalTemplate">
                      <SelectValue placeholder="Select a template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Template</SelectItem>
                      {goalTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Goal Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
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
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="goal_type">Goal Type *</Label>
                    <Select 
                      value={formData.goal_type} 
                      onValueChange={(value) => handleSelectChange('goal_type', value)}
                      required
                    >
                      <SelectTrigger id="goal_type">
                        <SelectValue placeholder="Select a goal type" />
                      </SelectTrigger>
                      <SelectContent>
                        {GOAL_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={formData.priority.toString()} 
                      onValueChange={(value) => handleSelectChange('priority', value)}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {GOAL_PRIORITIES.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value.toString()}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target_value">Target Value</Label>
                    <Input
                      id="target_value"
                      name="target_value"
                      type="number"
                      value={formData.target_value}
                      onChange={handleInputChange}
                      placeholder="e.g., 1000"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="target_asset">Target Asset</Label>
                    <Input
                      id="target_asset"
                      name="target_asset"
                      value={formData.target_asset}
                      onChange={handleInputChange}
                      placeholder="e.g., BTC, ETH, USD"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <DatePicker
                      id="start_date"
                      selected={formData.start_date}
                      onSelect={(date) => handleDateChange('start_date', date)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <DatePicker
                      id="end_date"
                      selected={formData.end_date}
                      onSelect={(date) => handleDateChange('end_date', date)}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setActiveTab('goals')}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                        Creating...
                      </>
                    ) : (
                      'Create Goal'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 