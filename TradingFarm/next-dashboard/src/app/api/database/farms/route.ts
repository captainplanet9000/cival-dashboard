/**
 * Server-side API for farm management operations
 * Provides endpoints for CRUD operations on farms
 */
import { NextRequest, NextResponse } from 'next/server';
import tradingFarmDb from '@/utils/database';

// GET - Retrieve all farms with performance metrics
export async function GET() {
  try {
    await tradingFarmDb.initialize();
    const farms = await tradingFarmDb.getFarms();
    
    // Add mock performance data for demonstration
    const farmsWithPerformance = farms.map(farm => ({
      ...farm,
      performance: parseFloat((Math.random() * 25 - 10).toFixed(2)),
      message_count: Math.floor(Math.random() * 1000),
      active_trades: Math.floor(Math.random() * 50)
    }));
    
    return NextResponse.json({
      success: true,
      data: farmsWithPerformance
    });
  } catch (error) {
    console.error('Failed to retrieve farms:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve farms',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// POST - Create a new farm
export async function POST(request: NextRequest) {
  try {
    await tradingFarmDb.initialize();
    const body = await request.json();
    
    // Validate request body
    if (!body.name || !body.boss_man_model) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: name and boss_man_model'
        },
        { status: 400 }
      );
    }
    
    // Create new farm
    const farm = await tradingFarmDb.createFarm({
      name: body.name,
      status: body.status || 'active',
      boss_man_model: body.boss_man_model
    });
    
    return NextResponse.json({
      success: true,
      data: farm
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create farm:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create farm',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
