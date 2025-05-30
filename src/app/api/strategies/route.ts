import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { type Database } from '@/types/database.types';

type TradingStrategy = Database['public']['Tables']['trading_strategies']['Row'];

export async function GET(request: NextRequest) { // Using NextRequest for consistency
  const supabase = createServerClient();

  // 1. Authentication (as per requirement, can be relaxed later if needed)
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('GET /api/strategies: Authentication error', authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Fetch Trading Strategies
    const { data: strategies, error: fetchError } = await supabase
      .from('trading_strategies')
      .select('strategy_id, name, description, parameters_schema, created_at, updated_at') // Select relevant columns
      .order('name', { ascending: true }); // Order by name

    if (fetchError) {
      console.error('GET /api/strategies: Error fetching trading strategies', fetchError);
      return NextResponse.json({ error: 'Failed to fetch trading strategies', details: fetchError.message }, { status: 500 });
    }

    // 3. Response
    // If strategies is null (should not happen with a non-erroring query returning an array), default to empty array.
    return NextResponse.json(strategies || [] as TradingStrategy[], { status: 200 });

  } catch (error: any) {
    console.error('GET /api/strategies: Unhandled error', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
