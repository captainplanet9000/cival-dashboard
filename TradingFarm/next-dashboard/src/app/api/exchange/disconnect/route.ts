import { NextRequest, NextResponse } from 'next/server';
import { exchangeService } from '@/utils/exchange/exchange-service';
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
    
    // Disconnect exchange
    await exchangeService.disconnectExchange(exchangeId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Exchange disconnect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
