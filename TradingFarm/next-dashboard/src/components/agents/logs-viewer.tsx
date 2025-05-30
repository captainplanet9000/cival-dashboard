/**
 * Logs Viewer
 * Component for displaying and filtering agent logs
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PieChart } from '@/components/charts';
import {
  RefreshCw,
  Download,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface LogsViewerProps {
  data: any;
  onRefresh: () => void;
  agentId: string;
}

export function LogsViewer({ data, onRefresh, agentId }: LogsViewerProps) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [filters, setFilters] = useState({
    level: '',
    source: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Log level colors
  const logLevelColors: Record<string, string> = {
    error: 'bg-red-100 text-red-800 hover:bg-red-200',
    warning: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    info: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    debug: 'bg-gray-100 text-gray-800 hover:bg-gray-200'
  };
  
  // Log level icons
  const logLevelIcons: Record<string, React.ReactNode> = {
    error: <AlertCircle className="h-3 w-3 mr-1" />,
    warning: <AlertTriangle className="h-3 w-3 mr-1" />,
    info: <Info className="h-3 w-3 mr-1" />,
    debug: <Bug className="h-3 w-3 mr-1" />
  };
  
  // Fetch logs when filters or pagination change
  useEffect(() => {
    fetchFilteredLogs();
  }, [activeTab, page, limit]);
  
  // Toggle log expansion
  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };
  
  // Fetch logs with filters
  const fetchFilteredLogs = async () => {
    setIsLoading(true);
    
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', ((page - 1) * limit).toString());
      
      // Apply active tab filter (log level)
      if (activeTab !== 'all') {
        queryParams.append('level', activeTab);
      } else if (filters.level) {
        queryParams.append('level', filters.level);
      }
      
      if (filters.source) {
        queryParams.append('source', filters.source);
      }
      
      if (filters.startDate) {
        queryParams.append('startDate', filters.startDate);
      }
      
      if (filters.endDate) {
        queryParams.append('endDate', filters.endDate);
      }
      
      if (filters.search) {
        queryParams.append('search', filters.search);
      }
      
      const response = await fetch(`/api/agents/${agentId}/logs?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      
      const newData = await response.json();
      
      // Update data only if component is still mounted
      onRefresh();
    } catch (error) {
      console.error('Error fetching filtered logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch logs",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Apply filters
  const applyFilters = () => {
    setPage(1); // Reset to first page when applying filters
    fetchFilteredLogs();
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilters({
      level: '',
      source: '',
      startDate: '',
      endDate: '',
      search: ''
    });
    setPage(1);
    fetchFilteredLogs();
  };
  
  // Export logs
  const exportLogs = async () => {
    try {
      if (!data.logs || data.logs.length === 0) {
        toast({
          title: "No logs to export",
          description: "There are no logs matching your current filters to export.",
          variant: "destructive"
        });
        return;
      }
      
      // Format logs for CSV
      const csvHeader = 'Timestamp,Level,Source,Message\n';
      const csvRows = data.logs.map((log: any) => {
        const timestamp = format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss');
        const level = log.logLevel;
        const source = log.source || '';
        // Escape quotes in message
        const message = log.message.replace(/"/g, '""');
        
        return `"${timestamp}","${level}","${source}","${message}"`;
      });
      
      const csvContent = csvHeader + csvRows.join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `agent_logs_${agentId}_${format(new Date(), 'yyyyMMdd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Logs Exported",
        description: `${data.logs.length} logs exported to CSV file.`
      });
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export logs to CSV",
        variant: "destructive"
      });
    }
  };
  
  // Format JSON for display
  const formatJson = (json: any): string => {
    try {
      return JSON.stringify(json, null, 2);
    } catch (error) {
      return String(json);
    }
  };
  
  // Generate chart data for log levels
  const getLogLevelChartData = () => {
    if (!data.metadata?.logLevelDistribution) {
      return {
        labels: ['No Data'],
        datasets: [{
          data: [1],
          backgroundColor: ['#e2e8f0']
        }]
      };
    }
    
    const distribution = data.metadata.logLevelDistribution;
    
    return {
      labels: Object.keys(distribution).map(level => level.charAt(0).toUpperCase() + level.slice(1)),
      datasets: [{
        data: Object.values(distribution),
        backgroundColor: [
          '#93c5fd', // info (blue)
          '#fde68a', // warning (yellow)
          '#fca5a5', // error (red)
          '#d1d5db'  // debug (gray)
        ]
      }]
    };
  };
  
  // Pagination controls
  const Pagination = () => (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-muted-foreground">
        {data.logs && data.metadata 
          ? `Showing ${(page - 1) * limit + 1} to ${Math.min(page * limit, data.metadata.total)} of ${data.metadata.total} logs`
          : 'Loading logs...'}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1 || isLoading}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => p + 1)}
          disabled={(page * limit >= (data.metadata?.total || 0)) || isLoading}
        >
          Next
        </Button>
        <Select
          value={limit.toString()}
          onValueChange={(value) => {
            setLimit(Number(value));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-20">
            <SelectValue placeholder="25" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
  
  return (
    <div className="space-y-4">
      {/* Filter controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle>Log Filters</CardTitle>
              <CardDescription>
                Filter logs by level, source, time range, or search term
              </CardDescription>
            </div>
            <div className="flex gap-2 mt-2 sm:mt-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetFilters}
              >
                Reset
              </Button>
              <Button
                size="sm"
                onClick={exportLogs}
                disabled={!data.logs || data.logs.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium">Log Level</label>
              <Select
                value={filters.level}
                onValueChange={(value) => setFilters({...filters, level: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Levels</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Source</label>
              <Select
                value={filters.source}
                onValueChange={(value) => setFilters({...filters, source: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sources</SelectItem>
                  {data.metadata?.logSources && data.metadata.logSources.map((source: string) => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Search</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search in logs..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      applyFilters();
                    }
                  }}
                />
                <Button variant="secondary" onClick={applyFilters}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Log distribution chart and tabs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Log Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <PieChart data={getLogLevelChartData()} />
            </div>
            <div className="mt-4 space-y-2">
              {data.metadata?.logLevelDistribution && Object.entries(data.metadata.logLevelDistribution).map(([level, count]) => (
                <div key={level} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      level === 'info' ? 'bg-blue-400' :
                      level === 'warning' ? 'bg-yellow-400' :
                      level === 'error' ? 'bg-red-400' :
                      'bg-gray-400'
                    }`} />
                    <span className="text-sm capitalize">{level}</span>
                  </div>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle>Log Entries</CardTitle>
            <Tabs 
              defaultValue="all" 
              value={activeTab}
              onValueChange={setActiveTab}
              className="mt-2"
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="info" className="text-blue-600">Info</TabsTrigger>
                <TabsTrigger value="warning" className="text-yellow-600">Warnings</TabsTrigger>
                <TabsTrigger value="error" className="text-red-600">Errors</TabsTrigger>
                <TabsTrigger value="debug" className="text-gray-600">Debug</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-60">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : data.logs && data.logs.length > 0 ? (
              <div className="space-y-2">
                {data.logs.map((log: any) => (
                  <Collapsible
                    key={log.id || log.timestamp}
                    open={expandedLogs[log.id || log.timestamp]}
                    onOpenChange={() => toggleLogExpansion(log.id || log.timestamp)}
                    className="border rounded-md"
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Badge className={logLevelColors[log.logLevel]}>
                          {logLevelIcons[log.logLevel]}
                          {log.logLevel}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                        </span>
                        {log.source && (
                          <Badge variant="outline" className="ml-2">
                            {log.source}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm line-clamp-1 max-w-md">
                          {log.message}
                        </span>
                        {expandedLogs[log.id || log.timestamp] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-4 pt-0 border-t">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">Message</h4>
                          <p className="text-sm whitespace-pre-wrap bg-muted p-2 rounded">
                            {log.message}
                          </p>
                        </div>
                        
                        {log.context && Object.keys(log.context).length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-1">Context</h4>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-96">
                              {formatJson(log.context)}
                            </pre>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium mb-1">Log Level</h4>
                            <p className="text-sm">{log.logLevel}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-1">Source</h4>
                            <p className="text-sm">{log.source || 'Unknown'}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-1">Timestamp</h4>
                            <p className="text-sm">{format(new Date(log.timestamp), 'PPpp')}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-1">Log ID</h4>
                            <p className="text-sm">{log.id || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center h-60">
                <div className="text-center">
                  <p className="text-lg font-medium">No logs found</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your filters or check back later
                  </p>
                </div>
              </div>
            )}
            
            <Pagination />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline"
              onClick={() => {
                setPage(1);
                onRefresh();
              }}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <div className="flex items-center gap-2">
              <Checkbox 
                id="auto-refresh" 
                // This would be connected to an auto-refresh feature
              />
              <label htmlFor="auto-refresh" className="text-sm">
                Auto-refresh
              </label>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
