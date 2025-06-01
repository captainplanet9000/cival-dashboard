import { NextRequest, NextResponse } from 'next/server';
import { storeExchangeCredentials, updateExchangeCredentials } from '@/utils/exchange/exchange-credentials-service';
import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { ExchangeCredentials } from '@/utils/exchange/types';

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
    const credentials: ExchangeCredentials = await req.json();
    
    // Validate user ID matches session
    if (credentials.user_id !== session.user.id) {
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 });
    }
    
    // Store credentials securely
    const exchangeId = await storeExchangeCredentials(credentials);
    
    // Create exchange config record
    const { error: configError } = await supabase
      .from('exchange_configs')
      .insert({
        id: exchangeId,
        user_id: session.user.id,
        name: credentials.name,
        exchange: credentials.exchange,
        testnet: credentials.testnet,
        active: true
      });
    
    if (configError) {
      console.error('Error creating exchange config:', configError);
      return NextResponse.json({ error: 'Failed to create exchange configuration' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, exchangeId });
  } catch (error) {
    console.error('Exchange credentials error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const credentials: ExchangeCredentials = await req.json();
    
    // Validate user ID matches session
    if (credentials.user_id !== session.user.id) {
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 });
    }
    
    // Ensure exchange ID is provided
    if (!credentials.id) {
      return NextResponse.json({ error: 'Exchange ID is required' }, { status: 400 });
    }
    
    // Update credentials securely
    await updateExchangeCredentials(credentials);
    
    // Update exchange config record
    const { error: configError } = await supabase
      .from('exchange_configs')
      .update({
        name: credentials.name,
        exchange: credentials.exchange,
        testnet: credentials.testnet,
        updated_at: new Date().toISOString()
      })
      .eq('id', credentials.id)
      .eq('user_id', session.user.id);
    
    if (configError) {
      console.error('Error updating exchange config:', configError);
      return NextResponse.json({ error: 'Failed to update exchange configuration' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Exchange credentials update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
