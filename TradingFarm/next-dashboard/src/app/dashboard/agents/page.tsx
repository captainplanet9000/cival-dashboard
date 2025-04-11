"use client";

import React from "react";
const { useState, useEffect, useCallback } = React;
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// Import Lucide icons
import { 
  Bot, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Settings, 
  PlayCircle, 
  PauseCircle,
  BarChart,
  Trash2,
  Search,
  RefreshCcw,
  Laptop,
  AlertTriangle,
  PlusCircle,
  Shield,
  Zap,
  MessageSquare,
  Brain,
  Loader2,
  Plus,
  Info,
  WifiOff
} from "lucide-react";

// Import our API service hooks
import useElizaOS from "@/services/hooks/use-elizaos";
import useExchange from "@/services/hooks/use-exchange";
import useNotifications from "@/services/hooks/use-notifications";
import useElizaAgentsWithFallback, { formatError } from "@/services/hooks/use-elizaos-with-fallback";

// Import Shadcn components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define types for agent integration
interface AgentModel {
  id: string;
  name: string;
  description: string;
  provider: string;
  capabilities: string[];
  contextSize: number;
  maxOutputTokens: number;
  isAvailable: boolean;
}

interface AgentCapability {
  id: string;
  name: string;
  description: string;
  category: string;
  requiredPermissions: string[];
}

interface AgentRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  defaultCapabilities: string[];
}

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  lastUpdated: string;
  sizeInBytes: number;
}

interface AgentConfiguration {
  description?: string;
  strategy_type?: string;
  risk_level?: string;
  target_markets?: string[];
  tradingPairs?: string[];
  execution_mode?: 'live' | 'dry-run' | 'backtest';
  modelConfig?: {
    modelId: string;
    temperature: number;
    maxTokens: number;
    systemPrompt?: string;
  };
  knowledgeBaseIds?: string[];
  capabilities?: string[];
  role?: string;
  performance_metrics?: {
    win_rate?: number;
    profit_loss?: number;
    total_trades?: number;
    average_trade_duration?: number;
  };
  [key: string]: any;
}

interface Agent {
  id: string;
  name: string;
  description?: string | null;
  farm_id?: string | null;
  type: 'trading' | 'analytical' | 'research' | 'conversational';
  strategy_type?: string;
  status: 'active' | 'paused' | 'initializing' | 'error' | 'inactive';
  risk_level?: 'low' | 'medium' | 'high';
  exchange?: string;
  target_markets?: string[];
  config?: any;
  configuration?: AgentConfiguration;
  instructions?: string | null;
  user_id?: string | null;
  is_active?: boolean;
  performance_metrics?: {
    win_rate?: number;
    profit_loss?: number;
    total_trades?: number;
    average_trade_duration?: number;
  };
  created_at: string;
  updated_at: string;
  execution_mode: 'live' | 'dry-run' | 'backtest';
  model_id?: string;
  knowledge_base_ids?: string[];
  capabilities?: string[];
  role_id?: string;
}

interface ExtendedAgent extends Agent {
  farm_name?: string;
  model?: AgentModel;
  knowledge_bases?: KnowledgeBase[];
  role?: AgentRole;
  last_message?: {
    content: string;
    timestamp: string;
  };
  performance?: {
    trades: number;
    win_rate: number;
    profit_loss: number;
  };
  is_fallback?: boolean;
  data_source?: 'api' | 'cache' | 'mock';
}

// Helper components for the agents page

