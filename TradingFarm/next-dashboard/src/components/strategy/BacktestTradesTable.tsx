'use client';

import { useState } from 'react';
import { BacktestTrade } from '@/lib/strategy/types';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronUp, 
  ArrowUpDown, 
  Search,
  SlidersHorizontal,
  Check
} from 'lucide-react';

interface BacktestTradesTableProps {
  trades: BacktestTrade[];
}

type SortField = 'entryTime' | 'symbol' | 'entryPrice' | 'exitPrice' | 'profit' | 'profitPercent' | 'duration';
type SortDirection = 'asc' | 'desc';

export default function BacktestTradesTable({ trades }: BacktestTradesTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('entryTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filter, setFilter] = useState<'all' | 'winning' | 'losing'>('all');
  
  // Apply search, sorting, and filtering
  const filteredTrades = trades
    .filter(trade => {
      // Apply search
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          trade.symbol.toLowerCase().includes(searchLower) ||
          trade.id.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    .filter(trade => {
      // Apply win/loss filter
      if (filter === 'winning') {
        return (trade.profit || 0) > 0;
      } else if (filter === 'losing') {
        return (trade.profit || 0) <= 0;
      }
      return true;
    })
    .sort((a, b) => {
      // Apply sorting
      let aValue: any;
      let bValue: any;
      
      // Safely access properties based on sortField
      switch(sortField) {
        case 'entryTime':
          aValue = a.entryTime;
          bValue = b.entryTime;
          break;
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'entryPrice':
          aValue = a.entryPrice;
          bValue = b.entryPrice;
          break;
        case 'exitPrice':
          aValue = a.exitPrice;
          bValue = b.exitPrice;
          break;
        case 'profit':
          aValue = a.profit || 0;
          bValue = b.profit || 0;
          break;
        case 'profitPercent':
          aValue = a.profitPercent || 0;
          bValue = b.profitPercent || 0;
          break;
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        default:
          aValue = '';
          bValue = '';
      }
      
      // Handle undefined values
      if (aValue === undefined) aValue = sortField === 'profit' || sortField === 'profitPercent' ? 0 : '';
      if (bValue === undefined) bValue = sortField === 'profit' || sortField === 'profitPercent' ? 0 : '';
      
      // Apply sort direction
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      // Handle date fields
      if (sortField === 'entryTime') {
        return direction * (new Date(aValue).getTime() - new Date(bValue).getTime());
      }
      
      // Handle numeric fields
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction * (aValue - bValue);
      }
      
      // Handle string fields
      return direction * aValue.toString().localeCompare(bValue.toString());
    });
  
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  const getSortIcon = (field: SortField) => {
    if (field === sortField) {
      return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
    }
    return <ArrowUpDown className="h-4 w-4 opacity-50" />;
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by symbol or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filter
              {filter !== 'all' && <span className="ml-1">: {filter}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter Trades</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setFilter('all')}>
              {filter === 'all' && <Check className="h-4 w-4 mr-2" />}
              All Trades
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter('winning')}>
              {filter === 'winning' && <Check className="h-4 w-4 mr-2" />}
              Winning Trades
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter('losing')}>
              {filter === 'losing' && <Check className="h-4 w-4 mr-2" />}
              Losing Trades
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="rounded-md border">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead onClick={() => handleSort('entryTime')} className="cursor-pointer">
                  <div className="flex items-center">
                    Date {getSortIcon('entryTime')}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('symbol')} className="cursor-pointer">
                  <div className="flex items-center">
                    Symbol {getSortIcon('symbol')}
                  </div>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead onClick={() => handleSort('entryPrice')} className="cursor-pointer">
                  <div className="flex items-center">
                    Entry {getSortIcon('entryPrice')}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('exitPrice')} className="cursor-pointer">
                  <div className="flex items-center">
                    Exit {getSortIcon('exitPrice')}
                  </div>
                </TableHead>
                <TableHead>SL/TP</TableHead>
                <TableHead onClick={() => handleSort('profit')} className="cursor-pointer">
                  <div className="flex items-center">
                    Profit {getSortIcon('profit')}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('profitPercent')} className="cursor-pointer">
                  <div className="flex items-center">
                    Return % {getSortIcon('profitPercent')}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('duration')} className="cursor-pointer">
                  <div className="flex items-center">
                    Duration {getSortIcon('duration')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                    No trades found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell>
                      {new Date(trade.entryTime).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">{trade.symbol}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        trade.entryType === 'BUY' 
                          ? 'bg-green-500/20 text-green-700' 
                          : 'bg-red-500/20 text-red-700'
                      }`}>
                        {trade.entryType}
                      </span>
                    </TableCell>
                    <TableCell>{trade.entryPrice.toFixed(4)}</TableCell>
                    <TableCell>
                      {trade.exitPrice ? trade.exitPrice.toFixed(4) : '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {trade.stopLoss && (
                        <div className="text-red-500">SL: {trade.stopLoss.toFixed(4)}</div>
                      )}
                      {trade.takeProfit && (
                        <div className="text-green-500">TP: {trade.takeProfit.toFixed(4)}</div>
                      )}
                    </TableCell>
                    <TableCell className={`${
                      trade.profit ? (trade.profit > 0 ? 'text-green-600' : 'text-red-600') : ''
                    }`}>
                      {trade.profit ? `$${trade.profit.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className={`${
                      trade.profitPercent 
                        ? (trade.profitPercent > 0 ? 'text-green-600' : 'text-red-600') 
                        : ''
                    }`}>
                      {trade.profitPercent ? `${trade.profitPercent.toFixed(2)}%` : '-'}
                    </TableCell>
                    <TableCell>
                      {trade.duration 
                        ? formatDuration(trade.duration)
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Showing {filteredTrades.length} of {trades.length} trades
      </div>
    </div>
  );
}

function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
