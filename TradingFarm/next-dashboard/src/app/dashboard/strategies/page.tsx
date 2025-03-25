"use client";  

import React, { useState, useEffect } from "react";
import { useEliza } from "@/context/eliza-context";
import { useSocket } from "@/providers/socket-provider";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Trash, 
  Edit, 
  MoreVertical, 
  RefreshCw,
  Play,
  Pause
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useStrategies } from "@/hooks/use-strategies";
import { Strategy } from '@/types/strategy';

// Define constants for trading events
const TRADING_EVENTS = {
  STRATEGY_CREATED: 'strategy:created',
  STRATEGY_UPDATED: 'strategy:updated',
  STRATEGY_DELETED: 'strategy:deleted',
  STRATEGY_ASSIGNED: 'strategy:assigned',
  STRATEGY_CREATE: 'strategy:create',
  STRATEGY_UPDATE: 'strategy:update',
  STRATEGY_DELETE: 'strategy:delete',
  COMMAND_SUBMIT: 'command:submit',
  KNOWLEDGE_QUERY: 'knowledge:query',
  MARKET_UPDATE: 'market:update',
  PORTFOLIO_UPDATE: 'portfolio:update',
  COMMAND_RESPONSE: 'command:response',
  KNOWLEDGE_RESPONSE: 'knowledge:response',
};

// Type for strategy status (used for local color styling)
type TradeStatus = 'active' | 'paused' | 'stopped' | 'draft' | 'inactive';

// Basic ElizaConsoleContainer component
const ElizaConsoleContainer = () => (
  <div className="bg-card rounded-lg border p-4">
    <h3 className="font-medium mb-2">ElizaOS Command Console</h3>
    <p className="text-sm text-muted-foreground">
      The command console is available through the ElizaOS button in the sidebar.
    </p>
  </div>
);

// Simple form component
const StrategyDialogForm = ({ 
  strategy, 
  onSubmit, 
  onCancel 
}: { 
  strategy?: Strategy, 
  onSubmit: (data: any) => void, 
  onCancel: () => void 
}) => (
  <div>
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <div className="col-span-4">
          <Button type="button" onClick={() => onSubmit({})}>Save Strategy</Button>
          <Button type="button" variant="outline" onClick={onCancel} className="ml-2">Cancel</Button>
        </div>
      </div>
    </div>
  </div>
);

