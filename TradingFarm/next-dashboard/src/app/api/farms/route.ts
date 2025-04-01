import { createServerAdminClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/farms
 * Fetches all available farms
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerAdminClient();

    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching farms:', error);
      return NextResponse.json(
        { error: 'Failed to fetch farms', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/farms:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/farms
 * Create a new farm
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, user_id } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Farm name is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerAdminClient();

    const { data, error } = await supabase
      .from('farms')
      .insert({
        name,
        description,
        user_id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating farm:', error);
      return NextResponse.json(
        { error: 'Failed to create farm', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/farms:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
