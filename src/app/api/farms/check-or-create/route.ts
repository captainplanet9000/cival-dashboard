// Remove direct supabase client import
// import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { FarmApi } from '@/lib/api/farms'; // Import the FarmApi
import { FarmSettings } from '@/types/database-json.types';

// Assuming authentication/owner ID is handled upstream (e.g., middleware)
// We'll simulate getting ownerId here
const getOwnerId = async (): Promise<string> => {
  // Replace with actual authentication logic to get user/owner ID
  return 'simulated-owner-uuid';
};

export async function POST(request: Request) {
  try {
    const ownerId = await getOwnerId();
    const body = await request.json();

    const { name, description, settings } = body;

    if (!name) {
      return NextResponse.json({ error: 'Farm name is required' }, { status: 400 });
    }

    // TODO: Add validation for the settings object structure if needed
    const farmDetails = {
        name,
        description: description || null,
        settings: settings as FarmSettings | undefined // Cast input settings
    };

    // Call the API layer method
    const farm = await FarmApi.checkOrCreateFarm(ownerId, farmDetails);

    return NextResponse.json(farm);

  } catch (error: any) {
    console.error('[CheckOrCreateFarm API Route] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
} 