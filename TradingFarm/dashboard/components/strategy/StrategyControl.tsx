import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent,
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { 
  AlertCircle, 
  ArrowUpDown, 
  Check, 
  ChevronDown, 
  Copy, 
  Edit, 
  Loader2, 
  MoreHorizontal, 
  Pause, 
  Play, 
  PlusCircle, 
  Search, 
  Trash2, 
  Upload 
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "../ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Strategy, StrategyStatus, StrategyType, StrategyFilter } from './types';
import StrategyDialog from './StrategyDialog';
import { useToast } from "../ui/use-toast";

interface StrategyControlProps {
  className?: string;
}

const mockStrategies: Strategy[] = [
  {
    id: '1',
    name: 'Momentum Breakout',
    description: 'Captures price breakouts with momentum confirmation',
    type: StrategyType.BREAKOUT,
    status: StrategyStatus.RUNNING,
    parameters: [
      {
        id: 'lookback',
        name: 'Lookback Period',
        description: 'Number of candles to analyze for breakout',
        type: 'number',
        value: 20,
        default: 20,
        min: 5,
        max: 100,
        step: 1,
        validation: { required: true, min: 5, max: 100 }
      },
      {
        id: 'threshold',
        name: 'Breakout Threshold',
        description: 'Threshold for considering a price movement a breakout (in %)',
        type: 'number',
        value: 2.5,
        default: 2,
        min: 0.5,
        max: 10,
        step: 0.1,
        validation: { required: true, min: 0.5, max: 10 }
      }
    ],
    exchanges: ['binance'],
    symbols: ['BTC/USDT', 'ETH/USDT'],
    author: 'System',
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2025-02-15T00:00:00Z',
    lastRunAt: '2025-03-15T10:30:00Z',
    performance: {
      profitLoss: 15.3,
      winRate: 62.5,
      drawdown: 8.2,
      sharpeRatio: 1.8,
      totalTrades: 48
    },
    isLive: true,
    isBacktesting: false,
    isElizaOSOptimized: true
  },
  {
    id: '2',
    name: 'Mean Reversion Strategy',
    description: 'Trades using reversion to mean principles',
    type: StrategyType.MEAN_REVERSION,
    status: StrategyStatus.PAUSED,
    parameters: [
      {
        id: 'bands',
        name: 'Bollinger Bands Periods',
        description: 'Period for Bollinger Bands calculation',
        type: 'number',
        value: 20,
        default: 20,
        min: 10,
        max: 50,
        validation: { required: true, min: 10, max: 50 }
      }
    ],
    exchanges: ['coinbase'],
    symbols: ['BTC/USD'],
    author: 'User',
    createdAt: '2025-01-10T00:00:00Z',
    updatedAt: '2025-03-01T00:00:00Z',
    lastRunAt: '2025-03-10T08:15:00Z',
    performance: {
      profitLoss: -3.2,
      winRate: 48.1,
      drawdown: 12.5,
      sharpeRatio: 0.6,
      totalTrades: 27
    },
    isLive: false,
    isBacktesting: false,
    isElizaOSOptimized: false
  },
  {
    id: '3',
    name: 'Elliott Wave Strategy',
    description: 'Detects and trades Elliott Wave patterns',
    type: StrategyType.ELLIOTT_WAVE,
    status: StrategyStatus.RUNNING,
    parameters: [
      {
        id: 'minWaveSize',
        name: 'Minimum Wave Size',
        description: 'Minimum price movement to consider as wave (in %)',
        type: 'number',
        value: 1.5,
        default: 1.0,
        min: 0.5,
        max: 5.0,
        step: 0.1,
        validation: { required: true, min: 0.5, max: 5.0 }
      }
    ],
    exchanges: ['bybit'],
    symbols: ['ETH/USDT'],
    author: 'ElizaOS',
    createdAt: '2025-02-20T00:00:00Z',
    updatedAt: '2025-03-12T00:00:00Z',
    lastRunAt: '2025-03-15T12:45:00Z',
    performance: {
      profitLoss: 22.7,
      winRate: 71.4,
      drawdown: 6.8,
      sharpeRatio: 2.2,
      totalTrades: 35
    },
    isLive: true,
    isBacktesting: false,
    isElizaOSOptimized: true
  }
];

const StrategyControl: React.FC<StrategyControlProps> = ({ className }) => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [filteredStrategies, setFilteredStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof Strategy>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<StrategyFilter>({});
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view' | 'import'>('create');

  const { toast } = useToast();

  useEffect(() => {
    // Simulate API call
    const fetchStrategies = async () => {
      setIsLoading(true);
      try {
        // Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStrategies(mockStrategies);
      } catch (error) {
        console.error('Failed to fetch strategies', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load strategies. Please try again."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStrategies();
  }, [toast]);

  useEffect(() => {
    // Apply filters and sorting
    let result = [...strategies];

    // Apply search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        strategy => 
          strategy.name.toLowerCase().includes(lowerQuery) ||
          strategy.description.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply status filter
    if (filter.status && filter.status.length > 0) {
      result = result.filter(strategy => filter.status?.includes(strategy.status));
    }

    // Apply type filter
    if (filter.types && filter.types.length > 0) {
      result = result.filter(strategy => filter.types?.includes(strategy.type));
    }

    // Apply exchange filter
    if (filter.exchanges && filter.exchanges.length > 0) {
      result = result.filter(strategy => 
        strategy.exchanges.some(exchange => filter.exchanges?.includes(exchange))
      );
    }

    // Apply live filter
    if (filter.isLive !== undefined) {
      result = result.filter(strategy => strategy.isLive === filter.isLive);
    }

    // Apply ElizaOS optimized filter
    if (filter.isElizaOSOptimized !== undefined) {
      result = result.filter(strategy => strategy.isElizaOSOptimized === filter.isElizaOSOptimized);
    }

    // Apply sorting
    result.sort((a, b) => {
      const valueA = a[sortColumn];
      const valueB = b[sortColumn];

      if (valueA === valueB) return 0;

      if (sortDirection === 'asc') {
        return valueA < valueB ? -1 : 1;
      } else {
        return valueA > valueB ? -1 : 1;
      }
    });

    setFilteredStrategies(result);
  }, [strategies, searchQuery, filter, sortColumn, sortDirection]);

  const handleSort = (column: keyof Strategy) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const openCreateDialog = () => {
    setSelectedStrategy(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const openEditDialog = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const openViewDialog = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setDialogMode('view');
    setDialogOpen(true);
  };

  const openImportDialog = () => {
    setSelectedStrategy(null);
    setDialogMode('import');
    setDialogOpen(true);
  };

  const handleDeleteStrategy = async (id: string) => {
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStrategies(prev => prev.filter(strategy => strategy.id !== id));
      
      toast({
        title: "Strategy Deleted",
        description: "The strategy has been successfully deleted."
      });
    } catch (error) {
      console.error('Failed to delete strategy', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete the strategy. Please try again."
      });
    }
  };

  const handleDuplicateStrategy = async (strategy: Strategy) => {
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newStrategy: Strategy = {
        ...strategy,
        id: `${strategy.id}-copy-${Date.now()}`,
        name: `${strategy.name} (Copy)`,
        status: StrategyStatus.STOPPED,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isLive: false
      };
      
      setStrategies(prev => [...prev, newStrategy]);
      
      toast({
        title: "Strategy Duplicated",
        description: "A copy of the strategy has been created."
      });
    } catch (error) {
      console.error('Failed to duplicate strategy', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to duplicate the strategy. Please try again."
      });
    }
  };

  const handleToggleStatus = async (strategy: Strategy) => {
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newStatus = strategy.status === StrategyStatus.RUNNING 
        ? StrategyStatus.PAUSED 
        : StrategyStatus.RUNNING;
      
      setStrategies(prev => 
        prev.map(s => 
          s.id === strategy.id 
            ? { ...s, status: newStatus, updatedAt: new Date().toISOString() } 
            : s
        )
      );
      
      toast({
        title: `Strategy ${newStatus === StrategyStatus.RUNNING ? 'Started' : 'Paused'}`,
        description: `The strategy has been ${newStatus === StrategyStatus.RUNNING ? 'started' : 'paused'}.`
      });
    } catch (error) {
      console.error('Failed to toggle strategy status', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update the strategy status. Please try again."
      });
    }
  };

  const formatProfitLoss = (value: number) => {
    return (
      <span className={value >= 0 ? 'text-green-500' : 'text-red-500'}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}%
      </span>
    );
  };

  const getStatusBadge = (status: StrategyStatus) => {
    switch (status) {
      case StrategyStatus.RUNNING:
        return <Badge className="bg-green-500">Running</Badge>;
      case StrategyStatus.PAUSED:
        return <Badge className="bg-yellow-500">Paused</Badge>;
      case StrategyStatus.STOPPED:
        return <Badge className="bg-gray-500">Stopped</Badge>;
      case StrategyStatus.ERROR:
        return <Badge className="bg-red-500">Error</Badge>;
      case StrategyStatus.CONFIGURING:
        return <Badge className="bg-blue-500">Configuring</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const renderMobileCard = (strategy: Strategy) => {
    return (
      <Card key={strategy.id} className="mb-4 md:hidden">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{strategy.name}</CardTitle>
              <CardDescription>{strategy.description}</CardDescription>
            </div>
            <div>
              {getStatusBadge(strategy.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="text-sm">{strategy.type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Exchanges</p>
              <p className="text-sm">{strategy.exchanges.join(', ')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Profit/Loss</p>
              <p className="text-sm">{formatProfitLoss(strategy.performance?.profitLoss || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-sm">{strategy.performance?.winRate || 0}%</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            {strategy.isElizaOSOptimized && (
              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                ElizaOS
              </Badge>
            )}
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleToggleStatus(strategy)}
              >
                {strategy.status === StrategyStatus.RUNNING ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => openViewDialog(strategy)}
              >
                Details
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEditDialog(strategy)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicateStrategy(strategy)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => handleDeleteStrategy(strategy.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={className}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Strategy Control</h2>
          <p className="text-muted-foreground">
            Manage and monitor your trading strategies
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={openCreateDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Strategy
          </Button>
          <Button variant="outline" onClick={openImportDialog}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search strategies..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Additional filter dropdowns would go here */}
          <Button 
            variant="outline" 
            className="whitespace-nowrap"
            onClick={() => {
              setSearchQuery('');
              setFilter({});
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="w-full flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredStrategies.length === 0 ? (
        <div className="rounded-md bg-muted p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No strategies found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your filters or create a new strategy.
          </p>
          <Button className="mt-4" onClick={openCreateDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Strategy
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile view - cards */}
          <div className="md:hidden space-y-4">
            {filteredStrategies.map(renderMobileCard)}
          </div>
          
          {/* Desktop view - table */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('name')}
                      className="px-0 font-medium flex items-center"
                    >
                      Name
                      {sortColumn === 'name' && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Exchanges</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('updatedAt')}
                      className="px-0 font-medium flex items-center"
                    >
                      Last Updated
                      {sortColumn === 'updatedAt' && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Performance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStrategies.map((strategy) => (
                  <TableRow key={strategy.id}>
                    <TableCell className="font-medium">
                      <div>
                        {strategy.name}
                        {strategy.isElizaOSOptimized && (
                          <Badge variant="outline" className="ml-2 bg-purple-100 text-purple-800 border-purple-200">
                            ElizaOS
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{strategy.description}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(strategy.status)}</TableCell>
                    <TableCell>{strategy.type}</TableCell>
                    <TableCell>{strategy.exchanges.join(', ')}</TableCell>
                    <TableCell>{new Date(strategy.updatedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div>
                        {formatProfitLoss(strategy.performance?.profitLoss || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Win Rate: {strategy.performance?.winRate || 0}%
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center space-x-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleToggleStatus(strategy)}
                              >
                                {strategy.status === StrategyStatus.RUNNING 
                                  ? <Pause className="h-4 w-4" /> 
                                  : <Play className="h-4 w-4" />
                                }
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {strategy.status === StrategyStatus.RUNNING ? 'Pause' : 'Start'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => openEditDialog(strategy)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openViewDialog(strategy)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateStrategy(strategy)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteStrategy(strategy.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      
      {/* Strategy Dialog component would be implemented separately */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-md max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {dialogMode === 'create' ? 'Create New Strategy' : 
               dialogMode === 'edit' ? 'Edit Strategy' :
               dialogMode === 'import' ? 'Import Strategy' : 'Strategy Details'}
            </h3>
            <p>Dialog content would go here...</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyControl;
