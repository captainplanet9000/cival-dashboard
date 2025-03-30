import { NextResponse } from 'next/server';
import { farmService } from '../../../data-access/services';

/**
 * GET /api/farms
 * Returns a list of farms, optionally filtered by owner ID
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');
    
    let farms;
    if (ownerId) {
      farms = await farmService.findByOwnerId(Number(ownerId));
    } else {
      farms = await farmService.findAll();
    }
    
    return NextResponse.json({ data: farms });
  } catch (error) {
    console.error('Error fetching farms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch farms' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/farms
 * Creates a new farm
 */
export async function POST(request: Request) {
  try {
    const farmData = await request.json();
    
    // Add validation here if needed
    if (!farmData.name) {
      return NextResponse.json(
        { error: 'Farm name is required' },
        { status: 400 }
      );
    }
    
    const newFarm = await farmService.create(farmData);
    
    return NextResponse.json({ data: newFarm }, { status: 201 });
  } catch (error) {
    console.error('Error creating farm:', error);
    return NextResponse.json(
      { error: 'Failed to create farm' },
      { status: 500 }
    );
  }
} 