'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/utils/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';

export default function VaultRedirect() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [redirectingTo, setRedirectingTo] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    if (isLoading) return;
    
    async function redirectToFarm() {
      try {
        if (!user) {
          router.push('/login');
          return;
        }
        
        const supabase = createBrowserClient();
        
        // Get the user's farms
        const { data: farms } = await supabase
          .from('farms')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1);
        
        // Redirect to the first farm's vault, or to the farms page if no farms
        if (farms && farms.length > 0) {
          const targetUrl = `/dashboard/${farms[0].id}/vault`;
          setRedirectingTo(targetUrl);
          router.push(targetUrl);
        } else {
          setRedirectingTo('/dashboard/farms');
          router.push('/dashboard/farms');
        }
      } catch (error) {
        console.error('Error redirecting to farm vault:', error);
        setRedirectingTo('/dashboard/farms');
        router.push('/dashboard/farms');
      }
    }
    
    redirectToFarm();
  }, [router, user, isLoading]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <h1 className="text-2xl font-bold mb-4">Redirecting to Vault System</h1>
      <p className="text-muted-foreground mb-6">
        The vault system has been updated. You're being redirected to the new interface.
      </p>
      {redirectingTo && (
        <p className="text-sm text-muted-foreground mb-4">
          Target: {redirectingTo}
        </p>
      )}
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
        <span>Redirecting...</span>
      </div>
    </div>
  );
}
