'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PlusIcon, ReloadIcon } from '@radix-ui/react-icons';
import { BarChart3, Lightbulb } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlayIcon, PauseIcon, DotsHorizontalIcon, CrossCircledIcon, CheckCircledIcon } from '@radix-ui/react-icons';

import { Goal } from '@/types/goal-types';

// Status badge mapping
const statusBadge = {
  PENDING: <Badge variant="outline">Pending</Badge>,
  ACTIVE: <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Active</Badge>,
  PAUSED: <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Paused</Badge>,
  COMPLETED: <Badge variant="default">Completed</Badge>,
  FAILED: <Badge variant="destructive">Failed</Badge>,
};

export default function AcquisitionGoalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [goals, setGoals] = useState<Goal[]>([]);
  const [farms, setFarms] = useState<Record<string, any>>({});
  
  // Fetch goals data
  const fetchGoals = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/goals/acquisition');
      const result = await response.json();
      
      if (result.data) {
        setGoals(result.data);
        
        // Fetch farm details for all farms
        const farmIds = [...new Set(result.data.map((goal: Goal) => goal.farm_id))];
        
        for (const farmId of farmIds) {
          const farmResponse = await fetch(`/api/farms/${farmId}`);
          const farmResult = await farmResponse.json();
          
          if (farmResult.data) {
            setFarms(prev => ({
              ...prev,
              [farmId]: farmResult.data
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Failed to load acquisition goals');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchGoals();
  }, []);
  
  // Handle goal activation
  const handleActivate = async (goalId: string) => {
    setActionLoading(prev => ({ ...prev, [goalId]: true }));
    
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
        // Update the goal in the local state
        setGoals(prev => 
          prev.map(goal => 
            goal.id === goalId ? { ...goal, status: 'ACTIVE' } : goal
          )
        );
        toast.success('Goal activated successfully');
      } else {
        toast.error(result.error || 'Failed to activate goal');
      }
    } catch (error) {
      console.error('Error activating goal:', error);
      toast.error('Failed to activate goal');
    } finally {
      setActionLoading(prev => ({ ...prev, [goalId]: false }));
    }
  };
  
  // Handle goal pausing
  const handlePause = async (goalId: string) => {
    setActionLoading(prev => ({ ...prev, [goalId]: true }));
    
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
        // Update the goal in the local state
        setGoals(prev => 
          prev.map(goal => 
            goal.id === goalId ? { ...goal, status: 'PAUSED' } : goal
          )
        );
        toast.success('Goal paused successfully');
      } else {
        toast.error(result.error || 'Failed to pause goal');
      }
    } catch (error) {
      console.error('Error pausing goal:', error);
      toast.error('Failed to pause goal');
    } finally {
      setActionLoading(prev => ({ ...prev, [goalId]: false }));
    }
  };
  
  // Handle goal deletion
  const handleDelete = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
      return;
    }
    
    setActionLoading(prev => ({ ...prev, [goalId]: true }));
    
    try {
      const response = await fetch(`/api/goals/acquisition/${goalId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove the goal from the local state
        setGoals(prev => prev.filter(goal => goal.id !== goalId));
        toast.success('Goal deleted successfully');
      } else {
        const result = await response.json();
        toast.error(result.error || 'Failed to delete goal');
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
    } finally {
      setActionLoading(prev => ({ ...prev, [goalId]: false }));
    }
  };
  
  // Calculate progress percentage
  const getProgressPercentage = (goal: Goal) => {
    return Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
  };
  
  // Filter active goals (not completed or failed)
  const activeGoals = goals.filter(goal => !['COMPLETED', 'FAILED'].includes(goal.status));
  const completedGoals = goals.filter(goal => ['COMPLETED', 'FAILED'].includes(goal.status));
  
  // Render loading skeleton
  if (loading) {
    return (
      <div className="container py-10">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[100px] w-full" />
          ))}
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
            <BreadcrumbLink href="/dashboard/goals/acquisition">
              Acquisition
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Acquisition Goals</h1>
          <p className="text-muted-foreground">
            Manage your token acquisition goals
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => fetchGoals()} variant="outline" size="icon">
            <ReloadIcon className="h-4 w-4" />
          </Button>
          <Button onClick={() => router.push('/dashboard/goals/acquisition/create')}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Create Goal
          </Button>
        </div>
      </div>
      
      {/* Active Goals */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight">Active Goals</h2>
        
        {activeGoals.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {activeGoals.map(goal => (
              <Card key={goal.id} className="overflow-hidden">
                <Link href={`/dashboard/goals/acquisition/${goal.id}`} className="block">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{goal.name}</CardTitle>
                        <CardDescription>
                          {goal.description || `Target: ${goal.target_amount.toLocaleString()} ${goal.selected_asset}`}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge[goal.status]}
                        {farms[goal.farm_id] && (
                          <Badge variant="outline">Farm: {farms[goal.farm_id].name}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Link>
                
                <CardContent className="pb-2">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-semibold">
                        {goal.current_amount.toLocaleString()} / {goal.target_amount.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {goal.selected_asset}
                      </span>
                    </div>
                    <div className="font-semibold">
                      {getProgressPercentage(goal)}%
                    </div>
                  </div>
                  <Progress value={getProgressPercentage(goal)} className="h-2" />
                </CardContent>
                
                <CardFooter className="justify-between pt-2">
                  <div className="text-sm text-muted-foreground">
                    Created: {format(new Date(goal.created_at), 'PP')}
                  </div>
                  
                  <div className="flex gap-2">
                    {goal.status === 'PENDING' && (
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.preventDefault();
                          handleActivate(goal.id);
                        }}
                        disabled={actionLoading[goal.id]}
                      >
                        {actionLoading[goal.id] ? (
                          <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <PlayIcon className="mr-2 h-4 w-4" />
                        )}
                        Activate
                      </Button>
                    )}
                    
                    {goal.status === 'ACTIVE' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={(e) => {
                          e.preventDefault();
                          handlePause(goal.id);
                        }}
                        disabled={actionLoading[goal.id]}
                      >
                        {actionLoading[goal.id] ? (
                          <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <PauseIcon className="mr-2 h-4 w-4" />
                        )}
                        Pause
                      </Button>
                    )}
                    
                    {goal.status === 'PAUSED' && (
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.preventDefault();
                          handleActivate(goal.id);
                        }}
                        disabled={actionLoading[goal.id]}
                      >
                        {actionLoading[goal.id] ? (
                          <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <PlayIcon className="mr-2 h-4 w-4" />
                        )}
                        Resume
                      </Button>
                    )}
                    
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/goals/acquisition/analytics?goalId=${goal.id}`}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="ml-2">
                      <Link href={`/dashboard/goals/acquisition/optimizations?goalId=${goal.id}`}>
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Optimize
                      </Link>
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <DotsHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => router.push(`/dashboard/goals/acquisition/${goal.id}`)}
                        >
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(goal.id)}
                          className="text-destructive"
                        >
                          Delete Goal
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border rounded-lg">
            <p className="text-muted-foreground mb-4">No active acquisition goals</p>
            <Button onClick={() => router.push('/dashboard/goals/acquisition/create')}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Goal
            </Button>
          </div>
        )}
      </div>
      
      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-6 mt-10">
          <h2 className="text-xl font-semibold tracking-tight">Completed Goals</h2>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Farm</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedGoals.map(goal => (
                  <TableRow key={goal.id}>
                    <TableCell>
                      <div className="font-medium">{goal.name}</div>
                    </TableCell>
                    <TableCell>
                      {goal.target_amount.toLocaleString()} {goal.selected_asset}
                    </TableCell>
                    <TableCell>
                      {farms[goal.farm_id]?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {goal.status === 'COMPLETED' ? (
                          <CheckCircledIcon className="mr-2 h-4 w-4 text-green-500" />
                        ) : (
                          <CrossCircledIcon className="mr-2 h-4 w-4 text-red-500" />
                        )}
                        {goal.status}
                      </div>
                    </TableCell>
                    <TableCell>
                      {goal.completed_at 
                        ? format(new Date(goal.completed_at), 'PP') 
                        : format(new Date(goal.updated_at), 'PP')}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push(`/dashboard/goals/acquisition/${goal.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
