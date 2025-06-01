import { createServerClient } from '@/utils/supabase/server';
import { bybitTradingService } from '@/services/bybit-trading-service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/agents/[id]/trading/account
 * 
 * Get account information from the exchange
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    const searchParams = req.nextUrl.searchParams;
    const exchangeId = searchParams.get('exchangeId');
    
    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }
    
    if (!exchangeId) {
      return NextResponse.json(
        { error: 'Exchange ID is required' },
        { status: 400 }
      );
    }
    
    // Get exchange credentials
    const credentialsResponse = await bybitTradingService.getCredentials(exchangeId);
    
    if (credentialsResponse.error || !credentialsResponse.data) {
      return NextResponse.json(
        { error: credentialsResponse.error || 'Failed to get exchange credentials' },
        { status: 500 }
      );
    }
    
    const credentials = credentialsResponse.data;
    
    // Create supabase client
    const supabase = await createServerClient();
    
    // Verify agent exists and has trading permissions
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, tools_config, trading_permissions')
      .eq('id', agentId)
      .single();
    
    if (agentError || !agent) {
      return NextResponse.json(
        { error: agentError?.message || 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Check if agent has trading tools equipped
    const hasExchangeTool = agent.tools_config?.some((tool: any) => 
      tool.type === 'exchange' || tool.name?.toLowerCase().includes('exchange')
    );
    
    if (!hasExchangeTool) {
      return NextResponse.json(
        { error: 'Agent does not have exchange trading tools equipped' },
        { status: 403 }
      );
    }
    
    // Get account information
    const accountResponse = await bybitTradingService.getAccountInfo(credentials);
    
    // Get positions
    const marketType = searchParams.get('marketType') || 'linear';
    const symbol = searchParams.get('symbol') || undefined;
    const positionsResponse = await bybitTradingService.getPositions(
      credentials, 
      marketType as any,
      symbol
    );
    
    // Get open orders
    const ordersResponse = await bybitTradingService.getOpenOrders(
      credentials,
      marketType as any,
      symbol
    );
    
    // Combine all responses
    return NextResponse.json({
      account: accountResponse.data || null,
      positions: positionsResponse.data?.list || [],
      orders: ordersResponse.data?.list || [],
      errors: {
        account: accountResponse.error,
        positions: positionsResponse.error,
        orders: ordersResponse.error
      }
    });
  } catch (error) {
    console.error('Error fetching account info:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
