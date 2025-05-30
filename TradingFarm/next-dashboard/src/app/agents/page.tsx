/**
 * ElizaOS Agent Management Page
 */
import React from 'react';
import { AgentDashboard } from '@/components/agents/AgentDashboard';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export const metadata = {
  title: 'ElizaOS Agents',
  description: 'Manage your ElizaOS trading agents and their knowledge base',
};

export default function AgentsPage() {
  return (
    <DashboardShell>
      <DashboardHeader 
        heading="ElizaOS Agents" 
        subheading="Autonomous trading agents powered by AI"
        icon="ai"
      />
      <div className="px-2">
        <AgentDashboard />
      </div>
    </DashboardShell>
  );
}
