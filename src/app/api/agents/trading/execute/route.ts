import { NextRequest, NextResponse } from 'next/server';
import { TradingManager } from '@/lib/trading/trading-manager';
import supabaseService from '@/lib/services/supabase-service';
import { checkAuth } from '@/lib/auth/checkAuth';

// API key authentication for agent requests


// Initialize trading manager
const tradingManager = new TradingManager();

export async function POST(req: NextRequest) {
  try {
    const session = await checkAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      agentId, 
      symbol, 
      side, 
      quantity, 
      orderType = 'limit',
      price,
      strategy,
      reasoning,
      confidence,
      exchange = 'hyperliquid'
    } = body;

    // Validate required fields
    if (!agentId || !symbol || !side || !quantity) {
      return NextResponse.json({ 
        error: 'Missing required fields: agentId, symbol, side, quantity' 
      }, { status: 400 });
    }

    // Check agent permissions from Supabase
    const agent = await supabaseService.getAgentTradingPermission(agentId).catch(() => null);
    if (!agent || !agent.is_active) {
      return NextResponse.json({
        error: 'Agent not registered or inactive'
      }, { status: 403 });
    }

    // Validate permissions
    const validationErrors = [];
    
    // Check symbol permission
    if (!agent.allowed_symbols.includes(symbol)) {
      validationErrors.push(`Symbol ${symbol} not allowed for agent`);
    }
    
    // Check strategy permission
    if (strategy && !agent.allowed_strategies.includes(strategy)) {
      validationErrors.push(`Strategy ${strategy} not allowed for agent`);
    }
    
    // Check trade size
    const tradeValue = quantity * (price || 0);
    if (tradeValue > agent.max_trade_size) {
      validationErrors.push(`Trade size ${tradeValue} exceeds max ${agent.max_trade_size}`);
    }
    
    // Check daily trade limit
    if (agent.trades_today >= agent.max_daily_trades) {
      validationErrors.push(`Daily trade limit reached: ${agent.max_daily_trades}`);
    }
    
    // Check position size
    const newPositionValue = agent.position_value + (side === 'buy' ? tradeValue : -tradeValue);
    if (Math.abs(newPositionValue) > agent.max_position_size) {
      validationErrors.push(`Position size would exceed max ${agent.max_position_size}`);
    }
    
    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: 'Trade validation failed', 
        details: validationErrors 
      }, { status: 400 });
    }

    // Execute trade through trading manager
    try {
      const tradeParams = {
        symbol,
        side,
        type: orderType,
        quantity,
        price,
        agentId,
        strategy,
        reasoning
      };
      
      const result = await tradingManager.placeOrder(tradeParams, exchange);
      
      // Record trade in Supabase
      const trade = await supabaseService.createAgentTrade({
        agent_id: agentId,
        user_id: session.user.id,
        symbol,
        side,
        quantity,
        price: result.price || price || 0,
        order_type: orderType,
        strategy,
        reasoning,
        confidence_score: confidence,
        status: result.status,
        exchange,
        order_id: result.orderId
      });

      // Update agent stats in Supabase
      await supabaseService.updateAgentTradingPermission(agentId, {
        trades_today: agent.trades_today + 1,
        position_value: newPositionValue
      });
      
      return NextResponse.json({
        success: true,
        trade: {
          orderId: trade.order_id,
          status: trade.status,
          executedPrice: trade.price,
          executedQuantity: trade.quantity,
          timestamp: trade.created_at
        }
      });
      
    } catch (error) {
      console.error('Trade execution error:', error);
      return NextResponse.json({ 
        error: 'Failed to execute trade',
        details: error.message 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Agent trading error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
