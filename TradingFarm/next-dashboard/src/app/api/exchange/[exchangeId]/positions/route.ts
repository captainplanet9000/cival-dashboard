import { NextRequest, NextResponse } from 'next/server';
import { exchangeService } from '@/utils/exchange/exchange-service';
import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
  req: NextRequest,
  { params }: { params: { exchangeId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient();
    const { exchangeId } = params;
    
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const symbol = searchParams.get('symbol') || undefined;
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if exchange exists and belongs to the user
    const { data: configData, error: configError } = await supabase
      .from('exchange_configs')
      .select('id')
      .eq('id', exchangeId)
      .eq('user_id', session.user.id)
      .single();
    
    if (configError || !configData) {
      return NextResponse.json(
        { error: 'Exchange not found or not owned by the current user' },
        { status: 404 }
      );
    }
    
    // Check if exchange is connected
    if (!exchangeService.isExchangeConnected(exchangeId)) {
      return NextResponse.json({ error: 'Exchange not connected' }, { status: 400 });
    }
    
    // Get positions
    const positions = await exchangeService.getPositions(exchangeId, symbol);
    
    return NextResponse.json({ success: true, data: positions });
  } catch (error) {
    console.error('Exchange positions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
