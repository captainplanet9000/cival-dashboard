import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { logger } from '@/utils/logging';

// Input validation schema for GET requests
const getQuerySchema = z.object({
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
});

// Input validation schema for POST requests
const postBodySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  requires_approval: z.boolean().optional().default(false),
  approval_threshold: z.number().optional().default(1),
});

/**
 * GET handler for vault masters 
 */
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Get and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const { limit, offset } = getQuerySchema.parse(queryParams);
    
    // Get vault masters from database
    const { data: vaultMasters, error, count } = await supabase
      .from('vault_masters')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      logger.error('Failed to fetch vault masters', { error, userId: 'system' });
      return NextResponse.json(
        { error: 'Failed to fetch vault masters' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data: vaultMasters,
      count,
      total: count,
      message: 'Vault masters retrieved successfully'
    });
  } catch (error) {
    logger.error('Error in GET /api/vault/masters', { error, userId: 'system' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler to create a new vault master
 */
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Get user from session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get and validate request body
    const body = await request.json();
    const validatedData = postBodySchema.parse(body);
    
    // Insert vault master into database
    const { data: vaultMaster, error } = await supabase
      .from('vault_masters')
      .insert({
        ...validatedData,
        owner_id: session.user.id,
        status: 'active',
      })
      .select()
      .single();
    
    if (error) {
      logger.error('Failed to create vault master', { error, userId: session.user.id });
      return NextResponse.json(
        { error: 'Failed to create vault master' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data: vaultMaster,
      message: 'Vault master created successfully'
    }, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/vault/masters', { error, userId: 'system' });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
