import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Database } from '@/types/database.types';
import { useFarm } from '@/hooks/useFarm';
import { AgentManager } from './AgentManager';
import { WalletManager } from './WalletManager';

type RiskLevel = 'low' | 'medium' | 'high';
type Farm = Database['public']['Tables']['farms']['Row'] & {
  farm_wallets?: Database['public']['Tables']['farm_wallets']['Row'][];
  farm_agents?: (Database['public']['Tables']['farm_agents']['Row'] & {
    agent_wallets?: Database['public']['Tables']['agent_wallets']['Row'][];
  })[];
};

interface FarmManagerProps {
  farmId?: string;
  supabaseUrl: string;
  supabaseKey: string;
  ownerId: string;
}

export function FarmManager({ farmId, supabaseUrl, supabaseKey, ownerId }: FarmManagerProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goal: '',
    riskLevel: 'medium' as RiskLevel,
  });

  const { farm, createFarm } = useFarm({
    farmId,
    supabaseUrl,
    supabaseKey,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { success, data } = await createFarm({
        name: formData.name,
        description: formData.description,
        goal: formData.goal,
        riskLevel: formData.riskLevel,
        ownerId,
      });

      if (success && data) {
        setFormData({
          name: '',
          description: '',
          goal: '',
          riskLevel: 'medium',
        });
      }
    } catch (error) {
      console.error('Failed to create farm:', error);
    }
  };

  const handleRoleChange = (value: string) => {
    if (value === 'low' || value === 'medium' || value === 'high') {
      setFormData({ ...formData, riskLevel: value });
    }
  };

  if (farm) {
    return (
      <div className="space-y-8">
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold">{farm.name}</h2>
              <p className="text-gray-500">{farm.description}</p>
              <p className="mt-2">
                <span className="font-semibold">Goal:</span> {farm.goal}
              </p>
              <p>
                <span className="font-semibold">Risk Level:</span>{' '}
                <span className="capitalize">{farm.risk_level}</span>
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  // Update farm status functionality will be implemented later
                  console.warn('Update farm status functionality not implemented yet');
                }}
              >
                {farm.status === 'active' ? 'Pause' : 'Activate'}
              </Button>
            </div>
          </div>

          <div className="space-y-8">
            <section>
              <h3 className="text-lg font-semibold mb-4">Wallets</h3>
              <WalletManager
                farmId={farm.id}
                supabaseUrl={supabaseUrl}
                supabaseKey={supabaseKey}
                wallets={farm.farm_wallets}
              />
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-4">Agents</h3>
              <AgentManager
                farmId={farm.id}
                supabaseUrl={supabaseUrl}
                supabaseKey={supabaseKey}
                agents={farm.farm_agents}
              />
            </section>

            {farm.farm_agents && farm.farm_wallets && (
              <section>
                <h3 className="text-lg font-semibold mb-4">Wallet Assignments</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {farm.farm_agents.map((agent) => (
                    <Card key={agent.id} className="p-4">
                      <h4 className="font-semibold">{agent.name}</h4>
                      {agent.agent_wallets && agent.agent_wallets.length > 0 ? (
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">Assigned Wallets:</p>
                          <ul className="mt-1 space-y-1">
                            {agent.agent_wallets.map((assignment) => {
                              const wallet = farm.farm_wallets?.find(
                                (w) => w.id === assignment.farm_wallet_id
                              );
                              return (
                                <li key={assignment.id} className="text-sm">
                                  {wallet?.name} ({assignment.allocation}%)
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 mt-2">No wallets assigned</p>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Farm Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal">Goal</Label>
          <Input
            id="goal"
            value={formData.goal}
            onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="riskLevel">Risk Level</Label>
          <Select
            value={formData.riskLevel}
            onValueChange={handleRoleChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select risk level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit">Create Farm</Button>
      </form>
    </Card>
  );
} 