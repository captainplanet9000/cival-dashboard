/**
 * API routes for ML Models
 */
import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/ml/models - Get all ML models for the current user
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get models
    const { data, error } = await supabase
      .from('ml_models')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching ML models:', error);
      return NextResponse.json({ error: 'Failed to fetch ML models' }, { status: 500 });
    }
    
    return NextResponse.json({ models: data });
  } catch (error) {
    console.error('Error in ML models API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/ml/models - Create a new ML model
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const { name, description, type, framework, parameters } = body;
    
    // Validate required fields
    if (!name || !type || !framework) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Insert new model
    const { data, error } = await supabase
      .from('ml_models')
      .insert({
        name,
        description,
        type,
        framework,
        version: '1.0.0',
        status: 'training',
        metrics: {},
        parameters: parameters || {},
        metadata: {},
        owner_id: user.id
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating ML model:', error);
      return NextResponse.json({ error: 'Failed to create ML model' }, { status: 500 });
    }
    
    return NextResponse.json({ model: data });
  } catch (error) {
    console.error('Error in ML models API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
