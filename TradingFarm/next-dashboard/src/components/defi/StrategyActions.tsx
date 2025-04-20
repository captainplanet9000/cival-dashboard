import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ExternalLink, 
  ChevronRight, 
  ChevronLeft, 
  ArrowUpDown,
  DownloadCloud,
  UploadCloud,
  Wallet,
  RefreshCw,
  AlertTriangle,
  Check,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '../ui/badge';

interface StrategyAction {
  id: string;
  strategy_id: string;
  action_type: string;
  description: string;
  tx_hash?: string;
  timestamp: string;
  before_state?: any;
  after_state?: any;
}

interface StrategyActionsProps {
  actions: StrategyAction[];
  chainId: number;
  showViewAll?: boolean;
  showPagination?: boolean;
  onViewAll?: () => void;
}

export default function StrategyActions({ 
  actions, 
  chainId, 
  showViewAll = false,
  showPagination = false,
  onViewAll 
}: StrategyActionsProps) {
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<string>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const pageSize = 10;
  
  // Sort and paginate actions
  const sortedActions = [...actions].sort((a, b) => {
    if (sortField === 'timestamp') {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
    return 0;
  });
  
  const paginatedActions = showPagination 
    ? sortedActions.slice((page - 1) * pageSize, page * pageSize)
    : sortedActions;
  
  const totalPages = Math.ceil(actions.length / pageSize);
  
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'supply':
        return <UploadCloud className="h-4 w-4 text-green-500" />;
      case 'borrow':
        return <DownloadCloud className="h-4 w-4 text-blue-500" />;
      case 'withdraw':
        return <Wallet className="h-4 w-4 text-orange-500" />;
      case 'repay':
        return <Check className="h-4 w-4 text-purple-500" />;
      case 'rebalance':
        return <RefreshCw className="h-4 w-4 text-cyan-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  const getBlockExplorerUrl = (chainId: number, txHash: string) => {
    let baseUrl = '';
    switch (chainId) {
      case 1:
        baseUrl = 'https://etherscan.io';
        break;
      case 42161:
        baseUrl = 'https://arbiscan.io';
        break;
      case 8453:
        baseUrl = 'https://basescan.org';
        break;
      case 10254:
        baseUrl = 'https://explorer.sonic.io';
        break;
      default:
        baseUrl = 'https://etherscan.io';
    }
    return `${baseUrl}/tx/${txHash}`;
  };
  
  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Strategy Actions</CardTitle>
          <CardDescription>
            History of operations for this strategy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Clock className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No actions recorded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Strategy Actions</CardTitle>
        <CardDescription>
          History of operations for this strategy
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('timestamp')}
                  className="flex items-center p-0 h-auto font-medium"
                >
                  Timestamp
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Transaction</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedActions.map((action) => (
              <TableRow key={action.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getActionIcon(action.action_type)}
                    <Badge variant="outline">{action.action_type}</Badge>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDistanceToNow(new Date(action.timestamp), { addSuffix: true })}
                </TableCell>
                <TableCell>{action.description}</TableCell>
                <TableCell>
                  {action.tx_hash ? (
                    <a
                      href={getBlockExplorerUrl(chainId, action.tx_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center"
                    >
                      <span className="font-mono text-xs">
                        {action.tx_hash.substring(0, 8)}...
                      </span>
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {(action.before_state || action.after_state) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <InfoIcon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-md">
                          <div className="space-y-2">
                            {action.before_state && (
                              <div>
                                <div className="font-medium">Before:</div>
                                <pre className="text-xs max-h-40 overflow-auto rounded bg-muted p-2">
                                  {JSON.stringify(action.before_state, null, 2)}
                                </pre>
                              </div>
                            )}
                            {action.after_state && (
                              <div>
                                <div className="font-medium">After:</div>
                                <pre className="text-xs max-h-40 overflow-auto rounded bg-muted p-2">
                                  {JSON.stringify(action.after_state, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {showPagination && totalPages > 1 && (
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page > 1 ? page - 1 : 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm">
              Page {page} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {showViewAll && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={onViewAll}>
              View All Actions
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper component for info icon
const InfoIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
