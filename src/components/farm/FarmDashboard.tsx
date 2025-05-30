import React, { useState } from 'react';
import { AgentManager } from '@/components/agent/AgentManager';
import { AgentMemory } from '@/components/agent/AgentMemory';
import { FarmEvents } from '@/components/farm/FarmEvents';
import { FarmPerformance } from '@/components/farm/FarmPerformance';

interface FarmDashboardProps {
  supabaseUrl: string;
  supabaseKey: string;
  farmId: string;
  ownerId: string;
}

export function FarmDashboard({
  supabaseUrl,
  supabaseKey,
  farmId,
  ownerId
}: FarmDashboardProps) {
  const [activeTab, setActiveTab] = useState<'agents' | 'memory' | 'events' | 'performance'>('agents');
  const [selectedAgentId, setSelectedAgentId] = useState<string>();

  const tabs = [
    { id: 'agents', label: 'Agents' },
    { id: 'memory', label: 'Memory' },
    { id: 'events', label: 'Events' },
    { id: 'performance', label: 'Performance' }
  ] as const;

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Farm Dashboard</h1>

        {/* Tab Navigation */}
        <div className="border-b">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'agents' && (
          <AgentManager
            supabaseUrl={supabaseUrl}
            supabaseKey={supabaseKey}
            farmId={farmId}
            ownerId={ownerId}
            onAgentSelect={setSelectedAgentId}
          />
        )}

        {activeTab === 'memory' && selectedAgentId && (
          <AgentMemory
            supabaseUrl={supabaseUrl}
            supabaseKey={supabaseKey}
            agentId={selectedAgentId}
          />
        )}

        {activeTab === 'events' && (
          <FarmEvents
            supabaseUrl={supabaseUrl}
            supabaseKey={supabaseKey}
            farmId={farmId}
          />
        )}

        {activeTab === 'performance' && (
          <FarmPerformance
            supabaseUrl={supabaseUrl}
            supabaseKey={supabaseKey}
            farmId={farmId}
          />
        )}

        {activeTab === 'memory' && !selectedAgentId && (
          <div className="text-center py-8 text-gray-500">
            Please select an agent to view its memory
          </div>
        )}
      </div>
    </div>
  );
} 