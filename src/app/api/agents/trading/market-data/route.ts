import { NextRequest, NextResponse } from 'next/server';
import { TradingManager } from '@/lib/trading/trading-manager';
import {
  createMarketDataSubscription,
  cancelMarketDataSubscription,
  getAgentPermissions
} from '@/lib/agents/agent-trading-service';
import { checkAuth } from '@/lib/auth/checkAuth';

// API key authentication for agent requests

// Initialize trading manager
const tradingManager = new TradingManager();

export async function GET(req: NextRequest) {
  try {
    const session = await checkAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    const interval = searchParams.get('interval') || '1m';
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }
    
    // Get market data from trading manager
    try {
      const marketData = await tradingManager.getMarketData(symbol, interval, limit);
      
      return NextResponse.json({
        symbol,
        interval,
        candles: marketData.candles || [],
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error fetching market data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch market data', details: error.message }, 
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error processing market data request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Endpoint for market data subscriptions
export async function POST(req: NextRequest) {
  try {
    const session = await checkAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    // Handle subscription registration
    if (body.action === 'subscribe') {
      const { symbol, interval, agentId, subscriptionId } = body;
      
      if (!symbol || !agentId) {
        return NextResponse.json({ 
          error: 'Symbol and agentId are required' 
        }, { status: 400 });
      }
      
      // Check if agent exists and is owned by user
      const agent = await getAgentPermissions(agentId);
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      
      if (agent.accountId !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      
      // Create subscription using shared service
      const subscription = await createMarketDataSubscription({
        agentId,
        userId: session.user.id,
        symbol,
        interval: interval || '1m'
      });
      
      console.log(`Created market data subscription: ${subscription.id} for ${symbol}`);
      
      return NextResponse.json({
        subscriptionId: subscription.id,
        symbol,
        interval: subscription.interval,
        status: 'active'
      });
    }
    
    // Handle subscription cancellation
    if (body.action === 'unsubscribe') {
      const { subscriptionId } = body;
      
      if (!subscriptionId) {
        return NextResponse.json({ 
          error: 'Subscription ID is required' 
        }, { status: 400 });
      }
      
      // Cancel subscription using shared service
      const result = await cancelMarketDataSubscription(subscriptionId);
      
      if (!result) {
        return NextResponse.json({ 
          error: 'Subscription not found' 
        }, { status: 404 });
      }
      
      console.log(`Cancelled market data subscription: ${subscriptionId}`);
      
      return NextResponse.json({
        subscriptionId,
        status: 'cancelled'
      });
    }
    
    return NextResponse.json({ 
      error: 'Invalid action' 
    }, { status: 400 });
    
  } catch (error) {
    console.error('Error processing market data subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}