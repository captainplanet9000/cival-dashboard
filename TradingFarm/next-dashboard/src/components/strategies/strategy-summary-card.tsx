"use client"

import { useState } from 'react'
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  LineChart, 
  Play, 
  Pause, 
  Edit, 
  MoreHorizontal, 
  Bot,
  Trash2,
  Download,
  Clock,
  ArrowRight,
  Brain
} from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { Strategy } from '@/types/strategy'
import { useRouter } from 'next/navigation'
import { StrategyAgentAssignment } from './strategy-agent-assignment'

interface StrategySummaryCardProps {
  strategy: Strategy
  view?: 'grid' | 'list'
  onStatusChange?: (id: string, status: string) => void
  onDelete?: (id: string) => void
}

export function StrategySummaryCard({
  strategy,
  view = 'grid',
  onStatusChange,
  onDelete
}: StrategySummaryCardProps) {
  const [isAssigning, setIsAssigning] = useState(false)
  const router = useRouter()
  
  const handleViewDetails = () => {
    router.push(`/dashboard/strategies/${strategy.id}`)
  }
  
  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onStatusChange) {
      onStatusChange(strategy.id, strategy.status === 'active' ? 'paused' : 'active')
    }
  }
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(strategy.id)
    }
  }
  
  const handleAssignStrategy = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsAssigning(true)
  }

  // List view
  if (view === 'list') {
    return (
      <>
        <div 
          className="flex items-center p-3 rounded-md hover:bg-accent cursor-pointer"
          onClick={handleViewDetails}
        >
          <div className="mr-4 flex-shrink-0">
            <Badge variant={strategy.status === 'active' ? 'default' : 'secondary'}>
              {strategy.status === 'active' ? 'Active' : 'Paused'}
            </Badge>
          </div>
          
          <div className="flex-grow min-w-0">
            <h3 className="font-medium">{strategy.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{strategy.description}</p>
          </div>
          
          <div className="flex items-center gap-2 mr-4">
            <div className="flex items-center space-x-1">
              {Array.isArray(strategy.markets) && strategy.markets.slice(0, 2).map((market, i) => (
                <Badge key={i} variant="outline" className="mr-1">{market}</Badge>
              ))}
              {Array.isArray(strategy.markets) && strategy.markets.length > 2 && (
                <Badge variant="outline">+{strategy.markets.length - 2}</Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 mr-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{strategy.timeframe || 'N/A'}</span>
          </div>
          
          <div className="flex-shrink-0 font-semibold">
            {typeof strategy.performance === 'number' 
              ? <span className={strategy.performance >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {strategy.performance > 0 ? '+' : ''}{strategy.performance.toFixed(1)}%
                </span>
              : strategy.performance}
          </div>
          
          <div className="ml-4 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleToggleStatus}>
                  {strategy.status === 'active' ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause Strategy
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Activate Strategy
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAssignStrategy}>
                  <Bot className="mr-2 h-4 w-4" />
                  Assign to Agents
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleViewDetails}>
                  <LineChart className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Strategy
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <StrategyAgentAssignment
          strategyId={strategy.id}
          strategyName={strategy.name}
          isOpen={isAssigning}
          onClose={() => setIsAssigning(false)}
        />
      </>
    )
  }

  // Grid view (default)
  return (
    <>
      <Card className="h-full cursor-pointer hover:shadow-md transition-shadow" onClick={handleViewDetails}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="line-clamp-1">{strategy.name}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleToggleStatus}>
                  {strategy.status === 'active' ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause Strategy
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Activate Strategy
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAssignStrategy}>
                  <Bot className="mr-2 h-4 w-4" />
                  Assign to Agents
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleViewDetails}>
                  <LineChart className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Strategy
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <Badge variant={strategy.status === 'active' ? 'default' : 'secondary'} className="mb-2">
            {strategy.status === 'active' ? 'Active' : 'Paused'}
          </Badge>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{strategy.description}</p>
          
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-muted-foreground mr-1" />
              <span className="text-xs">{strategy.timeframe || 'N/A'}</span>
            </div>
            <div className="flex items-center">
              <Brain className="h-4 w-4 text-muted-foreground mr-1" />
              <span className="text-xs">{strategy.type || 'Custom'}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1 mb-3">
            {Array.isArray(strategy.markets) && strategy.markets.map((market, i) => (
              <Badge key={i} variant="outline" className="text-xs">{market}</Badge>
            ))}
          </div>
          
          <div className="h-20 flex items-center justify-center bg-muted/20 rounded-md mb-2">
            <div className="text-center">
              <LineChart className="h-6 w-6 mx-auto text-primary" />
              <p className="text-xs text-muted-foreground mt-1">Performance Chart</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-3 flex justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Performance</p>
            <p className={`text-lg font-bold ${
              typeof strategy.performance === 'number' && strategy.performance >= 0 
                ? 'text-green-600' 
                : typeof strategy.performance === 'number' ? 'text-red-600' : ''
            }`}>
              {typeof strategy.performance === 'number' 
                ? `${strategy.performance > 0 ? '+' : ''}${strategy.performance.toFixed(1)}%` 
                : strategy.performance}
            </p>
          </div>
          
          <Button variant="ghost" size="sm" className="gap-1" onClick={(e) => {
            e.stopPropagation()
            handleViewDetails()
          }}>
            Details
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
      
      <StrategyAgentAssignment
        strategyId={strategy.id}
        strategyName={strategy.name}
        isOpen={isAssigning}
        onClose={() => setIsAssigning(false)}
      />
    </>
  )
}
