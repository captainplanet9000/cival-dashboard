import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@/utils/supabase/client';
// Removed duplicate import

export function EmergencyStopButton({ agentId }: { agentId: string }) {
  const supabase = createBrowserClient();
  const handleStop = async () => {
    await supabase.from('agent_events').insert({
      agent_id: agentId,
      type: 'command',
      source: 'user',
      content: 'EMERGENCY_STOP',
      metadata: { reason: 'Manual stop from dashboard' }
    });
    // Optionally show toast/notification
  };
  return (
    <Button variant="destructive" onClick={handleStop}>
      Emergency Stop
    </Button>
  );
}

export function ManualTradeButton({ agentId }: { agentId: string }) {
  const supabase = createBrowserClient();
  const handleManualTrade = async () => {
    // Example: place a simple market order (expand as needed)
    await supabase.from('orders').insert({
      agent_id: agentId,
      symbol: 'BTCUSD',
      side: 'buy',
      quantity: 0.01,
      order_type: 'market',
      status: 'pending',
      metadata: { placed_by: 'manual' }
    });
    // Optionally show toast/notification
  };
  return (
    <Button onClick={handleManualTrade}>
      Manual Trade
    </Button>
  );
}

export function RebalanceButton({ agentId }: { agentId: string }) {
  const supabase = createBrowserClient();
  const handleRebalance = async () => {
    await supabase.from('agent_events').insert({
      agent_id: agentId,
      type: 'command',
      source: 'user',
      content: 'REBALANCE',
      metadata: { reason: 'Manual rebalance from dashboard' }
    });
    // Optionally show toast/notification
  };
  return (
    <Button onClick={handleRebalance}>
      Rebalance
    </Button>
  );
}
