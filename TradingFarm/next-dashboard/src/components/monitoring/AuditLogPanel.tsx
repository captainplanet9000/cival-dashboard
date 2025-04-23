/**
 * Audit Log Panel Component
 *
 * Displays compliance-related audit logs with filtering and search capabilities.
 */

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, Download, Filter, Loader2 } from 'lucide-react';
import { monitoringService, AuditLog } from '@/utils/trading/monitoring-service';
import { format } from 'date-fns';

export interface AuditLogPanelProps {
  userId: string;
}

export default function AuditLogPanel({ userId }: AuditLogPanelProps) {
  const { toast } = useToast();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [exportingCsv, setExportingCsv] = useState(false);

  // Load audit logs
  useEffect(() => {
    const loadAuditLogs = async () => {
      setIsLoading(true);
      try {
        // Use the userId for regular users or undefined for admins to see all logs
        const entityType = entityTypeFilter !== 'all' ? entityTypeFilter : undefined;
        
        const logs = await monitoringService.getAuditLogs(
          userId,
          entityType,
          undefined, // entityId
          100 // limit
        );
        
        setAuditLogs(logs);
      } catch (error) {
        console.error('Error loading audit logs:', error);
        toast({
          title: "Failed to load audit logs",
          description: "There was an error loading the audit logs. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAuditLogs();
  }, [userId, entityTypeFilter, toast]);

  // Filter logs by action and search term
  const filteredLogs = auditLogs.filter(log => {
    // Filter by action
    if (actionFilter !== 'all' && log.action !== actionFilter) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const detailsStr = log.details ? JSON.stringify(log.details).toLowerCase() : '';
      
      return (
        log.action.toLowerCase().includes(searchLower) ||
        log.entity_type.toLowerCase().includes(searchLower) ||
        (log.entity_id || '').toLowerCase().includes(searchLower) ||
        detailsStr.includes(searchLower)
      );
    }
    
    return true;
  });

  // Export logs to CSV
  const handleExportCsv = () => {
    setExportingCsv(true);
    
    try {
      // Prepare CSV content
      const headers = ['Timestamp', 'User ID', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Details'];
      
      const rows = filteredLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.user_id || '',
        log.action,
        log.entity_type,
        log.entity_id || '',
        log.ip_address || '',
        log.details ? JSON.stringify(log.details) : ''
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      // Create download link
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
        title: "Export successful",
        description: "Audit logs have been exported as CSV.",
      });
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the audit logs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExportingCsv(false);
    }
  };

  // Get unique entity types for filter dropdown
  const uniqueEntityTypes = ['all', ...Array.from(new Set(auditLogs.map(log => log.entity_type)))];
  
  // Get unique actions for filter dropdown
  const uniqueActions = ['all', ...Array.from(new Set(auditLogs.map(log => log.action)))];

  // Render a colored badge for different action types
  const renderActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return <Badge className="bg-green-500">Create</Badge>;
      case 'update':
        return <Badge className="bg-blue-500">Update</Badge>;
      case 'delete':
        return <Badge className="bg-red-500">Delete</Badge>;
      case 'login':
        return <Badge className="bg-purple-500">Login</Badge>;
      case 'logout':
        return <Badge className="bg-slate-500">Logout</Badge>;
      case 'trade':
        return <Badge className="bg-amber-500">Trade</Badge>;
      case 'api_access':
        return <Badge className="bg-indigo-500">API Access</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Audit Log</h2>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={handleExportCsv}
          disabled={exportingCsv || filteredLogs.length === 0}
        >
          {exportingCsv ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Compliance & Audit Trail
          </CardTitle>
          <CardDescription>
            Track and monitor all system activities for compliance and security
          </CardDescription>
          
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audit logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            
            <div className="flex gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Entity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueEntityTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type === 'all' ? 'All Entities' : type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action === 'all' ? 'All Actions' : action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : filteredLogs.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>{renderActionBadge(log.action)}</TableCell>
                      <TableCell className="capitalize">{log.entity_type}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.entity_id ? log.entity_id.substring(0, 8) + '...' : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.ip_address || '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.details ? (
                          <div className="text-xs text-muted-foreground">
                            {JSON.stringify(log.details).substring(0, 50)}
                            {JSON.stringify(log.details).length > 50 ? '...' : ''}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No audit logs found</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                {searchTerm || entityTypeFilter !== 'all' || actionFilter !== 'all' 
                  ? "No logs match your current filters. Try adjusting your search or filters."
                  : "Audit logs will appear here as you perform actions in the system."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
