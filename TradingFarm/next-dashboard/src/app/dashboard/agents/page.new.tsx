"use client";

import React from "react";
const { useState, useEffect, useCallback } = React;
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

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
  Info
} from "lucide-react";

// Import our API service hooks
import useElizaOS from "@/services/hooks/use-elizaos";
import useExchange from "@/services/hooks/use-exchange";
import useNotifications from "@/services/hooks/use-notifications";

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

export default function AgentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createBrowserClient();
  
  // State for agents and filtering
  const [agents, setAgents] = useState<ExtendedAgent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<ExtendedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [executionModeFilter, setExecutionModeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Agent creation dialog state
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // State for available models and capabilities
  const [availableModels, setAvailableModels] = useState<AgentModel[]>([]);
  const [availableCapabilities, setAvailableCapabilities] = useState<AgentCapability[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AgentRole[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  
  // Use our hooks for API integration
  const elizaOS = useElizaOS();
  const exchange = useExchange({ defaultExchange: 'bybit' });
  const notifications = useNotifications();
  
  // Fetch agents from the API
  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const agentsData = await elizaOS.loadAgents();
      
      if (agentsData) {
        // Process agents data with additional info
        const processedAgents = agentsData.map((agent: any) => {
          return {
            ...agent,
            // Set default properties if needed
            is_active: agent.status === 'active',
            performance: agent.performance_metrics ? {
              trades: agent.performance_metrics.total_trades || 0,
              win_rate: agent.performance_metrics.win_rate || 0, 
              profit_loss: agent.performance_metrics.profit_loss || 0
            } : undefined
          };
        });
        
        setAgents(processedAgents);
        setError(null);
      } else {
        setAgents([]);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      setError((error as Error).message);
      toast({
        title: 'Error',
        description: 'Failed to load agents. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [elizaOS, toast]);

  // Fetch agent models and capabilities
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
      
      // Fetch knowledge bases
      const { data: kbData, error: kbError } = await supabase
        .from('knowledge_bases')
        .select('*');
        
      if (kbError) throw kbError;
      if (kbData) setKnowledgeBases(kbData);
    } catch (error) {
      console.error('Error loading agent resources:', error);
      toast({
        title: 'Warning',
        description: 'Failed to load some agent resources. Creation functionality may be limited.',
        variant: 'default'
      });
    }
  }, [elizaOS, supabase, toast]);
  
  // Setup real-time subscription for agent updates
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      try {
        const subscription = supabase
          .channel('agents-channel')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'agents' 
          }, (_payload: any) => {
            fetchAgents();
          })
          .subscribe();

        return () => {
          supabase.removeChannel(subscription);
        };
      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
      }
    };

    setupRealtimeSubscription();
    
    // Cleanup function
    return () => {
      // Any cleanup if needed
    };
  }, [supabase, fetchAgents]);
  
  // Initial data loading effect
  useEffect(() => {
    fetchAgents();
    fetchAgentResources();
  }, [fetchAgents, fetchAgentResources]);
  
  // Apply filters to agents
  useEffect(() => {
    if (!agents.length) {
      setFilteredAgents([]);
      return;
    }
    
    let filtered = [...agents];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(agent => agent.status.toLowerCase() === statusFilter.toLowerCase());
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(agent => agent.type.toLowerCase() === typeFilter.toLowerCase());
    }
    
    // Apply execution mode filter
    if (executionModeFilter !== 'all') {
      filtered = filtered.filter(agent => agent.execution_mode.toLowerCase() === executionModeFilter.toLowerCase());
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(agent => 
        agent.name.toLowerCase().includes(query) ||
        (agent.description || '').toLowerCase().includes(query) ||
        agent.type.toLowerCase().includes(query) ||
        (agent.strategy_type || '').toLowerCase().includes(query) ||
        (agent.exchange || '').toLowerCase().includes(query)
      );
    }
    
    setFilteredAgents(filtered);
  }, [agents, statusFilter, typeFilter, executionModeFilter, searchQuery]);
  
  // Handle agent status change
  const handleAgentStatusChange = async (agentId: string, newStatus: 'active' | 'paused' | 'inactive' | 'error') => {
    try {
      setLoading(true);
      const result = await elizaOS.updateAgent(agentId, { status: newStatus });
      
      if (result) {
        toast({
          title: 'Status Updated',
          description: `Agent status changed to ${newStatus}`,
          variant: 'default'
        });
        
        // Update local state
        fetchAgents();
        
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
        description: 'Failed to update agent status',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle agent deletion
  const handleDeleteAgent = async (agentId: string) => {
    try {
      const confirmed = window.confirm('Are you sure you want to delete this agent? This action cannot be undone.');
      if (!confirmed) return;
      
      setLoading(true);
      const result = await elizaOS.deleteAgent(agentId);
      
      if (result) {
        toast({
          title: 'Agent Deleted',
          description: 'Agent has been successfully deleted',
          variant: 'default'
        });
        
        // Update local state
        fetchAgents();
        
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
        description: 'Failed to delete agent',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle creating a new agent
  const handleCreateAgent = async (agentData: Partial<Agent>) => {
    try {
      setIsCreatingAgent(true);
      const result = await elizaOS.createAgent(agentData);
      
      if (result) {
        toast({
          title: 'Agent Created',
          description: 'New agent has been successfully created',
          variant: 'default'
        });
        
        // Close dialog and refresh agents
        setShowCreateDialog(false);
        fetchAgents();
        
        // Create notification
        await notifications.createNotification({
          type: 'agent_created',
          title: 'New Agent Created',
          message: `${agentData.name} has been added to your agents`,
          status: 'unread',
          metadata: { agentId: result.id }
        });
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to create new agent',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingAgent(false);
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
            onClick={() => fetchAgents()}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Agent
              </Button>
            </DialogTrigger>
            
            {showCreateDialog && (
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create a New Agent</DialogTitle>
                  <DialogDescription>
                    Configure your new AI agent for trading or analysis
                  </DialogDescription>
                </DialogHeader>
                
                {/* Agent creation form will go here */}
                <div className="grid gap-4 py-4">
                  <p>Agent creation form - under development</p>
                </div>
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => {
                      // Demo creating a simple agent
                      handleCreateAgent({
                        name: 'New Test Agent',
                        type: 'trading',
                        status: 'inactive',
                        execution_mode: 'dry-run',
                        description: 'A test agent created via the UI'
                      });
                    }}
                    disabled={isCreatingAgent}
                  >
                    {isCreatingAgent ? (
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
            )}
          </Dialog>
        </div>
      </div>
      
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
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
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
          
          <Select value={executionModeFilter} onValueChange={setExecutionModeFilter}>
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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading agents...</span>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-md p-4 flex items-start">
          <AlertTriangle className="h-5 w-5 text-destructive mr-2 mt-0.5" />
          <div>
            <h3 className="font-medium text-destructive">Error loading agents</h3>
            <p className="text-sm text-destructive/80">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => fetchAgents()}
            >
              Retry
            </Button>
          </div>
        </div>
      )}
      
      {/* Agent cards grid */}
      {!loading && !error && (
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
                <Button onClick={() => setShowCreateDialog(true)}>
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
                <Card key={agent.id} className="overflow-hidden">
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
                        <span className={`font-medium ${agent.performance?.profit_loss && agent.performance.profit_loss >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {agent.performance?.profit_loss !== undefined
                            ? `${agent.performance.profit_loss >= 0 ? '+' : ''}${agent.performance.profit_loss.toFixed(2)}%`
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
                            disabled={agent.status === 'active'}
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Activate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => agent.status === 'active' && handleAgentStatusChange(agent.id, 'paused')}
                            disabled={agent.status !== 'active'}
                          >
                            <PauseCircle className="h-4 w-4 mr-2" />
                            Pause
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleAgentStatusChange(agent.id, 'inactive')}
                            disabled={agent.status === 'inactive'}
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
