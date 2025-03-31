import { NextRequest, NextResponse } from 'next/server';
import { PineScriptService } from '../../../../services/pinescript-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

/**
 * POST /api/strategies/pinescript
 * 
 * Import a PineScript strategy
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.code || !body.name) {
      return NextResponse.json(
        { error: 'Required fields missing: code, name' },
        { status: 400 }
      );
    }
    
    const pineScriptService = new PineScriptService();
    
    // Import the strategy
    const strategyId = await pineScriptService.importStrategy(
      body.code,
      body.name,
      body.description || '',
      body.farmId
    );
    
    // Return the created strategy ID
    return NextResponse.json(
      { 
        success: true, 
        strategyId,
        message: 'Strategy imported successfully' 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error importing PineScript strategy:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to import strategy',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/strategies/pinescript
 * 
 * Get all PineScript strategies
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('active') === 'true';
    
    const pineScriptService = new PineScriptService();
    const repo = pineScriptService['strategyRepo'];
    
    // Get strategies
    const strategies = await repo.getByType('pinescript', isActive);
    
    return NextResponse.json({ strategies });
  } catch (error: any) {
    console.error('Error fetching PineScript strategies:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch strategies',
        details: error.message
      },
      { status: 500 }
    );
  }
} 