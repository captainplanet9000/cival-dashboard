"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { Terminal, Check, AlertCircle, RefreshCw, Play, Pause, AlertTriangle, Database, Download, Upload } from 'lucide-react';

interface AgentCommandsProps {
  agent: any;
  onExecuteCommand: (agentId: number, command: string, params?: any) => Promise<boolean>;
  isExecuting: boolean;
}

// Define available ElizaOS agent commands
const AVAILABLE_COMMANDS = [
  { id: 'start', name: 'Start Agent', description: 'Start the agent', icon: <Play className="h-4 w-4" /> },
  { id: 'stop', name: 'Stop Agent', description: 'Stop the agent', icon: <Pause className="h-4 w-4" /> },
  { id: 'restart', name: 'Restart Agent', description: 'Restart the agent', icon: <RefreshCw className="h-4 w-4" /> },
  { id: 'update', name: 'Update Parameters', description: 'Update agent parameters', icon: <Upload className="h-4 w-4" /> },
  { id: 'backup', name: 'Backup Agent', description: 'Create agent backup', icon: <Download className="h-4 w-4" /> },
  { id: 'check', name: 'Health Check', description: 'Check agent health', icon: <Check className="h-4 w-4" /> },
  { id: 'logs', name: 'Get Logs', description: 'Retrieve agent logs', icon: <Terminal className="h-4 w-4" /> },
  { id: 'debug', name: 'Debug Mode', description: 'Toggle debug mode', icon: <AlertTriangle className="h-4 w-4" /> },
  { id: 'reset', name: 'Reset Stats', description: 'Reset agent statistics', icon: <RefreshCw className="h-4 w-4" /> },
  { id: 'custom', name: 'Custom Command', description: 'Execute custom command', icon: <Terminal className="h-4 w-4" /> }
];

