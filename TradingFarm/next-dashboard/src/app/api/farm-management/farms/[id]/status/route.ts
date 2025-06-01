import { NextRequest, NextResponse } from 'next/server';
import neonFarmClient from '@/utils/database/neon-farm-client';

interface Params {
  params: {
    id: string;
  };
}

/**
 * Updates the status of a specific farm
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const farmId = params.id;
    
    if (!farmId) {
      return NextResponse.json(
        { error: 'Missing farm ID in the request path' },
        { status: 400 }
      );
    }
    
    const data = await request.json();
    
    if (!data.status) {
      return NextResponse.json(
        { error: 'Missing status field in request body' },
        { status: 400 }
      );
    }
    
    // Validate status value
    const validStatuses = ['active', 'paused', 'offline', 'maintenance', 'error'];
    if (!validStatuses.includes(data.status)) {
      return NextResponse.json(
        { error: `Invalid status value. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Update the farm status
    const updated = await neonFarmClient.updateFarmStatus(farmId, data.status);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Farm not found or status not updated' },
        { status: 404 }
      );
    }
    
    // Get the updated farm
    const farm = await neonFarmClient.getFarmById(farmId);
    
    return NextResponse.json({ 
      success: true,
      farm
    });
  } catch (error) {
    console.error('Error updating farm status:', error);
    return NextResponse.json(
      { error: 'Failed to update farm status' },
      { status: 500 }
    );
  }
}
