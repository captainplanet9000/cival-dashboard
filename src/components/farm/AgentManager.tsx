import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database } from '@/types/database.types';
import { useFarm } from '@/hooks/useFarm';
import { AgentTools } from './AgentTools';
import { AgentApis } from './AgentApis';

type AgentRole = 'trader' | 'risk_manager' | 'analyst';

type Agent = Database['public']['Tables']['farm_agents']['Row'] & {
  agent_wallets?: Database['public']['Tables']['agent_wallets']['Row'][];
  agent_tools?: Database['public']['Tables']['agent_tools']['Row'][];
  agent_apis?: Database['public']['Tables']['agent_apis']['Row'][];
};

interface AgentManagerProps {
  farmId: string;
  supabaseUrl: string;
  supabaseKey: string;
  agents?: Agent[];
  onAgentCreated?: (agent: Agent) => void;
  onAgentDeleted?: (agentId: string) => void;
}

export function AgentManager({ 
  farmId, 
  supabaseUrl, 
  supabaseKey, 
  agents = [], 
  onAgentCreated, 
  onAgentDeleted 
}: AgentManagerProps) {
  const [formData, setFormData] = useState({
    name: '',
    role: 'trader' as AgentRole,
  });

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const { createFarmAgent, deleteFarmAgent } = useFarm({
    supabaseUrl,
    supabaseKey,
  });

  const handleRoleChange = (value: string) => {
    if (value === 'trader' || value === 'risk_manager' || value === 'analyst') {
      setFormData({ ...formData, role: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { success, data } = await createFarmAgent({
        farmId,
        name: formData.name,
        role: formData.role,
        config: {},
      });

      if (success && data) {
        onAgentCreated?.(data);
        setFormData({
          name: '',
          role: 'trader',
        });
      }
    } catch (error) {
      console.error('Failed to create agent:', error);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    try {
      const { success, error } = await deleteFarmAgent(agentId);
      if (success) {
        onAgentDeleted?.(agentId);
      } else {
        console.error('Failed to delete agent:', error);
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trader">Trader</SelectItem>
                <SelectItem value="risk_manager">Risk Manager</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit">Add Agent</Button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{agent.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{agent.role}</p>
                <p className="text-sm text-gray-500">Status: {agent.status}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
                >
                  {selectedAgent?.id === agent.id ? 'Hide' : 'Manage'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteAgent(agent.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>

            {selectedAgent?.id === agent.id && (
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Tools</h4>
                  <AgentTools
                    agentId={agent.id}
                    supabaseUrl={supabaseUrl}
                    supabaseKey={supabaseKey}
                    tools={agent.agent_tools}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">APIs</h4>
                  <AgentApis
                    agentId={agent.id}
                    supabaseUrl={supabaseUrl}
                    supabaseKey={supabaseKey}
                    apis={agent.agent_apis}
                  />
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
} 