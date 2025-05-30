import { NextRequest, NextResponse } from 'next/server';
import { exchangeService } from '@/utils/exchange/exchange-service';
import { getExchangeCredentials } from '@/utils/exchange/exchange-credentials-service';
import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const { exchangeId } = await req.json();
    if (!exchangeId) {
      return NextResponse.json({ error: 'Exchange ID is required' }, { status: 400 });
    }
    
    // Get exchange configuration
    const { data: configData, error: configError } = await supabase
      .from('exchange_configs')
      .select('*')
      .eq('id', exchangeId)
      .eq('user_id', session.user.id)
      .single();
    
    if (configError || !configData) {
      return NextResponse.json(
        { error: configError?.message || 'Exchange configuration not found' },
        { status: 404 }
      );
    }
    
    // Initialize exchange
    const success = await exchangeService.initializeExchange({
      id: configData.id,
      exchange: configData.exchange,
      name: configData.name,
      testnet: configData.testnet,
      active: configData.active
    });
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to initialize exchange' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Exchange connect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
