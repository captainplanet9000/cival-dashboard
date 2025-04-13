'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createBrowserClient } from '@/utils/supabase/client'; // Import Supabase client
import { Database } from '@/types/database.types'; // Import Database types

// Actual component imports - Using default import for MetamaskConnector and FarmForm
import MetamaskConnector from '@/components/wallet/metamask-connector'; 
import { AgentList } from '@/components/AgentList'; // Keep named import
import { FarmList } from '@/components/FarmList'; // Keep named import
import FarmForm from '@/components/farms/farm-form'; 

// Define type for Agent data (based on database.types.ts)
// Using a simplified version for display here
type AgentDisplayInfo = Pick<Database['public']['Tables']['agents']['Row'], 'id' | 'agent_type' | 'status' | 'last_heartbeat_at'>;


export default function LiveOverviewPage() {
  const [allAgents, setAllAgents] = useState<AgentDisplayInfo[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [agentError, setAgentError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    const fetchAllAgents = async () => {
      setLoadingAgents(true);
      setAgentError(null);
      try {
        // Fetch all agents - adjust query as needed (e.g., add filtering by user/owner)
        const { data, error } = await supabase
          .from('agents')
          .select('id, agent_type, status, last_heartbeat_at');
          
        if (error) throw error;
        setAllAgents(data || []);
      } catch (err: any) {
        console.error("Error fetching all agents:", err);
        setAgentError("Failed to load agent data.");
      } finally {
        setLoadingAgents(false);
      }
    };

    fetchAllAgents();

    // Optional: Set up Supabase real-time subscription for agents table if needed
    // const channel = supabase.channel('realtime agents').on(...).subscribe();
    // return () => { supabase.removeChannel(channel); };

  }, []);

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
            <MetamaskConnector />
          </CardContent>
        </Card>

        {/* Agent Status Section - Now displays data fetched in this component */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Live Agent Status (All)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAgents ? (
              <p>Loading agents...</p>
            ) : agentError ? (
              <p className="text-red-500">{agentError}</p>
            ) : allAgents.length > 0 ? (
              <ul className="space-y-2">
                {allAgents.map((agent) => (
                  <li key={agent.id} className="flex justify-between items-center p-2 border rounded">
                    <span>ID: {agent.id.substring(0, 8)}... ({agent.agent_type})</span>
                    <span>Status: {agent.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No agents found.</p>
            )}
          </CardContent>
        </Card>
        
        {/* Farm Status Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Live Farm Status</CardTitle>
          </CardHeader>
          <CardContent>
             {/* FarmList likely needs similar treatment - requires props? */}
             {/* For now, rendering it directly and assuming it handles its data */} 
            <FarmList /> 
          </CardContent>
        </Card>

        {/* Farm Creation Section */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Create New Farm</CardTitle>
          </CardHeader>
          <CardContent>
            <FarmForm />
          </CardContent>
        </Card>

      </div>
    </div>
  );
} 