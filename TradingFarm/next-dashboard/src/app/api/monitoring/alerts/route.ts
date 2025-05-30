import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { AlertManagementService, TradingAlert } from '@/services/monitoring/alert-management-service';

/**
 * GET /api/monitoring/alerts
 * Fetch alerts with optional filtering
 */
export async function GET(request: Request) {
  try {
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Get authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const strategyId = searchParams.get('strategyId');
    const agentId = searchParams.get('agentId');
    const exchange = searchParams.get('exchange');
    const level = searchParams.get('level');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;
    
    // Fetch alerts
    const alerts = await AlertManagementService.getAlerts(
      session.user.id,
      {
        farmId: farmId ? parseInt(farmId) : undefined,
        strategyId: strategyId ? parseInt(strategyId) : undefined,
        agentId: agentId ? parseInt(agentId) : undefined,
        exchange: exchange || undefined,
        level: level as any || undefined,
        unreadOnly,
        limit,
        offset,
      }
    );
    
    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('API route error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitoring/alerts
 * Create a new alert
 */
export async function POST(request: Request) {
  try {
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Get authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401 }
      );
    }
    
    // Parse request body
    const data = await request.json();
    
    // Validate required fields
    if (!data.alert_type || !data.level || !data.message) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required fields: alert_type, level, message' }),
        { status: 400 }
      );
    }
    
    // Create alert
    const alert: Omit<TradingAlert, 'is_read' | 'is_acknowledged'> = {
      user_id: session.user.id,
      farm_id: data.farm_id,
      strategy_id: data.strategy_id,
      agent_id: data.agent_id,
      exchange: data.exchange,
      alert_type: data.alert_type,
      level: data.level,
      message: data.message,
      details: data.details,
    };
    
    const createdAlert = await AlertManagementService.createAlert(alert);
    
    if (!createdAlert) {
      return new NextResponse(
        JSON.stringify({ error: 'Failed to create alert' }),
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      alert: createdAlert,
      message: 'Alert created successfully' 
    });
  } catch (error) {
    console.error('API route error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/monitoring/alerts
 * Update alert status (read/acknowledged)
 */
export async function PATCH(request: Request) {
  try {
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Get authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401 }
      );
    }
    
    // Parse request body
    const data = await request.json();
    
    // Validate required fields
    if (!data.alertIds || !Array.isArray(data.alertIds) || data.alertIds.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required field: alertIds (array)' }),
        { status: 400 }
      );
    }
    
    // Update alert status
    const updates: { is_read?: boolean; is_acknowledged?: boolean } = {};
    if (typeof data.is_read === 'boolean') updates.is_read = data.is_read;
    if (typeof data.is_acknowledged === 'boolean') updates.is_acknowledged = data.is_acknowledged;
    
    if (Object.keys(updates).length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'No updates provided' }),
        { status: 400 }
      );
    }
    
    const success = await AlertManagementService.updateAlertStatus(
      session.user.id,
      data.alertIds,
      updates
    );
    
    if (!success) {
      return new NextResponse(
        JSON.stringify({ error: 'Failed to update alert status' }),
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success,
      message: 'Alert status updated successfully' 
    });
  } catch (error) {
    console.error('API route error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}
