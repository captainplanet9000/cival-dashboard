'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircledIcon,
  CrossCircledIcon,
  PauseIcon,
  PlayIcon,
  ReloadIcon,
  StopIcon,
} from '@radix-ui/react-icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { Goal, GoalStrategy, GoalTransaction, GoalMonitoringEvent } from '@/types/goal-types';
import { AgentMemoryViewer } from '@/components/goal-monitoring/agent-memory-viewer';

// Status badge mapping
const statusBadge = {
  PENDING: <Badge variant="outline">Pending</Badge>,
  ACTIVE: <Badge variant="success">Active</Badge>,
  PAUSED: <Badge variant="warning">Paused</Badge>,
  COMPLETED: <Badge variant="default">Completed</Badge>,
  FAILED: <Badge variant="destructive">Failed</Badge>,
};

// Strategy type badge mapping
const strategyBadge = {
  DEX_SWAP: <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">DEX Swap</Badge>,
  YIELD_FARMING: <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Yield Farming</Badge>,
  ARBITRAGE: <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">Arbitrage</Badge>,
  STAKING: <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">Staking</Badge>,
};

// Transaction type badge mapping
const transactionBadge = {
  SWAP: <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Swap</Badge>,
  STAKE: <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Stake</Badge>,
  UNSTAKE: <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">Unstake</Badge>,
  CLAIM: <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">Claim</Badge>,
  TRANSFER: <Badge variant="outline" className="bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300">Transfer</Badge>,
};

// Transaction status badge mapping
const transactionStatusBadge = {
  PENDING: <Badge variant="outline">Pending</Badge>,
  CONFIRMED: <Badge variant="success">Confirmed</Badge>,
  FAILED: <Badge variant="destructive">Failed</Badge>,
};

// Event type badge mapping
const eventTypeBadge = (type: string) => {
  const types: Record<string, JSX.Element> = {
    'PLANNING_STARTED': <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Planning Started</Badge>,
    'STRATEGY_PROPOSED': <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">Strategy Proposed</Badge>,
    'STRATEGY_SELECTED': <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Strategy Selected</Badge>,
    'EXECUTION_STARTED': <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">Execution Started</Badge>,
    'TRANSACTION_CONFIRMED': <Badge variant="success">Transaction Confirmed</Badge>,
    'TRANSACTION_FAILED': <Badge variant="destructive">Transaction Failed</Badge>,
    'MARKET_UPDATE': <Badge variant="outline" className="bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300">Market Update</Badge>,
    'ADAPTATION_STARTED': <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">Adaptation Started</Badge>,
    'GOAL_COMPLETED': <Badge variant="default">Goal Completed</Badge>,
  };
  
  return types[type] || <Badge variant="outline">{type}</Badge>;
};

