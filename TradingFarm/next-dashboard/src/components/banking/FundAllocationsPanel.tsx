"use client"

import { useState, useEffect } from 'react'
import { 
  RefreshCw, 
  PieChart, 
  Sliders, 
  BarChart4, 
  TrendingUp,
  Plus
} from 'lucide-react'
import { bankingService, Balance } from '@/services/banking-service'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createBrowserClient } from '@/utils/supabase/client'

interface Strategy {
  id: string
  name: string
  description: string
  allocation: number
  performance: number
  risk: 'low' | 'medium' | 'high'
  assets: string[]
}

interface FundAllocationsPanelProps {
  userId?: string
}

// Sample strategies data - in real app, would come from API/database
const SAMPLE_STRATEGIES: Strategy[] = [
  {
    id: 'momentum',
    name: 'Momentum Trading',
    description: 'Capitalizes on continuation of existing market trends',
    allocation: 30,
    performance: 14.2,
    risk: 'medium',
    assets: ['BTC', 'ETH', 'SOL']
  },
  {
    id: 'mean-rev',
    name: 'Mean Reversion',
    description: 'Profits from price returns to historical average',
    allocation: 25,
    performance: 8.5,
    risk: 'low',
    assets: ['BTC', 'ETH', 'LINK']
  },
  {
    id: 'trend',
    name: 'Trend Following',
    description: 'Captures gains by riding directional moves',
    allocation: 20,
    performance: 18.7,
    risk: 'high',
    assets: ['BTC', 'SOL', 'AVAX']
  },
  {
    id: 'liquidity',
    name: 'Liquidity Providing',
    description: 'Generates income by providing liquidity to markets',
    allocation: 15,
    performance: 6.8,
    risk: 'low',
    assets: ['USDT', 'ETH']
  },
  {
    id: 'grid',
    name: 'Grid Trading',
    description: 'Places orders at regular price intervals',
    allocation: 10,
    performance: 9.3,
    risk: 'medium',
    assets: ['BTC', 'ETH']
  }
];

