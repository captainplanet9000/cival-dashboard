"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { goalService, Goal } from "@/services/goal-service";
import { farmService, Farm } from "@/services/farm-service";
import { createBrowserClient } from "@/utils/supabase/client";
import {
  Target,
  Check,
  Clock,
  AlertCircle,
  ChevronLeft,
  Building,
  Edit,
  Trash2,
  ArrowUpRight,
  CalendarClock,
  LineChart,
  Flag,
  Calendar,
  Milestone,
  BarChart3,
  Share2,
  Medal,
  ClipboardCheck,
} from "lucide-react";

// Import Shadcn components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Valid goal status types
type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';

export default function GoalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params.id as string;
  const [goal, setGoal] = React.useState<Goal | null>(null);
  const [farm, setFarm] = React.useState<Farm | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  // Setup real-time subscription for goal updates
  React.useEffect(() => {
    const setupRealtimeSubscription = async () => {
      try {
        const subscription = supabase
          .channel(`goal-${goalId}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'goals',
            filter: `id=eq.${goalId}` 
          }, (payload) => {
            fetchGoal();
          })
          .subscribe();

        return () => {
          supabase.removeChannel(subscription);
        };
      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
      }
    };

    setupRealtimeSubscription();
  }, [supabase, goalId]);

  // Fetch goal and associated farm
  const fetchGoal = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await goalService.getGoalById(goalId);
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setGoal(response.data);
        
        // Fetch associated farm if farm_id exists
        if (response.data.farm_id) {
          const farmResponse = await farmService.getFarmById(response.data.farm_id);
          if (farmResponse.data) {
            setFarm(farmResponse.data);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching goal details:', error);
      setError('Failed to load goal details. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  React.useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  // Handle goal deletion
  const handleDeleteGoal = async () => {
    try {
      // Use the goal service to mark the goal as cancelled instead of deleting it
      const response = await goalService.updateGoal(goalId, { 
        status: 'cancelled' as GoalStatus
      });
      
      if (response.error) {
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: response.error,
        });
      } else {
        toast({
          title: "Goal Deleted",
          description: "The goal has been successfully deleted",
        });
        
        // Navigate back to goals list
        router.push('/dashboard/goals');
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "An unexpected error occurred",
      });
    }
  };

  // Handle goal status update
  const handleStatusChange = async (newStatus: GoalStatus) => {
    try {
      const response = await goalService.updateGoal(goalId, { 
        status: newStatus,
        ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {})
      });
      
      if (response.error) {
        toast({
          variant: "destructive",
          title: "Status Update Failed",
          description: response.error,
        });
      } else {
        toast({
          title: "Status Updated",
          description: `Goal status changed to ${newStatus}`,
        });
        
        // Update local goal state
        setGoal(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            status: newStatus,
            ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {})
          };
        });
      }
    } catch (error) {
      console.error('Error updating goal status:', error);
      toast({
        variant: "destructive",
        title: "Status Update Failed",
        description: "An unexpected error occurred",
      });
    }
  };

  // Helper functions for UI display
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'not_started':
        return <Target className="h-5 w-5 text-gray-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'not_started':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 0.75) return 'bg-green-500';
    if (progress >= 0.5) return 'bg-blue-500';
    if (progress >= 0.25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTimeRemaining = (deadline?: string) => {
    if (!deadline) return 'No deadline';
    
    const deadlineDate = new Date(deadline);
    const now = new Date();
    
    // If the deadline has passed
    if (deadlineDate < now) {
      const overdueDays = Math.ceil((now.getTime() - deadlineDate.getTime()) / (1000 * 3600 * 24));
      return `Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`;
    }
    
    // If the deadline is in the future
    const remainingDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return `${remainingDays} day${remainingDays !== 1 ? 's' : ''} remaining`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-60 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !goal) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/goals">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Goals
            </Link>
          </Button>
        </div>
        
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            {error || "Goal not found"}
          </h3>
          <p className="text-red-600 mb-4">
            {error 
              ? "We encountered an error while loading the goal details." 
              : "The goal you're looking for doesn't exist or has been deleted."}
          </p>
          <Button variant="outline" onClick={fetchGoal}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header navigation and actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/dashboard/goals">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Goals
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{goal.name}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/goals/${goal.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Goal
            </Link>
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Goal
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will delete this goal and cannot be undone. All associated data will be removed permanently.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteGoal}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {/* Goal overview card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Goal Overview</CardTitle>
              <CardDescription>Details and progress of this goal</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getStatusClass(goal.status)}>
                {getStatusIcon(goal.status)}
                <span className="ml-1">
                  {goal.status === 'in_progress' ? 'In Progress' : 
                   goal.status === 'completed' ? 'Completed' : 
                   'Not Started'}
                </span>
              </Badge>
              <Badge variant="outline" className={getPriorityClass(goal.priority)}>
                {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)} Priority
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Goal description */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
              <p className="text-sm">{goal.description || "No description provided"}</p>
            </div>
            
            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>Progress ({Math.round(goal.progress * 100)}%)</span>
                <span>{goal.current_value} / {goal.target_value} {goal.unit}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted">
                <div 
                  className={`h-3 rounded-full ${getProgressColor(goal.progress)}`} 
                  style={{ width: `${Math.min(goal.progress * 100, 100)}%` }} 
                />
              </div>
            </div>
            
            {/* Key details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <p className="text-sm font-medium">
                  {goal.type.charAt(0).toUpperCase() + goal.type.slice(1)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created on</p>
                <p className="text-sm font-medium">{formatDate(goal.created_at)}</p>
              </div>
              {goal.deadline && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Deadline</p>
                  <p className="text-sm font-medium">{formatDate(goal.deadline)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{getTimeRemaining(goal.deadline)}</p>
                </div>
              )}
              {goal.completed_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed on</p>
                  <p className="text-sm font-medium">{formatDate(goal.completed_at)}</p>
                </div>
              )}
            </div>
            
            {/* Associated farm */}
            {farm && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Associated Farm</h3>
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{farm.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {farm.description || "No description available"}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/farms/${farm.id}`}>
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Status management */}
      <Card>
        <CardHeader>
          <CardTitle>Status Management</CardTitle>
          <CardDescription>Update the current status of this goal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant={goal.status === 'not_started' ? 'default' : 'outline'} 
              onClick={() => handleStatusChange('not_started')}
              disabled={goal.status === 'not_started'}
            >
              <Target className="h-4 w-4 mr-2" />
              Not Started
            </Button>
            <Button 
              variant={goal.status === 'in_progress' ? 'default' : 'outline'} 
              onClick={() => handleStatusChange('in_progress')}
              disabled={goal.status === 'in_progress'}
            >
              <Clock className="h-4 w-4 mr-2" />
              In Progress
            </Button>
            <Button 
              variant={goal.status === 'completed' ? 'default' : 'outline'} 
              onClick={() => handleStatusChange('completed')}
              disabled={goal.status === 'completed'}
            >
              <Check className="h-4 w-4 mr-2" />
              Completed
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Additional information tabs */}
      <Tabs defaultValue="metrics">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="related">Related Goals</TabsTrigger>
        </TabsList>
        
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center p-6 h-[180px] border-2 border-dashed border-muted-foreground/20 rounded-md">
                  <div className="flex flex-col items-center text-center text-muted-foreground">
                    <LineChart className="h-8 w-8 mb-2 opacity-50" />
                    <p>Performance metrics will be available as you make progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Timeline Projection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center p-6 h-[180px] border-2 border-dashed border-muted-foreground/20 rounded-md">
                  <div className="flex flex-col items-center text-center text-muted-foreground">
                    <CalendarClock className="h-8 w-8 mb-2 opacity-50" />
                    <p>Projected completion timeline based on current progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="milestones" className="space-y-4">
          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Goal Milestones</CardTitle>
                <CardDescription>Track progress through key milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center p-6 h-[180px] border-2 border-dashed border-muted-foreground/20 rounded-md">
                  <div className="flex flex-col items-center text-center text-muted-foreground">
                    <Milestone className="h-8 w-8 mb-2 opacity-50" />
                    <p>No milestones defined for this goal yet</p>
                    <Button variant="link" className="mt-2" disabled>+ Add Milestone</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="related" className="space-y-4">
          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Related Goals</CardTitle>
                <CardDescription>Other goals that are related to this one</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center p-6 h-[180px] border-2 border-dashed border-muted-foreground/20 rounded-md">
                  <div className="flex flex-col items-center text-center text-muted-foreground">
                    <Share2 className="h-8 w-8 mb-2 opacity-50" />
                    <p>No related goals found</p>
                    <Button variant="link" className="mt-2" asChild>
                      <Link href="/dashboard/goals">
                        View All Goals
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
