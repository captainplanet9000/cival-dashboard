/**
 * Agent Settings Tab Component
 * Manages agent configuration and settings
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Settings, Trash, AlertCircle, Save, RefreshCw, CodeIcon } from 'lucide-react';
import { ElizaAgent } from '@/services/agent-service';
import { agentService } from '@/services/agent-service';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface AgentSettingsTabProps {
  agent: ElizaAgent;
  onAgentUpdated: () => void;
}

export function AgentSettingsTab({ agent, onAgentUpdated }: AgentSettingsTabProps) {
  const { toast } = useToast();
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description || '');
  const [instructions, setInstructions] = useState(agent.instructions || '');
  const [model, setModel] = useState(agent.model);
  const [agentTypes, setAgentTypes] = useState<{id: string, name: string}[]>([]);
  const [selectedAgentTypeId, setSelectedAgentTypeId] = useState(agent.agent_type_id || '');
  const [parameters, setParameters] = useState<Record<string, any>>(agent.parameters || {});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  
  // Load agent types on mount
  useEffect(() => {
    loadAgentTypes();
  }, []);
  
  const loadAgentTypes = async () => {
    setIsLoading(true);
    
    try {
      const response = await agentService.getAgentTypes();
      if (response.success && response.data) {
        setAgentTypes(response.data);
      }
    } catch (error) {
      console.error('Error loading agent types:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveSettings = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      const response = await agentService.updateElizaAgent(agent.id, {
        name,
        description,
        instructions,
        model,
        agent_type_id: selectedAgentTypeId,
        parameters
      });
      
      if (response.success) {
        toast({
          title: 'Agent Updated',
          description: 'Agent settings have been saved successfully.'
        });
        
        onAgentUpdated();
      } else {
        setError(response.error || 'Failed to update agent');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to update agent'
        });
      }
    } catch (error: any) {
      console.error('Error updating agent:', error);
      setError(error.message || 'An unexpected error occurred');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteAgent = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      const response = await agentService.deleteElizaAgent(agent.id);
      
      if (response.success) {
        toast({
          title: 'Agent Deleted',
          description: 'Agent has been deleted successfully.'
        });
        
        // Redirect to agents list
        window.location.href = '/agents';
      } else {
        setError(response.error || 'Failed to delete agent');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to delete agent'
        });
      }
    } catch (error: any) {
      console.error('Error deleting agent:', error);
      setError(error.message || 'An unexpected error occurred');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred'
      });
    } finally {
      setIsSaving(false);
      setIsDeleteConfirmOpen(false);
    }
  };
  
  const handleParameterChange = (key: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Agent Settings</h3>
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save Changes</span>
          </Button>
          
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="flex items-center gap-2">
                <Trash className="h-4 w-4" />
                <span>Delete Agent</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Agent</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this agent? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <p>
                  To confirm, please type the agent name: <strong>{agent.name}</strong>
                </p>
                <Input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder="Type agent name to confirm"
                />
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteConfirmName !== agent.name || isSaving}
                  onClick={handleDeleteAgent}
                >
                  {isSaving ? 'Deleting...' : 'Delete Agent'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>
                Edit basic agent information and configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter agent name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this agent does"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agentType">Agent Type</Label>
                <Select value={selectedAgentTypeId} onValueChange={setSelectedAgentTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent type" />
                  </SelectTrigger>
                  <SelectContent>
                    {agentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="model">LLM Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                    <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                    <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="instructions" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CodeIcon className="h-5 w-5" />
                Agent Instructions
              </CardTitle>
              <CardDescription>
                Custom instructions that define the agent's behavior and capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Provide detailed instructions for the agent's behavior..."
                rows={15}
                className="font-mono text-sm"
              />
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Use clear, specific instructions to guide the agent's reasoning and actions.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="parameters" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Agent Parameters
              </CardTitle>
              <CardDescription>
                Configure operational parameters for this agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="temperature">Temperature</Label>
                    <p className="text-sm text-muted-foreground">
                      Controls randomness in responses (0.0 - 1.0)
                    </p>
                  </div>
                  <div className="w-[120px] flex items-center space-x-2">
                    <Slider
                      id="temperature"
                      min={0}
                      max={1}
                      step={0.1}
                      value={[parameters.temperature || 0.7]}
                      onValueChange={([value]) => handleParameterChange('temperature', value)}
                    />
                    <span className="w-12 text-sm">
                      {typeof parameters.temperature === 'number' 
                        ? parameters.temperature.toFixed(1) 
                        : '0.7'}
                    </span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="max_tokens">Max Output Tokens</Label>
                    <p className="text-sm text-muted-foreground">
                      Maximum length of generated responses
                    </p>
                  </div>
                  <div>
                    <Input
                      id="max_tokens"
                      type="number"
                      value={parameters.max_tokens || 1024}
                      onChange={(e) => handleParameterChange('max_tokens', parseInt(e.target.value))}
                      className="w-[120px]"
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto_recovery">Auto Recovery</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically recover from errors during execution
                    </p>
                  </div>
                  <div>
                    <Switch
                      id="auto_recovery"
                      checked={parameters.auto_recovery || false}
                      onCheckedChange={(checked) => handleParameterChange('auto_recovery', checked)}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="use_knowledge_base">Use Knowledge Base</Label>
                    <p className="text-sm text-muted-foreground">
                      Leverage linked documents for agent responses
                    </p>
                  </div>
                  <div>
                    <Switch
                      id="use_knowledge_base"
                      checked={parameters.use_knowledge_base !== false}
                      onCheckedChange={(checked) => handleParameterChange('use_knowledge_base', checked)}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="trading_permissions">Trading Permissions</Label>
                    <p className="text-sm text-muted-foreground">
                      Level of trading actions allowed
                    </p>
                  </div>
                  <div>
                    <Select 
                      value={parameters.trading_permissions || 'read_only'}
                      onValueChange={(value) => handleParameterChange('trading_permissions', value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select permissions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read_only">Read Only</SelectItem>
                        <SelectItem value="suggest_trades">Suggest Trades</SelectItem>
                        <SelectItem value="execute_with_approval">Execute with Approval</SelectItem>
                        <SelectItem value="execute_automatically">Execute Automatically</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div></div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParameters({
                  temperature: 0.7,
                  max_tokens: 1024,
                  auto_recovery: true,
                  use_knowledge_base: true,
                  trading_permissions: 'read_only'
                })}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset to Default</span>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