export default function StrategiesPage() {
  const { strategies, loading, refreshStrategies } = useStrategies();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const socket = useSocket();
  const { toast } = useToast();
  const elizaContext = useEliza();
  
  // Safe client-side only execution
  const isClient = typeof window !== 'undefined';

  // Handle socket events for strategy updates (create, update, delete)
  useEffect(() => {
    if (!isClient || !socket || !socket.socket) return;
    
    const socketInstance = socket.socket;
    
    // New strategy created
    const handleStrategyCreated = (strategy: Strategy) => {
      refreshStrategies();
      toast({
        title: "Strategy Created",
        description: `${strategy.name} has been added to your strategies.`,
      });
    };
    
    // Strategy updated
    const handleStrategyUpdated = (strategy: Strategy) => {
      refreshStrategies();
      toast({
        title: "Strategy Updated",
        description: `${strategy.name} has been updated.`,
      });
    };
    
    // Strategy deleted
    const handleStrategyDeleted = (strategyId: string) => {
      refreshStrategies();
      toast({
        title: "Strategy Deleted",
        description: "The strategy has been deleted.",
      });
    };
    
    // Strategy assigned to an agent
    const handleStrategyAssigned = (data: { strategyId: string, agentId: string }) => {
      refreshStrategies();
      toast({
        title: "Strategy Assigned",
        description: `Strategy has been assigned to an agent.`,
      });
    };
    
    // Register event listeners
    socketInstance.on(TRADING_EVENTS.STRATEGY_CREATED, handleStrategyCreated);
    socketInstance.on(TRADING_EVENTS.STRATEGY_UPDATED, handleStrategyUpdated);
    socketInstance.on(TRADING_EVENTS.STRATEGY_DELETED, handleStrategyDeleted);
    socketInstance.on(TRADING_EVENTS.STRATEGY_ASSIGNED, handleStrategyAssigned);
    
    // Clean up event listeners on unmount
    return () => {
      socketInstance.off(TRADING_EVENTS.STRATEGY_CREATED, handleStrategyCreated);
      socketInstance.off(TRADING_EVENTS.STRATEGY_UPDATED, handleStrategyUpdated);
      socketInstance.off(TRADING_EVENTS.STRATEGY_DELETED, handleStrategyDeleted);
      socketInstance.off(TRADING_EVENTS.STRATEGY_ASSIGNED, handleStrategyAssigned);
    };
  }, [socket, refreshStrategies, toast, isClient]);
  
  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (!selectedStrategy) return;
    
    // Emit delete event to socket if available
    if (socket && socket.socket) {
      socket.socket.emit(TRADING_EVENTS.STRATEGY_DELETE, { 
        strategyId: selectedStrategy.id 
      });
    }
    
    // Show success message
    toast({
      title: "Strategy Deleted",
      description: `${selectedStrategy.name} has been deleted.`,
    });
    
    // Reset state and refresh strategies
    setSelectedStrategy(null);
    setIsDeleteDialogOpen(false);
    refreshStrategies();
  };
  
  // Format the date to a readable string
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get status badge color based on strategy status
  const getStatusColor = (status: TradeStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-amber-500';
      case 'stopped':
        return 'bg-red-500';
      case 'draft':
        return 'bg-slate-400';
      case 'inactive':
        return 'bg-gray-400';
      default:
        return 'bg-slate-400';
    }
  };
  
  // Effect to open ElizaOS with strategy context when component mounts
  useEffect(() => {
    // Only run on client, and only if elizaContext is available
    if (!isClient || !elizaContext || !elizaContext.executeCommand) {
      console.log("Skipping ElizaOS initialization - not ready");
      return;
    }
    
    // Set up strategy-specific quick commands when the component mounts  
    const setupMessage = async () => {
      try {
        // Add a small delay to ensure the UI is responsive first
        setTimeout(async () => {
          try {
            await elizaContext.executeCommand("/strategy-assistant");
            console.log("Strategy assistant initialized");
          } catch (err) {
            console.error("Strategy assistant initialization failed:", err);
          }
        }, 1000);
      } catch (error) {
        console.error("Error initializing strategy assistant:", error);
      }
    };
    
    // Only run once we have strategies loaded and not in loading state
    if (strategies.length > 0 && !loading) {
      console.log("Setting up strategy assistant");
      setupMessage();
    }
  }, [strategies, loading, elizaContext, isClient]);

  // Function to handle viewing a strategy's details
  const handleViewStrategy = (strategy: Strategy) => {
    // Use the correct setter approach for React state
    setSelectedStrategy(() => strategy);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Trading Strategies</h1>
          <p className="text-muted-foreground">
            Manage and monitor your algorithmic trading strategies
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refreshStrategies()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Strategy
          </Button>
        </div>
      </div>
      
      <Separator />
      
      {/* Strategy Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-3"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6 mb-3"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : strategies.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-lg text-muted-foreground">No strategies found</p>
          <p className="text-sm text-muted-foreground mb-4">Create your first trading strategy to get started</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Strategy
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {strategies.map((strategy) => (
            <Card key={strategy.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      {strategy.name}
                      <span className={`ml-2 inline-block w-2 h-2 rounded-full ${getStatusColor(strategy.status)}`}></span>
                    </CardTitle>
                    <CardDescription>
                      {strategy.description.length > 100 
                        ? `${strategy.description.substring(0, 100)}...` 
                        : strategy.description}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => {
                          handleViewStrategy(strategy);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (socket && socket.socket) {
                            socket.socket.emit(TRADING_EVENTS.STRATEGY_UPDATE, { 
                              ...strategy,
                              status: strategy.status === 'active' ? 'paused' : 'active' 
                            });
                          }
                        }}
                      >
                        {strategy.status === 'active' ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => {
                          setSelectedStrategy(strategy);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">{strategy.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium capitalize">{strategy.status}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{formatDate(strategy.createdAt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Return:</span>
                    <span className={`font-medium ${strategy.returns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {strategy.returns > 0 ? '+' : ''}{strategy.returns}%
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    if (elizaContext) {
                      elizaContext.openConsole();
                      setTimeout(() => {
                        elizaContext.executeCommand(`/analyze-strategy ${strategy.id}`);
                      }, 500);
                    }
                  }}
                >
                  Analyze with ElizaOS
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Create Strategy Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Strategy</DialogTitle>
            <DialogDescription>
              Define a new algorithmic trading strategy for your portfolio
            </DialogDescription>
          </DialogHeader>
          <StrategyDialogForm 
            onSubmit={(data) => {
              // Socket emit create strategy
              if (socket && socket.socket) {
                socket.socket.emit(TRADING_EVENTS.STRATEGY_CREATE, data);
              }
              setIsCreateDialogOpen(false);
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Strategy Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Strategy</DialogTitle>
            <DialogDescription>
              Update your trading strategy configuration
            </DialogDescription>
          </DialogHeader>
          {selectedStrategy && (
            <StrategyDialogForm 
              strategy={selectedStrategy}
              onSubmit={(data) => {
                // Socket emit update strategy
                if (socket && socket.socket) {
                  socket.socket.emit(TRADING_EVENTS.STRATEGY_UPDATE, {
                    ...selectedStrategy,
                    ...data
                  });
                }
                setIsEditDialogOpen(false);
                setSelectedStrategy(null);
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedStrategy(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Strategy</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this strategy? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedStrategy(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* ElizaOS Command Console */}
      <ElizaConsoleContainer />
    </div>
  );
}
