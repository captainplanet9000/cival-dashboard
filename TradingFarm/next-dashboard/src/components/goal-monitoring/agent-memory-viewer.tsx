'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ReloadIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import { Brain, Bot, Clock, FilterIcon } from 'lucide-react';

import { agentCoordinationElizaService } from '@/services/agent-coordination-eliza-service';

// Memory type badge mapping
const memoryTypeBadge = {
  'STRATEGY': <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Strategy</Badge>,
  'EXECUTION': <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Execution</Badge>,
  'MARKET_CONDITION': <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">Market</Badge>,
  'RESULT': <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">Result</Badge>,
};

const importanceColor = (importance: number) => {
  if (importance >= 0.8) return 'text-red-500 dark:text-red-400';
  if (importance >= 0.6) return 'text-amber-500 dark:text-amber-400';
  if (importance >= 0.4) return 'text-blue-500 dark:text-blue-400';
  return 'text-gray-500 dark:text-gray-400';
};

export interface AgentMemoryViewerProps {
  goalId: string;
  defaultMemoryType?: string;
  maxMemories?: number;
}

export function AgentMemoryViewer({
  goalId,
  defaultMemoryType = 'all',
  maxMemories = 10
}: AgentMemoryViewerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [memories, setMemories] = useState<any[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<any[]>([]);
  const [memoryType, setMemoryType] = useState<string>(defaultMemoryType);
  const [expandedMemory, setExpandedMemory] = useState<string | null>(null);
  
  // Fetch memories on mount and when goalId or memoryType changes
  useEffect(() => {
    fetchMemories();
  }, [goalId]);
  
  // Filter memories when memoryType changes
  useEffect(() => {
    if (memoryType === 'all') {
      setFilteredMemories(memories);
    } else {
      setFilteredMemories(memories.filter(memory => 
        memory.metadata?.memoryType === memoryType
      ));
    }
  }, [memories, memoryType]);
  
  // Fetch memories from ElizaOS
  const fetchMemories = async () => {
    setLoading(true);
    try {
      const { data, error } = await agentCoordinationElizaService.getGoalAcquisitionMemories(
        goalId,
        undefined,
        maxMemories
      );
      
      if (error) {
        console.error('Error fetching memories:', error);
      } else if (data) {
        setMemories(data);
        // Also update filtered memories if the memory type is 'all'
        if (memoryType === 'all') {
          setFilteredMemories(data);
        }
      }
    } catch (error) {
      console.error('Error fetching memories:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Format agent name from ID
  const formatAgentName = (agentId: string) => {
    // In a real implementation, this would fetch the agent name from a service
    // For now, just truncate the ID
    return `Agent ${agentId.substring(0, 8)}`;
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPp');
    } catch (error) {
      return dateString;
    }
  };
  
  // Handle memory expansion
  const toggleMemoryExpansion = (memoryId: string) => {
    if (expandedMemory === memoryId) {
      setExpandedMemory(null);
    } else {
      setExpandedMemory(memoryId);
    }
  };
  
  // Render loading skeleton
  if (loading && memories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-10" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Brain className="mr-2 h-5 w-5" />
              Agent Memories
            </CardTitle>
            <CardDescription>
              Knowledge and insights from agents working on this goal
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchMemories}
          >
            <ReloadIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <Select
            value={memoryType}
            onValueChange={setMemoryType}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Memory Types</SelectItem>
              <SelectItem value="STRATEGY">Strategy</SelectItem>
              <SelectItem value="EXECUTION">Execution</SelectItem>
              <SelectItem value="MARKET_CONDITION">Market Conditions</SelectItem>
              <SelectItem value="RESULT">Results</SelectItem>
            </SelectContent>
          </Select>
          
          <Badge variant="outline">
            {filteredMemories.length} Memories
          </Badge>
        </div>
        
        {filteredMemories.length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            {filteredMemories.map((memory) => (
              <AccordionItem key={memory.id} value={memory.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex flex-col items-start text-left">
                    <div className="flex items-center gap-2">
                      {memoryTypeBadge[memory.metadata?.memoryType as keyof typeof memoryTypeBadge] || 
                        <Badge variant="outline">{memory.metadata?.memoryType || 'Unknown'}</Badge>}
                      <span className="font-medium">
                        {formatAgentName(memory.agent_id)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 pr-10 truncate w-full">
                      {memory.content}
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    <div className="text-sm whitespace-pre-wrap rounded bg-muted/50 p-3">
                      {memory.content}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {formatDate(memory.timestamp)}
                      </div>
                      <div className={`flex items-center ${importanceColor(memory.importance)}`}>
                        <InfoCircledIcon className="mr-1 h-3 w-3" />
                        Importance: {memory.importance.toFixed(2)}
                      </div>
                    </div>
                    
                    {memory.metadata && Object.keys(memory.metadata).length > 0 && (
                      <div className="mt-3">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground">
                            View Metadata
                          </summary>
                          <pre className="mt-2 p-2 bg-muted/80 rounded overflow-auto max-h-[200px] text-xs">
                            {JSON.stringify(memory.metadata, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-12">
            <Bot className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {loading 
                ? 'Loading agent memories...' 
                : memories.length === 0 
                  ? 'No memories found for this goal' 
                  : 'No memories match the selected filter'}
            </p>
            {!loading && memories.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Memories will appear as agents work on this goal
              </p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <div className="flex items-center">
          <InfoCircledIcon className="mr-1 h-3 w-3" />
          Memories are stored automatically as agents analyze, strategize, and execute trades
        </div>
      </CardFooter>
    </Card>
  );
}
