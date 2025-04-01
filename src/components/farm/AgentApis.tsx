import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Database } from '@/types/database.types';
import { useFarm } from '@/hooks/useFarm';

type Api = Database['public']['Tables']['agent_apis']['Row'];
type RateLimit = {
  requests: number;
  per: 'second' | 'minute' | 'hour';
};

interface AgentApisProps {
  agentId: string;
  supabaseUrl: string;
  supabaseKey: string;
  apis?: Api[];
  onApiCreated?: (api: Api) => void;
  onApiDeleted?: (apiId: string) => void;
}

export function AgentApis({
  agentId,
  supabaseUrl,
  supabaseKey,
  apis = [],
  onApiCreated,
  onApiDeleted,
}: AgentApisProps) {
  const [formData, setFormData] = useState({
    name: '',
    endpoint: '',
    auth_config: {
      type: 'bearer',
      token: '',
      headers: {},
    },
    rate_limit: {
      requests: 60,
      per: 'minute' as RateLimit['per'],
    },
  });

  const { createAgentApi, deleteAgentApi } = useFarm({
    supabaseUrl,
    supabaseKey,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { success, data } = await createAgentApi({
        agentId,
        name: formData.name,
        endpoint: formData.endpoint,
        auth_config: formData.auth_config,
        rate_limit: formData.rate_limit,
      });

      if (success && data) {
        onApiCreated?.(data);
        setFormData({
          name: '',
          endpoint: '',
          auth_config: {
            type: 'bearer',
            token: '',
            headers: {},
          },
          rate_limit: {
            requests: 60,
            per: 'minute',
          },
        });
      }
    } catch (error) {
      console.error('Failed to create API:', error);
    }
  };

  const handleDeleteApi = async (apiId: string) => {
    try {
      const { success, error } = await deleteAgentApi(apiId);
      if (success) {
        onApiDeleted?.(apiId);
      } else {
        console.error('Failed to delete API:', error);
      }
    } catch (error) {
      console.error('Failed to delete API:', error);
    }
  };

  const getRateLimit = (api: Api): RateLimit => {
    const defaultRateLimit = { requests: 60, per: 'minute' as const };
    if (!api.rate_limit || typeof api.rate_limit !== 'object') return defaultRateLimit;

    const rateLimit = api.rate_limit as Record<string, unknown>;
    return {
      requests: typeof rateLimit.requests === 'number' ? rateLimit.requests : defaultRateLimit.requests,
      per: ['second', 'minute', 'hour'].includes(rateLimit.per as string)
        ? (rateLimit.per as RateLimit['per'])
        : defaultRateLimit.per,
    };
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">API Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endpoint">Endpoint URL</Label>
            <Input
              id="endpoint"
              type="url"
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth_config">Authentication Configuration</Label>
            <Textarea
              id="auth_config"
              value={JSON.stringify(formData.auth_config, null, 2)}
              onChange={(e) => {
                try {
                  const auth_config = JSON.parse(e.target.value);
                  setFormData({ ...formData, auth_config });
                } catch (error) {
                  // Ignore invalid JSON
                }
              }}
              placeholder="Enter JSON configuration"
              className="font-mono"
              rows={6}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate_limit_requests">Rate Limit (Requests)</Label>
              <Input
                id="rate_limit_requests"
                type="number"
                min="1"
                value={formData.rate_limit.requests}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rate_limit: {
                      ...formData.rate_limit,
                      requests: parseInt(e.target.value) || 60,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate_limit_per">Per</Label>
              <select
                id="rate_limit_per"
                value={formData.rate_limit.per}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rate_limit: {
                      ...formData.rate_limit,
                      per: e.target.value as RateLimit['per'],
                    },
                  })
                }
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="second">Second</option>
                <option value="minute">Minute</option>
                <option value="hour">Hour</option>
              </select>
            </div>
          </div>
          <Button type="submit">Add API</Button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {apis.map((api) => (
          <Card key={api.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{api.name}</h3>
                <p className="text-sm text-gray-500">{api.endpoint}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteApi(api.id)}
                className="text-red-500 hover:text-red-700"
              >
                Delete
              </Button>
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Rate Limit</h4>
              <p className="text-sm">
                {getRateLimit(api).requests} requests per {getRateLimit(api).per}
              </p>
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Authentication</h4>
              <pre className="text-sm overflow-auto p-2 bg-gray-50 rounded">
                {JSON.stringify(api.auth_config, null, 2)}
              </pre>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 