// Agent status badge component with tooltip
const AgentStatusBadge = ({ status, tooltipText }: { status: string, tooltipText?: string }) => {
  // Get the appropriate color for the status
  const getStatusColor = () => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'initializing':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };
  
  // Get the appropriate icon for the status
  const getStatusIcon = () => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-3.5 w-3.5 mr-1" />;
      case 'paused':
        return <PauseCircle className="h-3.5 w-3.5 mr-1" />;
      case 'inactive':
        return <AlertCircle className="h-3.5 w-3.5 mr-1" />;
      case 'initializing':
        return <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />;
      case 'error':
        return <AlertTriangle className="h-3.5 w-3.5 mr-1" />;
      default:
        return <Info className="h-3.5 w-3.5 mr-1" />;
    }
  };
  
  const content = (
    <Badge className={`${getStatusColor()} flex items-center px-2 py-0.5 text-xs font-medium rounded-full border`}>
      {getStatusIcon()}
      <span className="capitalize">{status}</span>
    </Badge>
  );
  
  // If tooltip text is provided, wrap the badge in a tooltip
  if (tooltipText) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return content;
};

// Agent type badge component
const AgentTypeBadge = ({ type }: { type: string }) => {
  // Get the appropriate color for the type
  const getTypeColor = () => {
    switch (type.toLowerCase()) {
      case 'trading':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'analytical':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'research':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'conversational':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };
  
  // Get the appropriate icon for the type
  const getTypeIcon = () => {
    switch (type.toLowerCase()) {
      case 'trading':
        return <BarChart className="h-3.5 w-3.5 mr-1" />;
      case 'analytical':
        return <Brain className="h-3.5 w-3.5 mr-1" />;
      case 'research':
        return <Search className="h-3.5 w-3.5 mr-1" />;
      case 'conversational':
        return <MessageSquare className="h-3.5 w-3.5 mr-1" />;
      default:
        return <Bot className="h-3.5 w-3.5 mr-1" />;
    }
  };
  
  return (
    <Badge className={`${getTypeColor()} flex items-center px-2 py-0.5 text-xs font-medium rounded-full border`}>
      {getTypeIcon()}
      <span className="capitalize">{type}</span>
    </Badge>
  );
};

// Risk level badge component
const RiskLevelBadge = ({ level }: { level?: string }) => {
  if (!level) return null;
  
  // Get the color based on risk level
  const getColor = () => {
    switch (level.toLowerCase()) {
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };
  
  return (
    <Badge className={`${getColor()} px-2 py-0.5 text-xs font-medium rounded-full border`}>
      <span className="capitalize">{level}</span>
    </Badge>
  );
};

// Execution mode badge
const ExecutionModeBadge = ({ mode }: { mode: string }) => {
  // Get the color based on mode
  const getColor = () => {
    switch (mode.toLowerCase()) {
      case 'live':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'dry-run':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'backtest':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };
  
  // Get the icon based on mode
  const getIcon = () => {
    switch (mode.toLowerCase()) {
      case 'live':
        return <Zap className="h-3.5 w-3.5 mr-1" />;
      case 'dry-run':
        return <Laptop className="h-3.5 w-3.5 mr-1" />;
      case 'backtest':
        return <Clock className="h-3.5 w-3.5 mr-1" />;
      default:
        return <Settings className="h-3.5 w-3.5 mr-1" />;
    }
  };
  
  return (
    <Badge className={`${getColor()} flex items-center px-2 py-0.5 text-xs font-medium rounded-full border`}>
      {getIcon()}
      <span className="capitalize">{mode}</span>
    </Badge>
  );
};

// Agent Avatar component with AI model indication
const AgentAvatar = ({ agent }: { agent: ExtendedAgent }) => {
  // Determine the avatar content based on agent type and model
  const getAvatarContent = () => {
    // Fallback based on agent type
    const initials = agent.name.split(' ').map(n => n[0]).join('').toUpperCase();
    let bgColor = "bg-blue-500";
    
    switch (agent.type.toLowerCase()) {
      case 'trading':
        bgColor = "bg-blue-500";
        break;
      case 'analytical':
        bgColor = "bg-purple-500";
        break;
      case 'research':
        bgColor = "bg-amber-500";
        break;
      case 'conversational':
        bgColor = "bg-green-500";
        break;
    }
    
    return <AvatarFallback className={bgColor}>{initials}</AvatarFallback>;
  };
  
  return (
    <Avatar className="h-12 w-12 border-2 border-primary/10">
      {getAvatarContent()}
    </Avatar>
  );
};

// External variable for coordinating dialog state across components
let createDialogOpenHandler: (() => void) | null = null;

// Create Agent Dialog Component 
function CreateAgentDialog({ 
  onAgentCreated 
}: { 
  onAgentCreated: () => Promise<void> 
}) {
  const { toast } = useToast();
  const supabase = createBrowserClient();
  const {
    createAgent,
    isConnected
  } = useElizaAgentsWithFallback();

  // State for dialog
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Register the open handler when the component mounts
  useEffect(() => {
    createDialogOpenHandler = () => setOpen(true);
    return () => {
      createDialogOpenHandler = null;
    };
  }, []);
  
  // New agent creation states
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentType, setNewAgentType] = useState<string>('trading');
  const [newAgentDescription, setNewAgentDescription] = useState('');
  const [newAgentExecutionMode, setNewAgentExecutionMode] = useState<string>('dry-run');
  const [newAgentRiskLevel, setNewAgentRiskLevel] = useState<string>('medium');
  const [newAgentModelId, setNewAgentModelId] = useState<string>('');
  const [newAgentInstructions, setNewAgentInstructions] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // State for available resources
  const [availableModels, setAvailableModels] = useState<AgentModel[]>([]);
  
  // Fetch models when dialog opens
  useEffect(() => {
    if (open) {
      // Populate with hardcoded values for now
      setAvailableModels([
        {
          id: 'gpt-4',
          name: 'GPT-4',
          description: 'OpenAI GPT-4 model for advanced reasoning',
          provider: 'openai',
          capabilities: ['code', 'reasoning', 'conversation'],
          contextSize: 32000,
          maxOutputTokens: 4096,
          isAvailable: true
        },
        {
          id: 'claude-3-opus',
          name: 'Claude 3 Opus',
          description: 'Anthropic Claude 3 Opus model for complex tasks',
          provider: 'anthropic',
          capabilities: ['research', 'reasoning', 'conversation'],
          contextSize: 200000,
          maxOutputTokens: 4096,
          isAvailable: true
        },
        {
          id: 'gemini-pro',
          name: 'Gemini Pro',
          description: 'Google Gemini Pro model for general purpose tasks',
          provider: 'google',
          capabilities: ['research', 'reasoning', 'conversation'],
          contextSize: 30000,
          maxOutputTokens: 2048,
          isAvailable: true
        }
      ]);
    }
  }, [open]);
  
  const handleSubmit = async () => {
    if (!newAgentName) {
      setError('Agent name is required');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      // Prepare agent data from form inputs
      const agentData: any = {
        name: newAgentName,
        type: newAgentType as 'trading' | 'analytical' | 'research' | 'conversational',
        execution_mode: newAgentExecutionMode as 'live' | 'dry-run' | 'backtest',
        description: newAgentDescription,
        status: 'initializing',
        risk_level: newAgentRiskLevel as 'low' | 'medium' | 'high',
        instructions: newAgentInstructions || null,
        is_active: false
      };

      // Add model ID if selected
      if (newAgentModelId) {
        agentData.model_id = newAgentModelId;
      }
      
      // Try to create agent with the new hook that has built-in fallbacks
      const result = await createAgent(agentData);
      
      if (result) {
        toast({
          title: "Agent Created",
          description: `${newAgentName} has been created successfully.`,
        });
        
        // Close dialog and reset form
        setOpen(false);
        resetForm();
        
        // Notify parent component to refresh the list
        await onAgentCreated();
      } else {
        throw new Error("Failed to create agent");
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      setError(formatError(error));
      
      toast({
        variant: 'destructive',
        title: 'Agent Creation Failed',
        description: formatError(error),
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const resetForm = () => {
    setNewAgentName('');
    setNewAgentType('trading');
    setNewAgentDescription('');
    setNewAgentExecutionMode('dry-run');
    setNewAgentRiskLevel('medium');
    setNewAgentModelId('');
    setNewAgentInstructions('');
    setShowAdvancedOptions(false);
    setError(null);
  };
  
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="h-4 w-4 mr-2" />
          New Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Fill out the form below to create a new trading agent.
            {!isConnected && (
              <div className="mt-2 text-amber-500 flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                <span>Offline mode: Agent will be saved locally until connection is restored</span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {/* Agent Creation Form */}
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              placeholder="Enter agent name"
              className="col-span-3"
              value={newAgentName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAgentName(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <Select 
              value={newAgentType} 
              onValueChange={setNewAgentType}
            >
              <SelectTrigger id="type" className="col-span-3">
                <SelectValue placeholder="Select agent type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trading">Trading</SelectItem>
                <SelectItem value="analytical">Analytical</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="conversational">Conversational</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="execution-mode" className="text-right">
              Execution Mode
            </Label>
            <Select 
              value={newAgentExecutionMode} 
              onValueChange={setNewAgentExecutionMode}
            >
              <SelectTrigger id="execution-mode" className="col-span-3">
                <SelectValue placeholder="Select execution mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dry-run">Dry Run (Simulated)</SelectItem>
                <SelectItem value="backtest">Backtest</SelectItem>
                <SelectItem value="live">Live Trading</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe this agent's purpose"
              className="col-span-3"
              value={newAgentDescription}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewAgentDescription(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right">
              <Label htmlFor="advanced-toggle">Advanced</Label>
            </div>
            <div className="flex items-center space-x-2 col-span-3">
              <Switch 
                id="advanced-toggle" 
                checked={showAdvancedOptions}
                onCheckedChange={setShowAdvancedOptions}
              />
              <Label htmlFor="advanced-toggle">Show advanced options</Label>
            </div>
          </div>
          
          {showAdvancedOptions && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="risk-level" className="text-right">
                  Risk Level
                </Label>
                <Select 
                  value={newAgentRiskLevel || 'medium'} 
                  onValueChange={setNewAgentRiskLevel}
                >
                  <SelectTrigger id="risk-level" className="col-span-3">
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="model" className="text-right">
                  AI Model
                </Label>
                <Select 
                  value={newAgentModelId || ''} 
                  onValueChange={setNewAgentModelId}
                >
                  <SelectTrigger id="model" className="col-span-3">
                    <SelectValue placeholder="Select AI model (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model: AgentModel) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="instructions" className="text-right">
                  Instructions
                </Label>
                <Textarea
                  id="instructions"
                  placeholder="Custom instructions for this agent"
                  className="col-span-3"
                  value={newAgentInstructions}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewAgentInstructions(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isCreating || !newAgentName}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Agent'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogPrimitive.Root>
  );
}

// Connection status indicator component
function ConnectionStatusIndicator({ 
  isConnected, 
  dataSource,
  isDevelopmentMode 
}: { 
  isConnected: boolean;
  dataSource: 'api' | 'cache' | 'mock' | null;
  isDevelopmentMode: boolean;
}) {
  if (isConnected && (!dataSource || dataSource === 'api')) return null;
  
  let statusColor = 'bg-yellow-100 border-yellow-200 text-yellow-800';
  let statusIcon = <AlertTriangle className="h-4 w-4 text-yellow-600" />;
  let statusText = 'Limited connectivity mode';
  let statusDescription = 'Some features may be unavailable.';
  
  if (!isConnected && dataSource === 'mock') {
    statusColor = 'bg-amber-100 border-amber-200 text-amber-800';
    statusIcon = <WifiOff className="h-4 w-4 text-amber-600" />;
    statusText = 'Offline mode - Using mock data';
    statusDescription = 'Changes will be saved locally and synchronized when connection is restored.';
  } else if (!isConnected && dataSource === 'cache') {
    statusColor = 'bg-blue-100 border-blue-200 text-blue-800';
    statusIcon = <Clock className="h-4 w-4 text-blue-600" />;
    statusText = 'Using cached data';
    statusDescription = 'Showing your previously loaded agents. Updates will be synchronized when connection is restored.';
  }
  
  return (
    <Alert variant="outline" className={`mb-4 ${statusColor}`}>
      <div className="flex gap-2 items-start">
        {statusIcon}
        <div>
          <AlertTitle>{statusText}</AlertTitle>
          <AlertDescription className="mt-1 text-sm">
            {statusDescription}
            {isDevelopmentMode && (
              <span className="block mt-1 text-xs font-medium">Development mode active</span>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}

// Agent card skeleton loader component
function AgentCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 space-y-3">
        <div className="flex justify-between items-start">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="w-20 h-6" />
            <Skeleton className="w-20 h-6" />
          </div>
        </div>
        <Skeleton className="h-6 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-full mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="flex justify-between w-full">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </CardFooter>
    </Card>
  );
}

export default function AgentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [executionModeFilter, setExecutionModeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Use our new hook with fallback capabilities
  const {
    agents,
    loading,
    error,
    isConnected,
    dataSource,
    isDevelopmentMode,
    refreshAgents,
    updateAgent,
    deleteAgent
  } = useElizaAgentsWithFallback();
  
  // Filtered agents based on current filters
  const [filteredAgents, setFilteredAgents] = useState<any[]>([]);
  
  // State for available models and capabilities (used in other components)
  const [availableModels, setAvailableModels] = useState<AgentModel[]>([]);
  const [availableCapabilities, setAvailableCapabilities] = useState<AgentCapability[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AgentRole[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  
  // Use our API hooks
  const exchange = useExchange({ defaultExchange: 'bybit' });
  const notifications = useNotifications();
  
  // Memoized filter handlers to prevent infinite render loops
  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
  }, []);
  
  const handleTypeFilterChange = useCallback((value: string) => {
    setTypeFilter(value);
  }, []);
  
  const handleExecutionModeFilterChange = useCallback((value: string) => {
    setExecutionModeFilter(value);
  }, []);
  
  // Fetch agent resources
  const fetchAgentResources = useCallback(async () => {
    try {
      // For now, use hardcoded values for these resources
      // In a real implementation, these would come from API calls
      const models = [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          description: 'OpenAI GPT-4 model for advanced reasoning',
          provider: 'openai',
          capabilities: ['code', 'reasoning', 'conversation'],
          contextSize: 32000,
          maxOutputTokens: 4096,
          isAvailable: true
        },
        {
          id: 'claude-3-opus',
          name: 'Claude 3 Opus',
          description: 'Anthropic Claude 3 Opus model for complex tasks',
          provider: 'anthropic',
          capabilities: ['research', 'reasoning', 'conversation'],
          contextSize: 200000,
          maxOutputTokens: 4096,
          isAvailable: true
        }
      ];
      setAvailableModels(models);
      
      // Sample capabilities
      const capabilities = [
        {
          id: 'trading',
          name: 'Trading',
          description: 'Ability to execute trades on exchanges',
          category: 'action',
          requiredPermissions: ['exchange_access']
        },
        {
          id: 'analysis',
          name: 'Market Analysis',
          description: 'Ability to analyze market data and trends',
          category: 'cognitive',
          requiredPermissions: ['data_access']
        }
      ];
      setAvailableCapabilities(capabilities);
      
      // Sample roles
      const roles = [
        {
          id: 'trader',
          name: 'Trader',
          description: 'Agent focused on executing trades',
          permissions: ['exchange_access', 'data_access'],
          defaultCapabilities: ['trading']
        },
        {
          id: 'analyst',
          name: 'Market Analyst',
          description: 'Agent focused on market analysis',
          permissions: ['data_access'],
          defaultCapabilities: ['analysis']
        }
      ];
      setAvailableRoles(roles);
      
      // Fetch knowledge bases - in the new architecture, this would be handled by a hook with fallback
      const supabase = createBrowserClient();
      try {
        const { data: kbData, error: kbError } = await supabase
          .from('knowledge_bases')
          .select('*');
          
        if (kbError) {
          console.warn('Error fetching knowledge bases:', kbError);
          setKnowledgeBases([]);
        } else if (kbData) {
          setKnowledgeBases(kbData);
        }
      } catch (supabaseError) {
        console.warn('Supabase connection error:', supabaseError);
        setKnowledgeBases([]);
      }
    } catch (error) {
      console.error('Error loading agent resources:', error);
      toast({
        title: 'Warning',
        description: 'Failed to load some agent resources. Creation functionality may be limited.',
        variant: 'default'
      });
    }
  }, [toast]);
  
  // Initial data loading effect
  useEffect(() => {
    fetchAgentResources();
  }, [fetchAgentResources]);
  
  // Apply filters to agents when dependency changes
  useEffect(() => {
    if (!agents) {
      setFilteredAgents([]);
      return;
    }
    
    let filtered = [...agents];
    
    // Apply status filter if not showing all
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(agent => agent.status?.toLowerCase() === statusFilter.toLowerCase());
    }
    
    // Apply type filter if not showing all
    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter(agent => agent.type?.toLowerCase() === typeFilter.toLowerCase());
    }
    
    // Apply execution mode filter if not showing all
    if (executionModeFilter && executionModeFilter !== 'all') {
      filtered = filtered.filter(agent => agent.execution_mode?.toLowerCase() === executionModeFilter.toLowerCase());
    }
    
    // Apply search query if provided
    if (searchQuery && searchQuery.length > 0) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(agent => {
        return (
          (agent.name?.toLowerCase().includes(query) ?? false) ||
          (agent.description?.toLowerCase().includes(query) ?? false) ||
          (agent.type?.toLowerCase().includes(query) ?? false) ||
          (agent.strategy_type?.toLowerCase().includes(query) ?? false) ||
          (agent.exchange?.toLowerCase().includes(query) ?? false)
        );
      });
    }
    
    setFilteredAgents(filtered);
  }, [agents, statusFilter, typeFilter, executionModeFilter, searchQuery]);
  
  // Handle agent status change
  const handleAgentStatusChange = async (agentId: string, newStatus: 'active' | 'paused' | 'inactive' | 'error') => {
    try {
      const result = await updateAgent(agentId, { status: newStatus });
      
      if (result) {
        toast({
          title: 'Status Updated',
          description: `Agent status changed to ${newStatus}`,
          variant: 'default'
        });
        
        // Create notification
        await notifications.createNotification({
          type: 'agent_status_change',
          title: 'Agent Status Changed',
          message: `Agent status changed to ${newStatus}`,
          status: 'unread',
          metadata: { agentId, newStatus }
        });
      }
    } catch (error) {
      console.error('Error changing agent status:', error);
      toast({
        title: 'Error',
        description: formatError(error),
        variant: 'destructive'
      });
    }
  };
  
  // Handle agent deletion
  const handleDeleteAgent = async (agentId: string) => {
    try {
      const confirmed = window.confirm('Are you sure you want to delete this agent? This action cannot be undone.');
      if (!confirmed) return;
      
      const result = await deleteAgent(agentId);
      
      if (result) {
        toast({
          title: 'Agent Deleted',
          description: 'Agent has been successfully deleted',
          variant: 'default'
        });
        
        // Create notification
        await notifications.createNotification({
          type: 'agent_deleted',
          title: 'Agent Deleted',
          message: 'An agent has been deleted from your account',
          status: 'unread',
          metadata: { agentId }
        });
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: 'Error',
        description: formatError(error),
        variant: 'destructive'
      });
    }
  };

  // Render the agents UI
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">AI Agents</h1>
          <p className="text-muted-foreground">Create and manage your trading and analytical agents</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refreshAgents()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          
          <CreateAgentDialog onAgentCreated={refreshAgents} />
        </div>
      </div>
      
      {/* Connection Status Indicator */}
      <ConnectionStatusIndicator 
        isConnected={isConnected} 
        dataSource={dataSource}
        isDevelopmentMode={isDevelopmentMode}
      />
      
      {/* Filtering and search controls */}
      <div className="bg-card border rounded-md p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search agents..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="initializing">Initializing</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="trading">Trading</SelectItem>
              <SelectItem value="analytical">Analytical</SelectItem>
              <SelectItem value="research">Research</SelectItem>
              <SelectItem value="conversational">Conversational</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={executionModeFilter} onValueChange={handleExecutionModeFilterChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="dry-run">Dry Run</SelectItem>
              <SelectItem value="backtest">Backtest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <AgentCardSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      )}
      
      {/* Error state */}
      {!loading && error && !agents.length && (
        <div className="bg-destructive/10 border border-destructive rounded-md p-6 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
          <h3 className="font-medium text-lg text-destructive mb-2">Error loading agents</h3>
          <p className="text-destructive/80 mb-4 max-w-md">{error}</p>
          <Button
            variant="outline"
            onClick={() => refreshAgents()}
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}
      
      {/* Agent cards grid */}
      {!loading && (
        <div>
          {filteredAgents.length === 0 ? (
            <div className="border rounded-md flex flex-col items-center justify-center p-12 text-center">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No agents found</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                {agents.length === 0 ?
                  "You don't have any agents yet. Create your first agent to get started." :
                  "No agents match your current filters. Try adjusting your search or filter criteria."}
              </p>
              {agents.length === 0 ? (
                <Button onClick={() => createDialogOpenHandler?.()}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Agent
                </Button>
              ) : (
                <Button variant="outline" onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setExecutionModeFilter('all');
                }}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgents.map((agent: ExtendedAgent) => (
                <Card key={agent.id} className={`overflow-hidden ${agent.is_fallback ? 'border-amber-200 bg-amber-50/20' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start mb-2">
                      <AgentAvatar agent={agent} />
                      <div className="flex items-center space-x-2">
                        <AgentStatusBadge status={agent.status} />
                        <ExecutionModeBadge mode={agent.execution_mode} />
                      </div>
                    </div>
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <AgentTypeBadge type={agent.type} />
                      {agent.risk_level && <RiskLevelBadge level={agent.risk_level} />}
                      {agent.is_fallback && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                          Offline
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm line-clamp-2 mb-4 text-muted-foreground">
                      {agent.description || "No description provided."}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Exchange</span>
                        <span className="font-medium">
                          {agent.exchange || "Not specified"}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Markets</span>
                        <span className="font-medium">
                          {agent.target_markets && agent.target_markets.length > 0
                            ? `${agent.target_markets[0]}${agent.target_markets.length > 1 ? ` +${agent.target_markets.length - 1}` : ''}`
                            : "Not specified"}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Strategy</span>
                        <span className="font-medium capitalize">
                          {agent.strategy_type || "Custom"}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Profit/Loss</span>
                        <span className={`font-medium ${agent.performance_metrics?.profit_loss && agent.performance_metrics.profit_loss >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {agent.performance_metrics?.profit_loss !== undefined
                            ? `${agent.performance_metrics.profit_loss >= 0 ? '+' : ''}${agent.performance_metrics.profit_loss.toFixed(2)}%`
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <div className="flex justify-between w-full">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem
                            onClick={() => agent.status !== 'active' && handleAgentStatusChange(agent.id, 'active')}
                            disabled={agent.status === 'active' || !isConnected}
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Activate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => agent.status === 'active' && handleAgentStatusChange(agent.id, 'paused')}
                            disabled={agent.status !== 'active' || !isConnected}
                          >
                            <PauseCircle className="h-4 w-4 mr-2" />
                            Pause
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleAgentStatusChange(agent.id, 'inactive')}
                            disabled={agent.status === 'inactive' || !isConnected}
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Stop
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteAgent(agent.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <Link href={`/dashboard/agents/${agent.id}`}>
                        <Button size="sm">
                          <Settings className="mr-2 h-4 w-4" />
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
