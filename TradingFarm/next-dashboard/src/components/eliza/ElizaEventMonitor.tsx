'use client';

import { useEffect, useState } from 'react';
import { useElizaEvents, ElizaEvent } from '../../lib/elizaos';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsItem, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, AlertTriangle, BellRing, Info, RefreshCcw, Trash2, WifiOff } from 'lucide-react';

interface ElizaEventMonitorProps {
  maxEvents?: number;
  showAgentEvents?: boolean;
  showCommandEvents?: boolean;
  showSystemEvents?: boolean;
  agentId?: string;
}

/**
 * ElizaOS Event Monitor Component
 * 
 * Displays real-time events from ElizaOS
 */
export default function ElizaEventMonitor({
  maxEvents = 50,
  showAgentEvents = true,
  showCommandEvents = true,
  showSystemEvents = true,
  agentId
}: ElizaEventMonitorProps) {
  const { events, connected, clearEvents } = useElizaEvents();
  const [filteredEvents, setFilteredEvents] = useState<ElizaEvent[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  
  // Filter events based on props and active filter
  useEffect(() => {
    let filtered = [...events];
    
    // Filter by agent ID if provided
    if (agentId) {
      filtered = filtered.filter(event => event.agent_id === agentId);
    }
    
    // Apply event type filters
    if (!showAgentEvents) {
      filtered = filtered.filter(event => event.event_type !== 'agent_status_change');
    }
    
    if (!showCommandEvents) {
      filtered = filtered.filter(event => event.event_type !== 'command_complete');
    }
    
    if (!showSystemEvents) {
      filtered = filtered.filter(event => event.event_type !== 'system_alert');
    }
    
    // Apply tab filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(event => {
        if (activeFilter === 'agent') return event.event_type === 'agent_status_change';
        if (activeFilter === 'command') return event.event_type === 'command_complete';
        if (activeFilter === 'system') return event.event_type === 'system_alert';
        if (activeFilter === 'tasks') return event.event_type === 'task_update';
        if (activeFilter === 'messages') return event.event_type === 'agent_message';
        return false;
      });
    }
    
    // Limit to max events
    filtered = filtered.slice(0, maxEvents);
    
    setFilteredEvents(filtered);
  }, [events, activeFilter, showAgentEvents, showCommandEvents, showSystemEvents, agentId, maxEvents]);

  // Get icon for event type
  const getEventIcon = (event: ElizaEvent) => {
    switch (event.event_type) {
      case 'agent_status_change': return <Badge variant="outline" className="whitespace-nowrap">Agent Status</Badge>;
      case 'command_complete': return <Badge variant="outline" className="whitespace-nowrap">Command</Badge>;
      case 'system_alert': return <Badge variant="outline" className="whitespace-nowrap">System Alert</Badge>;
      case 'agent_message': return <Badge variant="outline" className="whitespace-nowrap">Message</Badge>;
      case 'task_update': return <Badge variant="outline" className="whitespace-nowrap">Task</Badge>;
      default: return <Badge variant="outline" className="whitespace-nowrap">Event</Badge>;
    }
  };
  
  // Get severity icon
  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'warning': return <BellRing className="h-4 w-4 text-yellow-500" />;
      case 'info':
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>ElizaOS Events</CardTitle>
            <CardDescription>Real-time events from ElizaOS</CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            {connected ? (
              <div className="flex items-center text-xs text-green-500">
                <div className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                Connected
              </div>
            ) : (
              <div className="flex items-center text-xs text-red-500">
                <WifiOff className="h-3 w-3 mr-1" />
                Disconnected
              </div>
            )}
            
            <Button variant="ghost" size="sm" onClick={clearEvents}>
              <Trash2 className="h-4 w-4 mr-1" />
              <span className="sr-only md:not-sr-only">Clear Events</span>
            </Button>
            
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              <RefreshCcw className="h-4 w-4 mr-1" />
              <span className="sr-only md:not-sr-only">Reconnect</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <Tabs defaultValue="all" value={activeFilter} onValueChange={setActiveFilter}>
        <div className="px-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="all">All Events</TabsTrigger>
            {showAgentEvents && <TabsTrigger value="agent">Agent Status</TabsTrigger>}
            {showCommandEvents && <TabsTrigger value="command">Commands</TabsTrigger>}
            {showSystemEvents && <TabsTrigger value="system">System Alerts</TabsTrigger>}
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No events to display. Events will appear here in real-time as they occur.
              </div>
            ) : (
              <div className="divide-y">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start">
                      <div className="mr-2 mt-0.5">
                        {getSeverityIcon(event.severity)}
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            {getEventIcon(event)}
                            
                            {event.agent_id && (
                              <span className="text-xs text-muted-foreground">
                                Agent: {event.agent_id.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                          
                          <time className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </time>
                        </div>
                        
                        <div className="text-sm">
                          {renderEventContent(event)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Tabs>
      
      <CardFooter className="border-t py-2 px-6">
        <div className="flex justify-between items-center w-full">
          <span className="text-xs text-muted-foreground">
            Showing {filteredEvents.length} of {events.length} events
          </span>
          
          <Button variant="outline" size="sm" onClick={clearEvents}>
            Clear All
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

/**
 * Render event content based on event type
 */
function renderEventContent(event: ElizaEvent): React.ReactNode {
  switch (event.event_type) {
    case 'agent_status_change':
      return (
        <div>
          <p className="font-medium">Agent Status Changed</p>
          <p className="text-xs text-muted-foreground">
            {event.data.old_status} → <span className="font-medium">{event.data.new_status}</span>
          </p>
        </div>
      );
      
    case 'command_complete':
      return (
        <div>
          <p className="font-medium">Command Completed</p>
          <p className="text-xs text-muted-foreground">
            {truncateText(event.data.command, 100)}
          </p>
        </div>
      );
      
    case 'system_alert':
      return (
        <div>
          <p className="font-medium">{event.data.title || 'System Alert'}</p>
          <p className="text-xs text-muted-foreground">
            {truncateText(event.data.message, 100)}
          </p>
        </div>
      );
      
    case 'agent_message':
      return (
        <div>
          <p className="font-medium">Agent Message</p>
          <p className="text-xs text-muted-foreground">
            {truncateText(event.data.content, 100)}
          </p>
        </div>
      );
      
    case 'task_update':
      return (
        <div>
          <p className="font-medium">Task Update: {event.data.status}</p>
          <p className="text-xs text-muted-foreground">
            {event.data.description || event.data.task_type}
            {event.data.progress !== undefined && ` (${event.data.progress}% complete)`}
          </p>
        </div>
      );
      
    default:
      return (
        <div>
          <p className="font-medium">{event.event_type}</p>
          <p className="text-xs text-muted-foreground">
            {JSON.stringify(event.data).slice(0, 100)}
            {JSON.stringify(event.data).length > 100 ? '...' : ''}
          </p>
        </div>
      );
  }
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text?: string, maxLength: number = 100): string {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
} 