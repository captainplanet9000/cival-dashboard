'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import VaultDashboard from '@/components/vault/vault-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { createBrowserClient } from '@/utils/supabase/client';

export default function VaultPage() {
  const params = useParams();
  const farmId = params.farmId as string;
  const { user, isLoading } = useUser();
  const router = useRouter();

  // Loading state while checking user
  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[350px]" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  // Redirect if user is not logged in
  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="p-8">
      <VaultDashboard farmId={farmId} userId={user.id} />
    </div>
  );
}
