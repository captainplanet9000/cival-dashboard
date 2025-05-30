'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { DashboardSkeleton } from '@/components/skeleton/dashboard-skeleton';

// Dynamically import the Dashboard page with NoSSR to ensure client-side only rendering
// This ensures all interactive components work properly
const DashboardPage = dynamic(
  () => import('./dashboard/page'),
  { 
    ssr: false, 
    loading: () => <DashboardSkeleton />,
  }
);

export default function Home() {
  return (
    <main>
      <React.Suspense fallback={<DashboardSkeleton />}>
        <DashboardPage />
      </React.Suspense>
    </main>
  );
}
