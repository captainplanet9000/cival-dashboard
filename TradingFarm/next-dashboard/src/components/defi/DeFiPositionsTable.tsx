'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpDown, 
  ExternalLink, 
  DollarSign,
  Calendar
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DeFiPosition } from './ElizaDeFiConsoleWidget';

interface DeFiPositionsTableProps {
  positions: DeFiPosition[];
}

type SortField = 'protocol_name' | 'amount' | 'usd_value' | 'apy' | 'start_date' | 'risk_level';
type SortDirection = 'asc' | 'desc';

export function DeFiPositionsTable({ positions }: DeFiPositionsTableProps) {
  const [sortConfig, setSortConfig] = React.useState<{
    key: SortField;
    direction: SortDirection;
  }>({
    key: 'usd_value',
    direction: 'desc',
  });

  // Handle sorting
  const requestSort = (key: SortField) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort positions
  const sortedPositions = React.useMemo(() => {
    const sortablePositions = [...positions];
    sortablePositions.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sortablePositions;
  }, [positions, sortConfig]);

  // Format date to readable string
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Ongoing';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get appropriate color for risk level
  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'outline';
      case 'medium':
        return 'secondary';
      case 'high':
        return 'destructive';
      case 'very_high':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Render APY with appropriate styling
  const renderAPY = (apy: number) => {
    const formattedAPY = `${apy.toFixed(2)}%`;
    const textClass = apy > 20 ? 'text-amber-500' : apy > 5 ? 'text-emerald-500' : '';

    return <span className={`font-medium ${textClass}`}>{formattedAPY}</span>;
  };

  return (
    <div className="p-1">
      <ScrollArea className="h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => requestSort('protocol_name')}
                >
                  Protocol
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Position Type</TableHead>
              <TableHead>Chain</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => requestSort('usd_value')}
                >
                  Value
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => requestSort('apy')}
                >
                  APY
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => requestSort('start_date')}
                >
                  Date
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => requestSort('risk_level')}
                >
                  Risk
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPositions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center h-32 text-muted-foreground">
                  No positions available with the current filters
                </TableCell>
              </TableRow>
            ) : (
              sortedPositions.map(position => (
                <TableRow key={position.id}>
                  <TableCell className="font-medium">
                    {position.protocol_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {position.position_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {position.chain}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {position.asset_symbol}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      {position.usd_value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    {renderAPY(position.apy)}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{formatDate(position.start_date)}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <p>Start: {formatDate(position.start_date)}</p>
                            <p>End: {formatDate(position.end_date)}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRiskBadgeVariant(position.risk_level)}>
                      {position.risk_level}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                        <span className="sr-only">View Transaction</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
