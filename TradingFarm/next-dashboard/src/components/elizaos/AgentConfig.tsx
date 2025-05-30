import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createBrowserClient } from '@/utils/supabase/client';
import { z } from 'zod';

const configSchema = z.object({
  agentType: z.string().min(1),
  markets: z.array(z.string()).min(1),
  risk_level: z.enum(['low', 'medium', 'high']),
  api_access: z.boolean(),
  trading_permissions: z.string(),
  auto_recovery: z.boolean(),
  max_concurrent_tasks: z.number().min(1).max(20),
  llm_model: z.string(),
});

interface AgentConfigProps {
  agentId: string;
}

export default function AgentConfig({ agentId }: AgentConfigProps) {
  const [config, setConfig] = useState({
    agentType: 'market_maker',
    markets: ['BTC-USD', 'ETH-USD'],
    risk_level: 'medium' as const,
    api_access: true,
    trading_permissions: 'read_write',
    auto_recovery: true,
    max_concurrent_tasks: 5,
    llm_model: 'gpt-4o',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [marketInput, setMarketInput] = useState('');
  const supabase = createBrowserClient();

  useEffect(() => {
    fetchConfig();
  }, [agentId]);

  const fetchConfig = async () => {
    const { data, error } = await supabase
      .from('elizaos_agents')
      .select('config')
      .eq('id', agentId)
      .single();

    if (!error && data?.config) {
      setConfig(data.config);
    }
  };

  const saveConfig = async () => {
    setIsLoading(true);
    try {
      const validation = configSchema.safeParse(config);
      if (!validation.success) {
        console.error('Invalid config:', validation.error);
        return;
      }

      const { error } = await supabase
        .from('elizaos_agents')
        .update({ 
          config,
          updated_at: new Date().toISOString() 
        })
        .eq('id', agentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addMarket = () => {
    if (marketInput && !config.markets.includes(marketInput)) {
      setConfig(prev => ({
        ...prev,
        markets: [...prev.markets, marketInput]
      }));
      setMarketInput('');
    }
  };

  const removeMarket = (market: string) => {
    setConfig(prev => ({
      ...prev,
      markets: prev.markets.filter(m => m !== market)
    }));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Agent Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Agent Type</Label>
              <Select
                value={config.agentType}
                onValueChange={(value) => setConfig({...config, agentType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market_maker">Market Maker</SelectItem>
                  <SelectItem value="arbitrage">Arbitrage</SelectItem>
                  <SelectItem value="trend_follower">Trend Follower</SelectItem>
                  <SelectItem value="sentiment">Sentiment</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Risk Level</Label>
              <Select
                value={config.risk_level}
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  setConfig({...config, risk_level: value})
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Markets</Label>
            <div className="flex gap-2">
              <Input
                value={marketInput}
                onChange={(e) => setMarketInput(e.target.value)}
                placeholder="Add market (e.g. BTC-USD)"
                onKeyDown={(e) => e.key === 'Enter' && addMarket()}
              />
              <Button onClick={addMarket}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {config.markets.map((market) => (
                <div key={market} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md">
                  <span>{market}</span>
                  <button 
                    onClick={() => removeMarket(market)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>AI Model</Label>
              <Select
                value={config.llm_model}
                onValueChange={(value) => setConfig({...config, llm_model: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                  <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                  <SelectItem value="mixtral">Mixtral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Max Concurrent Tasks</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={config.max_concurrent_tasks}
                onChange={(e) => setConfig({...config, max_concurrent_tasks: Number(e.target.value)})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="api-access"
                checked={config.api_access}
                onCheckedChange={(checked) => setConfig({...config, api_access: checked})}
              />
              <Label htmlFor="api-access">API Access</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto-recovery"
                checked={config.auto_recovery}
                onCheckedChange={(checked) => setConfig({...config, auto_recovery: checked})}
              />
              <Label htmlFor="auto-recovery">Auto Recovery</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Trading Permissions</Label>
            <Select
              value={config.trading_permissions}
              onValueChange={(value) => setConfig({...config, trading_permissions: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read_only">Read Only</SelectItem>
                <SelectItem value="read_write">Read + Write</SelectItem>
                <SelectItem value="paper_trading">Paper Trading</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={saveConfig}
            disabled={isLoading}
            className="w-full mt-4"
          >
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
