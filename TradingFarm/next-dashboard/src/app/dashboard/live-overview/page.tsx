'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import { useRouter } from 'next/navigation';
import { AgentList } from '@/components/agents/agent-list';
import { FarmList } from '@/components/farms/farm-list';
import { useAuth, Agent, Farm } from '@/hooks';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatAddress, formatBalance } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from "@/components/ui/use-toast";

export default function LiveOverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = createBrowserClient();
  const { 
    address, 
    isConnected, 
    isConnecting, 
    error, 
    network 
  } = useWallet();

  // Handle farm actions
  const handleEditFarm = (farm: Farm) => {
    router.push(`/dashboard/farms/${farm.id}/edit`);
  };

  const handleViewFarm = (farm: Farm) => {
    router.push(`/dashboard/farms/${farm.id}`);
  };

  const handleFarmStatusChange = (farm: Farm, newStatus: boolean) => {
    console.log(`Change farm ${farm.id} status to ${newStatus ? 'active' : 'inactive'}`);
  };

  // Handle agent actions
  const handleEditAgent = (agent: Agent) => {
    router.push(`/dashboard/agents/${agent.id}/edit`);
  };

  const handleAgentStatusChange = async (agent: Agent, newStatus: boolean) => {
    const targetStatus = newStatus ? 'active' : 'inactive';
    console.log(`Attempting to change agent ${agent.id} status to ${targetStatus}`);

    try {
      const { error } = await supabase
        .from('agents')
        .update({ status: targetStatus })
        .eq('id', agent.id);

      if (error) {
        throw error;
      }

      toast({ 
        title: "Agent Status Updated",
        description: `Agent ${agent.id.substring(0, 8)}... status set to ${targetStatus}.`,
        variant: "default",
      });

      // Invalidate the agents query cache to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['agents'] });

    } catch (error: any) {
      console.error("Failed to update agent status:", error);
      toast({
        title: "Error Updating Status",
        description: error.message || "Could not update agent status. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Live Farm Overview</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Simplified Wallet Status Display */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Wallet Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isConnecting ? (
              <p className="text-sm text-muted-foreground">Connecting...</p>
            ) : isConnected ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Address</span>
                  <span className="font-mono text-sm">{formatAddress(address)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Network</span>
                  <span className="text-sm">{network || '-'}</span>
                </div>
                {error && <p className="text-red-500 text-xs mt-1">Error: {error}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Wallet not connected.</p>
                {error && <p className="text-red-500 text-xs mt-1">Error: {error}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Status Section */}
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
        
        {/* Farm Status Section */}
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