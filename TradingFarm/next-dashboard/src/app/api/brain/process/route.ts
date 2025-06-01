import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { processBrainAsset } from '@/utils/brain/ingestion-pipeline';

export async function POST(req: NextRequest) {
  try {
    // Create Supabase server client
    const supabase = createServerClient();
    
    // Get the session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Please login first' },
        { status: 401 }
      );
    }
    
    // Get asset ID from request body
    const { assetId } = await req.json();
    
    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      );
    }
    
    // Process the asset
    const result = await processBrainAsset(assetId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to process asset' },
        { status: 500 }
      );
    }
    
    // Return success response
    return NextResponse.json({
      message: 'Asset processed successfully',
      assetId
    });
    
  } catch (error) {
    console.error('Asset processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error during asset processing' },
      { status: 500 }
    );
  }
}
