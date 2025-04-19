// This page renders the AgentCoordinationDashboard for the Agent Orchestration route
'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Dynamically import to reduce initial bundle size
const AgentCoordinationDashboard = dynamic(
  () => import('@/components/agent-coordination/AgentCoordinationDashboard'),
  { ssr: false, loading: () => <div>Loading Agent Orchestration...</div> }
);

export default function AgentOrchestrationPage() {
  // Optional: support farmId query param for context
  const params = useSearchParams();
  const farmId = params?.get('farmId') ? Number(params.get('farmId')) : undefined;

  return (
    <Card className="max-w-5xl mx-auto mt-6">
      <CardHeader>
        <CardTitle>Agent Orchestration</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div>Loading Agent Orchestration...</div>}>
          <AgentCoordinationDashboard farmId={farmId ?? 1} />
        </Suspense>
      </CardContent>
    </Card>
  );
}
