import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Database } from '@/types/database.types';
import { useFarm } from '@/hooks/useFarm';

type Tool = Database['public']['Tables']['agent_tools']['Row'];

interface AgentToolsProps {
  agentId: string;
  supabaseUrl: string;
  supabaseKey: string;
  tools?: Tool[];
  onToolCreated?: (tool: Tool) => void;
  onToolDeleted?: (toolId: string) => void;
}

export function AgentTools({
  agentId,
  supabaseUrl,
  supabaseKey,
  tools = [],
  onToolCreated,
  onToolDeleted,
}: AgentToolsProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    config: {
      type: 'api',
      parameters: {},
      authentication: {},
    },
  });

  const { createAgentTool, deleteAgentTool } = useFarm({
    supabaseUrl,
    supabaseKey,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { success, data } = await createAgentTool({
        agentId,
        name: formData.name,
        description: formData.description,
        config: formData.config,
      });

      if (success && data) {
        onToolCreated?.(data);
        setFormData({
          name: '',
          description: '',
          config: {
            type: 'api',
            parameters: {},
            authentication: {},
          },
        });
      }
    } catch (error) {
      console.error('Failed to create tool:', error);
    }
  };

  const handleDeleteTool = async (toolId: string) => {
    try {
      const { success, error } = await deleteAgentTool(toolId);
      if (success) {
        onToolDeleted?.(toolId);
      } else {
        console.error('Failed to delete tool:', error);
      }
    } catch (error) {
      console.error('Failed to delete tool:', error);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tool Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="config">Configuration</Label>
            <Textarea
              id="config"
              value={JSON.stringify(formData.config, null, 2)}
              onChange={(e) => {
                try {
                  const config = JSON.parse(e.target.value);
                  setFormData({ ...formData, config });
                } catch (error) {
                  // Ignore invalid JSON
                }
              }}
              placeholder="Enter JSON configuration"
              className="font-mono"
              rows={6}
            />
          </div>
          <Button type="submit">Add Tool</Button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Card key={tool.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{tool.name}</h3>
                <p className="text-sm text-gray-500">{tool.description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteTool(tool.id)}
                className="text-red-500 hover:text-red-700"
              >
                Delete
              </Button>
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Configuration</h4>
              <pre className="text-sm overflow-auto p-2 bg-gray-50 rounded">
                {JSON.stringify(tool.config, null, 2)}
              </pre>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 