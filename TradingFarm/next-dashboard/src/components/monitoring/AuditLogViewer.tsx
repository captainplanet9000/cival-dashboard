'use client';

import * as React from 'react';
const { useState, useEffect } = React;
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Check, ChevronLeft, ChevronRight, Download, Filter, RefreshCw, Search } from 'lucide-react';
import { createBrowserClient } from '@/utils/supabase/client';
import { TradingAuditLog, AuditActionType, AuditStatus, getUserAuditLogs } from '@/utils/supabase/trading-audit';
import { formatDistanceToNow, format } from 'date-fns';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Get the appropriate badge color based on audit status
 */
const getStatusColor = (status: AuditStatus): string => {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'failure':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

/**
 * Format the audit action type for display
 */
const formatActionType = (actionType: AuditActionType): string => {
  return actionType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Properties for the AuditLogViewer component
 */
interface AuditLogViewerProps {
  farmId?: number;
  limit?: number;
}

/**
 * Audit log viewer component
 */
export function AuditLogViewer({ farmId, limit = 10 }: AuditLogViewerProps): JSX.Element {
  const { toast } = useToast();
  const supabase = createBrowserClient();
  const [auditLogs, setAuditLogs] = useState<TradingAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<TradingAuditLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    actionType: '' as AuditActionType | '',
    status: '' as AuditStatus | '',
    exchange: '',
    symbol: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Load audit logs
  useEffect(() => {
    const loadAuditLogs = async () => {
      setLoading(true);
      
      try {
        // Get the current user
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user) {
          setLoading(false);
          return;
        }
        
        // Prepare filter options
        const filterOptions: any = {
          limit,
          offset: (page - 1) * limit,
        };
        
        // Add farm ID if provided
        if (farmId) {
          filterOptions.farmId = farmId;
        }
        
        // Add filters if set
        if (filters.actionType) {
          filterOptions.actionType = filters.actionType;
        }
        
        if (filters.status) {
          filterOptions.status = filters.status;
        }
        
        if (filters.exchange) {
          filterOptions.exchange = filters.exchange;
        }
        
        if (filters.symbol) {
          filterOptions.symbol = filters.symbol;
        }
        
        if (filters.startDate) {
          filterOptions.startDate = filters.startDate;
        }
        
        if (filters.endDate) {
          filterOptions.endDate = filters.endDate;
        }
        
        // Get audit logs
        const { data, error, count } = await getUserAuditLogs(
          supabase,
          sessionData.session.user.id,
          filterOptions
        );
        
        if (error) throw error;
        
        setAuditLogs(data || []);
        setTotalLogs(count || 0);
      } catch (error: any) {
        console.error('Error loading audit logs:', error);
        toast({
          title: 'Error',
          description: 'Failed to load audit logs: ' + (error?.message || 'Unknown error'),
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadAuditLogs();
  }, [page, filters, farmId, limit]);

  // Calculate total pages
  const totalPages = Math.ceil(totalLogs / limit);

  // Handle page navigation
  const handlePreviousPage = (): void => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = (): void => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  // Handle viewing log details
  const handleViewDetails = (log: TradingAuditLog): void => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof typeof filters, value: string): void => {
    setFilters((prev: typeof filters) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  // Handle filter reset
  const handleResetFilters = (): void => {
    setFilters({
      actionType: '',
      status: '',
      exchange: '',
      symbol: '',
      startDate: '',
      endDate: '',
    });
    setPage(1);
  };
  
  // Handle refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRefresh = (): void => {
    setRefreshTrigger((prev: number) => prev + 1);
  };

  // Export logs to CSV
  const handleExportLogs = async (): Promise<void> => {
    try {
      // Get the current user
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) {
        return;
      }
      
      // Prepare filter options without pagination
      const filterOptions: any = {};
      
      // Add farm ID if provided
      if (farmId) {
        filterOptions.farmId = farmId;
      }
      
      // Add filters if set
      if (filters.actionType) {
        filterOptions.actionType = filters.actionType;
      }
      
      if (filters.status) {
        filterOptions.status = filters.status;
      }
      
      if (filters.exchange) {
        filterOptions.exchange = filters.exchange;
      }
      
      if (filters.symbol) {
        filterOptions.symbol = filters.symbol;
      }
      
      if (filters.startDate) {
        filterOptions.startDate = filters.startDate;
      }
      
      if (filters.endDate) {
        filterOptions.endDate = filters.endDate;
      }
      
      // Get all audit logs for export (limit to 1000 for performance)
      filterOptions.limit = 1000;
      
      const { data, error } = await getUserAuditLogs(
        supabase,
        sessionData.session.user.id,
        filterOptions
      );
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast({
          title: 'No Data',
          description: 'No audit logs available to export',
        });
        return;
      }
      
      // Convert to CSV
      const headers = ['ID', 'Action', 'Status', 'Exchange', 'Symbol', 'Date', 'Error'];
      const csvContent = [
        headers.join(','),
        ...data.map(log => [
          log.id,
          formatActionType(log.action_type),
          log.status,
          log.exchange,
          log.symbol || 'N/A',
          format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
          log.error_message ? `"${log.error_message.replace(/"/g, '""')}"` : 'None'
        ].join(','))
      ].join('\n');
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `audit_logs_${format(new Date(), 'yyyyMMdd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Export Complete',
        description: `Exported ${data.length} audit log records`,
      });
    } catch (error: any) {
      console.error('Error exporting audit logs:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export audit logs: ' + (error?.message || 'Unknown error'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold">Trading Activity Audit Log</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportLogs}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Filter Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Action Type</label>
                <Select 
                  value={filters.actionType} 
                  onValueChange={(value: string) => handleFilterChange('actionType', value as AuditActionType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Actions</SelectItem>
                    <SelectItem value="order_place">Order Place</SelectItem>
                    <SelectItem value="order_cancel">Order Cancel</SelectItem>
                    <SelectItem value="order_update">Order Update</SelectItem>
                    <SelectItem value="position_open">Position Open</SelectItem>
                    <SelectItem value="position_close">Position Close</SelectItem>
                    <SelectItem value="credential_use">Credential Use</SelectItem>
                    <SelectItem value="credential_create">Credential Create</SelectItem>
                    <SelectItem value="agent_action">Agent Action</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select 
                  value={filters.status} 
                  onValueChange={(value: string) => handleFilterChange('status', value as AuditStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Exchange</label>
                <Input 
                  placeholder="Exchange name" 
                  value={filters.exchange}
                  onChange={e => handleFilterChange('exchange', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Symbol</label>
                <Input 
                  placeholder="Trading symbol" 
                  value={filters.symbol}
                  onChange={e => handleFilterChange('symbol', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input 
                  type="datetime-local" 
                  value={filters.startDate}
                  onChange={e => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input 
                  type="datetime-local" 
                  value={filters.endDate}
                  onChange={e => handleFilterChange('endDate', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleResetFilters}>Reset Filters</Button>
            <span className="text-sm text-gray-500">
              {totalLogs} records match your filters
            </span>
          </CardFooter>
        </Card>
      )}

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Records</CardTitle>
          <CardDescription>
            Detailed records of all trading-related activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-24">
              <div className="animate-spin">
                <RefreshCw className="h-6 w-6 text-gray-400" />
              </div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No audit logs found for the selected filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Exchange</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log: TradingAuditLog) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {formatActionType(log.action_type)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={getStatusColor(log.status)}
                        >
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium capitalize">
                        {log.exchange}
                      </TableCell>
                      <TableCell>
                        {log.symbol || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <span className="whitespace-nowrap" title={format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}>
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewDetails(log)}
                        >
                          <Search className="h-4 w-4" />
                          <span className="sr-only">View Details</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            Showing {auditLogs.length > 0 ? (page - 1) * limit + 1 : 0}-{Math.min(page * limit, totalLogs)} of {totalLogs}
          </div>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePreviousPage}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleNextPage}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Detail Dialog */}
      <DialogPrimitive.Root open={showDetails} onOpenChange={(open: boolean) => setShowDetails(open)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Complete details for audit log #{selectedLog?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Action</h3>
                  <p className="mt-1">{formatActionType(selectedLog.action_type)}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <p className="mt-1">
                    <Badge 
                      variant="outline" 
                      className={getStatusColor(selectedLog.status)}
                    >
                      {selectedLog.status.charAt(0).toUpperCase() + selectedLog.status.slice(1)}
                    </Badge>
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Exchange</h3>
                  <p className="mt-1 capitalize">{selectedLog.exchange}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Symbol</h3>
                  <p className="mt-1">{selectedLog.symbol || 'N/A'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Date</h3>
                  <p className="mt-1">{format(new Date(selectedLog.created_at), 'yyyy-MM-dd HH:mm:ss')}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">IP Address</h3>
                  <p className="mt-1">{selectedLog.ip_address || 'Not recorded'}</p>
                </div>
                
                {selectedLog.agent_id && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Agent ID</h3>
                    <p className="mt-1">{selectedLog.agent_id}</p>
                  </div>
                )}
                
                {selectedLog.farm_id && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Farm ID</h3>
                    <p className="mt-1">{selectedLog.farm_id}</p>
                  </div>
                )}
                
                {selectedLog.credential_id && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Credential ID</h3>
                    <p className="mt-1">{selectedLog.credential_id}</p>
                  </div>
                )}
                
                {selectedLog.request_id && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Request ID</h3>
                    <p className="mt-1">{selectedLog.request_id}</p>
                  </div>
                )}
              </div>
              
              {selectedLog.error_message && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-red-500">Error</h3>
                  <div className="mt-1 p-3 bg-red-50 text-red-800 rounded border border-red-200 overflow-auto max-h-24">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}
              
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500">Details</h3>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-auto max-h-64">
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </DialogPrimitive.Root>
    </div>
  );
}
