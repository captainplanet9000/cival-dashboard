/**
 * Trading API Routes
 * Provides a bridge between AI agents and exchange functionality
 */
import { NextRequest, NextResponse } from 'next/server';
import { mockExchange, createExchangeConnector } from '@/utils/trading/exchange-connector';
import neonClient from '@/utils/database/neon-client';

// Connect the mock exchange by default
mockExchange.connect();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (!action) {
      return NextResponse.json(
        { error: 'Missing action parameter' },
        { status: 400 }
      );
    }
    
    switch (action) {
      case 'symbols': {
        const symbols = await mockExchange.getSymbols();
        return NextResponse.json(symbols);
      }
      
      case 'ticker': {
        const symbol = searchParams.get('symbol');
        if (!symbol) {
          return NextResponse.json(
            { error: 'Missing symbol parameter' },
            { status: 400 }
          );
        }
        
        const ticker = await mockExchange.getTicker(symbol);
        return NextResponse.json(ticker);
      }
      
      case 'account': {
        const account = await mockExchange.getAccountInfo();
        return NextResponse.json(account);
      }
      
      case 'open-orders': {
        const symbol = searchParams.get('symbol');
        const orders = await mockExchange.getOpenOrders(symbol || undefined);
        return NextResponse.json(orders);
      }
      
      case 'order-history': {
        const symbol = searchParams.get('symbol');
        const limit = searchParams.get('limit');
        const orders = await mockExchange.getOrderHistory(
          symbol || undefined, 
          limit ? parseInt(limit, 10) : undefined
        );
        return NextResponse.json(orders);
      }
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in trading API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { action } = data;
    
    if (!action) {
      return NextResponse.json(
        { error: 'Missing action field' },
        { status: 400 }
      );
    }
    
    switch (action) {
      case 'place-order': {
        const { agentId, symbol, type, side, price, stopPrice, quantity } = data;
        
        if (!agentId || !symbol || !type || !side || !quantity) {
          return NextResponse.json(
            { error: 'Missing required order parameters' },
            { status: 400 }
          );
        }
        
        // Get agent to verify it exists
        const agent = await neonClient.getAgent(agentId);
        if (!agent) {
          return NextResponse.json(
            { error: `Agent with ID ${agentId} not found` },
            { status: 404 }
          );
        }
        
        // Place order on exchange
        const order = await mockExchange.placeOrder({
          symbol,
          type,
          side,
          price,
          stopPrice,
          quantity,
          clientOrderId: `agent-${agentId}-${Date.now()}`
        });
        
        // Record the trade in the database
        try {
          const ticker = await mockExchange.getTicker(symbol);
          
          await neonClient.createAgentTrade({
            agent_id: agentId,
            symbol,
            entry_price: order.price || ticker.price,
            quantity: order.quantity,
            direction: side === 'buy' ? 'long' : 'short',
            status: order.status === 'filled' ? 'closed' : 'open',
            profit_loss: order.status === 'filled' ? 0 : undefined,
            profit_loss_percentage: order.status === 'filled' ? 0 : undefined,
            entry_time: new Date(order.timestamp).toISOString(),
            exit_time: order.status === 'filled' ? new Date().toISOString() : undefined,
            strategy_used: data.strategy || 'manual',
            trade_tags: data.tags || []
          });
        } catch (dbError) {
          console.error('Error recording trade in database:', dbError);
          // Continue with order placement even if record creation fails
        }
        
        return NextResponse.json(order);
      }
      
      case 'cancel-order': {
        const { orderId, symbol } = data;
        
        if (!orderId || !symbol) {
          return NextResponse.json(
            { error: 'Missing orderId or symbol parameter' },
            { status: 400 }
          );
        }
        
        const success = await mockExchange.cancelOrder(orderId, symbol);
        return NextResponse.json({ success });
      }
      
      case 'mcp-trading-command': {
        // Handle Model Context Protocol commands for trading
        const { command, parameters, agentId } = data;
        
        if (!command || !agentId) {
          return NextResponse.json(
            { error: 'Missing command or agentId' },
            { status: 400 }
          );
        }
        
        // Get agent to verify it exists
        const agent = await neonClient.getAgent(agentId);
        if (!agent) {
          return NextResponse.json(
            { error: `Agent with ID ${agentId} not found` },
            { status: 404 }
          );
        }
        
        let result;
        
        switch (command) {
          case 'market_analysis': {
            const { symbol, timeframe } = parameters || {};
            if (!symbol) {
              return NextResponse.json(
                { error: 'Missing symbol parameter for market analysis' },
                { status: 400 }
              );
            }
            
            // Simulate market analysis with mock data
            const ticker = await mockExchange.getTicker(symbol);
            const sentiment = Math.random() > 0.5 ? 'bullish' : 'bearish';
            const strength = Math.floor(Math.random() * 100);
            
            result = {
              symbol,
              price: ticker.price,
              timestamp: ticker.timestamp,
              sentiment,
              sentiment_strength: strength,
              timeframe: timeframe || '1h',
              indicators: {
                rsi: Math.floor(Math.random() * 100),
                macd: {
                  value: (Math.random() * 2 - 1) * 10,
                  signal: (Math.random() * 2 - 1) * 10,
                  histogram: (Math.random() * 2 - 1) * 5
                },
                moving_averages: {
                  ma_20: ticker.price * (1 + (Math.random() * 0.1 - 0.05)),
                  ma_50: ticker.price * (1 + (Math.random() * 0.2 - 0.1)),
                  ma_200: ticker.price * (1 + (Math.random() * 0.3 - 0.15))
                }
              },
              recommendation: sentiment === 'bullish' ? 'buy' : 'sell'
            };
            break;
          }
          
          case 'generate_trading_signals': {
            const { symbols, strategy } = parameters || {};
            if (!symbols || !Array.isArray(symbols)) {
              return NextResponse.json(
                { error: 'Missing or invalid symbols parameter for signal generation' },
                { status: 400 }
              );
            }
            
            // Generate simulated trading signals
            const signals = [];
            for (const symbol of symbols) {
              const ticker = await mockExchange.getTicker(symbol);
              const signalType = Math.random() > 0.7 ? 'buy' : (Math.random() > 0.5 ? 'sell' : 'neutral');
              
              signals.push({
                symbol,
                price: ticker.price,
                signal: signalType,
                confidence: Math.round(Math.random() * 100),
                timestamp: new Date().toISOString(),
                strategy: strategy || 'default',
                explanation: `Signal generated based on ${strategy || 'default'} strategy analysis`
              });
            }
            
            result = { signals };
            break;
          }
          
          case 'portfolio_allocation': {
            const { risk_level, target_assets } = parameters || {};
            
            // Calculate total portfolio value
            const accountInfo = await mockExchange.getAccountInfo();
            const totalValue = await Object.entries(accountInfo.balances).reduce(
              async (sumPromise, [currency, balance]) => {
                const sum = await sumPromise;
                
                if (currency === 'USDT' || currency === 'USD') {
                  return sum + balance.total;
                }
                
                // Get price for non-stablecoin assets
                try {
                  const ticker = await mockExchange.getTicker(`${currency}/USDT`);
                  return sum + balance.total * ticker.price;
                } catch {
                  return sum;
                }
              }, 
              Promise.resolve(0)
            );
            
            const riskFactor = risk_level === 'high' ? 0.8 : 
                               risk_level === 'medium' ? 0.5 : 0.3;
            
            const allocation: Record<string, number> = {};
            const assets = target_assets || ['BTC', 'ETH', 'SOL', 'USDT'];
            
            // Allocate stablecoins based on risk
            allocation['USDT'] = (1 - riskFactor) * 100;
            
            // Distribute remaining percentage among assets
            const remainingPercent = riskFactor * 100;
            const assetsExcludingStable = assets.filter((a: string) => a !== 'USDT' && a !== 'USD');
            
            assetsExcludingStable.forEach((asset: string, index: number) => {
              // Weighted allocation, favoring earlier assets
              const weight = (assetsExcludingStable.length - index) / 
                             ((assetsExcludingStable.length * (assetsExcludingStable.length + 1)) / 2);
              allocation[asset] = remainingPercent * weight;
            });
            
            result = {
              total_portfolio_value: totalValue,
              risk_level: risk_level || 'medium',
              allocation
            };
            break;
          }
          
          default:
            return NextResponse.json(
              { error: `Unknown trading command: ${command}` },
              { status: 400 }
            );
        }
        
        return NextResponse.json(result);
      }
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in trading API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
