/**
 * ElizaOS Agent Detail Page
 */
import { Suspense } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { AgentDetailPageContent } from '@/components/agents/AgentDetailPageContent';
import { Skeleton } from '@/components/ui/skeleton';

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  return (
    <DashboardShell>
      <DashboardHeader 
        heading="Agent Details" 
        subheading="Manage agent capabilities and knowledge"
        icon="agent"
        backLink="/agents"
        backLinkText="Back to Agents"
      />
      <div className="px-2">
        <Suspense fallback={<AgentDetailSkeleton />}>
          <AgentDetailPageContent agentId={params.id} />
        </Suspense>
      </div>
    </DashboardShell>
  );
}

function AgentDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-4">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-6 w-96" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      
      <Skeleton className="h-[400px]" />
    </div>
  );
}
