"use client"

import { useState, useEffect } from 'react'
import { Farm, FarmStatus } from '@/types/farm-management'
import { useFarmManagement } from './farm-management-provider'
import { createFarm as createFarmApi } from '@/utils/database/client-safe-farm'
import { 
  BarChart,
  RefreshCw,
  PlusCircle, 
  Pause, 
  Play, 
  Settings, 
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react'

// Farm status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'paused':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      case 'maintenance':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="mr-1 h-3 w-3" />
      case 'paused':
        return <Pause className="mr-1 h-3 w-3" />
      case 'maintenance':
        return <Settings className="mr-1 h-3 w-3" />
      case 'error':
        return <AlertTriangle className="mr-1 h-3 w-3" />
      default:
        return <Clock className="mr-1 h-3 w-3" />
    }
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor()}`}>
      {getStatusIcon()}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// Farm performance indicator component
const PerformanceIndicator = ({ value }: { value: number }) => {
  const getColor = () => {
    if (value > 5) return 'text-green-500'
    if (value > 0) return 'text-emerald-500'
    if (value > -5) return 'text-amber-500'
    return 'text-red-500'
  }

  const getSymbol = () => {
    if (value >= 0) return '↑'
    return '↓'
  }

  return (
    <span className={`text-sm font-medium ${getColor()}`}>
      {getSymbol()} {Math.abs(value).toFixed(2)}%
    </span>
  )
}

// Message flow visualization component
interface MessageConnection {
  fromFarm: string
  toFarm: string
  messageCount: number
  lastMessage: string
}

const MessageFlowVisualization = ({ connections }: { connections: MessageConnection[] }) => {
  return (
    <div className="relative mt-6 h-64 rounded-lg border border-border p-4">
      <h3 className="mb-2 text-sm font-medium">Message Bus Activity</h3>
      
      <div className="absolute inset-0 flex items-center justify-center opacity-70">
        <div className="text-center text-sm text-muted-foreground">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin opacity-20" />
          <p className="mt-2">Interactive message flow visualization requires WebSocket connection</p>
        </div>
      </div>
      
      <div className="mt-4 space-y-2">
        {connections.map((conn, i) => (
          <div key={i} className="flex items-center justify-between rounded-md bg-background/50 p-2 text-xs">
            <span>{conn.fromFarm} → {conn.toFarm}</span>
            <span className="font-mono">{conn.messageCount} msgs</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Create farm modal
const CreateFarmModal = ({ 
  isOpen, 
  onClose,
  onCreate 
}: { 
  isOpen: boolean
  onClose: () => void
  onCreate: (farmData: {name: string, status: FarmStatus, bossman: {model: string, status: string}}) => Promise<void>
}) => {
  const [name, setName] = useState('')
  const [bossManModel, setBossManModel] = useState('ElizaOS-Advanced')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    try {
      await onCreate({
        name,
        status: 'active',
        bossman: {
          model: bossManModel,
          status: 'idle'
        }
      })
      
      // Reset form and close modal
      setName('')
      setBossManModel('ElizaOS-Advanced')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create farm')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold">Create New Farm</h2>
        
        {error && (
          <div className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle className="mr-2 inline h-4 w-4" />
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium" htmlFor="farm-name">
              Farm Name
            </label>
            <input
              id="farm-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Alpha Farm"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium" htmlFor="boss-man-model">
              BossMan Model
            </label>
            <select
              id="boss-man-model"
              value={bossManModel}
              onChange={(e) => setBossManModel(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            >
              <option value="ElizaOS-Basic">ElizaOS Basic</option>
              <option value="ElizaOS-Advanced">ElizaOS Advanced</option>
              <option value="ElizaOS-Expert">ElizaOS Expert</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Farm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Main component
export const FarmNetworkVisualization = () => {
  const { farmData, isLoading, error, refreshFarms, updateFarmStatus } = useFarmManagement()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [messageConnections, setMessageConnections] = useState<MessageConnection[]>([])

  // Handle farm creation
  const handleCreateFarm = async (farmData: {name: string, status: FarmStatus, bossman: {model: string, status: string}}) => {
    try {
      await createFarmApi(farmData)
      await refreshFarms()
    } catch (error) {
      console.error('Error creating farm:', error)
      throw error
    }
  }

  // Generate mock message connections
  useEffect(() => {
    if (farmData.length > 1) {
      const mockConnections: MessageConnection[] = []
      
      // Create a few random connections
      for (let i = 0; i < Math.min(5, farmData.length); i++) {
        const fromIndex = Math.floor(Math.random() * farmData.length)
        let toIndex = Math.floor(Math.random() * farmData.length)
        
        // Avoid self-connection
        while (toIndex === fromIndex) {
          toIndex = Math.floor(Math.random() * farmData.length)
        }
        
        mockConnections.push({
          fromFarm: farmData[fromIndex].name,
          toFarm: farmData[toIndex].name,
          messageCount: Math.floor(Math.random() * 100) + 1,
          lastMessage: 'Strategy update'
        })
      }
      
      setMessageConnections(mockConnections)
    }
  }, [farmData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Farm Network</h2>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => refreshFarms()}
            className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
            disabled={isLoading}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center rounded-md border border-border bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
            Create Farm
          </button>
        </div>
      </div>
      
      {error && (
        <div className="rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle className="mr-2 inline h-4 w-4" />
          Failed to load farm data: {error.message}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {farmData.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background/50 p-6 text-center">
              <p className="text-muted-foreground">No farms have been created yet</p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                Create your first farm
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {farmData.map(farm => (
                <div 
                  key={farm.id}
                  className="rounded-lg border border-border bg-card p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium">{farm.name}</h3>
                    <StatusBadge status={farm.status} />
                  </div>
                  
                  <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Agents:</span>
                      <span className="ml-1 font-medium">{farm.agents}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Performance:</span>
                      <PerformanceIndicator value={farm.performance} />
                    </div>
                    <div>
                      <span className="text-muted-foreground">BossMan:</span>
                      <span className="ml-1 font-medium">{farm.bossman.model.replace('ElizaOS-', '')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <span className="ml-1 font-medium">{farm.bossman.status}</span>
                    </div>
                  </div>
                  
                  <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-background">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${farm.resources.cpu}%` }}
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const newStatus = farm.status === 'active' ? 'paused' : 'active'
                        updateFarmStatus(farm.id, newStatus)
                      }}
                      className="flex-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
                    >
                      {farm.status === 'active' ? (
                        <>
                          <Pause className="mr-1 inline h-3 w-3" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="mr-1 inline h-3 w-3" />
                          Start
                        </>
                      )}
                    </button>
                    
                    <button
                      className="flex-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
                    >
                      <BarChart className="mr-1 inline h-3 w-3" />
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {farmData.length > 1 && (
            <MessageFlowVisualization connections={messageConnections} />
          )}
        </>
      )}
      
      <CreateFarmModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateFarm}
      />
    </div>
  )
}
