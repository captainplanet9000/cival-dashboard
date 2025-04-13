/**
 * API routes for specific ML model
 */
import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const modelId = parseInt(params.id);
    
    if (isNaN(modelId)) {
      return NextResponse.json({ error: 'Invalid model ID' }, { status: 400 });
    }
    
    // Get model
    const { data, error } = await supabase
      .from('ml_models')
      .select('*')
      .eq('id', modelId)
      .eq('owner_id', user.id)
      .single();
      
    if (error) {
      console.error('Error fetching ML model:', error);
      return NextResponse.json({ error: 'Failed to fetch ML model' }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }
    
    return NextResponse.json({ model: data });
  } catch (error) {
    console.error('Error in ML model API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const modelId = parseInt(params.id);
    
    if (isNaN(modelId)) {
      return NextResponse.json({ error: 'Invalid model ID' }, { status: 400 });
    }
    
    // Parse request body
    const body = await req.json();
    const { name, description, parameters, metrics, status, metadata } = body;
    
    // Check ownership
    const { data: model, error: checkError } = await supabase
      .from('ml_models')
      .select('id')
      .eq('id', modelId)
      .eq('owner_id', user.id)
      .single();
      
    if (checkError || !model) {
      return NextResponse.json({ error: 'Model not found or not authorized' }, { status: 404 });
    }
    
    // Build update object
    const updates: any = {};
    
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (parameters !== undefined) updates.parameters = parameters;
    if (metrics !== undefined) updates.metrics = metrics;
    if (status !== undefined) updates.status = status;
    if (metadata !== undefined) updates.metadata = metadata;
    
    // Update model
    const { data, error } = await supabase
      .from('ml_models')
      .update(updates)
      .eq('id', modelId)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating ML model:', error);
      return NextResponse.json({ error: 'Failed to update ML model' }, { status: 500 });
    }
    
    return NextResponse.json({ model: data });
  } catch (error) {
    console.error('Error in ML model API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const modelId = parseInt(params.id);
    
    if (isNaN(modelId)) {
      return NextResponse.json({ error: 'Invalid model ID' }, { status: 400 });
    }
    
    // Check ownership
    const { data: model, error: checkError } = await supabase
      .from('ml_models')
      .select('id')
      .eq('id', modelId)
      .eq('owner_id', user.id)
      .single();
      
    if (checkError || !model) {
      return NextResponse.json({ error: 'Model not found or not authorized' }, { status: 404 });
    }
    
    // Delete model
    const { error } = await supabase
      .from('ml_models')
      .delete()
      .eq('id', modelId);
      
    if (error) {
      console.error('Error deleting ML model:', error);
      return NextResponse.json({ error: 'Failed to delete ML model' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in ML model API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
