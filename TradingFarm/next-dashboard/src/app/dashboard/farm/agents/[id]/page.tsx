'use client';

/**
 * Agent Details Page
 * Displays comprehensive information about a specific agent
 */
import React from 'react';
import { AgentMonitoringDashboard } from '@/components/agents/agent-monitoring-dashboard';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, Home, Server } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useParams } from 'next/navigation';

export default function AgentDetailsPage() {
  const params = useParams();
  const agentId = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!agentId) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Agent Not Found</h1>
        <p>The requested agent could not be found. Please check the URL and try again.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">
              <Home className="h-4 w-4 mr-1" />
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/farm">Farm</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/farm/agents">Agents</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{agentId}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Agent Monitoring</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Monitor agent health, performance, and logs. Compare with other agents
                  in your farm to optimize your trading strategies.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Agent Monitoring Dashboard */}
      <AgentMonitoringDashboard agentId={agentId} />
    </div>
  );
}

// Loading UI
export function Loading() {
  return (
    <div className="container mx-auto py-4 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Skeleton className="h-5 w-24" />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Skeleton className="h-5 w-12" />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Skeleton className="h-5 w-16" />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Skeleton className="h-5 w-32" />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64" />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle><Skeleton className="h-7 w-48" /></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
