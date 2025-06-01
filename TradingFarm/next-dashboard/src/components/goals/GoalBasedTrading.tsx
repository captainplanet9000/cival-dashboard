'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AreaChartComponent, BarChartComponent, LineChartComponent } from '@/components/ui/chart';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Target, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  ChevronRight, 
  Plus, 
  BarChart as BarChartIcon,
  Users,
  PiggyBank,
  Calendar,
  Shield,
  Flag,
  PlusCircle
} from 'lucide-react';

// Mock data for goal tracking
const MOCK_GOALS = [
  {
    id: 'goal1',
    name: 'College Fund',
    target: 50000,
    current: 32500,
    timeframe: '3 years',
    riskLevel: 'Medium',
    startDate: '2024-01-15',
    strategy: 'Balanced Growth',
    agents: ['TrendFollower', 'MeanReversion'],
    status: 'active',
    progress: 65,
    monthlyContribution: 500,
    projectedCompletion: '2026-09-21',
    performance: [
      { month: 'Jan', value: 28000 },
      { month: 'Feb', value: 29200 },
      { month: 'Mar', value: 30100 },
      { month: 'Apr', value: 31000 },
      { month: 'May', value: 32500 },
    ],
  },
  {
    id: 'goal2',
    name: 'House Down Payment',
    target: 100000,
    current: 15000,
    timeframe: '5 years',
    riskLevel: 'Medium-Low',
    startDate: '2024-03-10',
    strategy: 'Capital Preservation',
    agents: ['VolatilityHarvester'],
    status: 'active',
    progress: 15,
    monthlyContribution: 1200,
    projectedCompletion: '2029-01-15',
    performance: [
      { month: 'Mar', value: 12000 },
      { month: 'Apr', value: 13500 },
      { month: 'May', value: 15000 },
    ],
  },
  {
    id: 'goal3',
    name: 'Retirement Boost',
    target: 250000,
    current: 1250,
    timeframe: '10 years',
    riskLevel: 'High',
    startDate: '2024-05-01',
    strategy: 'Aggressive Growth',
    agents: ['TrendFollower'],
    status: 'active',
    progress: 0.5,
    monthlyContribution: 1000,
    projectedCompletion: '2034-05-01',
    performance: [
      { month: 'May', value: 1250 },
    ],
  },
];

// Mock data for goal performance chart
const GOAL_PERFORMANCE_DATA = [
  { month: 'Jan', actual: 28000, projected: 27500 },
  { month: 'Feb', actual: 29200, projected: 28500 },
  { month: 'Mar', actual: 30100, projected: 29500 },
  { month: 'Apr', actual: 31000, projected: 30500 },
  { month: 'May', actual: 32500, projected: 31500 },
  { month: 'Jun', actual: null, projected: 33000 },
  { month: 'Jul', actual: null, projected: 34500 },
  { month: 'Aug', actual: null, projected: 36000 },
  { month: 'Sep', actual: null, projected: 37500 },
  { month: 'Oct', actual: null, projected: 39000 },
  { month: 'Nov', actual: null, projected: 40500 },
  { month: 'Dec', actual: null, projected: 42000 },
];

// Mock data for allocation chart
const ALLOCATION_DATA = [
  { category: 'Crypto', percentage: 40 },
  { category: 'Stocks', percentage: 30 },
  { category: 'Stablecoins', percentage: 20 },
  { category: 'Cash', percentage: 10 },
];

