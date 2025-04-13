import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AgentCommandsProps {
  agentId: string;
}

interface CommandResult {
  id: string;
  type: string;
  status: string;
  result?: string;
  timestamp: string;
}

const commandTypes = [
  'analyze_market',
  'execute_trade',
  'adjust_strategy',
  'evaluate_risk',
  'coordinate_agents',
  'query_knowledge',
  'custom'
] as const;

export default function AgentCommands({ agentId }: AgentCommandsProps) {
  const [selectedType, setSelectedType] = useState<string>(commandTypes[0]);
  const [parameters, setParameters] = useState<string>('{}');
  const [priority, setPriority] = useState<number>(5);
  const [commandResults, setCommandResults] = useState<CommandResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const executeCommand = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/elizaos/agents/command?agentId=${agentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: selectedType,
          parameters: JSON.parse(parameters),
          priority,
          timeout_ms: 5000,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const newResult: CommandResult = {
          id: data.data.command_id,
          type: selectedType,
          status: data.data.status,
          timestamp: new Date().toISOString(),
        };
        setCommandResults(prev => [newResult, ...prev]);

        // Start polling for command completion
        pollCommandStatus(data.data.command_id);
      }
    } catch (error) {
      console.error('Error executing command:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pollCommandStatus = async (commandId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/elizaos/agents/command/${commandId}`);
        const data = await response.json();

        if (data.success) {
          setCommandResults(prev =>
            prev.map(result =>
              result.id === commandId
                ? { ...result, status: data.data.status, result: data.data.result }
                : result
            )
          );

          if (data.data.status !== 'queued' && data.data.status !== 'processing') {
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Error polling command status:', error);
        clearInterval(interval);
      }
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      queued: 'bg-yellow-500',
      processing: 'bg-blue-500',
      completed: 'bg-green-500',
      error: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Command Input */}
      <Card>
        <CardHeader>
          <CardTitle>Execute Command</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Command Type</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {commandTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Parameters (JSON)</label>
            <Input
              value={parameters}
              onChange={(e) => setParameters(e.target.value)}
              placeholder='{"key": "value"}'
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Priority (1-10)</label>
            <Slider
              value={[priority]}
              onValueChange={([value]) => setPriority(value)}
              min={1}
              max={10}
              step={1}
            />
            <div className="text-sm text-gray-500 text-center">{priority}</div>
          </div>

          <Button
            onClick={executeCommand}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Executing...' : 'Execute Command'}
          </Button>
        </CardContent>
      </Card>

      {/* Command History */}
      <Card>
        <CardHeader>
          <CardTitle>Command History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {commandResults.map((result) => (
                <div
                  key={result.id}
                  className="p-3 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{result.type}</span>
                    <Badge className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                  {result.result && (
                    <div className="text-sm text-gray-500">{result.result}</div>
                  )}
                  <div className="text-xs text-gray-400">
                    {new Date(result.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Command Queue */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Active Command Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {commandResults
              .filter((result) => ['queued', 'processing'].includes(result.status))
              .map((result) => (
                <Card key={result.id}>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium">{result.type}</div>
                    <Badge className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                    <div className="text-xs text-gray-400 mt-2">
                      {new Date(result.timestamp).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
