import React from 'react';
import { PageHeader } from '@/components/page-header';

export default function AgentsPage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <PageHeader 
        title="AI Agents" 
        description="Manage and monitor your AI trading agents. Configure strategies, view performance, and control agent operations."
      >
        {/* Optional: Add action buttons here if needed */}
      </PageHeader>

      <div className="mt-8">
        {/* Placeholder for Agent List/Management Components */}
        <p className="text-muted-foreground">Agent management components will be displayed here.</p>
      </div>
    </div>
  );
}
