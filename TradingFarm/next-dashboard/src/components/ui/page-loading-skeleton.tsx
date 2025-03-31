import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PageLoadingSkeleton() {
  return (
    <div className="p-4 space-y-6 w-full max-w-7xl mx-auto">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      {/* Main content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left sidebar */}
        <div className="col-span-1 space-y-4">
          <Skeleton className="h-[200px] w-full rounded-lg" />
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
        
        {/* Main area */}
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          
          {/* Card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-[180px] w-full rounded-lg" />
            <Skeleton className="h-[180px] w-full rounded-lg" />
            <Skeleton className="h-[180px] w-full rounded-lg" />
            <Skeleton className="h-[180px] w-full rounded-lg" />
          </div>
          
          {/* Chart area */}
          <Skeleton className="h-[350px] w-full rounded-lg" />
          
          {/* Tables */}
          <Skeleton className="h-[250px] w-full rounded-lg" />
        </div>
      </div>
      
      {/* Command console area */}
      <Skeleton className="h-[200px] w-full rounded-lg" />
    </div>
  );
}
