import { NextResponse } from 'next/server';
import { farmService } from '../../../../data-access/services';

interface RouteParams {
  params: {
    id: string;
  }
}

/**
 * GET /api/farms/[id]
 * Returns a specific farm by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const farmId = Number(id);
    
    if (isNaN(farmId)) {
      return NextResponse.json(
        { error: 'Invalid farm ID' },
        { status: 400 }
      );
    }
    
    const farm = await farmService.getFarmWithRelations(farmId);
    
    if (!farm) {
      return NextResponse.json(
        { error: 'Farm not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data: farm });
  } catch (error) {
    console.error(`Error fetching farm ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch farm' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/farms/[id]
 * Updates a specific farm
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const farmId = Number(id);
    const farmData = await request.json();
    
    if (isNaN(farmId)) {
      return NextResponse.json(
        { error: 'Invalid farm ID' },
        { status: 400 }
      );
    }
    
    const updatedFarm = await farmService.update(farmId, farmData);
    
    if (!updatedFarm) {
      return NextResponse.json(
        { error: 'Farm not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data: updatedFarm });
  } catch (error) {
    console.error(`Error updating farm ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update farm' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/farms/[id]
 * Deletes a specific farm
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const farmId = Number(id);
    
    if (isNaN(farmId)) {
      return NextResponse.json(
        { error: 'Invalid farm ID' },
        { status: 400 }
      );
    }
    
    const success = await farmService.delete(farmId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Farm not found or could not be deleted' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: true, message: 'Farm deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error deleting farm ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete farm' },
      { status: 500 }
    );
  }
} 