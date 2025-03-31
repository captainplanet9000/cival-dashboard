import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Generate mock trade data
    const generateMockTrades = (count: number, farmId?: string) => {
      const trades = [];
      const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD', 'ADA/USD'];
      const exchanges = ['Binance', 'Coinbase', 'Kraken', 'OKX'];
      const strategies = ['Momentum', 'Mean Reversion', 'Arbitrage', 'Grid', 'DCA'];
      
      // Parse start date or default to 30 days ago
      const start = startDate 
        ? new Date(startDate).getTime() 
        : Date.now() - 30 * 24 * 60 * 60 * 1000;
      
      // Parse end date or default to now
      const end = endDate 
        ? new Date(endDate).getTime() 
        : Date.now();
      
      for (let i = 0; i < count; i++) {
        const tradeTime = start + Math.random() * (end - start);
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const price = symbol.includes('BTC') 
          ? 50000 + (Math.random() * 10000)
          : symbol.includes('ETH')
            ? 3000 + (Math.random() * 500)
            : 10 + (Math.random() * 100);
            
        const size = symbol.includes('BTC') 
          ? 0.1 + (Math.random() * 0.5)
          : symbol.includes('ETH')
            ? 1 + (Math.random() * 5)
            : 10 + (Math.random() * 50);
            
        const fee = price * size * 0.001;
        const pnl = (side === 'buy' ? 1 : -1) * (Math.random() > 0.65 ? 1 : -1) * (price * size * (0.01 + Math.random() * 0.05));
        
        trades.push({
          id: `trade-${Date.now()}-${i}`,
          farmId: farmId || `farm-${Math.floor(Math.random() * 3) + 1}`,
          symbol,
          side,
          type: Math.random() > 0.3 ? 'market' : 'limit',
          price: parseFloat(price.toFixed(2)),
          size: parseFloat(size.toFixed(6)),
          value: parseFloat((price * size).toFixed(2)),
          fee: parseFloat(fee.toFixed(2)),
          pnl: parseFloat(pnl.toFixed(2)),
          pnlPercent: parseFloat((pnl / (price * size) * 100).toFixed(2)),
          timestamp: new Date(tradeTime).toISOString(),
          status: 'filled',
          exchange: exchanges[Math.floor(Math.random() * exchanges.length)],
          strategy: strategies[Math.floor(Math.random() * strategies.length)],
          // ElizaOS-specific fields for AI-driven trades
          elizaOS: Math.random() > 0.5 ? {
            agentId: `agent-${Math.floor(Math.random() * 3) + 1}`,
            reasoning: "Pattern detected based on momentum indicators and market sentiment analysis",
            confidence: parseFloat((0.65 + (Math.random() * 0.3)).toFixed(2)),
            model: Math.random() > 0.5 ? 'gpt-4' : 'claude-3',
            analysisTime: parseFloat((0.5 + (Math.random() * 2)).toFixed(1))
          } : null
        });
      }
      
      // Sort by timestamp descending (newest first)
      return trades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };
    
    const trades = generateMockTrades(limit + offset, farmId || undefined);
    
    // Apply pagination
    const paginatedTrades = trades.slice(offset, offset + limit);
    
    // Return the response with proper metadata
    return NextResponse.json({
      trades: paginatedTrades,
      total: farmId ? trades.length : 1000, // Mock a larger dataset
      limit,
      offset,
      hasMore: farmId ? (offset + limit < trades.length) : (offset + limit < 1000)
    });
  } catch (error) {
    console.error('Trades API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades data' },
      { status: 500 }
    );
  }
}
