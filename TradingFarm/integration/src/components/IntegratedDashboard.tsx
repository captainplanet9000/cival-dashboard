/**
 * Integrated Dashboard Component
 * 
 * This component demonstrates how to use the integrated Trading Farm + ElizaOS system,
 * showcasing the real-time command center, agent management, banking system, and knowledge base
 * all working together to create a powerful AI-powered trading platform.
 */

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertTriangle, CheckCircle, RefreshCw, Zap } from 'lucide-react';

// Import integrated components
import CommandCenter from './CommandCenter';
import { useAgentSystem } from '../hooks/useAgentSystem';
import { useFarmSystem } from '../hooks/useFarmSystem';
import { useBankingSystem } from '@/hooks/useBankingSystem';
import { useElizaOS } from '@/integrations/elizaos';
import knowledgeService from '../services/KnowledgeService';

// Import initialization utilities
import { initialize, status, IntegrationStatus } from '../utils/initialization';

export default function IntegratedDashboard() {
  // Integration status state
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    initialized: false,
    elizaConnected: false,
    databaseConnected: false,
    lastInitialized: null,
    debugMode: false
  });
  const [initializing, setInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState('command-center');
  
  // Hooks for the integrated systems
  const { connected: elizaConnected } = useElizaOS();
  const { agents, loading: agentsLoading } = useAgentSystem();
  const { farms, loading: farmsLoading } = useFarmSystem();
  const { masterWallet, farmWallets, loading: bankingLoading } = useBankingSystem();
  
  // Knowledge base stats
  const [knowledgeStats, setKnowledgeStats] = useState<any>(null);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  
  // Initialize the integration
  useEffect(() => {
    const initIntegration = async () => {
      setInitializing(true);
      await initialize({ debugMode: true });
      setIntegrationStatus(status());
      setInitializing(false);
    };
    
    initIntegration();
  }, []);
  
  // Load knowledge stats when ElizaOS is connected
  useEffect(() => {
    const loadKnowledgeStats = async () => {
      if (elizaConnected && knowledgeService.isConnected()) {
        try {
          setLoadingKnowledge(true);
          const stats = await knowledgeService.getStatistics();
          setKnowledgeStats(stats);
        } catch (error) {
          console.error('Error loading knowledge stats:', error);
        } finally {
          setLoadingKnowledge(false);
        }
      }
    };
    
    loadKnowledgeStats();
  }, [elizaConnected]);
  
  // Refresh the integration status
  const refreshStatus = () => {
    setIntegrationStatus(status());
  };
  
  // Retry initialization
  const retryInitialization = async () => {
    setInitializing(true);
    await initialize({ debugMode: true });
    setIntegrationStatus(status());
    setInitializing(false);
  };
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading Farm + ElizaOS</h1>
          <p className="text-muted-foreground">Integrated AI-powered trading platform</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant={elizaConnected ? "success" : "destructive"}>
            ElizaOS: {elizaConnected ? "Connected" : "Disconnected"}
          </Badge>
          
          <Badge variant={integrationStatus.databaseConnected ? "success" : "destructive"}>
            Database: {integrationStatus.databaseConnected ? "Connected" : "Disconnected"}
          </Badge>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1"
            onClick={refreshStatus}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Status
          </Button>
        </div>
      </header>
      
      {/* Integration Status Alert */}
      {!integrationStatus.initialized && !initializing && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Integration Not Initialized</AlertTitle>
          <AlertDescription>
            The Trading Farm + ElizaOS integration has not been properly initialized.
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4"
              onClick={retryInitialization}
            >
              Retry Initialization
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {initializing && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Initializing...</AlertTitle>
          <AlertDescription>
            Setting up the Trading Farm + ElizaOS integration. Please wait...
          </AlertDescription>
        </Alert>
      )}
      
      {integrationStatus.initialized && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Integration Active</AlertTitle>
          <AlertDescription>
            The Trading Farm + ElizaOS integration is active and running.
            {integrationStatus.lastInitialized && (
              <span className="ml-2 text-xs text-muted-foreground">
                Last initialized: {new Date(integrationStatus.lastInitialized).toLocaleString()}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="command-center">Command Center</TabsTrigger>
          <TabsTrigger value="agents">Agent Management</TabsTrigger>
          <TabsTrigger value="farms">Farm Management</TabsTrigger>
          <TabsTrigger value="banking">Banking System</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
        </TabsList>
        
        {/* Command Center Tab */}
        <TabsContent value="command-center" className="pt-6">
          <div className="grid grid-cols-1 gap-6">
            <CommandCenter height="600px" initialFocus={activeTab === 'command-center'} />
          </div>
        </TabsContent>
        
        {/* Agent Management Tab */}
        <TabsContent value="agents" className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Agent Overview</span>
                  {agentsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Agents:</span>
                    <span className="font-semibold">{agents.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Active Agents:</span>
                    <span className="font-semibold">
                      {agents.filter(a => a.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Paused Agents:</span>
                    <span className="font-semibold">
                      {agents.filter(a => a.status === 'paused').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Inactive Agents:</span>
                    <span className="font-semibold">
                      {agents.filter(a => a.status === 'inactive').length}
                    </span>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="pt-2">
                    <Button 
                      className="w-full gap-2" 
                      disabled={!elizaConnected}
                    >
                      <Zap className="h-4 w-4" />
                      Create New Agent
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Recent Agent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {agentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : agents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No agents found. Create your first agent to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {agents.slice(0, 5).map(agent => (
                      <div key={agent.id} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {agent.model} • Last active: {
                              agent.last_active 
                                ? new Date(agent.last_active).toLocaleString() 
                                : 'Never'
                            }
                          </div>
                        </div>
                        <Badge variant={
                          agent.status === 'active' ? 'success' :
                          agent.status === 'paused' ? 'warning' : 'outline'
                        }>
                          {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Agent Command Center */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Agent Command Console</CardTitle>
              </CardHeader>
              <CardContent>
                <CommandCenter 
                  showTitle={false} 
                  height="300px" 
                  contextType="agent"
                  contextId={agents.length > 0 ? agents[0].id : undefined}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Farm Management Tab */}
        <TabsContent value="farms" className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Farm Overview</span>
                  {farmsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Farms:</span>
                    <span className="font-semibold">{farms.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Active Farms:</span>
                    <span className="font-semibold">
                      {farms.filter(f => f.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Paused Farms:</span>
                    <span className="font-semibold">
                      {farms.filter(f => f.status === 'paused').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Locked Farms:</span>
                    <span className="font-semibold">
                      {farms.filter(f => f.status === 'locked').length}
                    </span>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="pt-2">
                    <Button 
                      className="w-full gap-2" 
                      disabled={!elizaConnected}
                    >
                      <Zap className="h-4 w-4" />
                      Create New Farm
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Farm Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {farmsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : farms.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No farms found. Create your first farm to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {farms.slice(0, 5).map(farm => (
                      <div key={farm.id} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <div className="font-medium">{farm.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Balance: ${farm.balance.toLocaleString()} • 
                            Risk Level: {farm.risk_level.charAt(0).toUpperCase() + farm.risk_level.slice(1)}
                          </div>
                        </div>
                        <Badge variant={
                          farm.status === 'active' ? 'success' :
                          farm.status === 'paused' ? 'warning' : 'destructive'
                        }>
                          {farm.status.charAt(0).toUpperCase() + farm.status.slice(1)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Farm Command Center */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Farm Command Console</CardTitle>
              </CardHeader>
              <CardContent>
                <CommandCenter 
                  showTitle={false} 
                  height="300px" 
                  contextType="farm"
                  contextId={farms.length > 0 ? farms[0].id : undefined}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Banking System Tab */}
        <TabsContent value="banking" className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Master Vault</span>
                  {bankingLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bankingLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !masterWallet ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No master vault found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-3xl font-bold">
                      ${masterWallet.totalBalance.toLocaleString()}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Allocated to Farms:</span>
                        <span className="font-semibold">
                          ${masterWallet.allocatedToFarms.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Reserve Funds:</span>
                        <span className="font-semibold">
                          ${masterWallet.reserveFunds.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">High Risk Exposure:</span>
                        <span className="font-semibold">
                          ${masterWallet.highRiskExposure.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Security Score:</span>
                        <span className="font-semibold">
                          {masterWallet.securityScore}/100
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Farm Wallets</CardTitle>
              </CardHeader>
              <CardContent>
                {bankingLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : farmWallets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No farm wallets found. Create farm wallets to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {farmWallets.slice(0, 5).map(wallet => (
                      <div key={wallet.id} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <div className="font-medium">{wallet.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Balance: ${wallet.balance.toLocaleString()} • 
                            Available: ${wallet.availableFunds.toLocaleString()}
                          </div>
                        </div>
                        <Badge variant={
                          wallet.risk_level === 'low' ? 'outline' :
                          wallet.risk_level === 'medium' ? 'secondary' : 'destructive'
                        }>
                          {wallet.risk_level.charAt(0).toUpperCase() + wallet.risk_level.slice(1)} Risk
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Banking Command Center */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Banking Command Console</CardTitle>
              </CardHeader>
              <CardContent>
                <CommandCenter 
                  showTitle={false} 
                  height="300px" 
                  contextType="wallet"
                  contextId={masterWallet?.id}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge" className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Knowledge Statistics</span>
                  {loadingKnowledge && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingKnowledge ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !knowledgeStats ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {elizaConnected 
                      ? 'No knowledge base statistics available.' 
                      : 'Connect to ElizaOS to view knowledge base statistics.'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Documents:</span>
                        <span className="font-semibold">
                          {knowledgeStats.documentCount}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Document Chunks:</span>
                        <span className="font-semibold">
                          {knowledgeStats.chunkCount}
                        </span>
                      </div>
                      
                      <Separator className="my-4" />
                      
                      <div className="font-medium mb-2">Categories:</div>
                      {Object.entries(knowledgeStats.categoryBreakdown).map(([category, count]) => (
                        <div key={category} className="flex justify-between items-center">
                          <span className="text-muted-foreground">{category}:</span>
                          <span className="font-semibold">{count as number}</span>
                        </div>
                      ))}
                      
                      <div className="text-xs text-muted-foreground pt-4">
                        Last updated: {new Date(knowledgeStats.lastUpdated).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Knowledge Base Query</CardTitle>
              </CardHeader>
              <CardContent>
                <CommandCenter 
                  showTitle={false} 
                  height="400px" 
                  contextType="system"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
