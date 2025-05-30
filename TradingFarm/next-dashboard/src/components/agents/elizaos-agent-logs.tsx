"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { AgentLogEntry, AgentLogLevel } from '@/services/agent-lifecycle-service';
import { useElizaAgentManager } from '@/hooks/useElizaAgentManager';

interface ElizaAgentLogsProps {
  agentId: string;
  limit?: number;
  showFilters?: boolean;
}

export function ElizaAgentLogs({ 
  agentId,
  limit = 10,
  showFilters = true
}: ElizaAgentLogsProps) {
  // States
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(limit);
  
  // Filters
  const [levelFilter, setLevelFilter] = useState<AgentLogLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // Get agent log function from the hook
  const { getAgentLogs } = useElizaAgentManager();
  
  // Fetch logs
  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const offset = (page - 1) * pageSize;
      
      // Apply filters
      const options: any = {
        limit: pageSize,
        offset,
      };
      
      if (levelFilter !== 'all') {
        options.level = levelFilter;
      }
      
      if (startDate) {
        options.startDate = startDate;
      }
      
      if (endDate) {
        options.endDate = endDate;
      }
      
      const result = await getAgentLogs(agentId, options);
      
      // If query string is provided, filter logs client-side
      let filteredLogs = result.logs;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(query) ||
          (log.details && JSON.stringify(log.details).toLowerCase().includes(query))
        );
      }
      
      setLogs(filteredLogs);
      setTotal(result.total);
    } catch (err) {
      console.error('Error fetching agent logs:', err);
      setError('Failed to fetch logs. Please try again.');
      setLogs([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch logs on mount and when filters/pagination change
  useEffect(() => {
    fetchLogs();
  }, [agentId, page, pageSize, levelFilter, startDate, endDate]);
  
  // Handle search
  const handleSearch = () => {
    fetchLogs();
  };
  
  // Handle refresh
  const handleRefresh = () => {
    fetchLogs();
    toast({
      title: 'Logs Refreshed',
      description: 'Agent logs have been refreshed.',
    });
  };
  
  // Get log level badge
  const getLevelBadge = (level: AgentLogLevel) => {
    switch (level) {
      case 'info':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Info</Badge>;
      case 'warning':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Warning</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Error</Badge>;
      case 'debug':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Debug</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };
  
  // Calculate pagination
  const totalPages = Math.ceil(total / pageSize);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;
  
  // If there's an error
  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center text-destructive mb-4">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
          <Button onClick={fetchLogs}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex space-x-2">
            <Select 
              value={levelFilter} 
              onValueChange={(value) => setLevelFilter(value as AgentLogLevel | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex-1 flex space-x-2">
              <Input 
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="outline" size="icon" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      )}
      
      {/* Logs Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Time</TableHead>
              <TableHead className="w-[100px]">Level</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-[100px]">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(pageSize).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="group">
                  <TableCell className="font-mono text-xs">
                    {new Date(log.timestamp).toLocaleTimeString()}
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>{getLevelBadge(log.level)}</TableCell>
                  <TableCell>
                    {log.message}
                    {log.details && (
                      <div className="mt-1 hidden group-hover:block text-xs text-muted-foreground font-mono bg-muted p-2 rounded overflow-x-auto max-w-[600px]">
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.source || 'system'}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      {showFilters && total > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {Math.min((page - 1) * pageSize + 1, total)} - {Math.min(page * pageSize, total)} of {total} logs
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              disabled={!canGoPrevious}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm">
              Page {page} of {totalPages || 1}
            </span>
            
            <Button
              variant="outline"
              size="icon"
              disabled={!canGoNext}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
