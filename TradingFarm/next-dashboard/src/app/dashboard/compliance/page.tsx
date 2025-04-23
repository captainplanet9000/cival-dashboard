import React from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import ComplianceDashboard from '@/components/monitoring/ComplianceDashboard';
import { createServerClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Compliance & Reporting | Trading Farm',
  description: 'View and manage your regulatory compliance, reports, and documents',
};

export default async function CompliancePage() {
  const supabase = await createServerClient();
  
  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <DashboardShell>
      <ComplianceDashboard />
    </DashboardShell>
  );
}
