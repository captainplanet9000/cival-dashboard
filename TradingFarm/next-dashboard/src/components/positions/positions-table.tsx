'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MoreHorizontal,
  Eye,
  RefreshCw,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  DollarSign,
  BarChart2,
  ShoppingCart,
  FileCog
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { reconcilePosition } from '@/app/actions/position-actions';

// Types for the positions
interface Position {
  id: string;
  farm_id: string;
  agent_id?: string;
  exchange: string;
  exchange_account_id?: string;
  symbol: string;
  quantity: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_percentage: number;
  cost_basis: number;
  market_value: number;
  side: 'long' | 'short';
  created_at: string;
  updated_at: string;
  reconciliation_status?: 'verified' | 'discrepancy' | 'pending';
  last_reconciled?: string;
  metadata?: Record<string, any>;
}

interface PositionsTableProps {
  positions: Position[];
  onRefresh?: () => void;
  loading?: boolean;
  farmId?: string;
  agentId?: string;
}

export default function PositionsTable({ 
  positions, 
  onRefresh, 
  loading = false,
  farmId,
  agentId,
}: PositionsTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [processingPosition, setProcessingPosition] = useState<string | null>(null);

  // Function to handle position reconciliation
  const handleReconcilePosition = async (positionId: string) => {
    try {
      setProcessingPosition(positionId);
      const result = await reconcilePosition(positionId);
      
      if (result.success) {
        toast({
          title: 'Position reconciled',
          description: 'The position has been successfully reconciled with the exchange.',
        });
        if (onRefresh) onRefresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to reconcile position',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error reconciling position:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setProcessingPosition(null);
    }
  };

  // Function to create a new order for a symbol
  const handleCreateOrder = (position: Position) => {
    const baseParams = new URLSearchParams({
      farm_id: position.farm_id,
      symbol: position.symbol
    });
    
    if (position.agent_id) baseParams.append('agent_id', position.agent_id);
    
    // Redirect to create order page
    router.push(`/trading/orders/create?${baseParams.toString()}`);
  };

  // View position details
  const handleViewPosition = (positionId: string) => {
    router.push(`/trading/positions/${positionId}`);
  };

  // Position analysis
  const handleAnalyzePosition = (positionId: string) => {
    router.push(`/trading/positions/${positionId}/analysis`);
  };

  // Function to get the badge color based on reconciliation status
  const getReconciliationBadge = (status?: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <RefreshCw className="mr-1 h-3 w-3" />
            Verified
          </Badge>
        );
      case 'discrepancy':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Discrepancy
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <RefreshCw className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Not Reconciled
          </Badge>
        );
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Get dynamic styling for PnL values
  const getPnlClass = (value: number) => {
    return value >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium';
  };

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between p-4">
        <h3 className="text-lg font-medium">Open Positions</h3>
        <Button 
          variant="outline" 
          size="sm"
          disabled={loading}
          onClick={onRefresh}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Entry Price</TableHead>
              <TableHead>Current Price</TableHead>
              <TableHead>Market Value</TableHead>
              <TableHead>Unrealized P&L</TableHead>
              <TableHead>Exchange</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No positions found
                </TableCell>
              </TableRow>
            ) : (
              positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell className="font-medium">{position.symbol}</TableCell>
                  <TableCell>
                    <div className={`flex items-center ${position.side === 'long' ? 'text-green-600' : 'text-red-600'}`}>
                      {position.side === 'long' ? (
                        <ChevronUp className="h-4 w-4 mr-1" />
                      ) : (
                        <ChevronDown className="h-4 w-4 mr-1" />
                      )}
                      {position.side.toUpperCase()}
                    </div>
                  </TableCell>
                  <TableCell>{position.quantity}</TableCell>
                  <TableCell>{formatCurrency(position.entry_price)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{formatCurrency(position.current_price)}</span>
                      <span className={`text-xs ${
                        position.current_price > position.entry_price 
                          ? 'text-green-600' 
                          : position.current_price < position.entry_price 
                            ? 'text-red-600' 
                            : 'text-muted-foreground'
                      }`}>
                        {position.current_price > position.entry_price ? '▲' : position.current_price < position.entry_price ? '▼' : ''}
                        {Math.abs(
                          ((position.current_price - position.entry_price) / position.entry_price) * 100
                        ).toFixed(2)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(position.market_value)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className={getPnlClass(position.unrealized_pnl)}>
                        {formatCurrency(position.unrealized_pnl)}
                      </span>
                      <span className={`text-xs ${getPnlClass(position.unrealized_pnl_percentage)}`}>
                        {formatPercentage(position.unrealized_pnl_percentage)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{position.exchange}</TableCell>
                  <TableCell>{getReconciliationBadge(position.reconciliation_status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={processingPosition === position.id}>
                          {processingPosition === position.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewPosition(position.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => handleCreateOrder(position)}>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Create Order
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleAnalyzePosition(position.id)}>
                          <BarChart2 className="mr-2 h-4 w-4" />
                          Analyze Position
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => handleReconcilePosition(position.id)}>
                          <FileCog className="mr-2 h-4 w-4" />
                          Reconcile
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
