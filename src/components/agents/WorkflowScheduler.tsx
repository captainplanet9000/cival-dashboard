import React, { useState, useEffect } from 'react';
import { FarmAgent } from '@/services/farm/farm-service';
import { 
  WorkflowSchedule, 
  ScheduleFrequency,
  CreateScheduleParams,
  workflowSchedulerService 
} from '@/services/workflow-scheduler-service';
import { WorkflowType } from './AgentWorkflow';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Check, Clock, Edit, Play, Trash } from 'lucide-react';
import { format } from 'date-fns';

interface WorkflowSchedulerProps {
  agent: FarmAgent;
  availableWorkflows: Array<{
    id: string;
    name: string;
    type: WorkflowType;
  }>;
}

export const WorkflowScheduler: React.FC<WorkflowSchedulerProps> = ({ 
  agent,
  availableWorkflows
}) => {
  const [schedules, setSchedules] = useState<WorkflowSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<WorkflowSchedule | null>(null);
  
  // Form state for create/edit
  const [formData, setFormData] = useState<Partial<CreateScheduleParams>>({
    name: '',
    description: '',
    agentId: agent.id,
    frequency: 'ONCE',
    input: ''
  });

  // Fetch agent schedules
  useEffect(() => {
    if (agent?.id) {
      fetchSchedules();
    }
  }, [agent.id]);

  // Reset form data when dialogs close
  useEffect(() => {
    if (!isCreateDialogOpen && !isEditDialogOpen) {
      resetForm();
    }
  }, [isCreateDialogOpen, isEditDialogOpen]);

  // Update form data when editing a schedule
  useEffect(() => {
    if (selectedSchedule && isEditDialogOpen) {
      setFormData({
        name: selectedSchedule.name,
        description: selectedSchedule.description,
        agentId: selectedSchedule.agentId,
        workflowId: selectedSchedule.workflowId,
        workflowType: selectedSchedule.workflowType,
        input: selectedSchedule.input,
        frequency: selectedSchedule.frequency,
        cronExpression: selectedSchedule.cronExpression
      });
    }
  }, [selectedSchedule, isEditDialogOpen]);

  // Fetch schedules for the agent
  const fetchSchedules = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const agentSchedules = await workflowSchedulerService.getSchedulesForAgent(agent.id);
      setSchedules(agentSchedules);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch schedules');
      console.error('Error fetching schedules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      agentId: agent.id,
      frequency: 'ONCE',
      input: ''
    });
    setSelectedSchedule(null);
  };

  // Handle form field changes
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle workflow selection
  const handleWorkflowChange = (workflowId: string) => {
    const selectedWorkflow = availableWorkflows.find(w => w.id === workflowId);
    
    if (selectedWorkflow) {
      setFormData(prev => ({
        ...prev,
        workflowId,
        workflowType: selectedWorkflow.type
      }));
    }
  };

  // Handle schedule creation
  const handleCreateSchedule = async () => {
    setError(null);
    
    try {
      // Validate form data
      if (!formData.name || !formData.workflowId || !formData.input) {
        setError('Name, workflow, and input are required fields');
        return;
      }
      
      // Create schedule
      const scheduleParams: CreateScheduleParams = {
        name: formData.name!,
        description: formData.description,
        agentId: agent.id,
        workflowId: formData.workflowId!,
        workflowType: formData.workflowType!,
        input: formData.input!,
        frequency: formData.frequency as ScheduleFrequency,
        cronExpression: formData.cronExpression,
        runImmediately: formData.runImmediately
      };
      
      await workflowSchedulerService.createSchedule(scheduleParams);
      
      // Refresh schedules
      await fetchSchedules();
      
      // Close dialog
      setIsCreateDialogOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create schedule');
      console.error('Error creating schedule:', err);
    }
  };

  // Handle schedule update
  const handleUpdateSchedule = async () => {
    setError(null);
    
    if (!selectedSchedule) return;
    
    try {
      // Validate form data
      if (!formData.name || !formData.workflowId || !formData.input) {
        setError('Name, workflow, and input are required fields');
        return;
      }
      
      // Update schedule
      await workflowSchedulerService.updateSchedule(selectedSchedule.id, {
        name: formData.name,
        description: formData.description,
        workflowId: formData.workflowId,
        workflowType: formData.workflowType,
        input: formData.input,
        frequency: formData.frequency as ScheduleFrequency,
        cronExpression: formData.cronExpression
      });
      
      // Refresh schedules
      await fetchSchedules();
      
      // Close dialog
      setIsEditDialogOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update schedule');
      console.error('Error updating schedule:', err);
    }
  };

  // Handle schedule deletion
  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) {
      return;
    }
    
    try {
      await workflowSchedulerService.deleteSchedule(scheduleId);
      
      // Refresh schedules
      await fetchSchedules();
    } catch (err: any) {
      setError(err.message || 'Failed to delete schedule');
      console.error('Error deleting schedule:', err);
    }
  };

  // Handle schedule activation/deactivation
  const handleToggleSchedule = async (schedule: WorkflowSchedule) => {
    try {
      if (schedule.isActive) {
        await workflowSchedulerService.deactivateSchedule(schedule.id);
      } else {
        await workflowSchedulerService.activateSchedule(schedule.id);
      }
      
      // Refresh schedules
      await fetchSchedules();
    } catch (err: any) {
      setError(err.message || `Failed to ${schedule.isActive ? 'deactivate' : 'activate'} schedule`);
      console.error(`Error ${schedule.isActive ? 'deactivating' : 'activating'} schedule:`, err);
    }
  };

  // Handle manual execution of a schedule
  const handleRunSchedule = async (scheduleId: string) => {
    try {
      const result = await workflowSchedulerService.executeScheduledWorkflow(scheduleId);
      
      if (result.success) {
        alert(`Workflow executed successfully: ${result.result}`);
      } else {
        alert(`Workflow execution failed: ${result.error}`);
      }
      
      // Refresh schedules
      await fetchSchedules();
    } catch (err: any) {
      setError(err.message || 'Failed to execute schedule');
      console.error('Error executing schedule:', err);
    }
  };

  // Format date for display
  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return format(date, 'MMM d, yyyy h:mm a');
  };

  // Get the next iteration text based on frequency
  const getFrequencyText = (schedule: WorkflowSchedule) => {
    switch (schedule.frequency) {
      case 'ONCE':
        return 'One time only';
      case 'HOURLY':
        return 'Every hour';
      case 'DAILY':
        return 'Every day';
      case 'WEEKLY':
        return 'Every week';
      case 'MONTHLY':
        return 'Every month';
      case 'CUSTOM':
        return schedule.cronExpression || 'Custom schedule';
      default:
        return 'Unknown frequency';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Scheduled Workflows</CardTitle>
          <CardDescription>
            Manage automated workflows for your {agent.type} agent
          </CardDescription>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create Schedule</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Workflow Schedule</DialogTitle>
              <DialogDescription>
                Set up an automated workflow that will run on a schedule
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="Daily Market Analysis"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Analyze BTC market conditions daily..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="workflow">Workflow</Label>
                <Select
                  value={formData.workflowId}
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
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="input">Workflow Input</Label>
                <Textarea
                  id="input"
                  value={formData.input || ''}
                  onChange={(e) => handleFormChange('input', e.target.value)}
                  placeholder="Enter parameters, target assets, or instructions..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => handleFormChange('frequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONCE">Once</SelectItem>
                    <SelectItem value="HOURLY">Hourly</SelectItem>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.frequency === 'CUSTOM' && (
                <div className="space-y-2">
                  <Label htmlFor="cronExpression">Cron Expression</Label>
                  <Input
                    id="cronExpression"
                    value={formData.cronExpression || ''}
                    onChange={(e) => handleFormChange('cronExpression', e.target.value)}
                    placeholder="* * * * *"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: minute hour day month weekday (e.g., "0 8 * * 1" for Mondays at 8 AM)
                  </p>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="runImmediately"
                  checked={formData.runImmediately || false}
                  onCheckedChange={(checked) => handleFormChange('runImmediately', checked)}
                />
                <Label htmlFor="runImmediately">Run immediately after creation</Label>
              </div>
            </div>
            
            {error && (
              <div className="text-sm font-medium text-destructive mt-2">
                {error}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSchedule}>
                Create Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner className="h-8 w-8" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-muted-foreground">No scheduled workflows found.</p>
            <p className="text-sm text-muted-foreground mt-2">Create a schedule to automate your agent workflows.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map(schedule => (
                <TableRow key={schedule.id}>
                  <TableCell>
                    <div className="font-medium">{schedule.name}</div>
                    {schedule.description && (
                      <div className="text-xs text-muted-foreground">{schedule.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {availableWorkflows.find(w => w.id === schedule.workflowId)?.name || schedule.workflowType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span className="text-xs">{getFrequencyText(schedule)}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">
                      {formatDate(schedule.nextRunTime)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={schedule.isActive}
                        onCheckedChange={() => handleToggleSchedule(schedule)}
                      />
                      <span className={schedule.isActive ? 'text-green-600' : 'text-muted-foreground'}>
                        {schedule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleRunSchedule(schedule.id)}
                        title="Run now"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setSelectedSchedule(schedule);
                          setIsEditDialogOpen(true);
                        }}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        title="Delete"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        {error && (
          <div className="text-sm font-medium text-destructive mt-4">
            {error}
          </div>
        )}
      </CardContent>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Workflow Schedule</DialogTitle>
            <DialogDescription>
              Update the settings for this scheduled workflow
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name || ''}
                onChange={(e) => handleFormChange('name', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description || ''}
                onChange={(e) => handleFormChange('description', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-workflow">Workflow</Label>
              <Select
                value={formData.workflowId}
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
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-input">Workflow Input</Label>
              <Textarea
                id="edit-input"
                value={formData.input || ''}
                onChange={(e) => handleFormChange('input', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-frequency">Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => handleFormChange('frequency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONCE">Once</SelectItem>
                  <SelectItem value="HOURLY">Hourly</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.frequency === 'CUSTOM' && (
              <div className="space-y-2">
                <Label htmlFor="edit-cronExpression">Cron Expression</Label>
                <Input
                  id="edit-cronExpression"
                  value={formData.cronExpression || ''}
                  onChange={(e) => handleFormChange('cronExpression', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Format: minute hour day month weekday (e.g., "0 8 * * 1" for Mondays at 8 AM)
                </p>
              </div>
            )}
          </div>
          
          {error && (
            <div className="text-sm font-medium text-destructive mt-2">
              {error}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSchedule}>
              Update Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}; 