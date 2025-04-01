import React, { useState, Dispatch, SetStateAction, useCallback } from 'react';
import { useAgent } from '@/hooks/useAgent';
import { CreateAgentParams } from '@/services/agent/farm-agent-manager';
import type { Database } from '@/types/database.types';

type AgentData = Database['public']['Tables']['farm_agents']['Row'] & {
  plugins: Database['public']['Tables']['agent_plugins']['Row'][];
  clients: Database['public']['Tables']['agent_clients']['Row'][];
};

export interface AgentManagerProps {
  supabaseUrl: string;
  supabaseKey: string;
  farmId: string;
  ownerId: string;
  onAgentSelect?: (agentId: string | undefined) => void;
}

export function AgentManager({
  supabaseUrl,
  supabaseKey,
  farmId,
  ownerId,
  onAgentSelect
}: AgentManagerProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreateAgentParams>({
    name: '',
    description: '',
    farmId,
    ownerId,
    modelConfig: {
      provider: 'openai',
      model_name: 'gpt-4'
    }
  });

  const {
    agent,
    isLoading,
    error,
    createAgent,
    activateAgent,
    deactivateAgent,
    updateAgent,
    deleteAgent
  } = useAgent({
    supabaseUrl,
    supabaseKey,
    agentId: selectedAgentId,
    farmId
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const result = await createAgent(formData);
      if (result.success && result.data) {
        setSelectedAgentId(result.data.id);
        setFormData({
          ...formData,
          name: '',
          description: ''
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleActivate = async () => {
    const result = await activateAgent();
    if (!result.success) {
      console.error('Failed to activate agent:', result.error);
    }
  };

  const handleDeactivate = async () => {
    const result = await deactivateAgent();
    if (!result.success) {
      console.error('Failed to deactivate agent:', result.error);
    }
  };

  const handleDelete = async () => {
    const result = await deleteAgent();
    if (result.success) {
      setSelectedAgentId(undefined);
    } else {
      console.error('Failed to delete agent:', result.error);
    }
  };

  const handleAgentSelect = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    onAgentSelect?.(agentId);
  }, [onAgentSelect]);

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Agent name"
          className="w-full p-2 border rounded"
          required
        />
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Agent description"
          className="w-full p-2 border rounded"
          required
        />
        <button
          type="submit"
          disabled={isCreating}
          className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isCreating ? 'Creating...' : 'Create Agent'}
        </button>
      </form>

      {isLoading ? (
        <div>Loading...</div>
      ) : agent ? (
        <div className="space-y-4">
          <div className="p-4 border rounded">
            <h3 className="text-lg font-semibold">{agent.name}</h3>
            <p>Status: {agent.status}</p>
            <div className="mt-2 space-x-2">
              {agent.status === 'inactive' ? (
                <button
                  onClick={handleActivate}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Activate
                </button>
              ) : (
                <button
                  onClick={handleDeactivate}
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Deactivate
                </button>
              )}
              <button
                onClick={handleDelete}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Plugins</h4>
            {agent.plugins.map((plugin) => (
              <div key={plugin.id} className="p-2 border rounded">
                {plugin.plugin_name} v{plugin.plugin_version}
                {plugin.enabled ? ' (Enabled)' : ' (Disabled)'}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Clients</h4>
            {agent.clients.map((client) => (
              <div key={client.id} className="p-2 border rounded">
                {client.client_type}
                {client.enabled ? ' (Enabled)' : ' (Disabled)'}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
} 