'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  ChevronDown, 
  Terminal, 
  RefreshCw, 
  PauseCircle,
  Play,
  CpuIcon,
  MemoryStick,
  Clock,
  XCircle,
  Gauge,
  BellRing,
  LayoutList,
  BarChart2,
  LineChart,
  ExternalLink,
  Settings,
  Info
} from 'lucide-react';
import { Agent } from '@/types/agent';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { AgentHealthData, HealthStatus } from '@/lib/agents/health-monitor';
import { useToast } from '@/components/ui/use-toast';
import { useModal } from '@/components/ui/modal-controller';

export interface AgentCardProps {
  agent: Agent;
  health?: AgentHealthData;
  healthStatus?: HealthStatus;
  healthBadge?: React.ReactNode;
  onViewDetails?: (agentId: string) => void;
  onStartAgent?: (agentId: string) => Promise<boolean>;
  onStopAgent?: (agentId: string) => Promise<boolean>;
  onRestartAgent?: (agentId: string) => Promise<boolean>;
}

export function AgentCard({ 
  agent, 
  health, 
  healthBadge,
  onViewDetails,
  onStartAgent,
  onStopAgent,
  onRestartAgent
}: AgentCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const formatLastActive = (date: Date | null) => {
    if (!date) return 'Never active';
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const { showModal } = useModal();
  
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(agent.id);
    } else {
      // Use the modal system instead
      showModal('agentHealth', { agentId: agent.id });
    }
  };

  const handleAction = async (
    actionType: 'start' | 'stop' | 'restart',
    actionFn?: (agentId: string) => Promise<boolean>
  ) => {
    if (!actionFn) return;
    
    setIsLoading(true);
    try {
      const success = await actionFn(agent.id);
      if (success) {
        toast({
          title: `Agent ${actionType}ed`,
          description: `${agent.name} has been ${actionType}ed successfully.`,
        });
      } else {
        toast({
          title: `Failed to ${actionType} agent`,
          description: `Could not ${actionType} ${agent.name}. Please try again.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(`Error ${actionType}ing agent:`, error);
      toast({
        title: `Error ${actionType}ing agent`,
        description: `An error occurred while ${actionType}ing ${agent.name}.`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!health) {
      return <Activity className="h-4 w-4 text-gray-400" />;
    }
    
    switch (health.status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'inactive':
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    if (healthBadge) {
      return healthBadge;
    }

    switch (agent.status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'paused':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Paused</Badge>;
      case 'stopped':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Stopped</Badge>;
      case 'learning':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Learning</Badge>;
      default:
        return <Badge variant="outline">{agent.status}</Badge>;
    }
  };

  const getAgentTypeBadge = () => {
    switch (agent.type.toLowerCase()) {
      case 'trader':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Trader</Badge>;
      case 'analyzer':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">Analyzer</Badge>;
      case 'monitor':
        return <Badge variant="outline" className="bg-teal-100 text-teal-800 border-teal-300">Monitor</Badge>;
      case 'executor':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Executor</Badge>;
      default:
        return <Badge variant="outline">{agent.type}</Badge>;
    }
  };

  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpanded}
      className="rounded-lg border bg-card text-card-foreground shadow-sm"
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <CardTitle className="text-lg flex items-center gap-2">
              {getStatusIcon()}
              {agent.name}
            </CardTitle>
            <div className="flex flex-wrap gap-2 mt-1">
              {getStatusBadge()}
              {getAgentTypeBadge()}
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'transform rotate-180' : ''}`} />
              <span className="sr-only">Toggle details</span>
            </Button>
          </CollapsibleTrigger>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3 pt-0">
        <div className="text-sm text-muted-foreground space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Last active: {health ? formatLastActive(health.health_check_timestamp ? new Date(health.health_check_timestamp) : null) : 'Unknown'}</span>
          </div>
          
          {health && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <div className="flex items-center gap-1">
                          <CpuIcon className="h-3 w-3" />
                          <span>CPU</span>
                        </div>
                        <span>{health.cpu_usage}%</span>
                      </div>
                      <Progress 
                        value={health.cpu_usage} 
                        className="h-1.5" 
                        indicatorClassName={health.cpu_usage > 90 ? "bg-red-500" : health.cpu_usage > 70 ? "bg-amber-500" : "bg-green-500"}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>CPU Usage: {health.cpu_usage}%</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <div className="flex items-center gap-1">
                          <MemoryStick className="h-3 w-3" />
                          <span>Memory</span>
                        </div>
                        <span>{health.memory_usage}%</span>
                      </div>
                      <Progress 
                        value={health.memory_usage} 
                        className="h-1.5" 
                        indicatorClassName={health.memory_usage > 90 ? "bg-red-500" : health.memory_usage > 70 ? "bg-amber-500" : "bg-green-500"}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Memory Usage: {health.memory_usage}%</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <div className="flex items-center gap-1">
                          <Gauge className="h-3 w-3" />
                          <span>Response</span>
                        </div>
                        <span>{health.response_time}ms</span>
                      </div>
                      <Progress 
                        value={Math.min(100, (health.response_time || 0) / 3)} 
                        className="h-1.5" 
                        indicatorClassName={(health.response_time || 0) > 200 ? "bg-red-500" : (health.response_time || 0) > 100 ? "bg-amber-500" : "bg-green-500"}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Response Time: {health.response_time}ms</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <div className="flex items-center gap-1">
                          <BellRing className="h-3 w-3" />
                          <span>Errors</span>
                        </div>
                        <span>{health.error_count}</span>
                      </div>
                      <Progress 
                        value={Math.min(100, health.error_count * 10)} 
                        className="h-1.5" 
                        indicatorClassName={health.error_count > 10 ? "bg-red-500" : health.error_count > 0 ? "bg-amber-500" : "bg-green-500"}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Errors: {health.error_count} | Warnings: {health.warning_count}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </CardContent>
      
      <CollapsibleContent>
        <CardContent className="pt-0 border-t">
          {health && (health.error_count > 0 || health.warning_count > 0) ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Issues ({health.error_count + health.warning_count})</span>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                {health.error_count > 0 && (
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <span>{health.error_count} error{health.error_count !== 1 ? 's' : ''} detected</span>
                  </div>
                )}
                {health.warning_count > 0 && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                    <span>{health.warning_count} warning{health.warning_count !== 1 ? 's' : ''} detected</span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  View details for more information
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>No issues detected</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="border rounded-md p-2">
              <h4 className="text-xs font-medium mb-1 flex items-center gap-1">
                <Terminal className="h-3.5 w-3.5" />
                Agent Details
              </h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-medium">ID:</span>
                  <span className="col-span-2 truncate" title={agent.id}>{agent.id ? agent.id.substring(0, 8) + '...' : 'N/A'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-medium">Farm:</span>
                  <span className="col-span-2 truncate" title={agent.farm_id}>{agent.farm_id ? agent.farm_id.substring(0, 8) + '...' : 'N/A'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-medium">Created:</span>
                  <span className="col-span-2">
                    {formatDistanceToNow(new Date(agent.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="border rounded-md p-2">
              <h4 className="text-xs font-medium mb-1 flex items-center gap-1">
                <LayoutList className="h-3.5 w-3.5" />
                Health Stats
              </h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-medium">Uptime:</span>
                  <span className="col-span-2">{health ? `${(health.uptime_percentage || 99.9).toFixed(1)}%` : 'Unknown'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-medium">Status:</span>
                  <span className="col-span-2">{health ? health.status : 'Unknown'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-medium">Last check:</span>
                  <span className="col-span-2">
                    {health ? formatLastActive(health.health_check_timestamp ? new Date(health.health_check_timestamp) : null) : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </CollapsibleContent>
      
      <CardFooter className="pt-1">
        <div className="flex justify-between w-full">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleViewDetails}
            disabled={isLoading}
          >
            Details
          </Button>
          
          <div className="flex gap-1">
            {onStartAgent && agent.status !== 'active' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleAction('start', onStartAgent)}
                disabled={isLoading}
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                Start
              </Button>
            )}
            
            {onStopAgent && agent.status === 'active' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleAction('stop', onStopAgent)}
                disabled={isLoading}
              >
                <PauseCircle className="h-3.5 w-3.5 mr-1" />
                Stop
              </Button>
            )}
            
            {onRestartAgent && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleAction('restart', onRestartAgent)}
                disabled={isLoading}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Restart
              </Button>
            )}
          </div>
        </div>
      </CardFooter>
    </Collapsible>
  );
}
