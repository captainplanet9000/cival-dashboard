// TradingFarm/next-dashboard/src/app/api/farms/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { z } from 'zod';

const farmSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  risk_parameters: z.object({
    max_drawdown: z.number().min(0).max(100),
    daily_loss_limit: z.number().min(0),
    position_size_limit: z.number().min(0)
  }),
  capital_allocation: z.number().min(0),
  active: z.boolean().default(true)
});

/**
 * GET /api/farms
 * Get all farms for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('id');

    if (farmId) {
      // Get single farm
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .eq('id', farmId)
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    // List all farms
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching farms:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch farms' },
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
    const supabase = await createServerClient();
    const json = await request.json();

    // Validate farm data
    const validationResult = farmSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid farm data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const farmData = validationResult.data;

    // Create farm
    const { data, error } = await supabase
      .from('farms')
      .insert(farmData)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating farm:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create farm' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/farms
 * Update a farm
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { id, ...updateData } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Farm ID is required' },
        { status: 400 }
      );
    }

    // Validate update data
    const validationResult = farmSchema.partial().safeParse(updateData);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid farm data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Update farm
    const { data, error } = await supabase
      .from('farms')
      .update(validationResult.data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating farm:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update farm' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/farms
 * Delete a farm
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Farm ID is required' },
        { status: 400 }
      );
    }

    // Soft delete farm
    const { data, error } = await supabase
      .from('farms')
      .update({ active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error deleting farm:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete farm' },
      { status: 500 }
    );
  }
}
