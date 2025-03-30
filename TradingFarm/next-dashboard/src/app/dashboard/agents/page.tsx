import { Metadata } from 'next';
import ElizaAgentManager from '@/components/eliza/ElizaAgentManager';
import ElizaEventMonitor from '@/components/eliza/ElizaEventMonitor';
import ElizaChatInterface from '@/components/eliza/eliza-chat-interface';
import DashboardHeader from '@/components/dashboard/dashboard-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
  title: 'Trading Agents - Trading Farm',
  description: 'Manage your ElizaOS trading agents',
};

export default function AgentsPage() {
  return (
    <>
      <DashboardHeader 
        title="Trading Agents" 
        description="Manage your ElizaOS agents and commands"
      />

      <Tabs defaultValue="agents" className="space-y-4">
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="commands">Command Console</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="agents" className="space-y-4">
          <ElizaAgentManager showCreateButton={true} />
        </TabsContent>
        
        <TabsContent value="events" className="space-y-4">
          <ElizaEventMonitor 
            maxEvents={100}
            showAgentEvents={true}
            showCommandEvents={true}
            showSystemEvents={true}
          />
        </TabsContent>
        
        <TabsContent value="commands" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">ElizaOS Command Console</h2>
            <div className="h-[600px]">
              <ElizaChatInterface />
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator className="my-8" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2">
          <h2 className="text-lg font-semibold mb-4">Recent Agent Activity</h2>
          <ElizaEventMonitor 
            maxEvents={5}
            showAgentEvents={true}
            showCommandEvents={false}
            showSystemEvents={false}
          />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-4">System Alerts</h2>
          <ElizaEventMonitor 
            maxEvents={5}
            showAgentEvents={false}
            showCommandEvents={false}
            showSystemEvents={true}
          />
        </div>
      </div>
    </>
  );
}
