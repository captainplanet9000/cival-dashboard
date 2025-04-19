import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { TradingEngine } from '@/core/trading-engine';
import { ExchangeFactory } from '@/utils/exchanges/exchange-factory';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { engineConfig, orderRequest } = body;
    // Instantiate exchange adapter
    const adapter = ExchangeFactory.getAdapter(engineConfig.exchangeId);
    // Create and initialize trading engine
    const engine = new TradingEngine(adapter, engineConfig);
    const initialized = await engine.initialize();
    if (!initialized) {
      return NextResponse.json({ error: 'Failed to initialize trading engine' }, { status: 500 });
    }
    // Execute order
    const result = await engine.executeOrder(orderRequest);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
