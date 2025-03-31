'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { 
  AlertTriangle, 
  Check, 
  RefreshCcw, 
  Settings, 
  Wifi, 
  WifiOff, 
  Database, 
  Server, 
  Clock,
  Zap,
  Brain
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { testExchangeConnections, getExchangeLatency } from '@/app/actions/exchange-actions';
import { formatDistanceToNow } from 'date-fns';

// Types
export interface ExchangeConnection {
  exchange_id: string;
  exchange_name: string;
  api_key_id: string;
  api_key_name: string;
  farm_id: string;
  farm_name: string;
  status: 'connected' | 'disconnected' | 'limited' | 'unknown';
  last_connected_at: string | null;
  logo_url: string;
  permissions: {
    read: boolean;
    trade: boolean;
    withdraw: boolean;
  };
  error_message?: string;
  error_code?: string;
  latency_ms?: number;
  rate_limit_remaining?: number;
  rate_limit_reset_at?: string;
  testnet: boolean;
}

interface ConnectionTestPanelProps {
  connections: ExchangeConnection[];
  onRefresh?: () => void;
  isLoading?: boolean;
  hasElizaOS?: boolean;
}

export default function ConnectionTestPanel({
  connections,
  onRefresh,
  isLoading = false,
  hasElizaOS = true
}: ConnectionTestPanelProps) {
  const { toast } = useToast();
  const [testingConnections, setTestingConnections] = useState(false);
  const [testingLatency, setTestingLatency] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [latencyResults, setLatencyResults] = useState<Record<string, number>>({});
  
  // Handle refresh/test connections
  const handleTestConnections = async () => {
    if (isLoading || testingConnections) return;
    
    setTestingConnections(true);
    
    try {
      const result = await testExchangeConnections();
      
      if (result.success) {
        toast({
          title: "Connection Test Complete",
          description: result.message || "All exchange connections have been tested.",
        });
        
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast({
          title: "Connection Test Failed",
          description: result.error || "Failed to test exchange connections",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing connections:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while testing connections",
        variant: "destructive",
      });
    } finally {
      setTestingConnections(false);
    }
  };
  
  // Handle latency test
  const handleLatencyTest = async (apiKeyId: string) => {
    if (testingLatency) return;
    
    setSelectedConnection(apiKeyId);
    setTestingLatency(true);
    
    try {
      const result = await getExchangeLatency(apiKeyId);
      
      if (result.success) {
        setLatencyResults(prev => ({
          ...prev,
          [apiKeyId]: result.latency_ms
        }));
        
        toast({
          title: "Latency Test Complete",
          description: `Current latency: ${result.latency_ms}ms`,
        });
      } else {
        toast({
          title: "Latency Test Failed",
          description: result.error || "Failed to test latency",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing latency:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while testing latency",
        variant: "destructive",
      });
    } finally {
      setTestingLatency(false);
      setSelectedConnection(null);
    }
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Connected</Badge>;
      case 'limited':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Limited</Badge>;
      case 'disconnected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Disconnected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Unknown</Badge>;
    }
  };
  
  // Get latency indicator
  const getLatencyIndicator = (latency?: number) => {
    if (!latency) return null;
    
    if (latency < 100) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{latency}ms</Badge>;
    } else if (latency < 300) {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{latency}ms</Badge>;
    } else {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{latency}ms</Badge>;
    }
  };
  
  // Determine if any connections are disconnected
  const hasDisconnectedConnections = connections.some(conn => conn.status === 'disconnected');
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl flex items-center">
              <Wifi className="h-5 w-5 mr-2" />
              Exchange Connections
            </CardTitle>
            <CardDescription>
              Monitor the status of your exchange API connections
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            {hasElizaOS && (
              <Badge className="bg-primary/20 text-primary border-primary/30 flex items-center">
                <Brain className="h-3 w-3 mr-1" />
                ElizaOS Enhanced
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleTestConnections}
              disabled={isLoading || testingConnections}
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${(isLoading || testingConnections) ? 'animate-spin' : ''}`} />
              {testingConnections ? 'Testing...' : 'Test All'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Status */}
        <div className="p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {hasDisconnectedConnections ? (
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <WifiOff className="h-5 w-5 text-red-600" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
              )}
              
              <div>
                <div className="font-medium">
                  {hasDisconnectedConnections 
                    ? "Some connections have issues" 
                    : "All exchanges are connected"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {connections.length} {connections.length === 1 ? 'connection' : 'connections'} configured
                </div>
              </div>
            </div>
            
            {hasDisconnectedConnections && (
              <Button variant="outline" size="sm" onClick={handleTestConnections}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </div>
        
        {/* Connection List */}
        <div className="space-y-4">
          {connections.length === 0 ? (
            <div className="text-center p-6 border rounded-lg bg-muted/30">
              <WifiOff className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">No Exchange Connections</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                You haven't added any exchange API keys yet.
              </p>
              <Button 
                variant="default" 
                onClick={() => window.location.href = '/exchange/api-keys/new'}
              >
                Add Exchange API Key
              </Button>
            </div>
          ) : (
            <div>
              {connections.map((connection) => (
                <div 
                  key={connection.api_key_id} 
                  className={`p-4 border rounded-lg mb-3 ${
                    connection.status === 'disconnected' ? 'border-red-200 bg-red-50/50' : 
                    connection.status === 'limited' ? 'border-amber-200 bg-amber-50/50' : 
                    'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    {/* Exchange & API Key Info */}
                    <div className="flex items-center">
                      {connection.logo_url && (
                        <img 
                          src={connection.logo_url} 
                          alt={connection.exchange_name} 
                          className="w-8 h-8 mr-3" 
                        />
                      )}
                      
                      <div>
                        <div className="font-medium flex items-center">
                          {connection.exchange_name}
                          {connection.testnet && (
                            <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200">
                              Testnet
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {connection.api_key_name}
                        </div>
                      </div>
                    </div>
                    
                    {/* Status */}
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(connection.status)}
                      {getLatencyIndicator(connection.latency_ms || latencyResults[connection.api_key_id])}
                    </div>
                  </div>
                  
                  {/* Permissions & Details */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className={connection.permissions.read ? 'border-green-200' : 'border-red-200'}>
                      Read: {connection.permissions.read ? 'Yes' : 'No'}
                    </Badge>
                    <Badge variant="outline" className={connection.permissions.trade ? 'border-green-200' : 'border-gray-200'}>
                      Trade: {connection.permissions.trade ? 'Yes' : 'No'}
                    </Badge>
                    <Badge variant="outline" className={connection.permissions.withdraw ? 'border-green-200' : 'border-gray-200'}>
                      Withdraw: {connection.permissions.withdraw ? 'No' : 'Yes'}
                    </Badge>
                    
                    {connection.farm_name && (
                      <Badge variant="outline" className="border-blue-200">
                        Farm: {connection.farm_name}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Rate Limit Info */}
                  {connection.rate_limit_remaining !== undefined && (
                    <div className="mt-3">
                      <div className="text-xs text-muted-foreground mb-1">
                        Rate Limit: {connection.rate_limit_remaining} remaining
                        {connection.rate_limit_reset_at && (
                          <span className="ml-1">
                            (resets {formatDistanceToNow(new Date(connection.rate_limit_reset_at), { addSuffix: true })})
                          </span>
                        )}
                      </div>
                      <Progress 
                        value={connection.rate_limit_remaining} 
                        max={1000} 
                        className="h-1" 
                      />
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {connection.status === 'disconnected' && connection.error_message && (
                    <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                      <span className="font-medium">Error:</span> {connection.error_message}
                      {connection.error_code && (
                        <span className="ml-1 text-xs">({connection.error_code})</span>
                      )}
                    </div>
                  )}
                  
                  {/* Last Connected */}
                  <div className="mt-3 flex justify-between items-center">
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {connection.last_connected_at ? (
                        <>Last connected {formatDistanceToNow(new Date(connection.last_connected_at), { addSuffix: true })}</>
                      ) : (
                        <>Never connected</>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleLatencyTest(connection.api_key_id)}
                        disabled={testingLatency && selectedConnection === connection.api_key_id}
                      >
                        {testingLatency && selectedConnection === connection.api_key_id ? (
                          <>
                            <RefreshCcw className="h-3 w-3 mr-1 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Zap className="h-3 w-3 mr-1" />
                            Test Latency
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = `/exchange/api-keys/${connection.api_key_id}`}
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Manage
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* ElizaOS Integration */}
        {hasElizaOS && (
          <div className="border border-primary/30 bg-primary/5 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Brain className="h-5 w-5 text-primary mt-1" />
              <div>
                <h3 className="font-medium text-primary">ElizaOS Connection Monitor</h3>
                <p className="text-sm mt-1">
                  ElizaOS is actively monitoring your exchange connections and will alert you to any issues or anomalies. 
                  The AI system will automatically detect authentication problems, unusual response patterns, and potential API outages.
                </p>
                
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-background rounded p-2 border border-primary/20 text-xs">
                    <div className="font-medium mb-1">Automatic Issue Detection</div>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Connection failures analysis</li>
                      <li>Rate limit monitoring</li>
                      <li>Response time anomalies</li>
                      <li>API version compatibility</li>
                    </ul>
                  </div>
                  
                  <div className="bg-background rounded p-2 border border-primary/20 text-xs">
                    <div className="font-medium mb-1">Preventive Actions</div>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Throttling during high traffic periods</li>
                      <li>Automated reconnection attempts</li>
                      <li>API key rotation suggestions</li>
                      <li>Proactive alternative route finding</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="border-t pt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={() => window.location.href = '/exchange/api-keys'}
        >
          Manage API Keys
        </Button>
        
        <Button
          variant="outline"
          onClick={() => window.location.href = '/exchange/advanced-settings'}
        >
          Advanced Settings
        </Button>
      </CardFooter>
    </Card>
  );
}
