'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import { useRouter } from 'next/navigation';

// Import our new components
import MetaMaskConnector from '@/components/wallet/metamask-connector';
import { AgentList } from '@/components/agents/agent-list';
import { FarmList } from '@/components/farms/farm-list';
import { useAuth, Agent, Farm } from '@/hooks';

export default function LiveOverviewPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Handle farm actions
  const handleEditFarm = (farm: Farm) => {
    router.push(`/dashboard/farms/${farm.id}/edit`);
  };

  const handleViewFarm = (farm: Farm) => {
    router.push(`/dashboard/farms/${farm.id}`);
  };

  const handleFarmStatusChange = (farm: Farm, newStatus: boolean) => {
    // This would be handled by a real mutate function
    console.log(`Change farm ${farm.id} status to ${newStatus ? 'active' : 'inactive'}`);
  };

  // Handle agent actions
  const handleEditAgent = (agent: Agent) => {
    router.push(`/dashboard/agents/${agent.id}/edit`);
  };

  const handleAgentStatusChange = (agent: Agent, newStatus: boolean) => {
    // This would be handled by a real mutate function
    console.log(`Change agent ${agent.id} status to ${newStatus ? 'active' : 'inactive'}`);
  };

  return (
    <div className="flex flex-col space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Live Farm Overview</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Wallet Section */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Wallet Status</CardTitle>
          </CardHeader>
          <CardContent>
            <MetaMaskConnector />
          </CardContent>
        </Card>

        {/* Agent Status Section - Using the real AgentList component */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Live Agent Status</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentList 
              onEdit={handleEditAgent} 
              onStatusChange={handleAgentStatusChange}
            />
          </CardContent>
        </Card>
        
        {/* Farm Status Section - Using the real FarmList component */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Live Farm Status</CardTitle>
          </CardHeader>
          <CardContent>
            <FarmList 
              userId={user?.id}
              onEdit={handleEditFarm}
              onStatusChange={handleFarmStatusChange}
              onView={handleViewFarm}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 