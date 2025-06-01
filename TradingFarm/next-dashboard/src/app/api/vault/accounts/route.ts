import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { logger } from '@/utils/logging';

// Input validation schema for GET requests
const getQuerySchema = z.object({
  vault_id: z.coerce.number().optional(),
  account_type: z.enum(['trading', 'operational', 'reserve', 'fee', 'investment', 'custody']).optional(),
  currency: z.string().optional(),
  status: z.enum(['active', 'frozen', 'closed', 'pending']).optional(),
  search: z.string().optional(),
  min_balance: z.coerce.number().optional(),
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
});

// Input validation schema for POST requests (create account)
const postBodySchema = z.object({
  vault_id: z.number(),
  farm_id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  account_type: z.enum(['trading', 'operational', 'reserve', 'fee', 'investment', 'custody']),
  address: z.string().optional(),
  network: z.string().optional(),
  exchange: z.string().optional(),
  currency: z.string(),
  initial_balance: z.number().optional().default(0),
});

/**
 * GET handler for vault accounts with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Get and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const { 
      vault_id, account_type, currency, status, 
      search, min_balance, limit, offset 
    } = getQuerySchema.parse(queryParams);
    
    // Build query with filters
    let query = supabase
      .from('vault_accounts')
      .select('*, vault_masters(name, status)', { count: 'exact' });
    
    // Apply filters if provided
    if (vault_id) {
      query = query.eq('vault_id', vault_id);
    }
    
    if (account_type) {
      query = query.eq('account_type', account_type);
    }
    
    if (currency) {
      query = query.eq('currency', currency);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (min_balance) {
      query = query.gte('balance', min_balance);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,currency.ilike.%${search}%`);
    }
    
    // Execute query with pagination
    const { data: vaultAccounts, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      logger.error('Failed to fetch vault accounts', { error, userId: 'system' });
      return NextResponse.json(
        { error: 'Failed to fetch vault accounts' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data: vaultAccounts,
      count,
      total: count,
      message: 'Vault accounts retrieved successfully'
    });
  } catch (error) {
    logger.error('Error in GET /api/vault/accounts', { error, userId: 'system' });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler to create a new vault account
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
    
    // Verify user has access to the vault
    const { data: vaultAccess, error: vaultError } = await supabase
      .from('vault_masters')
      .select('id')
      .eq('id', validatedData.vault_id)
      .eq('owner_id', session.user.id)
      .single();
      
    if (vaultError || !vaultAccess) {
      logger.error('User does not have access to this vault', { 
        userId: session.user.id,
        vaultId: validatedData.vault_id
      });
      return NextResponse.json(
        { error: 'You do not have access to this vault' },
        { status: 403 }
      );
    }
    
    // Insert vault account into database
    const { data: vaultAccount, error } = await supabase
      .from('vault_accounts')
      .insert({
        vault_id: validatedData.vault_id,
        farm_id: validatedData.farm_id,
        name: validatedData.name,
        account_type: validatedData.account_type,
        address: validatedData.address,
        network: validatedData.network,
        exchange: validatedData.exchange,
        currency: validatedData.currency,
        balance: validatedData.initial_balance,
        reserved_balance: 0,
        last_updated: new Date().toISOString(),
        status: 'active',
      })
      .select()
      .single();
    
    if (error) {
      logger.error('Failed to create vault account', { error, userId: session.user.id });
      return NextResponse.json(
        { error: 'Failed to create vault account' },
        { status: 500 }
      );
    }
    
    // If initial balance is greater than 0, create an initial deposit transaction
    if (validatedData.initial_balance > 0) {
      const { error: txError } = await supabase
        .from('vault_transactions')
        .insert({
          account_id: vaultAccount.id,
          type: 'deposit',
          amount: validatedData.initial_balance,
          currency: validatedData.currency,
          timestamp: new Date().toISOString(),
          status: 'completed',
          approval_status: 'approved',
          note: 'Initial deposit on account creation',
        });
        
      if (txError) {
        logger.warn('Failed to create initial deposit transaction', { 
          error: txError, 
          userId: session.user.id,
          accountId: vaultAccount.id
        });
        // We don't fail the entire request if just the transaction record fails
      }
    }
    
    return NextResponse.json({
      data: vaultAccount,
      message: 'Vault account created successfully'
    }, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/vault/accounts', { error, userId: 'system' });
    
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
