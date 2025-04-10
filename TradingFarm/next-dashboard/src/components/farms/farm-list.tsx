'use client';

import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  useFarms, 
  useCreateFarm, 
  useDeleteFarm 
} from '@/hooks';
import { formatDistanceToNow } from 'date-fns';
import { Farm } from '@/schemas/farm-schemas';
import { Plus, Edit, Trash2, Activity, CircleDollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Farm list component that uses React Query hooks
 */
export function FarmList() {
  const router = useRouter();
  
  // Use the custom hook to fetch farms data
  const { 
    data: farms, 
    isLoading, 
    isError, 
    error,
    refetch
  } = useFarms();

  // Use the delete mutation hook
  const deleteFarm = useDeleteFarm();
  
  // Function to handle farm deletion
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this farm?')) {
      await deleteFarm.mutateAsync(id);
    }
  };
  
  // Function to handle navigation to farm details
  const handleViewFarm = (id: number) => {
    router.push(`/dashboard/farms/${id}`);
  };
  
  // Function to handle navigation to edit form
  const handleEditFarm = (id: number) => {
    router.push(`/dashboard/farms/${id}/edit`);
  };
  
  // Function to handle navigation to create form
  const handleCreateFarm = () => {
    router.push('/dashboard/farms/create');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Farms</h2>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Create Farm
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/50 px-6 py-3">
                <div className="flex justify-between w-full">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Farms</h2>
          <Button onClick={handleCreateFarm}>
            <Plus className="mr-2 h-4 w-4" />
            Create Farm
          </Button>
        </div>
        <Card className="border-red-300">
          <CardHeader>
            <CardTitle className="text-red-500">Error Loading Farms</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Empty state
  if (!farms || farms.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Farms</h2>
          <Button onClick={handleCreateFarm}>
            <Plus className="mr-2 h-4 w-4" />
            Create Farm
          </Button>
        </div>
        <Card className="text-center p-6">
          <CardHeader>
            <CardTitle>No Farms Found</CardTitle>
            <CardDescription>
              Get started by creating your first farm.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={handleCreateFarm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Farm
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Render farms list
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Farms</h2>
        <Button onClick={handleCreateFarm}>
          <Plus className="mr-2 h-4 w-4" />
          Create Farm
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {farms.map((farm: Farm) => (
          <Card key={farm.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">{farm.name}</CardTitle>
                <Badge className={farm.is_active ? 'bg-green-600' : 'bg-orange-600'}>
                  {farm.status}
                </Badge>
              </div>
              <CardDescription>
                {farm.description || 'No description provided'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Activity className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Performance: </span>
                  <span className="ml-1 font-medium">
                    {farm.performance_metrics?.roi ? `${farm.performance_metrics.roi.toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <CircleDollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created: </span>
                  <span className="ml-1 font-medium">
                    {formatDistanceToNow(new Date(farm.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/50 px-6 py-3">
              <div className="flex justify-between w-full">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleViewFarm(farm.id)}
                >
                  View Details
                </Button>
                <div className="space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleEditFarm(farm.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:text-red-600" 
                    onClick={() => handleDelete(farm.id)}
                    disabled={deleteFarm.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
