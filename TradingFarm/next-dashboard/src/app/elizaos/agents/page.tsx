import AgentDashboard from '@/components/elizaos/AgentDashboard';
import { createServerClient } from '@/utils/supabase/server';

export default async function ElizaOSAgentsPage() {
  const supabase = createServerClient();
  
  // Fetch initial agents data
  const { data: agents } = await supabase
    .from('elizaos_agents')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch initial alerts
  const { data: alerts } = await supabase
    .from('elizaos_alerts')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">ElizaOS Agent Management</h1>
      <AgentDashboard initialAgents={agents || []} initialAlerts={alerts || []} />
    </div>
  );
}
