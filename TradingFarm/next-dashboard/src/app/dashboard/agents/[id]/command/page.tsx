import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { createServerClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ElizaCommandConsole } from '@/components/agents/eliza-command-console';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgentDetailBreadcrumb } from '@/components/agents/agent-detail-breadcrumb';

export const metadata: Metadata = {
  title: "Agent Command Console | Trading Farm",
  description: "ElizaOS Command Console for interacting with trading agents"
};

// Skeleton loading state
function AgentCommandSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-44 mb-2" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[60vh] w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function AgentCommandPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient();
  
  // Get the agent details
  const { data: agent, error } = await supabase
    .from('agents')
    .select('id, name, farm_id, type, status, configuration')
    .eq('id', params.id)
    .single();
    
  if (error || !agent) {
    notFound();
  }
  
  // Get farm details
  const { data: farm } = await supabase
    .from('farms')
    .select('name')
    .eq('id', agent.farm_id)
    .single();
  
  const farmName = farm?.name || 'Unknown Farm';
  
  return (
    <div className="space-y-6">
      <AgentDetailBreadcrumb 
        agentId={agent.id} 
        agentName={agent.name} 
        farmId={agent.farm_id} 
        farmName={farmName} 
        currentPage="Command Console"
      />
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>ElizaOS Command Console</CardTitle>
            <CardDescription>
              Interact with {agent.name} using natural language. Ask questions, issue commands, and receive intelligent responses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="console" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="console">Console</TabsTrigger>
                <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
                <TabsTrigger value="help">Commands</TabsTrigger>
              </TabsList>
              
              <TabsContent value="console" className="w-full">
                <ElizaCommandConsole agentId={agent.id} agentName={agent.name} />
              </TabsContent>
              
              <TabsContent value="knowledge">
                <div className="py-8 px-4 text-center">
                  <h3 className="text-lg font-medium mb-2">Knowledge Base Access</h3>
                  <p className="text-muted-foreground mb-4">
                    {agent.name} has access to trading strategies, market analysis, and historical data.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-md">Sample Questions</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <p>• What is mean reversion trading?</p>
                        <p>• How do I manage risk in volatile markets?</p>
                        <p>• Explain the momentum trading strategy</p>
                        <p>• What indicators work best for trend following?</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-md">Knowledge Sources</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <p>• Trading strategy documentation</p>
                        <p>• Market analysis reports</p>
                        <p>• Technical indicator guides</p>
                        <p>• Risk management frameworks</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="help">
                <div className="py-8 px-4">
                  <h3 className="text-lg font-medium mb-4">Available Commands</h3>
                  
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Agent Control</h4>
                      <ul className="list-disc ml-6 space-y-1 text-sm">
                        <li><code className="bg-muted px-1 rounded">start trading</code> - Activate the agent</li>
                        <li><code className="bg-muted px-1 rounded">stop trading</code> - Deactivate the agent</li>
                        <li><code className="bg-muted px-1 rounded">status</code> - Check agent status</li>
                        <li><code className="bg-muted px-1 rounded">update risk level to [level]</code> - Change risk parameters</li>
                      </ul>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Analysis & Information</h4>
                      <ul className="list-disc ml-6 space-y-1 text-sm">
                        <li><code className="bg-muted px-1 rounded">analyze market conditions</code> - Get current market analysis</li>
                        <li><code className="bg-muted px-1 rounded">show performance</code> - Display performance metrics</li>
                        <li><code className="bg-muted px-1 rounded">explain strategy</code> - Get strategy explanation</li>
                        <li><code className="bg-muted px-1 rounded">what is [concept]?</code> - Query knowledge base</li>
                      </ul>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Advanced Features</h4>
                      <ul className="list-disc ml-6 space-y-1 text-sm">
                        <li><code className="bg-muted px-1 rounded">backtest [parameters]</code> - Run strategy backtests</li>
                        <li><code className="bg-muted px-1 rounded">optimize for [market]</code> - Optimize strategy</li>
                        <li><code className="bg-muted px-1 rounded">set alerts for [condition]</code> - Configure alerts</li>
                        <li><code className="bg-muted px-1 rounded">integrate with [exchange]</code> - Connect to exchanges</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Page({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<AgentCommandSkeleton />}>
      <AgentCommandPage params={params} />
    </Suspense>
  );
}
