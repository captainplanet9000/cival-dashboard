import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { AlertManagementService, AlertRule } from '@/services/monitoring/alert-management-service';

/**
 * GET /api/monitoring/alert-rules
 * Fetch alert rules with optional filtering
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
    const activeOnly = searchParams.get('activeOnly') === 'true';
    
    // Fetch alert rules
    const alertRules = await AlertManagementService.getAlertRules(
      session.user.id,
      {
        farmId: farmId ? parseInt(farmId) : undefined,
        activeOnly,
      }
    );
    
    return NextResponse.json({ alertRules });
  } catch (error) {
    console.error('API route error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitoring/alert-rules
 * Create or update an alert rule
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
    if (!data.name || !data.rule_type || !data.level || !data.conditions) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required fields: name, rule_type, level, conditions' }),
        { status: 400 }
      );
    }
    
    // Create or update rule
    const rule: Omit<AlertRule, 'created_at' | 'updated_at'> = {
      id: data.id, // Will be undefined for new rules
      user_id: session.user.id,
      farm_id: data.farm_id,
      name: data.name,
      description: data.description,
      rule_type: data.rule_type,
      conditions: data.conditions,
      level: data.level,
      notification_channels: data.notification_channels || ['ui'],
      is_active: data.is_active !== false, // Default to true if not provided
      throttle_minutes: data.throttle_minutes || 60,
      last_triggered: data.last_triggered,
    };
    
    const savedRule = await AlertManagementService.saveAlertRule(rule);
    
    if (!savedRule) {
      return new NextResponse(
        JSON.stringify({ error: 'Failed to save alert rule' }),
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      alertRule: savedRule,
      message: `Alert rule ${data.id ? 'updated' : 'created'} successfully` 
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
 * DELETE /api/monitoring/alert-rules
 * Delete an alert rule
 */
export async function DELETE(request: Request) {
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
    const ruleId = searchParams.get('id');
    
    if (!ruleId) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required parameter: id' }),
        { status: 400 }
      );
    }
    
    // Delete alert rule
    const success = await AlertManagementService.deleteAlertRule(
      session.user.id,
      parseInt(ruleId)
    );
    
    if (!success) {
      return new NextResponse(
        JSON.stringify({ error: 'Failed to delete alert rule' }),
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success,
      message: 'Alert rule deleted successfully' 
    });
  } catch (error) {
    console.error('API route error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}
