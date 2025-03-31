/**
 * Trading Strategy Manager Component
 * 
 * Manages trading strategies for a farm, including creation, editing,
 * and monitoring of automated trading strategies
 */
"use client"

import { useState } from 'react'
import { useTradingStrategies } from '@/hooks/use-trading-strategy'
import { StrategyConfig, StrategyType } from '@/services/trading-strategy-service'
import { ExchangeType } from '@/services/exchange-service'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Plus, Play, Square, RefreshCw, Trash, Edit, BarChart, History, AlertCircle, Check } from 'lucide-react'
import { StrategyForm } from '@/components/trading-strategy-form'
import { StrategySignalList } from '@/components/trading-strategy-signals'
import { cn } from '@/lib/utils'

interface TradingStrategyManagerProps {
  farmId: number
  className?: string
}

export function TradingStrategyManager({ farmId, className }: TradingStrategyManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyConfig | null>(null)
  const [selectedTab, setSelectedTab] = useState<string>('active')

  // Get strategies from the API
  const { 
    strategies, 
    isLoading, 
    error, 
    fetchStrategies,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    startStrategy,
    stopStrategy
  } = useTradingStrategies(farmId)

  // Filter strategies based on active status
  const activeStrategies = strategies.filter(strategy => strategy.isActive)
  const inactiveStrategies = strategies.filter(strategy => !strategy.isActive)
  
  // Handle strategy creation
  const handleCreateStrategy = async (strategy: Omit<StrategyConfig, 'id'>) => {
    await createStrategy(strategy)
    setIsCreateDialogOpen(false)
  }
  
  // Handle strategy update
  const handleUpdateStrategy = async (id: number, updates: Partial<StrategyConfig>) => {
    await updateStrategy(id, updates)
    setIsEditDialogOpen(false)
    setSelectedStrategy(null)
  }
  
  // Handle strategy deletion
  const handleDeleteStrategy = async () => {
    if (selectedStrategy) {
      await deleteStrategy(selectedStrategy.id!)
      setIsDeleteDialogOpen(false)
      setSelectedStrategy(null)
    }
  }
  
  // Handle strategy start/stop
  const handleToggleStrategy = async (strategy: StrategyConfig) => {
    if (strategy.isActive) {
      await stopStrategy(strategy.id!)
    } else {
      await startStrategy(strategy.id!)
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Trading Strategies</h2>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchStrategies()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Strategy
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="active" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="active" className="relative">
            Active
            {activeStrategies.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeStrategies.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive
            {inactiveStrategies.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {inactiveStrategies.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Strategies</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-4">
          {activeStrategies.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <Play className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Active Strategies</h3>
                  <p className="text-sm text-muted-foreground mt-2 mb-4">
                    You don't have any active trading strategies. Start a strategy to begin automated trading.
                  </p>
                  {inactiveStrategies.length > 0 ? (
                    <Button 
                      onClick={() => setSelectedTab('inactive')}
                    >
                      View Inactive Strategies
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => setIsCreateDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Strategy
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeStrategies.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  onEdit={() => {
                    setSelectedStrategy(strategy)
                    setIsEditDialogOpen(true)
                  }}
                  onDelete={() => {
                    setSelectedStrategy(strategy)
                    setIsDeleteDialogOpen(true)
                  }}
                  onToggle={() => handleToggleStrategy(strategy)}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="inactive" className="mt-4">
          {inactiveStrategies.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <Square className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Inactive Strategies</h3>
                  <p className="text-sm text-muted-foreground mt-2 mb-4">
                    You don't have any inactive trading strategies. Create a strategy to get started.
                  </p>
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Strategy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {inactiveStrategies.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  onEdit={() => {
                    setSelectedStrategy(strategy)
                    setIsEditDialogOpen(true)
                  }}
                  onDelete={() => {
                    setSelectedStrategy(strategy)
                    setIsDeleteDialogOpen(true)
                  }}
                  onToggle={() => handleToggleStrategy(strategy)}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="all" className="mt-4">
          {strategies.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <BarChart className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Trading Strategies</h3>
                  <p className="text-sm text-muted-foreground mt-2 mb-4">
                    You haven't created any trading strategies yet. Create your first strategy to begin automated trading.
                  </p>
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Strategy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {strategies.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  onEdit={() => {
                    setSelectedStrategy(strategy)
                    setIsEditDialogOpen(true)
                  }}
                  onDelete={() => {
                    setSelectedStrategy(strategy)
                    setIsDeleteDialogOpen(true)
                  }}
                  onToggle={() => handleToggleStrategy(strategy)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Create Strategy Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Create Trading Strategy</DialogTitle>
            <DialogDescription>
              Configure an automated trading strategy for your farm. This strategy will execute trades based on its rules.
            </DialogDescription>
          </DialogHeader>
          
          <StrategyForm
            farmId={farmId}
            onSubmit={handleCreateStrategy}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Strategy Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Edit Trading Strategy</DialogTitle>
            <DialogDescription>
              Update your trading strategy configuration.
            </DialogDescription>
          </DialogHeader>
          
          {selectedStrategy && (
            <StrategyForm
              farmId={farmId}
              strategy={selectedStrategy}
              onSubmit={(values) => handleUpdateStrategy(selectedStrategy.id!, values)}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this trading strategy? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedStrategy && (
            <div className="py-4">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="font-medium">Strategy Name:</h4>
                <span>{selectedStrategy.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <h4 className="font-medium">Type:</h4>
                <span className="capitalize">{selectedStrategy.strategyType.replace('_', ' ')}</span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDeleteStrategy}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete Strategy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Strategy Card Component
function StrategyCard({ 
  strategy, 
  onEdit, 
  onDelete, 
  onToggle 
}: { 
  strategy: StrategyConfig, 
  onEdit: () => void, 
  onDelete: () => void, 
  onToggle: () => void 
}) {
  const [isSignalsOpen, setIsSignalsOpen] = useState(false)
  
  // Format strategy type for display
  const formatStrategyType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
  
  return (
    <Card className="relative overflow-hidden">
      <div 
        className={cn(
          "absolute top-0 left-0 w-1 h-full",
          strategy.isActive ? "bg-green-500" : "bg-amber-500"
        )}
      />
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{strategy.name}</CardTitle>
            <CardDescription className="mt-1 flex items-center">
              <span className="capitalize">{formatStrategyType(strategy.strategyType)}</span>
              <span className="mx-2">•</span>
              <span>{strategy.symbol}</span>
              <span className="mx-2">•</span>
              <span className="capitalize">{strategy.exchange}</span>
            </CardDescription>
          </div>
          
          <Badge 
            variant={strategy.isActive ? "success" : "secondary"}
            className={strategy.isActive ? "bg-green-100 text-green-800" : ""}
          >
            {strategy.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Timeframe:</span>
            <span className="font-medium">{strategy.timeframe}</span>
          </div>
          
          {strategy.maxDrawdown && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Max Drawdown:</span>
              <span className="font-medium">{strategy.maxDrawdown}%</span>
            </div>
          )}
          
          {strategy.maxPositionSize && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Max Position:</span>
              <span className="font-medium">{strategy.maxPositionSize}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Parameters:</span>
            <span className="font-medium">{Object.keys(strategy.parameters).length} configured</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex items-center justify-between pt-2">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsSignalsOpen(true)}
          >
            <History className="h-4 w-4 mr-2" />
            Signals
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
        
        <Button
          variant={strategy.isActive ? "destructive" : "default"}
          size="sm"
          onClick={onToggle}
        >
          {strategy.isActive ? (
            <>
              <Square className="h-4 w-4 mr-2" />
              Stop
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Start
            </>
          )}
        </Button>
      </CardFooter>
      
      {/* Strategy Signals Dialog */}
      <Dialog open={isSignalsOpen} onOpenChange={setIsSignalsOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Trading Signals - {strategy.name}</DialogTitle>
            <DialogDescription>
              Recent signals generated by this trading strategy
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <StrategySignalList strategyId={strategy.id!} />
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsSignalsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
