import React from 'react';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { SocketProvider } from '@/providers/socket-provider';
import UnifiedDashboard from '@/components/dashboard/unified-dashboard';
import PageLoadingSkeleton from '@/components/ui/page-loading-skeleton';

interface DashboardPageProps {
  params: {
    farmId: string;
  };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  // Safely extract farmId from params
  const farmId = params?.farmId;
  
  // Ensure we have a valid farmId
  if (!farmId) {
    return notFound();
  }
  
  const farmIdNumber = parseInt(farmId, 10);
  
  try {
    // Validate farm ID and fetch initial data
    const supabase = await createServerClient();
    
    // Get the user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return notFound();
    }
    
    // Fetch farm details to verify access
    const { data: farm, error } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmIdNumber)
      .single();
    
    if (error || !farm) {
      console.error('Error fetching farm:', error);
      return notFound();
    }
    
    // Check if user has access to this farm directly from farms table
    if (farm.user_id !== user.id) {
      console.log('User does not own this farm, access denied');
      return notFound();
    }
    
    return (
      <SocketProvider farmId={farmId} userId={user.id}>
        <div className="flex flex-col w-full min-h-screen">
          <React.Suspense fallback={<PageLoadingSkeleton />}>
            <UnifiedDashboard farmId={farmId} />
          </React.Suspense>
        </div>
      </SocketProvider>
    );
  } catch (error) {
    console.error('Dashboard page error:', error);
    return notFound();
  }
}
