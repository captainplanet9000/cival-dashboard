import React from 'react';
import { Metadata } from 'next';
import FarmAgentManager from '@/components/database/farm-agent-manager';
import { DashboardShell } from '@/components/shell';
import { DashboardHeader } from '@/components/header';

export const metadata: Metadata = {
  title: 'Database Testing',
  description: 'Test your Trading Farm database operations',
};

export default function DatabaseTestPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Database Testing"
        text="Test Supabase database operations for farms and agents"
      />
      <div className="grid gap-4">
        <FarmAgentManager />
      </div>
    </DashboardShell>
  );
}
