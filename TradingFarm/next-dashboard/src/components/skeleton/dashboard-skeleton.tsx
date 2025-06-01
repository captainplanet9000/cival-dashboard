'use client';

import React from 'react';

/**
 * DashboardSkeleton Component
 * 
 * A placeholder loading component that displays while the dashboard is being loaded
 * Uses Tailwind CSS for styling consistent with shadcn/ui design system
 */
export function DashboardSkeleton() {
  return (
    <div className="w-full min-h-screen bg-background animate-pulse">
      {/* Header skeleton */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
          <div className="h-8 w-40 bg-muted rounded-md" />
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 bg-muted rounded-full" />
            <div className="h-8 w-24 bg-muted rounded-md" />
          </div>
        </div>
      </div>
      
      {/* Main content skeleton with sidebar */}
      <div className="grid grid-cols-12 h-[calc(100vh-3.5rem)]">
        {/* Sidebar skeleton */}
        <div className="col-span-2 border-r border-border/40 p-4">
          <div className="space-y-4">
            <div className="h-8 w-full bg-muted rounded-md" />
            <div className="h-8 w-full bg-muted rounded-md" />
            <div className="h-8 w-full bg-muted rounded-md" />
            <div className="h-8 w-full bg-muted rounded-md" />
            <div className="h-8 w-full bg-muted rounded-md" />
            <div className="h-8 w-full bg-muted rounded-md" />
          </div>
        </div>
        
        {/* Dashboard content skeleton */}
        <div className="col-span-10 p-6 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Status cards */}
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                <div className="flex flex-col space-y-4">
                  <div className="h-5 w-32 bg-muted rounded-md" />
                  <div className="h-10 w-24 bg-muted rounded-md" />
                  <div className="h-4 w-full bg-muted rounded-md" />
                </div>
              </div>
            ))}
            
            {/* Chart skeletons */}
            <div className="col-span-1 md:col-span-2 rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <div className="h-6 w-48 bg-muted rounded-md mb-6" />
              <div className="h-64 w-full bg-muted rounded-md" />
            </div>
            
            {/* Table skeleton */}
            <div className="col-span-1 lg:col-span-3 rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <div className="h-6 w-48 bg-muted rounded-md mb-6" />
              <div className="space-y-4">
                <div className="h-10 w-full bg-muted rounded-md" />
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 w-full bg-muted rounded-md" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
