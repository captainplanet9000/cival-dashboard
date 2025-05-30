import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { z } from 'zod';

// GET handler for retrieving a single agent by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const id = params.id;
    
    // Get agent from database
    const { data, error } = await supabase
      .from('elizaos_agents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching ElizaOS agent:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch agent' },
        { status: 500 }
      );
    }
    
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error fetching ElizaOS agent:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PUT handler for updating an agent
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const id = params.id;
    const json = await request.json();
    
    // Simple validation schema for updates
    const updateSchema = z.object({
      name: z.string().min(3).optional(),
      status: z.enum(['initializing', 'active', 'idle', 'paused', 'error']).optional(),
      config: z.record(z.any()).optional(),
      performance_metrics: z.record(z.any()).optional(),
    });
    
    // Validate request body
    const validationResult = updateSchema.safeParse(json);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => 
        `${e.path.join('.')}: ${e.message}`
      ).join(', ');
      
      return NextResponse.json(
        { success: false, error: `Validation error: ${errorMessage}` },
        { status: 400 }
      );
    }
    
    const validatedData = validationResult.data;
    
    // Update agent in database
    const { data, error } = await supabase
      .from('elizaos_agents')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating ElizaOS agent:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update agent' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error updating ElizaOS agent:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE handler for removing an agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const id = params.id;
    
    // Delete agent from database
    const { error } = await supabase
      .from('elizaos_agents')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting ElizaOS agent:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete agent' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, data: { message: 'Agent deleted successfully' } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error deleting ElizaOS agent:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
