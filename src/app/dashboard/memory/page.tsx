'use client';

import React, { useState } from 'react';
import { Metadata } from 'next';
import { MemoryExplorer } from '../../../components/memory/MemoryExplorer';

export const metadata: Metadata = {
  title: 'Agent Memory - Trading Farm Dashboard',
  description: 'Visualize agent memory and knowledge graphs for your trading agents.'
};

export default function MemoryDashboardPage() {
  // This would typically come from the user's session or context
  const [agentId, setAgentId] = useState<string>('default-agent-id');

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Agent Memory Dashboard</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <MemoryExplorer agentId={agentId} initialView="graph" />
      </div>
    </div>
  );
} 