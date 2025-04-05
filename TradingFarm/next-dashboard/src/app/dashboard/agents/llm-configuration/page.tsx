/**
 * Agent LLM Configuration Page
 * 
 * This page provides an interface for managing LLM configurations for Trading Farm agents,
 * including OpenRouter integration for access to multiple LLM providers.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/utils/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  ReloadIcon, 
  InfoCircledIcon, 
  ExclamationTriangleIcon, 
  ChevronLeftIcon,
  PlusIcon,
  Pencil1Icon,
  TrashIcon
} from '@radix-ui/react-icons'
import { AgentLlmConfig } from '@/components/agents/agent-llm-config'
import { Separator } from '@/components/ui/separator'
import { TableHeader, TableRow, TableHead, TableBody, TableCell, Table } from '@/components/ui/table'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/**
 * Agent LLM Configuration Page
 */
export default function AgentLlmConfigurationPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const selectedAgentId = searchParams.get('agentId')
  
  // State
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState<any[]>([])
  const [apiConfigurations, setApiConfigurations] = useState<any[]>([])
  const [selectedAgent, setSelectedAgent] = useState<any>(null)
  const [newConfigOpen, setNewConfigOpen] = useState(false)
  const [newConfigData, setNewConfigData] = useState({
    name: '',
    provider: 'openrouter',
    apiKey: '',
  })
  
  // Fetch agents data
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) throw error
        
        setAgents(data || [])
        
        // If agent ID is in URL, select that agent
        if (selectedAgentId) {
          const agent = data?.find(a => a.id === selectedAgentId)
          if (agent) {
            setSelectedAgent(agent)
          }
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error fetching agents:', error)
        toast({
          title: 'Error',
          description: 'Failed to load agents',
          variant: 'destructive'
        })
        setLoading(false)
      }
    }
    
    fetchAgents()
  }, [supabase, toast, selectedAgentId])
  
  // Fetch API configurations
  useEffect(() => {
    const fetchApiConfigurations = async () => {
      try {
        const { data, error } = await supabase
          .from('user_api_configurations')
          .select('*, api_service_providers(*)')
          .order('created_at', { ascending: false })
        
        if (error) throw error
        
        setApiConfigurations(data || [])
      } catch (error) {
        console.error('Error fetching API configurations:', error)
        toast({
          title: 'Error',
          description: 'Failed to load API configurations',
          variant: 'destructive'
        })
      }
    }
    
    fetchApiConfigurations()
  }, [supabase, toast])
  
  // Handle agent selection
  const handleSelectAgent = (agent: any) => {
    setSelectedAgent(agent)
    router.push(`/dashboard/agents/llm-configuration?agentId=${agent.id}`)
  }
  
  // Create new API configuration
  const createApiConfiguration = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      
      if (!user.user) {
        throw new Error('Not authenticated')
      }
      
      // Get provider ID
      const { data: providers, error: providerError } = await supabase
        .from('api_service_providers')
        .select('id')
        .eq('name', newConfigData.provider)
        .single()
      
      if (providerError || !providers) {
        throw new Error('Provider not found')
      }
      
      // Create configuration
      const { data, error } = await supabase
        .from('user_api_configurations')
        .insert({
          user_id: user.user.id,
          provider_id: providers.id,
          display_name: newConfigData.name,
          api_key: newConfigData.apiKey,
          is_active: true
        })
        .select()
      
      if (error) throw error
      
      toast({
        title: 'Success',
        description: 'API configuration created successfully',
      })
      
      // Refresh API configurations
      const { data: refreshedData, error: refreshError } = await supabase
        .from('user_api_configurations')
        .select('*, api_service_providers(*)')
        .order('created_at', { ascending: false })
      
      if (!refreshError) {
        setApiConfigurations(refreshedData || [])
      }
      
      // Close dialog
      setNewConfigOpen(false)
      setNewConfigData({
        name: '',
        provider: 'openrouter',
        apiKey: '',
      })
    } catch (error) {
      console.error('Error creating API configuration:', error)
      toast({
        title: 'Error',
        description: 'Failed to create API configuration',
        variant: 'destructive'
      })
    }
  }
  
  // Delete API configuration
  const deleteApiConfiguration = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API configuration?')) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('user_api_configurations')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      toast({
        title: 'Success',
        description: 'API configuration deleted successfully',
      })
      
      // Refresh API configurations
      const { data, error: refreshError } = await supabase
        .from('user_api_configurations')
        .select('*, api_service_providers(*)')
        .order('created_at', { ascending: false })
      
      if (!refreshError) {
        setApiConfigurations(data || [])
      }
    } catch (error) {
      console.error('Error deleting API configuration:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete API configuration',
        variant: 'destructive'
      })
    }
  }
  
  // Assign API configuration to agent
  const assignConfigToAgent = async (agentId: string, configId: string) => {
    try {
      // Check if assignment already exists
      const { data: existing, error: checkError } = await supabase
        .from('agent_api_services')
        .select('*')
        .eq('agent_id', agentId)
        .eq('configuration_id', configId)
      
      if (checkError) throw checkError
      
      if (existing && existing.length > 0) {
        toast({
          title: 'Info',
          description: 'This configuration is already assigned to the agent',
        })
        return
      }
      
      // Create assignment
      const { error } = await supabase
        .from('agent_api_services')
        .insert({
          agent_id: agentId,
          configuration_id: configId,
          priority: 10,
          is_active: true
        })
      
      if (error) throw error
      
      toast({
        title: 'Success',
        description: 'API configuration assigned to agent successfully',
      })
    } catch (error) {
      console.error('Error assigning configuration to agent:', error)
      toast({
        title: 'Error',
        description: 'Failed to assign configuration to agent',
        variant: 'destructive'
      })
    }
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => router.push('/dashboard/agents')}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Agent LLM Configuration</h1>
        </div>
        
        <Dialog open={newConfigOpen} onOpenChange={setNewConfigOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              New API Configuration
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Configuration</DialogTitle>
              <DialogDescription>
                Add a new API configuration for your agents to use
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Configuration Name</Label>
                <Input 
                  id="name" 
                  placeholder="My OpenRouter API"
                  value={newConfigData.name}
                  onChange={(e) => setNewConfigData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select 
                  value={newConfigData.provider}
                  onValueChange={(value) => setNewConfigData(prev => ({ ...prev, provider: value }))}
                >
                  <SelectTrigger id="provider">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="google">Google AI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input 
                  id="api-key" 
                  type="password"
                  placeholder="API Key"
                  value={newConfigData.apiKey}
                  onChange={(e) => setNewConfigData(prev => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewConfigOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={createApiConfiguration}
                disabled={!newConfigData.name || !newConfigData.provider || !newConfigData.apiKey}
              >
                Create Configuration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="grid grid-cols-2 w-[400px]">
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="api-keys">API Configurations</TabsTrigger>
        </TabsList>
        
        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Agent List */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Agents</CardTitle>
                <CardDescription>
                  Select an agent to configure
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center py-4">
                    <ReloadIcon className="h-5 w-5 animate-spin mr-2" />
                    <span>Loading agents...</span>
                  </div>
                ) : agents.length > 0 ? (
                  <div className="space-y-2">
                    {agents.map(agent => (
                      <div 
                        key={agent.id}
                        className={`
                          p-3 rounded-lg cursor-pointer transition-colors
                          ${selectedAgent?.id === agent.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                          }
                        `}
                        onClick={() => handleSelectAgent(agent)}
                      >
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-xs opacity-80">
                          {agent.description
                            ? agent.description.substring(0, 40) + (agent.description.length > 40 ? '...' : '')
                            : 'No description'
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <InfoCircledIcon className="h-4 w-4 mr-2" />
                    <AlertTitle>No Agents Found</AlertTitle>
                    <AlertDescription>
                      Create an agent first to configure LLM settings.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
            
            {/* Agent Configuration */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>
                  {selectedAgent ? selectedAgent.name : 'Select an Agent'}
                </CardTitle>
                <CardDescription>
                  {selectedAgent
                    ? 'Configure language model settings for this agent'
                    : 'Select an agent from the list to configure its LLM settings'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedAgent ? (
                  <AgentLlmConfig agentId={selectedAgent.id} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                    <InfoCircledIcon className="h-10 w-10 text-muted-foreground" />
                    <h3 className="text-lg font-medium">No Agent Selected</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Select an agent from the list on the left to view and configure its language model settings.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Configurations</CardTitle>
              <CardDescription>
                Manage your API keys and configurations for language models
              </CardDescription>
            </CardHeader>
            <CardContent>
              {apiConfigurations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiConfigurations.map(config => (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">
                          {config.display_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {config.api_service_providers?.name || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.is_active ? 'success' : 'secondary'}>
                            {config.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(config.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {selectedAgent && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => assignConfigToAgent(selectedAgent.id, config.id)}
                            >
                              Assign to {selectedAgent.name}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteApiConfiguration(config.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Alert>
                  <InfoCircledIcon className="h-4 w-4 mr-2" />
                  <AlertTitle>No API Configurations</AlertTitle>
                  <AlertDescription>
                    Click &quot;New API Configuration&quot; to add your first API configuration.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>API Usage</CardTitle>
              <CardDescription>
                Monitor your API usage and costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                <AlertTitle>Usage Stats Coming Soon</AlertTitle>
                <AlertDescription>
                  Detailed API usage statistics and cost tracking will be available in a future update.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
