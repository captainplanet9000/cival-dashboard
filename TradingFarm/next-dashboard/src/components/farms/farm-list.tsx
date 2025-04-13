'use client';

import React from 'react';
import { useFarms, Farm } from '@/hooks/use-farms';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, MoreHorizontal, Edit, Trash, Play, Pause, Activity } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FarmListProps {
  userId?: string;
  onEdit?: (farm: Farm) => void;
  onDelete?: (farm: Farm) => void;
  onStatusChange?: (farm: Farm, newStatus: boolean) => void;
  onView?: (farm: Farm) => void;
}

export function FarmList({ userId, onEdit, onDelete, onStatusChange, onView }: FarmListProps) {
  const { farms, loading, error, refresh } = useFarms({ userId, enableRealtime: true });

  // Get farm status badge
  const getStatusBadge = (farm: Farm) => {
    if (!farm.is_active) {
      return <Badge variant="outline" className="bg-gray-100">Inactive</Badge>;
    }

    switch (farm.status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{farm.status}</Badge>;
    }
  };

  // Handle the refresh click
  const handleRefresh = () => {
    refresh();
  };

  // Render loading skeleton
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Farms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-4">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-red-500 font-medium">Failed to load farms</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" /> Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render empty state
  if (farms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Farms</span>
            <Button onClick={handleRefresh} size="icon" variant="ghost">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-4">
            <p className="text-sm text-muted-foreground">No farms found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render the farm list
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Farms ({farms.length})</span>
          <Button onClick={handleRefresh} size="icon" variant="ghost">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {farms.map((farm) => (
              <TableRow key={farm.id}>
                <TableCell className="font-medium">
                  {onView ? (
                    <Button 
                      variant="link" 
                      className="p-0 h-auto font-medium"
                      onClick={() => onView(farm)}
                    >
                      {farm.name}
                    </Button>
                  ) : (
                    farm.name
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(farm)}</TableCell>
                <TableCell className="text-sm text-muted-foreground line-clamp-1">
                  {farm.description || 'No description'}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {onView && (
                        <DropdownMenuItem onClick={() => onView(farm)}>
                          <Activity className="h-4 w-4 mr-2" /> View Details
                        </DropdownMenuItem>
                      )}
                      {onStatusChange && (
                        <DropdownMenuItem onClick={() => onStatusChange(farm, !farm.is_active)}>
                          {farm.is_active ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" /> Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" /> Start
                            </>
                          )}
                        </DropdownMenuItem>
                      )}
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(farm)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem 
                          onClick={() => onDelete(farm)}
                          className="text-red-500"
                        >
                          <Trash className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
