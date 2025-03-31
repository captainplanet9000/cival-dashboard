"use client"

import { useState, useEffect } from 'react'
import { 
  Database, 
  Plus, 
  Trash2, 
  Edit, 
  ArrowUpDown, 
  AlertOctagon, 
  CheckCircle2, 
  Activity,
  Users,
  RefreshCw,
  BarChart2,
  DollarSign,
  ChevronRight,
  ChevronDown,
  Search
} from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent } from '../../../components/ui/dialog'
import { api } from '../../../lib/api-client'
import { Input } from '../../../components/ui/input'
import CreateFarm from './create-farm'
import Link from 'next/link'

interface Farm {
  id: number
  name: string
  description?: string
  is_active: boolean
  risk_profile: {
    max_drawdown: number
    risk_per_trade?: number
    volatility_tolerance?: 'low' | 'medium' | 'high'
  }
  performance_metrics: {
    win_rate: number
    profit_factor?: number
    trades_count: number
    total_profit_loss?: number
  }
  created_at: string
  updated_at: string
}

const farmData: Farm[] = [
  {
    id: 1,
    name: 'Bitcoin Momentum',
    is_active: true,
    risk_profile: {
      max_drawdown: 20,
      volatility_tolerance: 'medium'
    },
    performance_metrics: {
      win_rate: 0.55,
      trades_count: 100
    },
    created_at: '2023-10-15',
    updated_at: '2023-10-15'
  },
  {
    id: 2,
    name: 'Ethereum Swing',
    is_active: true,
    risk_profile: {
      max_drawdown: 30,
      volatility_tolerance: 'high'
    },
    performance_metrics: {
      win_rate: 0.45,
      trades_count: 80
    },
    created_at: '2023-11-05',
    updated_at: '2023-11-05'
  },
  {
    id: 3,
    name: 'Stablecoin Arbitrage',
    is_active: false,
    risk_profile: {
      max_drawdown: 10,
      volatility_tolerance: 'low'
    },
    performance_metrics: {
      win_rate: 0.60,
      trades_count: 50
    },
    created_at: '2023-12-20',
    updated_at: '2023-12-20'
  },
  {
    id: 4,
    name: 'Altcoin Breakout',
    is_active: false,
    risk_profile: {
      max_drawdown: 40,
      volatility_tolerance: 'high'
    },
    performance_metrics: {
      win_rate: 0.30,
      trades_count: 20
    },
    created_at: '2024-01-10',
    updated_at: '2024-01-10'
  }
]

// Farm Status Card Component
const FarmStatusCard = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="dashboard-card flex items-center">
        <div className="p-3 rounded-full bg-primary/10 mr-4">
          <Database className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Active Farms</p>
          <p className="text-2xl font-bold">2</p>
        </div>
      </div>
      
      <div className="dashboard-card flex items-center">
        <div className="p-3 rounded-full bg-success/10 mr-4">
          <DollarSign className="h-6 w-6 text-success" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Total Capital</p>
          <p className="text-2xl font-bold">$100,000</p>
        </div>
      </div>
      
      <div className="dashboard-card flex items-center">
        <div className="p-3 rounded-full bg-accent/10 mr-4">
          <Users className="h-6 w-6 text-accent" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Total Agents</p>
          <p className="text-2xl font-bold">11</p>
        </div>
      </div>
    </div>
  )
}

export default function FarmManagementPage() {
  const [farms, setFarms] = useState<Farm[]>([])
  const [filteredFarms, setFilteredFarms] = useState<Farm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  
  // Load farms
  const loadFarms = async () => {
    setLoading(true)
    try {
      const response = await api.getFarms()
      
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        setFarms(response.data)
        applyFilters(response.data, searchQuery, statusFilter)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load farms')
    } finally {
      setLoading(false)
    }
  }
  
  // Initial load
  useEffect(() => {
    loadFarms()
  }, [])
  
  // Apply filters when search or status filter changes
  useEffect(() => {
    applyFilters(farms, searchQuery, statusFilter)
  }, [searchQuery, statusFilter])
  
  // Apply filters to farms data
  const applyFilters = (farms: Farm[], query: string, status: 'all' | 'active' | 'inactive') => {
    let result = [...farms]
    
    // Apply status filter
    if (status !== 'all') {
      result = result.filter(farm => 
        (status === 'active' ? farm.is_active : !farm.is_active)
      )
    }
    
    // Apply search filter
    if (query.trim()) {
      const lowerQuery = query.toLowerCase()
      result = result.filter(farm => 
        farm.name.toLowerCase().includes(lowerQuery) || 
        (farm.description && farm.description.toLowerCase().includes(lowerQuery))
      )
    }
    
    setFilteredFarms(result)
  }
  
  // Handle farm creation success
  const handleFarmCreated = () => {
    loadFarms()
  }
  
  // Format currency
  const formatCurrency = (value?: number) => {
    if (value === undefined) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }
  
  // Format percentage
  const formatPercentage = (value?: number) => {
    if (value === undefined) return 'N/A'
    return `${(value * 100).toFixed(2)}%`
  }
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Farm Management</h1>
          <p className="text-muted-foreground">Create and manage your trading farms</p>
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Farm
        </Button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search farms..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <select
          className="border rounded-md px-3 py-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="all">All Farms</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        
        <Button variant="outline" size="icon" onClick={loadFarms} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          <p className="font-medium">Error loading farms</p>
          <p>{error}</p>
        </div>
      )}
      
      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading farms...</p>
        </div>
      )}
      
      {/* Empty state */}
      {!loading && filteredFarms.length === 0 && (
        <div className="text-center py-12 border rounded-md bg-muted/10">
          <h3 className="text-lg font-medium mb-2">No farms found</h3>
          <p className="text-muted-foreground mb-6">
            {farms.length === 0 
              ? 'Get started by creating your first trading farm' 
              : 'No farms match your current filters'}
          </p>
          {farms.length === 0 && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Farm
            </Button>
          )}
        </div>
      )}
      
      {/* Farms list */}
      {!loading && filteredFarms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFarms.map((farm) => (
            <Link 
              key={farm.id} 
              href={`/dashboard/farm-management/${farm.id}`}
              className="block"
            >
              <div className="border rounded-lg overflow-hidden hover:border-primary hover:shadow-md transition-all">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{farm.name}</h3>
                    <div className={`px-2 py-0.5 text-xs rounded-full ${
                      farm.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {farm.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  
                  {farm.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {farm.description}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Performance</p>
                      <p className={`text-sm font-medium ${
                        (farm.performance_metrics?.total_profit_loss || 0) >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {formatCurrency(farm.performance_metrics?.total_profit_loss)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground">Win Rate</p>
                      <p className="text-sm font-medium">
                        {formatPercentage(farm.performance_metrics?.win_rate)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground">Max Drawdown</p>
                      <p className="text-sm font-medium">
                        {farm.risk_profile?.max_drawdown || 0}%
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground">Total Trades</p>
                      <p className="text-sm font-medium">
                        {farm.performance_metrics?.trades_count || 0}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-muted/10 px-4 py-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(farm.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      {/* Create Farm Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-2xl">
          <CreateFarm 
            onClose={() => setShowCreateDialog(false)}
            onSuccess={handleFarmCreated}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
