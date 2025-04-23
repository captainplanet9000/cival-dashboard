import React from 'react';
import { Metadata } from 'next';
// Import will be fixed when component is created - using dynamic import instead
import dynamic from 'next/dynamic';

const AgentTradingPageClient = dynamic(() => import('./client-components').then(mod => mod.AgentTradingPageClient), {
  loading: () => <div className="space-y-6">
    <div className="space-y-2">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="h-4 w-64 bg-muted animate-pulse rounded" />
    </div>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div className="h-[400px] bg-muted animate-pulse rounded-xl" />
      <div className="h-[400px] bg-muted animate-pulse rounded-xl" />
      <div className="h-[400px] bg-muted animate-pulse rounded-xl" />
    </div>
  </div>
});
import { createServerClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Agent Trading | Trading Farm',
  description: 'Intelligent Trading Agents for automated market analysis and trade execution',
};

export default async function AgentTradingPage() {
  const supabase = createServerClient();
  
  // Get the user
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Agent Trading</h2>
      </div>
      
      {/* Suspense boundary replaced with dynamic import */}
        <AgentTradingPageClient userId={user.id} />

    </div>
  );
}

// Loading fallback
function AgentTradingFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-[400px] rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    </div>
  );
}