export default function FundAllocationsPanel({ userId = '1' }: FundAllocationsPanelProps) {
  const [balances, setBalances] = useState<Balance[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>(SAMPLE_STRATEGIES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [tempAllocations, setTempAllocations] = useState<{[key: string]: number}>({})
  const [pendingChanges, setPendingChanges] = useState(false)
  const [activeTab, setActiveTab] = useState('strategies')
  const [farms, setFarms] = useState<{id: string, name: string}[]>([])
  const { toast } = useToast()
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchData()
    fetchFarms()
  }, [userId])

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get balances for allocation
      const { data, error: fetchError } = await bankingService.getBalances(userId)
      
      if (fetchError) {
        setError(fetchError)
      } else if (data) {
        setBalances(data)
      }
      
      // In a real app, you'd also fetch current strategy allocations
      // For now, we're using the sample data
      const initialAllocations: {[key: string]: number} = {}
      strategies.forEach(strategy => {
        initialAllocations[strategy.id] = strategy.allocation
      })
      setTempAllocations(initialAllocations)
      
    } catch (err: any) {
      setError(err.message || 'Failed to load allocation data')
      toast({
        title: "Error",
        description: "Failed to load allocation data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchFarms = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: farmData } = await supabase
        .from('farms')
        .select('id, name')
        .eq('user_id', user.id)
      
      if (farmData && farmData.length > 0) {
        setFarms(farmData)
      }
    }
  }

  const handleRefresh = () => {
    toast({
      description: "Refreshing allocation data...",
    })
    fetchData()
  }

  const handleSliderChange = (strategyId: string, value: number[]) => {
    const newValue = value[0]
    
    // Compute the difference to distribute among other strategies
    const currentTotal = Object.values(tempAllocations).reduce((sum, val) => sum + val, 0)
    const diff = newValue - tempAllocations[strategyId]
    
    if (currentTotal + diff > 100) {
      toast({
        title: "Allocation Error",
        description: "Total allocation cannot exceed 100%",
        variant: "destructive",
      })
      return
    }
    
    // Update the allocation for this strategy
    setTempAllocations(prev => ({
      ...prev,
      [strategyId]: newValue
    }))
    
    setPendingChanges(true)
  }

  const saveAllocations = async () => {
    setLoading(true)
    
    try {
      // In a real app, you'd send this to the API
      // For now, we'll just update the UI
      const updatedStrategies = strategies.map(strategy => ({
        ...strategy,
        allocation: tempAllocations[strategy.id] || strategy.allocation
      }))
      
      setStrategies(updatedStrategies)
      setPendingChanges(false)
      setEditMode(false)
      
      toast({
        title: "Allocations Updated",
        description: "Your fund allocations have been saved",
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to save allocations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const cancelChanges = () => {
    // Reset to original values
    const initialAllocations: {[key: string]: number} = {}
    strategies.forEach(strategy => {
      initialAllocations[strategy.id] = strategy.allocation
    })
    setTempAllocations(initialAllocations)
    setPendingChanges(false)
    setEditMode(false)
  }

  // Get risk color
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-success'
      case 'medium':
        return 'text-warning'
      case 'high':
        return 'text-destructive'
      default:
        return 'text-primary'
    }
  }

  // Render loading state
  if (loading && !editMode) {
    return (
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Fund Allocations</h2>
          <Button variant="ghost" size="sm" disabled>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 border border-border rounded-md">
              <div className="flex items-center">
                <Skeleton className="h-10 w-10 rounded-full mr-3" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-5 w-12 mb-1 ml-auto" />
                <Skeleton className="h-2 w-24 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Render error state
  if (error && !editMode) {
    return (
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Fund Allocations</h2>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <div className="p-4 border border-destructive/30 bg-destructive/10 rounded-md text-destructive text-center">
          <p className="font-medium">Failed to load allocation data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center">
            <PieChart className="mr-2 h-5 w-5" />
            Fund Allocations
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage how your funds are allocated across trading strategies
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {!editMode ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                <Sliders className="h-4 w-4 mr-2" />
                Edit Allocations
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={cancelChanges}>
                Cancel
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={saveAllocations}
                disabled={!pendingChanges || loading}
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="strategies" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="strategies">
            <BarChart4 className="mr-2 h-4 w-4" />
            Strategy Allocations
          </TabsTrigger>
          <TabsTrigger value="performance">
            <TrendingUp className="mr-2 h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="strategies">
          <div className="space-y-4">
            {/* Overall Allocation Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Overall Allocation</h3>
                <span className="text-sm font-medium">
                  {Object.values(tempAllocations).reduce((sum, val) => sum + val, 0)}% Allocated
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                {strategies.map((strategy) => (
                  <div 
                    key={strategy.id}
                    className="h-full" 
                    style={{ 
                      width: `${editMode ? tempAllocations[strategy.id] : strategy.allocation}%`,
                      backgroundColor: strategy.id === 'momentum' ? '#0ea5e9' : 
                                      strategy.id === 'mean-rev' ? '#10b981' : 
                                      strategy.id === 'trend' ? '#f59e0b' : 
                                      strategy.id === 'liquidity' ? '#8b5cf6' : 
                                      '#ec4899'
                    }}
                    title={`${strategy.name}: ${editMode ? tempAllocations[strategy.id] : strategy.allocation}%`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {strategies.map((strategy) => (
                  <div key={strategy.id} className="flex items-center text-xs">
                    <div 
                      className="h-3 w-3 rounded-full mr-1"
                      style={{ 
                        backgroundColor: strategy.id === 'momentum' ? '#0ea5e9' : 
                                        strategy.id === 'mean-rev' ? '#10b981' : 
                                        strategy.id === 'trend' ? '#f59e0b' : 
                                        strategy.id === 'liquidity' ? '#8b5cf6' : 
                                        '#ec4899'
                      }}
                    />
                    <span>{strategy.name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {strategies.map((strategy) => (
              <div key={strategy.id} className="border border-border rounded-md overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium flex items-center">
                      {strategy.name}
                      <span className={`text-xs ml-2 ${getRiskColor(strategy.risk)}`}>
                        {strategy.risk.charAt(0).toUpperCase() + strategy.risk.slice(1)} Risk
                      </span>
                    </h3>
                    <span className="font-bold">
                      {editMode ? tempAllocations[strategy.id] : strategy.allocation}%
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    {strategy.description}
                  </p>
                  
                  {editMode ? (
                    <Slider 
                      defaultValue={[strategy.allocation]} 
                      max={100} 
                      step={1}
                      value={[tempAllocations[strategy.id]]}
                      onValueChange={(value) => handleSliderChange(strategy.id, value)}
                      className="mb-2"
                    />
                  ) : (
                    <Progress value={strategy.allocation} className="h-2 mb-2" />
                  )}
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Assets: {strategy.assets.join(', ')}</span>
                    <span>Performance: {strategy.performance > 0 ? '+' : ''}{strategy.performance}%</span>
                  </div>
                </div>
              </div>
            ))}
            
            {!editMode && (
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Custom Strategy
              </Button>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="performance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {strategies.map((strategy) => (
              <Card key={`perf-${strategy.id}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{strategy.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-muted-foreground">Performance</span>
                    <span className={`font-bold ${strategy.performance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {strategy.performance > 0 ? '+' : ''}{strategy.performance}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-muted-foreground">Allocation</span>
                    <span className="font-medium">{strategy.allocation}%</span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-muted-foreground">Risk Level</span>
                    <span className={`font-medium ${getRiskColor(strategy.risk)}`}>
                      {strategy.risk.charAt(0).toUpperCase() + strategy.risk.slice(1)}
                    </span>
                  </div>
                  
                  <div className="mt-4 p-3 bg-muted/30 rounded-md">
                    <h4 className="text-sm font-medium mb-1">Assets</h4>
                    <div className="flex flex-wrap gap-1">
                      {strategy.assets.map(asset => (
                        <span key={asset} className="px-2 py-1 bg-primary/10 text-xs rounded-md">
                          {asset}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
