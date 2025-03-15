import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  MoreHorizontal,
  Pause,
  Eye,
  X,
  Edit,
  AlertTriangle,
  ArrowUpDown,
  Search,
  ChevronsUpDown
} from "lucide-react";
import { ActiveTrade } from './types';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";

interface ActiveTradesProps {
  trades: ActiveTrade[];
  onViewDetails: (tradeId: string) => void;
  onCloseTrade: (tradeId: string) => void;
  onPauseTrade: (tradeId: string) => void;
  onEditTrade: (tradeId: string) => void;
}

const ActiveTrades: React.FC<ActiveTradesProps> = ({
  trades,
  onViewDetails,
  onCloseTrade,
  onPauseTrade,
  onEditTrade
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('openTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter trades based on search and filter criteria
  const filteredTrades = trades.filter(trade => {
    const matchesSearch = 
      trade.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trade.strategy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trade.exchange.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterBy === 'all') return true;
    if (filterBy === 'long' && trade.type === 'long') return true;
    if (filterBy === 'short' && trade.type === 'short') return true;
    if (filterBy === 'profit' && trade.pnl > 0) return true;
    if (filterBy === 'loss' && trade.pnl < 0) return true;
    if (filterBy === 'high-risk' && trade.risk === 'high') return true;
    
    return false;
  });

  // Sort trades based on sort criteria
  const sortedTrades = [...filteredTrades].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'symbol':
        comparison = a.symbol.localeCompare(b.symbol);
        break;
      case 'pnl':
        comparison = a.pnl - b.pnl;
        break;
      case 'pnlPercentage':
        comparison = a.pnlPercentage - b.pnlPercentage;
        break;
      case 'openTime':
        comparison = new Date(a.openTime).getTime() - new Date(b.openTime).getTime();
        break;
      default:
        comparison = 0;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl flex items-center justify-between">
          <div className="flex items-center">
            <ArrowUpDown className="h-5 w-5 mr-2 text-primary" />
            Active Trades
          </div>
          <Badge variant="outline" className="font-normal">
            {trades.length} Active
          </Badge>
        </CardTitle>
        <CardDescription>
          Monitor and manage your currently open trading positions
        </CardDescription>
      </CardHeader>
      
      <div className="px-6 flex flex-col gap-3 sm:flex-row sm:items-center mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by symbol, strategy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trades</SelectItem>
              <SelectItem value="long">Long Only</SelectItem>
              <SelectItem value="short">Short Only</SelectItem>
              <SelectItem value="profit">In Profit</SelectItem>
              <SelectItem value="loss">In Loss</SelectItem>
              <SelectItem value="high-risk">High Risk</SelectItem>
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[130px] justify-between">
                <span>Sort: {
                  sortBy === 'symbol' ? 'Symbol' :
                  sortBy === 'pnl' ? 'P&L' :
                  sortBy === 'pnlPercentage' ? 'P&L %' :
                  sortBy === 'openTime' ? 'Open Time' : 'Default'
                }</span>
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuLabel>Sort Trades</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortBy('symbol')}>
                Symbol {sortBy === 'symbol' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('pnl')}>
                P&L Value {sortBy === 'pnl' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('pnlPercentage')}>
                P&L Percentage {sortBy === 'pnlPercentage' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('openTime')}>
                Open Time {sortBy === 'openTime' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleSortDirection}>
                {sortDirection === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100%-1rem)]">
          {sortedTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ArrowUpDown className="h-10 w-10 mx-auto mb-2 opacity-30" />
              {trades.length === 0 ? (
                <p>No active trades</p>
              ) : (
                <p>No trades match your filters</p>
              )}
              <Button variant="outline" className="mt-4" onClick={() => {
                setSearchQuery('');
                setFilterBy('all');
              }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-3 pr-2">
              {sortedTrades.map((trade) => (
                <div 
                  key={trade.id}
                  className={`rounded-lg border p-3 ${
                    trade.pnl > 0 
                      ? 'bg-green-50/30 dark:bg-green-950/10 border-green-200 dark:border-green-900' 
                      : trade.pnl < 0 
                        ? 'bg-red-50/30 dark:bg-red-950/10 border-red-200 dark:border-red-900' 
                        : 'bg-muted/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center">
                        <h3 className="text-base font-medium">
                          {trade.symbol}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={`ml-2 ${
                            trade.type === 'long' 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : 'bg-red-100 text-red-800 border-red-200'
                          }`}
                        >
                          {trade.type === 'long' ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {trade.type.toUpperCase()}
                        </Badge>
                        
                        {trade.risk === 'high' && (
                          <Badge 
                            variant="outline" 
                            className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-200"
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            HIGH RISK
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground mt-1">
                        <span>{trade.strategy}</span>
                        <span className="mx-1.5">•</span>
                        <span>{trade.exchange}</span>
                      </div>
                    </div>
                    
                    <TooltipProvider>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewDetails(trade.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditTrade(trade.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Parameters
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onPauseTrade(trade.id)}>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause Strategy
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onCloseTrade(trade.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Close Position
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TooltipProvider>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Entry Price</p>
                      <p className="text-sm font-medium">${trade.entryPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Current Price</p>
                      <p className="text-sm font-medium">${trade.currentPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Quantity</p>
                      <p className="text-sm font-medium">{trade.quantity}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">P&L</p>
                      <div className="flex items-center">
                        <p className={`text-sm font-medium ${
                          trade.pnl > 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : trade.pnl < 0 
                              ? 'text-red-600 dark:text-red-400' 
                              : ''
                        }`}>
                          {trade.pnl > 0 ? '+' : ''}
                          ${trade.pnl.toFixed(2)} ({trade.pnl > 0 ? '+' : ''}
                          {trade.pnlPercentage.toFixed(2)}%)
                        </p>
                        {trade.pnl > 0 ? (
                          <TrendingUp className="h-3.5 w-3.5 ml-1 text-green-600 dark:text-green-400" />
                        ) : trade.pnl < 0 ? (
                          <TrendingDown className="h-3.5 w-3.5 ml-1 text-red-600 dark:text-red-400" />
                        ) : null}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Open Time</p>
                      <p className="text-sm">{new Date(trade.openTime).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {(trade.stopLoss || trade.takeProfit) && (
                    <div className="flex gap-4 mt-3 pt-3 border-t">
                      {trade.stopLoss && (
                        <div>
                          <p className="text-xs text-muted-foreground">Stop Loss</p>
                          <p className="text-sm font-medium text-red-600">${trade.stopLoss.toFixed(2)}</p>
                        </div>
                      )}
                      {trade.takeProfit && (
                        <div>
                          <p className="text-xs text-muted-foreground">Take Profit</p>
                          <p className="text-sm font-medium text-green-600">${trade.takeProfit.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActiveTrades;
