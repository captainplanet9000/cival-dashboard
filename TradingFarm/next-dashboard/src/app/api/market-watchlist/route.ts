import { NextResponse } from 'next/server';
import { NextRequest } from '@/types/next-types';
import { createServerClient } from '@/utils/supabase/server';
import { z } from 'zod';

// Schema for validating watchlist item requests
const watchlistItemSchema = z.object({
  id: z.string().optional(),
  user_id: z.string(),
  symbol: z.string(),
  exchange: z.string(),
  is_favorite: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  alerts_config: z.any().optional(),
  last_price: z.number().nullable().optional(),
  last_update: z.string().nullable().optional(),
});

// Schema for validating list requests
const listRequestSchema = z.object({
  user_id: z.string(),
  include_prices: z.boolean().optional(),
  exchange_filter: z.string().optional(),
  favorites_only: z.boolean().optional(),
});

/**
 * Handle GET request for watchlist items
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const includePrices = searchParams.get('include_prices') === 'true';
    const exchangeFilter = searchParams.get('exchange_filter');
    const favoritesOnly = searchParams.get('favorites_only') === 'true';
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const supabase = createServerClient();
    
    // Build the query
    let query = supabase
      .from('market_watchlist')
      .select('*')
      .eq('user_id', userId);
    
    // Apply filters if provided
    if (exchangeFilter) {
      query = query.eq('exchange', exchangeFilter);
    }
    
    if (favoritesOnly) {
      query = query.eq('is_favorite', true);
    }
    
    // Ordering
    query = query.order('is_favorite', { ascending: false })
      .order('updated_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching watchlist items:', error);
      return NextResponse.json({ error: 'Failed to fetch watchlist items' }, { status: 500 });
    }
    
    // If we need to include latest prices, we would fetch them here
    // This is a placeholder for future implementation
    if (includePrices && data.length > 0) {
      // For Phase 1, we'll just return the data without updated prices
      // In Phase 2, we'll add real-time price updates
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in watchlist GET route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle POST request to create or update watchlist items
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const result = watchlistItemSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.format() }, { status: 400 });
    }
    
    const watchlistItem = result.data;
    const supabase = createServerClient();
    
    // If ID is provided, this is an update, otherwise it's a create
    if (watchlistItem.id) {
      const { data, error } = await supabase
        .from('market_watchlist')
        .update({
          symbol: watchlistItem.symbol,
          exchange: watchlistItem.exchange,
          is_favorite: watchlistItem.is_favorite,
          notes: watchlistItem.notes,
          alerts_config: watchlistItem.alerts_config,
          last_price: watchlistItem.last_price,
          last_update: watchlistItem.last_update,
          updated_at: new Date().toISOString()
        })
        .eq('id', watchlistItem.id)
        .eq('user_id', watchlistItem.user_id) // Ensure user can only update their own items
        .select();
      
      if (error) {
        console.error('Error updating watchlist item:', error);
        return NextResponse.json({ error: 'Failed to update watchlist item' }, { status: 500 });
      }
      
      return NextResponse.json({ data: data[0] });
    } else {
      // This is a create
      const { data, error } = await supabase
        .from('market_watchlist')
        .insert({
          user_id: watchlistItem.user_id,
          symbol: watchlistItem.symbol,
          exchange: watchlistItem.exchange,
          is_favorite: watchlistItem.is_favorite || false,
          notes: watchlistItem.notes,
          alerts_config: watchlistItem.alerts_config
        })
        .select();
      
      if (error) {
        console.error('Error creating watchlist item:', error);
        return NextResponse.json({ error: 'Failed to create watchlist item' }, { status: 500 });
      }
      
      return NextResponse.json({ data: data[0] });
    }
  } catch (error) {
    console.error('Error in watchlist POST route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle DELETE request to remove watchlist items
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('user_id');
    
    if (!id || !userId) {
      return NextResponse.json({ error: 'Item ID and User ID are required' }, { status: 400 });
    }
    
    const supabase = createServerClient();
    
    const { error } = await supabase
      .from('market_watchlist')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // Ensure user can only delete their own items
    
    if (error) {
      console.error('Error deleting watchlist item:', error);
      return NextResponse.json({ error: 'Failed to delete watchlist item' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in watchlist DELETE route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle PATCH request to update specific aspects of watchlist items
 * (e.g., toggling favorite status)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, user_id, ...updates } = body;
    
    if (!id || !user_id) {
      return NextResponse.json({ error: 'Item ID and User ID are required' }, { status: 400 });
    }
    
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('market_watchlist')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user_id) // Ensure user can only update their own items
      .select();
    
    if (error) {
      console.error('Error updating watchlist item:', error);
      return NextResponse.json({ error: 'Failed to update watchlist item' }, { status: 500 });
    }
    
    return NextResponse.json({ data: data[0] });
  } catch (error) {
    console.error('Error in watchlist PATCH route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
