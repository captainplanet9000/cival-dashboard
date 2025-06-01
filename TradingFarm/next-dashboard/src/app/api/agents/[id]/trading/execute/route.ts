import { createServerClient } from '@/utils/supabase/server';
import { bybitTradingService, TradeRequest } from '@/services/bybit-trading-service';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/agents/[id]/trading/execute
 * 
 * Execute a trade on behalf of an agent
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    
    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }
    
    // Get request body
    const {
      exchangeId,
      tradeRequest,
      risk_management = {}
    } = await req.json();
    
    // Validate request
    if (!exchangeId) {
      return NextResponse.json(
        { error: 'Exchange ID is required' },
        { status: 400 }
      );
    }
    
    if (!tradeRequest || !tradeRequest.symbol || !tradeRequest.side || !tradeRequest.quantity) {
      return NextResponse.json(
        { error: 'Trade parameters are required (symbol, side, quantity)' },
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
      .select('id, name, tools_config, trading_permissions, farm_id')
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
    
    // Check if agent has trading permissions
    const tradingPerms = agent.trading_permissions || {};
    const hasPermissions = tradingPerms.enabled !== false; // Default to true if not set
    
    if (!hasPermissions) {
      return NextResponse.json(
        { error: 'Agent does not have trading permissions enabled' },
        { status: 403 }
      );
    }
    
    // Check position size limits
    if (tradingPerms.max_position_size && tradeRequest.quantity > tradingPerms.max_position_size) {
      return NextResponse.json(
        { error: `Position size exceeds maximum allowed (${tradingPerms.max_position_size})` },
        { status: 400 }
      );
    }
    
    // Apply risk management if configured (modify the trade request)
    const modifiedRequest = { ...tradeRequest };
    
    if (risk_management.use_stop_loss === true && risk_management.stop_loss_percent) {
      const stopLossPercent = parseFloat(risk_management.stop_loss_percent);
      
      // Calculate stop loss price based on entry price and direction
      if (modifiedRequest.price) { // For limit orders
        const entryPrice = parseFloat(modifiedRequest.price.toString());
        modifiedRequest.stopLoss = modifiedRequest.side === 'Buy'
          ? entryPrice * (1 - stopLossPercent / 100)
          : entryPrice * (1 + stopLossPercent / 100);
      } else {
        // For market orders, we'll need the current price
        // We could get it from the ticker endpoint, but for simplicity we'll skip
        // this for now and rely on price being provided in the request
      }
    }
    
    if (risk_management.use_take_profit === true && risk_management.take_profit_percent) {
      const takeProfitPercent = parseFloat(risk_management.take_profit_percent);
      
      // Calculate take profit price based on entry price and direction
      if (modifiedRequest.price) { // For limit orders
        const entryPrice = parseFloat(modifiedRequest.price.toString());
        modifiedRequest.takeProfit = modifiedRequest.side === 'Buy'
          ? entryPrice * (1 + takeProfitPercent / 100)
          : entryPrice * (1 - takeProfitPercent / 100);
      }
    }
    
    // Execute the trade
    const response = await bybitTradingService.placeTrade(credentials, modifiedRequest);
    
    if (response.error || !response.data) {
      return NextResponse.json(
        { error: response.error || 'Failed to execute trade' },
        { status: 500 }
      );
    }
    
    // Log the trade in the database
    const tradeId = uuidv4();
    const { error: logError } = await supabase
      .from('agent_trades')
      .insert({
        id: tradeId,
        agent_id: agentId,
        exchange_id: exchangeId,
        symbol: tradeRequest.symbol,
        side: tradeRequest.side,
        order_type: tradeRequest.orderType,
        quantity: tradeRequest.quantity,
        price: tradeRequest.price,
        order_id: response.data.orderId,
        order_link_id: response.data.orderLinkId,
        status: response.data.orderStatus,
        market_type: tradeRequest.marketType || 'linear',
        stop_loss: modifiedRequest.stopLoss,
        take_profit: modifiedRequest.takeProfit,
        risk_management: risk_management,
        metadata: {
          exchange_response: response.data,
          trade_request: tradeRequest
        }
      });
    
    if (logError) {
      console.error('Failed to log trade:', logError);
      // Don't return an error here, as the trade was already executed
    }
    
    // Return success with trade details
    return NextResponse.json({
      success: true,
      trade: response.data,
      trade_id: tradeId
    });
  } catch (error) {
    console.error('Error executing trade:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
