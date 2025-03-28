"use client";

import React from 'react';
import { X, ArrowUpRight, ArrowDownRight, History, Filter } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TradingAgent } from '@/services/trading/agent-base';
import { TradingPosition, OrderSide, PositionStatus } from '@/services/trading/trading-types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PositionsTableProps {
  agent?: string;
  refreshTrigger?: number;
}

export function PositionsTable({ agent, refreshTrigger }: PositionsTableProps) {
  const [positions, setPositions] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<'all' | 'open' | 'closed'>('all');
  
  // Fetch positions when component mounts or when refreshTrigger changes
  React.useEffect(() => {
    fetchPositions();
  }, [agent, refreshTrigger]); // Add dependencies

  const fetchPositions = async () => {
    setIsLoading(true);
    try {
      // If we have an agent ID, fetch positions for that agent
      // Otherwise, fetch all positions
      let data;
      if (agent) {
        // In a real app, this would call your API with the agent ID
        data = await fetch(`/api/trading/positions?agentId=${agent}`).then(res => res.json());
      } else {
        // Fetch all positions
        data = await fetch('/api/trading/positions').then(res => res.json());
      }
      setPositions(data || []);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Format number with specific precision
  const formatNumber = (num: number | undefined, precision: number = 2): string => {
    if (num === undefined) return 'N/A';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
  };
  
  // Format date
  const formatDate = (timestamp: number | undefined): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };
  
  // Get filtered positions
  const getFilteredPositions = (): any[] => {
    if (filter === 'all') return positions;
    return positions.filter((pos: any) => {
      return filter === 'open' 
        ? pos.status === 'OPEN' || pos.status === 'open'
        : pos.status === 'CLOSED' || pos.status === 'closed';
    });
  };
  
  // Get position icon based on side
  const getPositionIcon = (side: OrderSide) => {
    return side === OrderSide.BUY 
      ? <ArrowUpRight className="h-4 w-4 text-green-500" />
      : <ArrowDownRight className="h-4 w-4 text-red-500" />;
  };
  
  // Get position color based on side
  const getPositionColor = (side: OrderSide): string => {
    return side === OrderSide.BUY ? 'text-green-500' : 'text-red-500';
  };
  
  // Handle close position
  const handleClosePosition = (positionId: string) => {
    try {
      // In a real app, this would call your API to close the position
      console.log('Close position:', positionId);
    } catch (error) {
      console.error('Failed to close position:', error);
    }
  };
  
  // Handle filter selection
  const handleFilterChange = (value: string) => {
    setFilter(value as 'all' | 'open' | 'closed');
  };

  // Render empty state
  const renderEmptyState = () => {
    return (
      <div className="p-8 text-center">
        <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No positions found</h3>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          {filter === 'all' 
            ? 'When the agent opens positions, they will appear here.'
            : `No ${filter} positions found. Try changing the filter.`}
        </p>
      </div>
    );
  };
  
  // Calculate position profit/loss
  const calculatePositionPnL = (position: any): React.ReactNode => {
    if (position.status === PositionStatus.CLOSED && position.pnl !== undefined) {
      const isProfitable = position.pnl >= 0;
      return (
        <span className={isProfitable ? 'text-green-500' : 'text-red-500'}>
          {isProfitable ? '+' : ''}{formatNumber(position.pnl)}
        </span>
      );
    }
    
    if (position.status === PositionStatus.OPEN) {
      return <span className="text-muted-foreground">Open</span>;
    }
    
    return <span className="text-muted-foreground">Unknown</span>;
  };
  
  // Render positions table
  const renderPositionsTable = () => {
    const filteredPositions = getFilteredPositions();
    
    if (filteredPositions.length === 0) {
      return renderEmptyState();
    }
    
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Entry</TableHead>
              <TableHead>Exit</TableHead>
              <TableHead>P/L</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPositions.map(position => (
              <TableRow key={position.id}>
                <TableCell>{position.symbol}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    {getPositionIcon(position.side)}
                    <span className={`ml-1 ${getPositionColor(position.side)}`}>
                      {position.side === OrderSide.BUY ? 'Long' : 'Short'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>${formatNumber(position.entryPrice)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(position.entryTime)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {position.exitPrice ? (
                    <div className="text-sm">
                      <div>${formatNumber(position.exitPrice)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(position.exitTime)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {calculatePositionPnL(position)}
                </TableCell>
                <TableCell>
                  <Badge variant={position.status === PositionStatus.OPEN ? 'default' : 'secondary'}>
                    {position.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {position.status === PositionStatus.OPEN && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleClosePosition(position.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Close
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-medium">Positions</h3>
        <div className="flex items-center">
          <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
          <Select 
            value={filter} 
            onValueChange={handleFilterChange}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {renderPositionsTable()}
      </div>
    </div>
  );
}
