// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/supabase_edge_functions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface RealtimeUpdateRequest {
  type: 'subscribe' | 'unsubscribe' | 'broadcast';
  channel: string;
  payload?: Record<string, any>;
  farm_id?: string;
  event?: string;
}

interface ClientInfo {
  connectionId: string;
  connectedAt: string;
  userId?: string;
  farmId?: string;
  lastActivity: string;
}

// In-memory store of connected clients (would use Redis in production)
const connectedClients: Map<string, ClientInfo> = new Map();

Deno.serve(async (req) => {
  // Enable CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables for Supabase client');
    }

    // Initialize Supabase client with service role key (for admin operations)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // For GET requests, return connection stats
    if (req.method === 'GET') {
      return handleStatsRequest();
    }

    // Process the request
    const body: RealtimeUpdateRequest = await req.json();
    
    switch (body.type) {
      case 'subscribe':
        return handleSubscribeRequest(req, body);
      
      case 'unsubscribe':
        return handleUnsubscribeRequest(req, body);
      
      case 'broadcast':
        return handleBroadcastRequest(supabase, body);
      
      default:
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid request type' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
  } catch (error) {
    // Handle any errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Realtime handler error: ${errorMessage}`);
    
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Handle client subscription requests
function handleSubscribeRequest(req: Request, body: RealtimeUpdateRequest): Response {
  try {
    // Extract user info from the request (if any)
    const authHeader = req.headers.get('authorization');
    const userId = authHeader ? extractUserIdFromToken(authHeader) : undefined;
    
    // Generate a connection ID if not provided
    const connectionId = req.headers.get('x-connection-id') || crypto.randomUUID();
    
    // Store client info
    connectedClients.set(connectionId, {
      connectionId,
      connectedAt: new Date().toISOString(),
      userId,
      farmId: body.farm_id,
      lastActivity: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Subscribed successfully', 
        connectionId,
        channel: body.channel
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, message: `Subscription error: ${errorMessage}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
}

// Handle client unsubscribe requests
function handleUnsubscribeRequest(req: Request, body: RealtimeUpdateRequest): Response {
  try {
    // Get the connection ID
    const connectionId = req.headers.get('x-connection-id');
    
    if (!connectionId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing connection ID' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Remove the client
    const removed = connectedClients.delete(connectionId);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: removed ? 'Unsubscribed successfully' : 'Connection not found',
        channel: body.channel
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, message: `Unsubscribe error: ${errorMessage}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
}

// Handle broadcasting an event to clients
async function handleBroadcastRequest(supabase: any, body: RealtimeUpdateRequest): Promise<Response> {
  try {
    if (!body.payload) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing payload' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    if (!body.event) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing event type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // In a real implementation, we would have a websocket connection to all clients
    // and would filter clients based on their subscription settings
    // Here we're just logging and returning success
    
    // Check for farm-specific broadcasts
    if (body.farm_id) {
      // For farm-specific events, we should also save to the database for persistence
      if (body.event === 'farm_status_update') {
        await saveFarmStatusUpdate(supabase, body);
      } else if (body.event === 'trade_executed') {
        await saveTradeExecuted(supabase, body);
      }
      
      console.log(`Broadcast to farm ${body.farm_id}: ${body.event}`);
    } else {
      console.log(`Broadcast to all: ${body.event}`);
    }
    
    // Log the broadcast to audit logs
    await supabase
      .from('audit_logs')
      .insert({
        action: 'realtime.broadcast',
        resource_type: 'channel',
        resource_id: null,
        farm_id: body.farm_id,
        details: {
          channel: body.channel,
          event: body.event,
          payload: body.payload
        }
      });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Broadcast sent',
        channel: body.channel,
        event: body.event,
        recipients: body.farm_id ? 'farm-specific' : 'all'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, message: `Broadcast error: ${errorMessage}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}

// Return stats about connected clients
function handleStatsRequest(): Response {
  const stats = {
    connectedClients: connectedClients.size,
    clients: Array.from(connectedClients.values()).map(client => ({
      connectionId: client.connectionId,
      connectedAt: client.connectedAt,
      lastActivity: client.lastActivity,
      hasUserId: !!client.userId,
      hasFarmId: !!client.farmId
    }))
  };
  
  return new Response(
    JSON.stringify(stats),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Helper to extract user ID from auth token
function extractUserIdFromToken(authHeader: string): string | undefined {
  try {
    // Note: In a real implementation, this would properly decode and verify the JWT
    // This is a simplified placeholder implementation
    if (!authHeader.startsWith('Bearer ')) return undefined;
    
    const token = authHeader.replace('Bearer ', '');
    const base64Url = token.split('.')[1];
    if (!base64Url) return undefined;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    
    return payload.sub;
  } catch (error) {
    console.error('Error extracting user ID from token:', error);
    return undefined;
  }
}

// Save farm status update to the database
async function saveFarmStatusUpdate(supabase: any, body: RealtimeUpdateRequest): Promise<void> {
  if (!body.farm_id || !body.payload) return;
  
  const farmId = body.farm_id;
  const { status, message, metrics } = body.payload;
  
  if (!status) return;
  
  await supabase
    .from('farm_status_updates')
    .insert({
      farm_id: farmId,
      status,
      message: message || `Status changed to ${status}`,
      metrics: metrics || {},
      updated_by: null
    });
}

// Save trade execution to the database
async function saveTradeExecuted(supabase: any, body: RealtimeUpdateRequest): Promise<void> {
  if (!body.farm_id || !body.payload) return;
  
  const farmId = body.farm_id;
  const trade = body.payload;
  
  if (!trade.market || !trade.side || !trade.price || !trade.quantity) return;
  
  await supabase
    .from('trades')
    .insert({
      farm_id: farmId,
      agent_id: trade.agent_id,
      market: trade.market,
      side: trade.side,
      price: trade.price,
      quantity: trade.quantity,
      fee: trade.fee || 0,
      fee_currency: trade.fee_currency || trade.market.split('/')[1],
      total: trade.price * trade.quantity,
      profit_loss: trade.profit_loss,
      executed_at: trade.executed_at || new Date().toISOString(),
      wallet_id: trade.wallet_id,
      strategy_id: trade.strategy_id
    });
} 