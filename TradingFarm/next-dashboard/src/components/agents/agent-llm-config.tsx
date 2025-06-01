/**
 * Agent LLM Configuration Component
 * 
 * This component provides an interface for configuring an agent's language model settings
 * with support for OpenRouter, enabling access to models from various providers.
 */

import React, { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { InfoCircledIcon, ReloadIcon, CheckCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { OpenRouterModel, OpenRouterProvider } from '@/services/api/openrouter-client'
import { cn } from '@/lib/utils'

// Model Details Interface
interface ModelDetails {
  id: string;
  name: string;
  provider: string;
  pricing: {
    prompt: number; // Cost per 1M prompt tokens in USD
    completion: number; // Cost per 1M completion tokens in USD
  };
  context_length: number;
  capabilities: string[];
}

// Agent LLM Configuration Interface
interface AgentLlmConfig {
  hasLlm: boolean;
  serviceType: string;
  providerName: string;
  model: string;
}

// Props Interface
interface AgentLlmConfigProps {
  agentId: string;
  onConfigChange?: (config: AgentLlmConfig) => void;
  className?: string;
}

/**
 * Agent LLM Configuration Component
 */
export const AgentLlmConfig: React.FC<AgentLlmConfigProps> = ({
  agentId,
  onConfigChange,
  className
}) => {
  const { toast } = useToast();
  
  // State
  const [loading, setLoading] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [config, setConfig] = useState<AgentLlmConfig | null>(null);
  const [models, setModels] = useState<ModelDetails[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [useSystemApiKey, setUseSystemApiKey] = useState(true);
  
  // Fetch agent LLM configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`/api/agents/${agentId}/llm`);
        if (!response.ok) throw new Error('Failed to fetch LLM configuration');
        
        const data = await response.json();
        setConfig(data.config);
        
        if (data.config.model) {
          setSelectedModel(data.config.model);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching agent LLM config:', error);
        toast({
          title: 'Error',
          description: 'Failed to load agent LLM configuration',
          variant: 'destructive'
        });
        setLoading(false);
      }
    };
    
    fetchConfig();
  }, [agentId, toast]);
  
  // Fetch available models
  const fetchAvailableModels = async () => {
    setLoadingModels(true);
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (apiKey && !useSystemApiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      const response = await fetch('/api/api-services/openrouter/models', { headers });
      if (!response.ok) throw new Error('Failed to fetch models');
      
      const data = await response.json();
      setModels(data.models);
      
      toast({
        title: 'Success',
        description: `Loaded ${data.models.length} models from OpenRouter`,
      });
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      toast({
        title: 'Error',
        description: 'Failed to load models. Check your API key.',
        variant: 'destructive'
      });
    } finally {
      setLoadingModels(false);
    }
  };
  
  // Handle model selection
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    
    if (config) {
      const updatedConfig = {
        ...config,
        model: modelId
      };
      setConfig(updatedConfig);
      
      if (onConfigChange) {
        onConfigChange(updatedConfig);
      }
    }
  };
  
  // Save configuration
  const saveConfiguration = async () => {
    setLoading(true);
    try {
      // In a real implementation, you would save to the database here
      const updatedConfig: AgentLlmConfig = {
        hasLlm: true,
        serviceType: 'llm',
        providerName: 'openrouter',
        model: selectedModel
      };
      
      // Update local state
      setConfig(updatedConfig);
      
      // Notify parent component
      if (onConfigChange) {
        onConfigChange(updatedConfig);
      }
      
      toast({
        title: 'Success',
        description: 'LLM configuration saved successfully'
      });
    } catch (error) {
      console.error('Error saving LLM configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to save LLM configuration',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Group models by provider
  const getModelsByProvider = () => {
    const grouped: Record<string, ModelDetails[]> = {};
    
    models.forEach(model => {
      const provider = model.provider;
      if (!grouped[provider]) {
        grouped[provider] = [];
      }
      grouped[provider].push(model);
    });
    
    return grouped;
  };
  
  // Format pricing for display
  const formatPrice = (price: number) => {
    return `$${price.toFixed(4)} / 1M tokens`;
  };
  
  // Get model card style based on pricing
  const getModelCardStyle = (model: ModelDetails) => {
    // Premium models (more expensive)
    if (model.pricing.completion > 0.005) {
      return 'border-amber-500 dark:border-amber-400';
    }
    // Mid-tier models
    if (model.pricing.completion > 0.001) {
      return 'border-blue-500 dark:border-blue-400';
    }
    // Economy models
    return 'border-green-500 dark:border-green-400';
  };
  
  // Render provider section
  const renderProviderSection = (provider: string, providerModels: ModelDetails[]) => {
    return (
      <div key={provider} className="mb-8">
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <Badge variant="outline" className="mr-2">{provider}</Badge>
          <span>{providerModels.length} models</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providerModels.map(model => (
            <Card 
              key={model.id}
              className={cn(
                "cursor-pointer hover:shadow-md transition-shadow border-2",
                selectedModel === model.id ? "border-primary" : getModelCardStyle(model)
              )}
              onClick={() => handleModelChange(model.id)}
            >
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="truncate pr-2">{model.name.split('/').pop()}</span>
                  {selectedModel === model.id && 
                    <CheckCircledIcon className="h-4 w-4 text-primary" />
                  }
                </CardTitle>
                <CardDescription className="text-xs">
                  Context: {model.context_length.toLocaleString()} tokens
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 pb-2">
                <div className="text-xs text-muted-foreground">
                  <div>Input: {formatPrice(model.pricing.prompt)}</div>
                  <div>Output: {formatPrice(model.pricing.completion)}</div>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex flex-wrap gap-1">
                {model.capabilities?.slice(0, 3).map(capability => (
                  <Badge key={capability} variant="secondary" className="text-xs">
                    {capability}
                  </Badge>
                ))}
                {model.capabilities?.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{model.capabilities.length - 3} more
                  </Badge>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  };
  
  // Main render
  return (
    <div className={cn("agent-llm-config", className)}>
      <Tabs defaultValue="models" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>
        
        {/* Models Tab */}
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>LLM Selection</CardTitle>
              <CardDescription>
                Select a language model for this agent via OpenRouter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* API Key Configuration */}
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="use-system-key">Use system API key</Label>
                    <Switch 
                      id="use-system-key" 
                      checked={useSystemApiKey}
                      onCheckedChange={setUseSystemApiKey}
                    />
                  </div>
                  
                  {!useSystemApiKey && (
                    <div className="flex space-x-2">
                      <Input
                        id="api-key"
                        type="password"
                        placeholder="OpenRouter API Key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                
                {/* Load Models Button */}
                <Button 
                  onClick={fetchAvailableModels}
                  disabled={loadingModels || (!useSystemApiKey && !apiKey)}
                >
                  {loadingModels ? (
                    <>
                      <ReloadIcon className="h-4 w-4 mr-2 animate-spin" />
                      Loading Models...
                    </>
                  ) : (
                    <>Load Available Models</>
                  )}
                </Button>
                
                {/* Model Selection */}
                {models.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {Object.entries(getModelsByProvider()).map(([provider, providerModels]) => 
                      renderProviderSection(provider, providerModels)
                    )}
                  </div>
                ) : (
                  <div className="py-4">
                    {loadingModels ? (
                      <div className="flex justify-center items-center">
                        <ReloadIcon className="h-6 w-6 animate-spin mr-2" />
                        <span>Loading models...</span>
                      </div>
                    ) : (
                      <Alert>
                        <InfoCircledIcon className="h-4 w-4 mr-2" />
                        <AlertTitle>No Models Loaded</AlertTitle>
                        <AlertDescription>
                          Click "Load Available Models" to fetch models from OpenRouter.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Cancel</Button>
              <Button 
                onClick={saveConfiguration}
                disabled={loading || !selectedModel}
              >
                {loading ? (
                  <>
                    <ReloadIcon className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>Save Configuration</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Model Settings</CardTitle>
              <CardDescription>
                Configure how the language model responds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Temperature Control */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="temperature">Temperature ({temperature})</Label>
                  <span className="text-sm text-muted-foreground">
                    {temperature < 0.4 ? 'More precise' : temperature > 0.7 ? 'More creative' : 'Balanced'}
                  </span>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={1}
                  step={0.1}
                  value={[temperature]}
                  onValueChange={(values) => setTemperature(values[0])}
                />
              </div>
              
              {/* Max Tokens Control */}
              <div className="space-y-2">
                <Label htmlFor="max-tokens">
                  Max Output Tokens ({maxTokens})
                </Label>
                <Slider
                  id="max-tokens"
                  min={100}
                  max={4000}
                  step={100}
                  value={[maxTokens]}
                  onValueChange={(values) => setMaxTokens(values[0])}
                />
                <span className="text-xs text-muted-foreground">
                  Higher values allow for longer responses but may increase costs
                </span>
              </div>
              
              {/* Context Types */}
              <div className="space-y-2">
                <Label htmlFor="context-type">Default Context Type</Label>
                <Select defaultValue="general">
                  <SelectTrigger id="context-type">
                    <SelectValue placeholder="Select context type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="market">Market Analysis</SelectItem>
                    <SelectItem value="trade">Trade Execution</SelectItem>
                    <SelectItem value="strategy">Strategy Development</SelectItem>
                    <SelectItem value="risk">Risk Management</SelectItem>
                    <SelectItem value="portfolio">Portfolio Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Reset to Defaults</Button>
              <Button>Save Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Usage Tab */}
        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>Usage & Analytics</CardTitle>
              <CardDescription>
                Monitor your agent's LLM usage and costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                <AlertTitle>Usage Stats Unavailable</AlertTitle>
                <AlertDescription>
                  Connect your agent to an LLM and make some requests to see usage statistics.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                {/* Placeholder for usage stats */}
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-medium mb-2">Current Period Usage</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">0</div>
                      <div className="text-xs text-muted-foreground">Requests</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">0</div>
                      <div className="text-xs text-muted-foreground">Tokens</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">$0.00</div>
                      <div className="text-xs text-muted-foreground">Cost</div>
                    </div>
                  </div>
                </div>
                
                {/* Usage Limits */}
                <div className="space-y-2">
                  <Label htmlFor="monthly-limit">Monthly Budget Limit</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="monthly-limit"
                      type="number"
                      placeholder="$ amount"
                      min={0}
                      step={1}
                    />
                    <Button>Set</Button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    The agent will stop using the LLM when this limit is reached
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AgentLlmConfig
