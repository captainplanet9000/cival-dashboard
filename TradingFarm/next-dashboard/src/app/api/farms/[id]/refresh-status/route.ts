import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/auth-helpers';

/**
 * POST /api/farms/:id/refresh-status
 * Manually refresh the farm status summary
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const farmId = params.id;

    if (!farmId) {
      return NextResponse.json(
        { error: "Farm ID is required" },
        { status: 400 }
      );
    }

    // Verify farm exists and user has access
    const supabase = await createServerClient();
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .eq('owner_id', user.id)
      .single();

    if (farmError || !farm) {
      return NextResponse.json(
        { error: "Farm not found or access denied" },
        { status: 404 }
      );
    }

    // Force refresh by calling the database trigger function
    await supabase.rpc('update_farm_status_summary', { farm_id: farmId });

    // Get the updated status summary
    const { data: updatedFarm, error: updateError } = await supabase
      .from('farms')
      .select('status_summary')
      .eq('id', farmId)
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to fetch updated status summary" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedFarm.status_summary });
  } catch (error) {
    console.error("Error refreshing farm status:", error);
    return NextResponse.json(
      { error: "Failed to refresh farm status" },
      { status: 500 }
    );
  }
}