// Component for creating a new trading goal
function GoalCreationForm() {
  const [formData, setFormData] = useState({
    name: '',
    target: '',
    timeframe: '',
    riskLevel: 50,
    monthlyContribution: '',
    strategy: ''
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would save the goal
    alert('Goal created! In a real implementation, this would be saved.');
    // Reset form
    setFormData({
      name: '',
      target: '',
      timeframe: '',
      riskLevel: 50,
      monthlyContribution: '',
      strategy: ''
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="goal-name">Goal Name</Label>
        <Input 
          id="goal-name" 
          placeholder="e.g. House Down Payment"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="target-amount">Target Amount ($)</Label>
          <Input 
            id="target-amount" 
            type="number" 
            placeholder="e.g. 50000"
            value={formData.target}
            onChange={(e) => handleChange('target', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="time-frame">Time Frame</Label>
          <Select onValueChange={(value) => handleChange('timeframe', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1year">1 year</SelectItem>
              <SelectItem value="2years">2 years</SelectItem>
              <SelectItem value="3years">3 years</SelectItem>
              <SelectItem value="5years">5 years</SelectItem>
              <SelectItem value="10years">10 years</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="risk-level">Risk Tolerance</Label>
          <span className="text-sm text-muted-foreground">
            {formData.riskLevel < 33 ? 'Conservative' : 
             formData.riskLevel < 66 ? 'Moderate' : 'Aggressive'}
          </span>
        </div>
        <Slider
          id="risk-level"
          min={0}
          max={100}
          step={1}
          value={[formData.riskLevel as number]}
          onValueChange={(value) => handleChange('riskLevel', value[0])}
          className="py-4"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Lower Risk</span>
          <span>Balanced</span>
          <span>Higher Risk</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="monthly-contribution">Monthly Contribution ($)</Label>
        <Input 
          id="monthly-contribution" 
          type="number" 
          placeholder="e.g. 500"
          value={formData.monthlyContribution}
          onChange={(e) => handleChange('monthlyContribution', e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="strategy">Trading Strategy</Label>
        <Select onValueChange={(value) => handleChange('strategy', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="balanced">Balanced Growth</SelectItem>
            <SelectItem value="aggressive">Aggressive Growth</SelectItem>
            <SelectItem value="conservative">Capital Preservation</SelectItem>
            <SelectItem value="income">Income Generation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <Switch id="auto-adjust" />
        <Label htmlFor="auto-adjust" className="text-sm">
          Allow ElizaOS to automatically adjust strategy based on market conditions
        </Label>
      </div>

      <Button type="submit" className="w-full">
        <PlusCircle className="mr-2 h-4 w-4" />
        Create Trading Goal
      </Button>
    </form>
  );
}

// Component for goal details view
function GoalDetails({ goal }: { goal: typeof MOCK_GOALS[0] }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold">{goal.name}</h3>
          <p className="text-sm text-muted-foreground">Started on {goal.startDate}</p>
        </div>
        <Badge variant={goal.status === 'active' ? 'default' : 'secondary'} className={goal.status === 'active' ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : ""}>
          {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Goal Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between mb-2 text-sm">
              <span>Current: ${goal.current.toLocaleString()}</span>
              <span>Target: ${goal.target.toLocaleString()}</span>
            </div>
            <Progress value={goal.progress} className="h-2" />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Monthly Contribution</p>
                <p className="font-medium">${goal.monthlyContribution}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Projected Completion</p>
                <p className="font-medium">{goal.projectedCompletion}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Risk Level</span>
                <Badge variant="outline">{goal.riskLevel}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Trading Strategy</span>
                <Badge variant="outline">{goal.strategy}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Assigned Agents</span>
                <div className="flex space-x-1">
                  {goal.agents.map((agent, i) => (
                    <Badge key={i} variant="secondary">{agent}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Performance Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <AreaChartComponent
              data={GOAL_PERFORMANCE_DATA}
              areas={[
                { dataKey: 'actual', name: 'Actual Performance' },
                { dataKey: 'projected', name: 'Projected Growth' }
              ]}
              xAxisDataKey="month"
              showLegend={true}
              showXAxis={true}
              showYAxis={true}
              yAxisWidth={65}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Asset Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <BarChartComponent
              data={ALLOCATION_DATA}
              bars={[
                { dataKey: 'percentage', name: 'Allocation' }
              ]}
              xAxisDataKey="category"
              showXAxis={true}
              showYAxis={true}
              yAxisWidth={40}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button variant="outline" className="w-full">
          <Shield className="mr-2 h-4 w-4" />
          Adjust Risk Parameters
        </Button>
        <Button variant="outline" className="w-full">
          <Users className="mr-2 h-4 w-4" />
          Manage Agents
        </Button>
      </div>
    </div>
  );
}

// Main component for Goal-Based Trading
export default function GoalBasedTrading() {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('current-goals');

  const handleViewGoal = (goalId: string) => {
    setSelectedGoal(goalId);
    setActiveTab('goal-details');
  };

  const handleBackToGoals = () => {
    setSelectedGoal(null);
    setActiveTab('current-goals');
  };

  const selectedGoalDetails = MOCK_GOALS.find(goal => goal.id === selectedGoal);

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="bg-muted/30">
        <CardTitle className="flex items-center">
          <Target className="mr-2 h-5 w-5" />
          Goal-Based Trading
        </CardTitle>
        <CardDescription>
          Set financial goals and let our AI agents optimize your trading strategy
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 grid grid-cols-3 w-full">
            <TabsTrigger value="current-goals">
              <Flag className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Current Goals</span>
              <span className="inline sm:hidden">Goals</span>
            </TabsTrigger>
            <TabsTrigger value="create-goal">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Create Goal</span>
              <span className="inline sm:hidden">Create</span>
            </TabsTrigger>
            <TabsTrigger value="goal-details" disabled={!selectedGoal}>
              <BarChartIcon className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Goal Details</span>
              <span className="inline sm:hidden">Details</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="current-goals">
            <div className="space-y-4">
              {MOCK_GOALS.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No goals created yet</p>
                  <Button
                    onClick={() => setActiveTab('create-goal')}
                    variant="outline"
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Goal
                  </Button>
                </div>
              ) : (
                MOCK_GOALS.map((goal) => (
                  <Card key={goal.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{goal.name}</h3>
                            <div className="mt-1 text-sm text-muted-foreground">
                              ${goal.current.toLocaleString()} of ${goal.target.toLocaleString()} ({goal.progress}%)
                            </div>
                          </div>
                          <Badge variant="outline">{goal.riskLevel}</Badge>
                        </div>
                        
                        <div className="mt-4 mb-2">
                          <Progress value={goal.progress} className="h-2" />
                        </div>
                        
                        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                          <div className="flex items-center">
                            <TrendingUp className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>{goal.strategy}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>{goal.timeframe}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>{goal.projectedCompletion}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t p-2 flex justify-between items-center bg-muted/20">
                        <span className="text-sm flex items-center">
                          <PiggyBank className="mr-2 h-4 w-4 text-muted-foreground" />
                          Monthly: ${goal.monthlyContribution}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewGoal(goal.id)}
                          className="text-primary"
                        >
                          View Details
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="create-goal">
            <GoalCreationForm />
          </TabsContent>
          
          <TabsContent value="goal-details">
            {selectedGoalDetails ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackToGoals}
                  className="mb-4"
                >
                  ← Back to Goals
                </Button>
                <GoalDetails goal={selectedGoalDetails} />
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Select a goal to view details</p>
                <Button
                  onClick={() => setActiveTab('current-goals')}
                  variant="outline"
                  className="mt-4"
                >
                  Back to Goals
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="bg-muted/30 border-t">
        <div className="flex items-center w-full text-xs text-muted-foreground">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <p>Past performance is not indicative of future results. All investments involve risk.</p>
        </div>
      </CardFooter>
    </Card>
  );
}
