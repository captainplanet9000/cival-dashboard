"use client";

import * as React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { AlertCircle, Check, Database, RefreshCw, Save } from 'lucide-react';
import { useElizaAgentManager } from '@/hooks/useElizaAgentManager';
import { ElizaAgent } from '@/types/agent-types';

interface ElizaAgentConfigProps {
  agent: ElizaAgent;
}

export function ElizaAgentConfig({ agent }: ElizaAgentConfigProps) {
  const { updateAgentConfig } = useElizaAgentManager();
  
  // State for editing mode
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for config values
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description || '');
  const [strategyType, setStrategyType] = useState(agent.config.strategyType || 'trend_following');
  const [riskLevel, setRiskLevel] = useState(agent.config.risk_level || 'medium');
  const [apiAccess, setApiAccess] = useState(agent.config.api_access || false);
  const [tradingPermissions, setTradingPermissions] = useState(agent.config.trading_permissions || 'read');
  const [autoRecovery, setAutoRecovery] = useState(agent.config.auto_recovery || true);
  const [maxConcurrentTasks, setMaxConcurrentTasks] = useState(agent.config.max_concurrent_tasks || 3);
  const [llmModel, setLlmModel] = useState(agent.config.llm_model || 'gpt-4o');
  const [initialInstructions, setInitialInstructions] = useState(agent.config.initialInstructions || '');
  
  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditing) {
      // Reset form to original values if canceling
      resetForm();
    }
    setIsEditing(!isEditing);
  };
  
  // Reset form to original values
  const resetForm = () => {
    setName(agent.name);
    setDescription(agent.description || '');
    setStrategyType(agent.config.strategyType || 'trend_following');
    setRiskLevel(agent.config.risk_level || 'medium');
    setApiAccess(agent.config.api_access || false);
    setTradingPermissions(agent.config.trading_permissions || 'read');
    setAutoRecovery(agent.config.auto_recovery || true);
    setMaxConcurrentTasks(agent.config.max_concurrent_tasks || 3);
    setLlmModel(agent.config.llm_model || 'gpt-4o');
    setInitialInstructions(agent.config.initialInstructions || '');
  };
  
  // Save configuration changes
  const handleSaveConfig = async () => {
    setIsSaving(true);
    
    try {
      // Format updated config
      const updatedConfig = {
        ...agent.config,
        strategyType,
        risk_level: riskLevel,
        api_access: apiAccess,
        trading_permissions: tradingPermissions,
        auto_recovery: autoRecovery,
        max_concurrent_tasks: maxConcurrentTasks,
        llm_model: llmModel,
        initialInstructions,
      };
      
      // Call the update function from the hook
      await updateAgentConfig(agent.id, {
        name,
        description,
        config: updatedConfig
      });
      
      toast({
        title: 'Configuration Saved',
        description: 'Agent configuration updated successfully',
      });
      
      // Exit edit mode
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating agent config:', error);
      toast({
        title: 'Error',
        description: 'Failed to update agent configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h3 className="text-lg font-medium">Agent Configuration</h3>
        <Button 
          variant={isEditing ? "outline" : "default"} 
          onClick={toggleEditMode}
        >
          {isEditing ? 'Cancel' : 'Edit Configuration'}
        </Button>
      </div>
      
      <Tabs defaultValue="basic" className="w-full">
        <TabsList>
          <TabsTrigger value="basic">Basic Configuration</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
          <TabsTrigger value="instructions">Custom Instructions</TabsTrigger>
          <TabsTrigger value="json">Raw JSON</TabsTrigger>
        </TabsList>
        
        {/* Basic Configuration */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Configuration</CardTitle>
              <CardDescription>
                Core settings that define the agent's behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Agent Name</Label>
                    <Input 
                      id="name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="strategy">Strategy Type</Label>
                    <Select 
                      value={strategyType} 
                      onValueChange={setStrategyType}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select strategy" />
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
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    disabled={!isEditing}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="risk">Risk Level</Label>
                    <Select 
                      value={riskLevel} 
                      onValueChange={setRiskLevel}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="permissions">Trading Permissions</Label>
                    <Select 
                      value={tradingPermissions} 
                      onValueChange={setTradingPermissions}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select permissions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read">Read Only</SelectItem>
                        <SelectItem value="suggest">Suggest Trades</SelectItem>
                        <SelectItem value="execute">Execute Trades</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="api_access">API Access</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow agent to access external APIs
                    </p>
                  </div>
                  <Switch
                    id="api_access"
                    checked={apiAccess}
                    onCheckedChange={setApiAccess}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
            {isEditing && (
              <CardFooter>
                <Button 
                  onClick={handleSaveConfig} 
                  disabled={isSaving}
                  className="ml-auto"
                >
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
        
        {/* Advanced Settings */}
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Technical configuration options for the agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto_recovery">Auto Recovery</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically restart agent after transient errors
                    </p>
                  </div>
                  <Switch
                    id="auto_recovery"
                    checked={autoRecovery}
                    onCheckedChange={setAutoRecovery}
                    disabled={!isEditing}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_tasks">Max Concurrent Tasks</Label>
                    <Input 
                      id="max_tasks" 
                      type="number"
                      min={1}
                      max={10}
                      value={maxConcurrentTasks} 
                      onChange={(e) => setMaxConcurrentTasks(parseInt(e.target.value))}
                      disabled={!isEditing}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum number of tasks the agent can run simultaneously
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="llm_model">LLM Model</Label>
                    <Select 
                      value={llmModel} 
                      onValueChange={setLlmModel}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select LLM model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4o (Default)</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                        <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                        <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Language model powering the agent's reasoning
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Available Markets</Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/20">
                    {agent.config.markets?.map((market: string) => (
                      <Badge key={market} variant="outline" className="px-2 py-1">
                        {market}
                      </Badge>
                    ))}
                    {isEditing && (
                      <Badge variant="outline" className="px-2 py-1 bg-primary/10 cursor-pointer">
                        + Add Market
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Available Tools</Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/20">
                    {agent.config.tools?.map((tool: string) => (
                      <Badge key={tool} variant="outline" className="px-2 py-1">
                        {tool.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                    {isEditing && (
                      <Badge variant="outline" className="px-2 py-1 bg-primary/10 cursor-pointer">
                        + Add Tool
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            {isEditing && (
              <CardFooter>
                <Button 
                  onClick={handleSaveConfig} 
                  disabled={isSaving}
                  className="ml-auto"
                >
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
        
        {/* Custom Instructions */}
        <TabsContent value="instructions">
          <Card>
            <CardHeader>
              <CardTitle>Custom Instructions</CardTitle>
              <CardDescription>
                Provide specific guidance for the agent's behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="instructions">Initial Instructions</Label>
                <Textarea 
                  id="instructions" 
                  value={initialInstructions} 
                  onChange={(e) => setInitialInstructions(e.target.value)}
                  placeholder="Enter instructions for the agent's initial behavior..."
                  rows={10}
                  disabled={!isEditing}
                  className="font-mono"
                />
                <p className="text-sm text-muted-foreground">
                  These instructions will be used to guide the agent's behavior during initialization.
                  You can use markdown formatting.
                </p>
              </div>
            </CardContent>
            {isEditing && (
              <CardFooter>
                <Button 
                  onClick={handleSaveConfig} 
                  disabled={isSaving}
                  className="ml-auto"
                >
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
        
        {/* Raw JSON */}
        <TabsContent value="json">
          <Card>
            <CardHeader>
              <CardTitle>Raw Configuration</CardTitle>
              <CardDescription>
                View the raw JSON configuration for advanced users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="p-4 rounded-md bg-muted/50 overflow-auto max-h-[400px] font-mono text-xs">
                  {JSON.stringify(agent.config, null, 2)}
                </pre>
                {!isEditing && (
                  <div className="absolute inset-0 bg-background/20 flex items-center justify-center rounded-md">
                    <div className="bg-background/90 p-4 rounded-md shadow-lg text-center">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium">Edit mode required</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enable edit mode to modify raw configuration
                      </p>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="mt-3"
                        onClick={toggleEditMode}
                      >
                        Enable Edit Mode
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <AlertCircle className="h-3 w-3 inline-block mr-1" />
                Editing raw JSON is for advanced users only. Invalid JSON will cause errors.
              </p>
            </CardContent>
            {isEditing && (
              <CardFooter>
                <Button 
                  onClick={handleSaveConfig} 
                  disabled={isSaving}
                  className="ml-auto"
                >
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
