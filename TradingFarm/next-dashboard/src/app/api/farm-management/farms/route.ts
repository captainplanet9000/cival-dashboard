/**
 * API Routes for Farm Management
 * Provides CRUD operations for Trading Farm's farm management system
 */
import { NextRequest, NextResponse } from 'next/server';
import neonFarmClient from '@/utils/database/neon-farm-client';
import { mockFarms } from '@/utils/database/mock-farm-data';

export async function GET(request: NextRequest) {
  try {
    // Check if we're in development mode - prioritize mock data for faster development
    if (process.env.NODE_ENV === 'development') {
      // Simulate a slight delay to mimic network latency
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const { searchParams } = new URL(request.url);
      const farmId = searchParams.get('farmId');
      
      if (farmId) {
        // Get a specific farm from mock data
        const farm = mockFarms.find(f => f.id === farmId);
        
        if (!farm) {
          return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
        }
        
        return NextResponse.json(farm);
      }
      
      // Return all mock farms
      return NextResponse.json(mockFarms);
    }
    
    // Production mode - use real database
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    
    if (farmId) {
      try {
        // Get a specific farm
        const farm = await neonFarmClient.getFarmById(farmId);
        
        if (!farm) {
          return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
        }
        
        // Get agents if requested
        if (searchParams.get('includeAgents') === 'true') {
          try {
            const agents = await neonFarmClient.getAgentsByFarm(farmId);
            return NextResponse.json({ 
              ...farm, 
              agents_data: agents 
            });
          } catch (agentError) {
            console.error('Error fetching agents:', agentError);
            // Still return the farm data even if agents fetch fails
            return NextResponse.json({
              ...farm,
              agents_data: [],
              agents_error: 'Failed to fetch agents'
            });
          }
        }
        
        // Get resource history if requested
        if (searchParams.get('includeResourceHistory') === 'true') {
          try {
            const resourceHistory = await neonFarmClient.getFarmResourceHistory(farmId);
            return NextResponse.json({
              ...farm,
              resource_history: resourceHistory
            });
          } catch (historyError) {
            console.error('Error fetching resource history:', historyError);
            // Still return the farm data even if history fetch fails
            return NextResponse.json({
              ...farm,
              resource_history: [],
              history_error: 'Failed to fetch resource history'
            });
          }
        }
        
        return NextResponse.json(farm);
      } catch (farmError) {
        console.error('Error fetching specific farm:', farmError);
        // Provide a user-friendly error response
        return NextResponse.json(
          { error: 'Unable to retrieve farm details. Please try again later.' },
          { status: 500 }
        );
      }
    }
    
    // Get all farms with error handling
    try {
      const farms = await neonFarmClient.getAllFarms();
      return NextResponse.json(farms);
    } catch (farmsError) {
      console.error('Error fetching all farms:', farmsError);
      
      // In production, we should not expose internal errors to clients
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Unable to retrieve farms. Please try again later.' },
          { status: 500 }
        );
      } else {
        // In development, return mock data as fallback with warning
        console.warn('Falling back to mock data for farms');
        return NextResponse.json({
          farms: mockFarms,
          warning: 'Database connection failed. Using mock data instead.'
        });
      }
    }
  } catch (error) {
    console.error('Unexpected error in farms API route:', error);
    
    // Graceful error handling with fallback for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using mock data as fallback due to API error');
      return NextResponse.json({
        farms: mockFarms,
        warning: 'API error occurred. Using mock data instead.'
      });
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.status) {
      return NextResponse.json(
        { error: 'Missing required fields: name and status are required' },
        { status: 400 }
      );
    }
    
    // Create the farm
    const newFarm = await neonFarmClient.createFarm({
      name: data.name,
      status: data.status,
      performance: data.performance || 0,
      bossman: data.bossman || {
        model: 'ElizaOS-Basic',
        status: 'idle'
      },
      resources: data.resources || {
        cpu: 0,
        memory: 0,
        bandwidth: 0
      }
    });
    
    return NextResponse.json(newFarm, { status: 201 });
  } catch (error) {
    console.error('Error creating farm:', error);
    return NextResponse.json(
      { error: 'Failed to create farm' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.id) {
      return NextResponse.json(
        { error: 'Missing farm ID' },
        { status: 400 }
      );
    }
    
    // For now, we only support updating status
    if (!data.status) {
      return NextResponse.json(
        { error: 'Missing status field' },
        { status: 400 }
      );
    }
    
    const updated = await neonFarmClient.updateFarmStatus(data.id, data.status);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Farm not found or status not updated' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating farm:', error);
    return NextResponse.json(
      { error: 'Failed to update farm' },
      { status: 500 }
    );
  }
}
