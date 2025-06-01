"use client";

import React from "react";
import { PageHeader } from '@/components/page-header';
import { goalService, Goal } from "@/services/goal-service";
import { farmService, Farm } from "@/services/farm-service";
import { createBrowserClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { 
  Target, 
  Check, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  Plus, 
  Search,
  RefreshCcw,
  FilterX,
  Trash2,
  Edit,
  Building
} from "lucide-react";

// Import Shadcn components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalCreationDialog } from "@/components/goals/goal-creation-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// Extended Goal interface with farm_name
interface ExtendedGoal extends Goal {
  farm_name?: string;
}

// Valid goal status types
type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';

export default function GoalsPage() {
  const [goals, setGoals] = React.useState<ExtendedGoal[]>([]);
  const [filteredGoals, setFilteredGoals] = React.useState<ExtendedGoal[]>([]);
  const [farms, setFarms] = React.useState<Farm[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");
  const [farmFilter, setFarmFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isAuthError, setIsAuthError] = React.useState<boolean>(false);
  const { toast } = useToast();
  const supabase = createBrowserClient();
  const { refreshSession } = useAuth();

  // Fetch goals and farms
  const fetchGoals = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsAuthError(false);
    
    try {
      // Fetch goals from goalService
      const goalsResponse = await goalService.getGoals();
      
      if (goalsResponse.error) {
        // Check for JWT authentication errors
        if (typeof goalsResponse.error === 'string' && 
            (goalsResponse.error.includes('JWSInvalidSignature') || 
             goalsResponse.error.includes('JWT') || 
             goalsResponse.error.includes('401'))) {
          setIsAuthError(true);
          console.error('JWT Authentication error:', goalsResponse.error);
        }
        setError(goalsResponse.error);
      } else if (goalsResponse.data) {
        // Get farms data to map farm names to goals
        const farmsResponse = await farmService.getFarms();
        const farmsMap = new Map<string, string>();
        
        if (farmsResponse.data) {
          farmsResponse.data.forEach((farm: Farm) => {
            farmsMap.set(farm.id.toString(), farm.name);
          });
        }
        
        // Add farm_name to each goal
        const goalsWithFarmNames = goalsResponse.data.map((goal: Goal) => {
          return {
            ...goal,
            farm_name: goal.farm_id ? farmsMap.get(goal.farm_id.toString()) || `Farm #${goal.farm_id}` : 'No Farm'
          };
        });
        
        setGoals(goalsWithFarmNames);
      }

      // Fetch farms for filtering
      const farmsResponse = await farmService.getFarms();
      if (farmsResponse.data) {
        setFarms(farmsResponse.data);
      }
    } catch (err: any) {
      console.error("Error fetching goals:", err);
      
      // Check for JWT/auth errors in the caught exception
      if (err.message && 
          (err.message.includes('JWSInvalidSignature') || 
           err.message.includes('JWT') || 
           err.message.includes('401'))) {
        setIsAuthError(true);
        console.error('JWT Authentication error in exception:', err.message);
      }
      
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Apply filters and search
  React.useEffect(() => {
    let result = [...goals];
    
    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((goal: ExtendedGoal) => goal.status === statusFilter);
    }
    
    // Apply type filter
    if (typeFilter !== "all") {
      result = result.filter((goal: ExtendedGoal) => goal.type === typeFilter);
    }
    
    // Apply priority filter
    if (priorityFilter !== "all") {
      result = result.filter((goal: ExtendedGoal) => goal.priority === priorityFilter);
    }
    
    // Apply farm filter
    if (farmFilter !== "all") {
      result = result.filter((goal: ExtendedGoal) => 
        // Ensure string comparison for farm_id
        goal.farm_id?.toString() === farmFilter.toString()
      );
    }
    
    // Apply search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter((goal: ExtendedGoal) => 
        goal.title.toLowerCase().includes(query) || 
        (goal.description && goal.description.toLowerCase().includes(query))
      );
    }
    
    setFilteredGoals(result);
  }, [goals, statusFilter, typeFilter, priorityFilter, farmFilter, searchQuery]);

  // Handle goal creation success
  const handleGoalCreated = (newGoal: Goal) => {
    const extendedGoal: ExtendedGoal = {
      ...newGoal,
      farm_name: farms.find((farm: Farm) => farm.id.toString() === newGoal.farm_id?.toString())?.name || `Farm #${newGoal.farm_id}`
    };
    
    setGoals((prev: ExtendedGoal[]) => [extendedGoal, ...prev]);
    toast({
      title: "Goal Created",
      description: `${newGoal.title} has been created successfully`,
    });
  };

  // Handle goal deletion
  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm("Are you sure you want to delete this goal? This action cannot be undone.")) {
      return;
    }

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
        
        // Remove goal from the local state
        setGoals((goals: ExtendedGoal[]) => goals.filter(goal => goal.id !== goalId));
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
  const handleStatusChange = async (goalId: string, newStatus: GoalStatus) => {
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
        
        // Update goal in the local state
        setGoals(goals.map((goal: ExtendedGoal) => 
          goal.id === goalId 
            ? { ...goal, status: newStatus, ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}) } 
            : goal
        ));
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
        return <Check className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'not_started':
        return <Target className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
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
      day: 'numeric'
    }).format(date);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 0.75) return 'bg-green-500';
    if (progress >= 0.5) return 'bg-blue-500';
    if (progress >= 0.25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Loading state
  if (loading && goals.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <Skeleton className="h-14 w-full" />
        
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-[150px] w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        {error && (
          <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Goals</h3>
            <p className="text-red-600 mb-4">{error}</p>
            {isAuthError ? (
              <div className="flex flex-col gap-2 items-center">
                <p className="text-sm text-red-600 mb-2">Your session might have expired. Please refresh your authentication.</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={fetchGoals}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <Button 
                    onClick={async () => {
                      try {
                        await refreshSession();
                        toast({
                          title: "Session refreshed",
                          description: "Authentication has been renewed. Retrying..."
                        });
                        fetchGoals();
                      } catch (err) {
                        console.error("Failed to refresh session:", err);
                        toast({
                          title: "Authentication error",
                          description: "Could not refresh your session. Please try logging out and in again.",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh Session
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={fetchGoals}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <PageHeader 
        title="Goals" 
        description="Define, track, and manage your trading and performance goals."
      >
        <GoalCreationDialog onSuccess={handleGoalCreated} />
      </PageHeader>

      <div className="mt-8"> 
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters & Search</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search goals..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="profit">Profit</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="diversification">Diversification</SelectItem>
                  <SelectItem value="automation">Automation</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={farmFilter} onValueChange={setFarmFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Farm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Farms</SelectItem>
                  {farms.map((farm: Farm) => (
                    <SelectItem key={farm.id} value={farm.id.toString()}>
                      {farm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2" 
            onClick={() => {
              setStatusFilter("all");
              setTypeFilter("all");
              setPriorityFilter("all");
              setFarmFilter("all");
              setSearchQuery("");
            }}
          >
            <FilterX className="h-4 w-4 mr-2" />
            Reset Filters
          </Button>
        </Card>

        {filteredGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-muted/50 rounded-lg border border-dashed">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Goals Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {goals.length > 0 
                ? "No goals match your current filter criteria."
                : "You haven't created any trading goals yet. Create your first goal to get started."}
            </p>
            {goals.length > 0 ? (
              <Button variant="outline" onClick={() => {
                setStatusFilter("all");
                setTypeFilter("all");
                setPriorityFilter("all");
                setFarmFilter("all");
                setSearchQuery("");
              }}>
                Clear Filters
              </Button>
            ) : (
              <GoalCreationDialog />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGoals.map((goal: ExtendedGoal) => (
              <Card key={goal.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Target className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-medium">{goal.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {goal.description || "No description provided."}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
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
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
                            <Building className="h-3 w-3 mr-1" />
                            {goal.farm_name || `Farm #${goal.farm_id}`}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {goal.status !== 'in_progress' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(goal.id, 'in_progress')}>
                              <Clock className="h-4 w-4 mr-2" />
                              Mark as In Progress
                            </DropdownMenuItem>
                          )}
                          {goal.status !== 'completed' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(goal.id, 'completed')}>
                              <Check className="h-4 w-4 mr-2" />
                              Mark as Completed
                            </DropdownMenuItem>
                          )}
                          {goal.status !== 'not_started' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(goal.id, 'not_started')}>
                              <Target className="h-4 w-4 mr-2" />
                              Reset to Not Started
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/goals/${goal.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Goal
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteGoal(goal.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Goal
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <Link href={`/dashboard/goals/${goal.id}`} passHref className="text-sm text-primary hover:underline">
                        View Details
                      </Link>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                      <span>Progress ({goal.progress !== null ? Math.round(goal.progress * 100) : 0}%)</span>
                      <span>{goal.current_value} / {goal.target_value}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div 
                        className={`h-2 rounded-full ${getProgressColor(goal.progress !== null ? goal.progress : 0)}`} 
                        style={{ width: `${Math.min((goal.progress !== null ? goal.progress : 0) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Goal Type:</span>
                      <div className="font-medium">
                        {goal.type.charAt(0).toUpperCase() + goal.type.slice(1)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <div className="font-medium">
                        {formatDate(goal.created_at)}
                      </div>
                    </div>
                    {goal.deadline && (
                      <div>
                        <span className="text-muted-foreground">Deadline:</span>
                        <div className="font-medium">
                          {formatDate(goal.deadline)}
                        </div>
                      </div>
                    )}
                    {goal.completed_at && (
                      <div>
                        <span className="text-muted-foreground">Completed:</span>
                        <div className="font-medium">
                          {formatDate(goal.completed_at)}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