export default function AcquisitionGoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [farm, setFarm] = useState<any | null>(null);
  const [strategies, setStrategies] = useState<GoalStrategy[]>([]);
  const [transactions, setTransactions] = useState<GoalTransaction[]>([]);
  const [monitoringEvents, setMonitoringEvents] = useState<GoalMonitoringEvent[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Fetch goal data
  useEffect(() => {
    const fetchGoalData = async () => {
      setLoading(true);
      try {
        // Fetch goal details
        const goalResponse = await fetch(`/api/goals/acquisition?goal_id=${goalId}`);
        const goalResult = await goalResponse.json();
        
        if (goalResult.data) {
          setGoal(goalResult.data);
          
          // Fetch farm details
          const farmResponse = await fetch(`/api/farms/${goalResult.data.farm_id}`);
          const farmResult = await farmResponse.json();
          
          if (farmResult.data) {
            setFarm(farmResult.data);
          }
          
          // Fetch strategies
          const strategiesResponse = await fetch(`/api/goals/acquisition/${goalId}/strategies`);
          const strategiesResult = await strategiesResponse.json();
          
          if (strategiesResult.data) {
            setStrategies(strategiesResult.data);
          }
          
          // Fetch transactions
          const transactionsResponse = await fetch(`/api/goals/acquisition/${goalId}/transactions`);
          const transactionsResult = await transactionsResponse.json();
          
          if (transactionsResult.data) {
            setTransactions(transactionsResult.data);
          }
          
          // Fetch monitoring events
          const monitoringResponse = await fetch(`/api/goals/acquisition/${goalId}/monitoring`);
          const monitoringResult = await monitoringResponse.json();
          
          if (monitoringResult.data) {
            setMonitoringEvents(monitoringResult.data);
          }
        } else {
          toast.error('Failed to load goal details');
          router.push('/dashboard/goals');
        }
      } catch (error) {
        console.error('Error fetching goal data:', error);
        toast.error('Failed to load goal details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGoalData();
  }, [goalId, router]);
  
  // Handle goal activation
  const handleActivate = async () => {
    if (!goal) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/goals/acquisition/${goalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.data) {
        setGoal(result.data);
        toast.success('Goal activated successfully');
      } else {
        toast.error(result.error || 'Failed to activate goal');
      }
    } catch (error) {
      console.error('Error activating goal:', error);
      toast.error('Failed to activate goal');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle goal pausing
  const handlePause = async () => {
    if (!goal) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/goals/acquisition/${goalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'PAUSED' }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.data) {
        setGoal(result.data);
        toast.success('Goal paused successfully');
      } else {
        toast.error(result.error || 'Failed to pause goal');
      }
    } catch (error) {
      console.error('Error pausing goal:', error);
      toast.error('Failed to pause goal');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle goal resuming
  const handleResume = async () => {
    if (!goal) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/goals/acquisition/${goalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.data) {
        setGoal(result.data);
        toast.success('Goal resumed successfully');
      } else {
        toast.error(result.error || 'Failed to resume goal');
      }
    } catch (error) {
      console.error('Error resuming goal:', error);
      toast.error('Failed to resume goal');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Calculate progress percentage
  const progressPercentage = goal 
    ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
    : 0;
  
  // Determine active strategy
  const activeStrategy = strategies.find(strategy => strategy.is_active);
  
  // Render loading skeleton
  if (loading) {
    return (
      <div className="container py-10">
        <div className="space-y-2 mb-6">
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-4 w-64" />
        </div>
        
        <div className="grid gap-6">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }
  
  if (!goal) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Goal not found or failed to load. Please try again.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push('/dashboard/goals')}>
            Return to Goals
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container py-10">
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/goals">Goals</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/dashboard/goals/acquisition/${goalId}`}>
              {goal.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">{goal.name}</h1>
          <div className="flex items-center gap-2">
            {statusBadge[goal.status]}
            {goal.selected_asset && (
              <Badge variant="secondary">Target: {goal.selected_asset}</Badge>
            )}
            {farm && (
              <Badge variant="outline">Farm: {farm.name}</Badge>
            )}
          </div>
        </div>
        
        <div className="flex mt-4 sm:mt-0 gap-2">
          {goal.status === 'PENDING' && (
            <Button onClick={handleActivate} disabled={actionLoading}>
              {actionLoading ? (
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlayIcon className="mr-2 h-4 w-4" />
              )}
              Activate
            </Button>
          )}
          
          {goal.status === 'ACTIVE' && (
            <Button 
              onClick={handlePause} 
              variant="outline" 
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PauseIcon className="mr-2 h-4 w-4" />
              )}
              Pause
            </Button>
          )}
          
          {goal.status === 'PAUSED' && (
            <Button onClick={handleResume} disabled={actionLoading}>
              {actionLoading ? (
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlayIcon className="mr-2 h-4 w-4" />
              )}
              Resume
            </Button>
          )}
          
          <Button variant="outline" onClick={() => router.push('/dashboard/goals')}>
            Back to Goals
          </Button>
        </div>
      </div>
      
      {/* Description */}
      {goal.description && (
        <p className="text-muted-foreground mb-6">{goal.description}</p>
      )}
      
      {/* Tabs */}
      <Tabs 
        defaultValue="overview" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="mt-6"
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="memories">Agent Memories</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>
                Current progress towards the acquisition goal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <span className="text-3xl font-bold">
                      {goal.current_amount.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      / {goal.target_amount.toLocaleString()} {goal.selected_asset}
                    </span>
                  </div>
                  <div className="text-2xl font-semibold mt-2 sm:mt-0">
                    {progressPercentage}%
                  </div>
                </div>
                
                <Progress value={progressPercentage} className="h-2" />
                
                <div className="flex justify-between text-sm text-muted-foreground">
                  <div>0</div>
                  <div>{goal.target_amount.toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Current Strategy Card */}
          <Card>
            <CardHeader>
              <CardTitle>Current Strategy</CardTitle>
              <CardDescription>
                The active strategy being used to achieve this goal
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeStrategy ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        {strategyBadge[activeStrategy.strategy_type as keyof typeof strategyBadge] || 
                          strategyBadge.DEX_SWAP}
                      </div>
                      <div className="mt-1">
                        <span className="font-semibold">Proposed by:</span> {activeStrategy.agent?.name || 'Unknown Agent'}
                      </div>
                      <div className="mt-1">
                        <span className="font-semibold">Selected at:</span> {activeStrategy.selected_at ? 
                          format(new Date(activeStrategy.selected_at), 'PPP p') : 'Not selected'}
                      </div>
                    </div>
                    <Badge variant="success" className="uppercase">Active</Badge>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2">Parameters</h4>
                    {activeStrategy.parameters ? (
                      <div className="bg-muted/50 p-3 rounded text-sm font-mono whitespace-pre">
                        {JSON.stringify(activeStrategy.parameters, null, 2)}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No parameters specified</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {goal.status === 'PENDING' 
                      ? 'Activate the goal to start strategy planning'
                      : 'No active strategy selected yet'}
                  </p>
                  {goal.status === 'PENDING' && (
                    <Button onClick={handleActivate} className="mt-4" disabled={actionLoading}>
                      Activate Goal
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Recent Transactions Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Recent transactions for this goal
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTab('transactions')}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.slice(0, 3).map(transaction => (
                    <div key={transaction.id} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                      <div>
                        <div className="flex items-center gap-2">
                          {transactionBadge[transaction.transaction_type as keyof typeof transactionBadge] || 
                            transactionBadge.SWAP}
                          {transactionStatusBadge[transaction.status]}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {transaction.asset_from && transaction.amount_from ? (
                            <span>{transaction.amount_from.toLocaleString()} {transaction.asset_from}</span>
                          ) : null}
                          {transaction.asset_from && transaction.asset_to && ' → '}
                          {transaction.asset_to && transaction.amount_to ? (
                            <span>{transaction.amount_to.toLocaleString()} {transaction.asset_to}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(transaction.created_at), 'PP')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-muted-foreground">
                  No transactions yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Strategies Tab */}
        <TabsContent value="strategies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Proposals</CardTitle>
              <CardDescription>
                Strategies proposed by agents for this goal
              </CardDescription>
            </CardHeader>
            <CardContent>
              {strategies.length > 0 ? (
                <div className="space-y-6">
                  {strategies.map(strategy => (
                    <div 
                      key={strategy.id} 
                      className={`border rounded-lg p-4 ${strategy.is_active ? 'border-primary' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            {strategyBadge[strategy.strategy_type as keyof typeof strategyBadge] || 
                              <Badge variant="outline">{strategy.strategy_type}</Badge>}
                            {strategy.is_active && (
                              <Badge variant="success" className="uppercase">Active</Badge>
                            )}
                          </div>
                          <div className="mt-2">
                            <span className="font-semibold">Proposed by:</span> {strategy.agent?.name || 'Unknown Agent'}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Proposed: {format(new Date(strategy.proposed_at), 'PPP p')}
                          </div>
                          {strategy.selected_at && (
                            <div className="text-sm text-muted-foreground mt-1">
                              Selected: {format(new Date(strategy.selected_at), 'PPP p')}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Separator className="my-4" />
                      
                      <div>
                        <h4 className="font-semibold mb-2">Parameters</h4>
                        {strategy.parameters ? (
                          <div className="bg-muted/50 p-3 rounded text-sm font-mono whitespace-pre">
                            {JSON.stringify(strategy.parameters, null, 2)}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No parameters specified</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {goal.status === 'PENDING' 
                      ? 'Activate the goal to start strategy planning'
                      : 'No strategies proposed yet'}
                  </p>
                  {goal.status === 'PENDING' && (
                    <Button onClick={handleActivate} className="mt-4" disabled={actionLoading}>
                      Activate Goal
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>
                All transactions related to this goal
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Tx Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(transaction => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {transactionBadge[transaction.transaction_type as keyof typeof transactionBadge] || 
                            <Badge variant="outline">{transaction.transaction_type}</Badge>}
                        </TableCell>
                        <TableCell>
                          {transaction.asset_from && transaction.amount_from 
                            ? `${transaction.amount_from.toLocaleString()} ${transaction.asset_from}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {transaction.asset_to && transaction.amount_to
                            ? `${transaction.amount_to.toLocaleString()} ${transaction.asset_to}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {transactionStatusBadge[transaction.status]}
                        </TableCell>
                        <TableCell>
                          {format(new Date(transaction.created_at), 'PP p')}
                        </TableCell>
                        <TableCell>
                          {transaction.transaction_hash ? (
                            <HoverCard>
                              <HoverCardTrigger className="cursor-pointer text-blue-600 dark:text-blue-400">
                                {transaction.transaction_hash.substring(0, 7)}...
                              </HoverCardTrigger>
                              <HoverCardContent className="w-80">
                                <div className="font-mono text-xs break-all">
                                  {transaction.transaction_hash}
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring Events</CardTitle>
              <CardDescription>
                Events recorded during goal execution
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monitoringEvents.length > 0 ? (
                <div className="space-y-4">
                  {monitoringEvents.map(event => (
                    <div key={event.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                        <div className="flex items-center gap-2">
                          {eventTypeBadge(event.event_type)}
                          <span className="text-sm text-muted-foreground">
                            by {event.agent?.name || 'Unknown Agent'}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 sm:mt-0">
                          {format(new Date(event.created_at), 'PPP p')}
                        </div>
                      </div>
                      
                      {event.event_data && Object.keys(event.event_data).length > 0 && (
                        <div className="mt-3">
                          <div 
                            className="bg-muted/50 p-3 rounded text-sm font-mono text-xs overflow-x-auto whitespace-pre"
                            style={{ maxHeight: '200px' }}
                          >
                            {JSON.stringify(event.event_data, null, 2)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No monitoring events yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Agent Memories Tab */}
        <TabsContent value="memories" className="space-y-6">
          <AgentMemoryViewer goalId={goalId} maxMemories={20} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
