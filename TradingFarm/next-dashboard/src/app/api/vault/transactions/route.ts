import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { logger } from '@/utils/logging';

// Input validation schema for GET requests
const getQuerySchema = z.object({
  account_id: z.coerce.number().optional(),
  vault_id: z.coerce.number().optional(),
  type: z.union([
    z.enum(['deposit', 'withdrawal', 'transfer', 'trade', 'fee', 'interest', 'allocation', 'reward']),
    z.string().transform((val) => val.split(','))
  ]).optional(),
  status: z.union([
    z.enum(['pending', 'approved', 'completed', 'failed', 'cancelled']),
    z.string().transform((val) => val.split(','))
  ]).optional(),
  approval_status: z.enum(['pending', 'approved', 'rejected']).optional(),
  currency: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  min_amount: z.coerce.number().optional(),
  max_amount: z.coerce.number().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
});

// Input validation schema for POST requests (create transaction)
const postBodySchema = z.object({
  account_id: z.number(),
  reference_id: z.string().optional(),
  type: z.enum(['deposit', 'withdrawal', 'transfer', 'trade', 'fee', 'interest', 'allocation', 'reward']),
  subtype: z.string().optional(),
  amount: z.number().min(0.000001, "Amount must be greater than zero"),
  currency: z.string(),
  source_account_id: z.number().optional(),
  destination_account_id: z.number().optional(),
  external_source: z.string().optional(),
  external_destination: z.string().optional(),
  fee: z.number().optional(),
  fee_currency: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  note: z.string().optional(),
});

/**
 * GET handler for vault transactions with comprehensive filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Get and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const { 
      account_id, vault_id, type, status, approval_status,
      currency, start_date, end_date, min_amount, max_amount,
      search, limit, offset 
    } = getQuerySchema.parse(queryParams);
    
    // Build query with filters
    let query = supabase
      .from('vault_transactions')
      .select(`
        *,
        account:account_id(id, name, vault_id, currency, account_type),
        source_account:source_account_id(id, name, vault_id, currency, account_type),
        destination_account:destination_account_id(id, name, vault_id, currency, account_type)
      `, { count: 'exact' });
    
    // Apply filters if provided
    if (account_id) {
      query = query.eq('account_id', account_id);
    }
    
    // If vault_id is provided, we need to find all accounts in that vault first
    if (vault_id && !account_id) {
      const { data: vaultAccounts } = await supabase
        .from('vault_accounts')
        .select('id')
        .eq('vault_id', vault_id);
        
      if (vaultAccounts && vaultAccounts.length > 0) {
        const accountIds = vaultAccounts.map(a => a.id);
        query = query.in('account_id', accountIds);
      } else {
        // If no accounts found in vault, return empty result early
        return NextResponse.json({
          data: [],
          count: 0,
          total: 0,
          message: 'No accounts found in specified vault'
        });
      }
    }
    
    if (type) {
      if (Array.isArray(type)) {
        query = query.in('type', type);
      } else {
        query = query.eq('type', type);
      }
    }
    
    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }
    
    if (approval_status) {
      query = query.eq('approval_status', approval_status);
    }
    
    if (currency) {
      query = query.eq('currency', currency);
    }
    
    if (start_date) {
      query = query.gte('timestamp', start_date);
    }
    
    if (end_date) {
      query = query.lte('timestamp', end_date);
    }
    
    if (min_amount) {
      query = query.gte('amount', min_amount);
    }
    
    if (max_amount) {
      query = query.lte('amount', max_amount);
    }
    
    if (search) {
      query = query.or(`reference_id.ilike.%${search}%,note.ilike.%${search}%`);
    }
    
    // Execute query with pagination
    const { data: transactions, error, count } = await query
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      logger.error('Failed to fetch vault transactions', { error, userId: 'system' });
      return NextResponse.json(
        { error: 'Failed to fetch vault transactions' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data: transactions,
      count,
      total: count,
      message: 'Vault transactions retrieved successfully'
    });
  } catch (error) {
    logger.error('Error in GET /api/vault/transactions', { error, userId: 'system' });
    
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
 * POST handler to create a new vault transaction
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
    
    // Verify user has access to the account
    const { data: accountData, error: accountError } = await supabase
      .from('vault_accounts')
      .select('id, vault_id, currency, balance, account_type, vault_masters!inner(owner_id)')
      .eq('id', validatedData.account_id)
      .single();
    
    if (accountError || !accountData || accountData.vault_masters.owner_id !== session.user.id) {
      logger.error('User does not have access to this account', { 
        userId: session.user.id,
        accountId: validatedData.account_id
      });
      return NextResponse.json(
        { error: 'You do not have access to this account' },
        { status: 403 }
      );
    }
    
    // For transfers, verify destination account exists and belongs to user
    if (validatedData.type === 'transfer' && validatedData.destination_account_id) {
      const { data: destAccount, error: destError } = await supabase
        .from('vault_accounts')
        .select('id, vault_id, currency, vault_masters!inner(owner_id)')
        .eq('id', validatedData.destination_account_id)
        .single();
        
      if (destError || !destAccount || destAccount.vault_masters.owner_id !== session.user.id) {
        logger.error('User does not have access to destination account', { 
          userId: session.user.id,
          destAccountId: validatedData.destination_account_id
        });
        return NextResponse.json(
          { error: 'You do not have access to the destination account' },
          { status: 403 }
        );
      }
      
      // Check currency compatibility for transfers
      if (destAccount.currency !== validatedData.currency) {
        return NextResponse.json(
          { error: 'Currency mismatch between source and destination accounts' },
          { status: 400 }
        );
      }
    }
    
    // For withdrawals, check sufficient balance
    if (validatedData.type === 'withdrawal' && accountData.balance < validatedData.amount) {
      return NextResponse.json(
        { error: 'Insufficient balance for withdrawal' },
        { status: 400 }
      );
    }
    
    // Begin transaction
    const { data, error } = await supabase.rpc('create_vault_transaction', {
      p_account_id: validatedData.account_id,
      p_reference_id: validatedData.reference_id,
      p_type: validatedData.type,
      p_subtype: validatedData.subtype,
      p_amount: validatedData.amount,
      p_currency: validatedData.currency,
      p_source_account_id: validatedData.source_account_id,
      p_destination_account_id: validatedData.destination_account_id,
      p_external_source: validatedData.external_source,
      p_external_destination: validatedData.external_destination,
      p_fee: validatedData.fee,
      p_fee_currency: validatedData.fee_currency,
      p_metadata: validatedData.metadata,
      p_note: validatedData.note,
      p_status: 'pending',
      p_approval_status: 'pending',
      p_user_id: session.user.id
    });
    
    if (error) {
      logger.error('Failed to create vault transaction', { error, userId: session.user.id });
      return NextResponse.json(
        { error: 'Failed to create transaction', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data,
      message: 'Transaction created successfully'
    }, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/vault/transactions', { error, userId: 'system' });
    
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
