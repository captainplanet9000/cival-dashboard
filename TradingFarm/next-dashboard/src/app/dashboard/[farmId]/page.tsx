import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { SocketProvider } from '@/providers/socket-provider';
import UnifiedDashboard from '@/components/dashboard/unified-dashboard';
import PageLoadingSkeleton from '@/components/ui/page-loading-skeleton';

interface DashboardPageProps {
  params: {
    farmId: string;
  };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { farmId } = params;
  
  // Validate farm ID and fetch initial data
  const supabase = createClient();
  
  // Get the user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return notFound();
  }
  
  // Fetch farm details to verify access
  const { data: farm, error } = await supabase
    .from('farms')
    .select('*')
    .eq('id', farmId)
    .single();
  
  if (error || !farm) {
    console.error('Error fetching farm:', error);
    return notFound();
  }
  
  // Check user permission (basic check - can be expanded)
  const { data: permission } = await supabase
    .from('farm_users')
    .select('*')
    .eq('farm_id', farmId)
    .eq('user_id', user.id)
    .single();
  
  if (!permission) {
    // User doesn't have access to this farm
    return notFound();
  }
  
  return (
    <SocketProvider farmId={farmId} userId={user.id}>
      <div className="flex flex-col w-full min-h-screen">
        <Suspense fallback={<PageLoadingSkeleton />}>
          <UnifiedDashboard farm={farm} farmId={farmId} />
        </Suspense>
      </div>
    </SocketProvider>
  );
}