export default function AgentCommands({ agent, onExecuteCommand, isExecuting }: AgentCommandsProps) {
  const [selectedCommand, setSelectedCommand] = useState('');
  const [commandParams, setCommandParams] = useState<Record<string, any>>({});
  const [commandResult, setCommandResult] = useState<any>(null);
  const [commandStatus, setCommandStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Reset command parameters when command changes
  const handleCommandChange = (commandId: string) => {
    setSelectedCommand(commandId);
    setCommandParams({});
    setCommandResult(null);
    setCommandStatus('idle');
    
    // Set default parameters based on command
    switch (commandId) {
      case 'logs':
        setCommandParams({ lines: 50, level: 'info' });
        break;
      case 'debug':
        setCommandParams({ enabled: true });
        break;
      case 'update':
        setCommandParams({ ...agent.parameters }); // Copy current parameters
        break;
      case 'custom':
        setCommandParams({ command: '', args: '' });
        break;
    }
  };
  
  // Update command parameter
  const updateParam = (key: string, value: any) => {
    setCommandParams(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Execute the command
  const executeCommand = async () => {
    setCommandStatus('idle');
    setCommandResult(null);
    
    try {
      const success = await onExecuteCommand(agent.id, selectedCommand, commandParams);
      
      // Simulate command result
      const result = {
        timestamp: new Date().toISOString(),
        command: selectedCommand,
        parameters: commandParams,
        result: success 
          ? { status: 'success', message: `Command ${selectedCommand} executed successfully` }
          : { status: 'error', message: `Failed to execute command ${selectedCommand}` }
      };
      
      setCommandResult(result);
      setCommandStatus(success ? 'success' : 'error');
    } catch (error) {
      console.error('Error executing command:', error);
      setCommandStatus('error');
      setCommandResult({
        timestamp: new Date().toISOString(),
        command: selectedCommand,
        parameters: commandParams,
        result: {
          status: 'error',
          message: `Exception occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      });
    }
  };
  
  // Render command parameters form based on selected command
  const renderCommandParams = () => {
    switch (selectedCommand) {
      case 'logs':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="log-lines">Number of Lines</Label>
              <Input 
                id="log-lines" 
                type="number"
                value={commandParams.lines}
                onChange={(e) => updateParam('lines', parseInt(e.target.value))}
                min={1}
                max={1000}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="log-level">Log Level</Label>
              <Select 
                value={commandParams.level} 
                onValueChange={(value) => updateParam('level', value)}
              >
                <SelectTrigger id="log-level">
                  <SelectValue placeholder="Select log level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
        
      case 'debug':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="debug-enabled">Debug Mode</Label>
              <Select 
                value={commandParams.enabled ? 'true' : 'false'} 
                onValueChange={(value) => updateParam('enabled', value === 'true')}
              >
                <SelectTrigger id="debug-enabled">
                  <SelectValue placeholder="Debug mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enable</SelectItem>
                  <SelectItem value="false">Disable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
        
      case 'update':
        // For simplicity, we'll just show a text area for JSON parameters
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parameters-json">Parameters (JSON)</Label>
              <Textarea 
                id="parameters-json" 
                value={JSON.stringify(commandParams, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setCommandParams(parsed);
                  } catch (err) {
                    // Allow invalid JSON while editing
                  }
                }}
                rows={10}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Edit parameters as JSON
              </p>
            </div>
          </div>
        );
        
      case 'custom':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-command">Command</Label>
              <Input 
                id="custom-command" 
                value={commandParams.command}
                onChange={(e) => updateParam('command', e.target.value)}
                placeholder="Enter custom command"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="command-args">Arguments (JSON)</Label>
              <Textarea 
                id="command-args" 
                value={commandParams.args}
                onChange={(e) => updateParam('args', e.target.value)}
                placeholder='{"arg1": "value1", "arg2": "value2"}'
                rows={4}
                className="font-mono text-xs"
              />
            </div>
          </div>
        );
        
      default:
        if (!selectedCommand) {
          return (
            <div className="py-8 text-center text-muted-foreground">
              <p>Select a command to configure</p>
            </div>
          );
        }
        
        return (
          <div className="py-4 text-center">
            <p>No additional parameters needed for this command.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click Execute to run {AVAILABLE_COMMANDS.find(c => c.id === selectedCommand)?.name}
            </p>
          </div>
        );
    }
  };
  
  // Render command result
  const renderCommandResult = () => {
    if (!commandResult) return null;
    
    const isSuccess = commandStatus === 'success';
    
    return (
      <Card className={isSuccess ? 'border-green-500' : 'border-red-500'}>
        <CardHeader className="pb-2">
          <div className="flex items-center">
            {isSuccess ? (
              <Check className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            )}
            <CardTitle className="text-md">
              {isSuccess ? 'Command Executed Successfully' : 'Command Failed'}
            </CardTitle>
          </div>
          <CardDescription>
            {new Date(commandResult.timestamp).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Command:</span> {commandResult.command}
            </div>
            
            {Object.keys(commandResult.parameters).length > 0 && (
              <div className="text-sm">
                <span className="font-medium">Parameters:</span>
                <pre className="mt-1 p-2 bg-muted/20 rounded-md text-xs overflow-auto">
                  {JSON.stringify(commandResult.parameters, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="text-sm mt-2">
              <span className="font-medium">Result:</span>
              <pre className={`mt-1 p-2 rounded-md text-xs overflow-auto ${
                isSuccess ? 'bg-green-50' : 'bg-red-50'
              }`}>
                {JSON.stringify(commandResult.result, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agent Commands</CardTitle>
          <CardDescription>
            Execute commands on your ElizaOS agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Command Selection */}
            <div className="space-y-2">
              <Label htmlFor="command-select">Select Command</Label>
              <Select 
                value={selectedCommand} 
                onValueChange={handleCommandChange}
              >
                <SelectTrigger id="command-select">
                  <SelectValue placeholder="Select a command to execute" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_COMMANDS.map(command => (
                    <SelectItem key={command.id} value={command.id}>
                      <div className="flex items-center">
                        <span className="mr-2">{command.icon}</span>
                        <span>{command.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedCommand && (
                <p className="text-xs text-muted-foreground">
                  {AVAILABLE_COMMANDS.find(c => c.id === selectedCommand)?.description}
                </p>
              )}
            </div>
            
            {/* Command Parameters */}
            <div className="pt-2 border-t">
              <h3 className="text-sm font-medium mb-3">Command Parameters</h3>
              {renderCommandParams()}
            </div>
            
            {/* Execute Button */}
            <div className="pt-2 flex justify-end">
              <Button
                onClick={executeCommand}
                disabled={isExecuting || !selectedCommand}
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Terminal className="mr-2 h-4 w-4" />
                    Execute Command
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Command Result */}
      {commandResult && renderCommandResult()}
      
      {/* Command History Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Command History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>Command history would be displayed here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 