"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BacktestTrade } from '@/types/backtesting';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowDown, 
  ArrowUp, 
  TrendingUp, 
  TrendingDown,
  Search,
  SlidersHorizontal
} from 'lucide-react';

interface BacktestTradesListProps {
  trades: BacktestTrade[];
}

export function BacktestTradesList({ trades }: BacktestTradesListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof BacktestTrade>('entry_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const pageSize = 10;

  // Filter trades based on search query
  const filteredTrades = trades.filter(trade => 
    trade.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trade.direction.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trade.exit_reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort trades
  const sortedTrades = [...filteredTrades].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    // Convert to comparable values if necessary
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      if (sortField === 'entry_time' || sortField === 'exit_time') {
        return sortDirection === 'asc' 
          ? new Date(aValue).getTime() - new Date(bValue).getTime()
          : new Date(bValue).getTime() - new Date(aValue).getTime();
      }
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }
    
    // For numeric values
    return sortDirection === 'asc' 
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedTrades.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTrades = sortedTrades.slice(startIndex, startIndex + pageSize);

  // Handle sorting
  const handleSort = (field: keyof BacktestTrade) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  const renderSortArrow = (field: keyof BacktestTrade) => {
    if (field !== sortField) return null;
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    );
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Trade History</CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-[200px]">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search trades..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Button variant="outline" size="sm" className="h-9 px-2">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer" 
                  onClick={() => handleSort('entry_time')}
                >
                  <div className="flex items-center">
                    Entry Time
                    {renderSortArrow('entry_time')}
                  </div>
                </TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead 
                  className="text-right cursor-pointer" 
                  onClick={() => handleSort('entry_price')}
                >
                  <div className="flex items-center justify-end">
                    Entry Price
                    {renderSortArrow('entry_price')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer" 
                  onClick={() => handleSort('exit_price')}
                >
                  <div className="flex items-center justify-end">
                    Exit Price
                    {renderSortArrow('exit_price')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer" 
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center justify-end">
                    Quantity
                    {renderSortArrow('quantity')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer" 
                  onClick={() => handleSort('profit_loss')}
                >
                  <div className="flex items-center justify-end">
                    P&L
                    {renderSortArrow('profit_loss')}
                  </div>
                </TableHead>
                <TableHead>Exit Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No trades found matching your search criteria
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTrades.map((trade, index) => (
                  <TableRow key={`${trade.entry_time}-${trade.exit_time}-${index}`}>
                    <TableCell className="text-nowrap">
                      {new Date(trade.entry_time).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{trade.symbol}</TableCell>
                    <TableCell>
                      {trade.direction === 'long' ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 flex w-[65px] justify-center items-center">
                          <TrendingUp className="mr-1 h-3.5 w-3.5" />
                          LONG
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 flex w-[65px] justify-center items-center">
                          <TrendingDown className="mr-1 h-3.5 w-3.5" />
                          SHORT
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {trade.entry_price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {trade.exit_price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {trade.quantity.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8
                      })}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${trade.profit_loss > 0 ? 'text-green-500' : trade.profit_loss < 0 ? 'text-red-500' : ''}`}>
                      {formatCurrency(trade.profit_loss)}
                      <br />
                      <span className="text-xs">
                        ({trade.profit_loss_pct > 0 ? '+' : ''}{trade.profit_loss_pct.toFixed(2)}%)
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {trade.exit_reason.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filteredTrades.length)} of {filteredTrades.length} trades
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
