import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { ExchangeCredentialsService } from '@/services/exchange-credentials-service';
import { z } from 'zod';

// Schema for validating exchange credential updates
const updateSchema = z.object({
  api_key: z.string().optional(),
  api_secret: z.string().optional(),
  farm_id: z.number().optional().nullable(),
  additional_params: z.record(z.any()).optional(),
  is_testnet: z.boolean().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

/**
 * GET endpoint to retrieve a specific exchange credential
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const credentialId = parseInt(params.id);
    
    if (isNaN(credentialId)) {
      return NextResponse.json(
        { error: 'Invalid credential ID' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the credential from the database
    const { data, error } = await supabase
      .from('exchange_credentials')
      .select('*')
      .eq('id', credentialId)
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: 'Credential not found or access denied' },
        { status: 404 }
      );
    }
    
    // For security, don't return the API secret
    const secureData = {
      ...data,
      api_secret: '••••••••' // Masked for security
    };
    
    return NextResponse.json({ credential: secureData });
  } catch (error) {
    console.error('Error in GET /api/exchanges/credentials/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH endpoint to update an exchange credential
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const credentialId = parseInt(params.id);
    
    if (isNaN(credentialId)) {
      return NextResponse.json(
        { error: 'Invalid credential ID' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify ownership of the credential
    const { data: credential, error: credentialError } = await supabase
      .from('exchange_credentials')
      .select('id')
      .eq('id', credentialId)
      .eq('user_id', user.id)
      .single();
    
    if (credentialError || !credential) {
      return NextResponse.json(
        { error: 'Credential not found or access denied' },
        { status: 404 }
      );
    }
    
    // Parse and validate the request body
    const body = await request.json();
    const validation = updateSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.format() },
        { status: 400 }
      );
    }
    
    // Update the credential
    const { data, error } = await ExchangeCredentialsService.updateCredentials(
      credentialId,
      validation.data
    );
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to update exchange credential' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Exchange credential updated successfully',
      credential_id: credentialId
    });
  } catch (error) {
    console.error('Error in PATCH /api/exchanges/credentials/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE endpoint to delete an exchange credential
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const credentialId = parseInt(params.id);
    
    if (isNaN(credentialId)) {
      return NextResponse.json(
        { error: 'Invalid credential ID' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify ownership of the credential
    const { data: credential, error: credentialError } = await supabase
      .from('exchange_credentials')
      .select('id')
      .eq('id', credentialId)
      .eq('user_id', user.id)
      .single();
    
    if (credentialError || !credential) {
      return NextResponse.json(
        { error: 'Credential not found or access denied' },
        { status: 404 }
      );
    }
    
    // Delete the credential
    const { success, error } = await ExchangeCredentialsService.deleteCredentials(credentialId);
    
    if (!success || error) {
      return NextResponse.json(
        { error: 'Failed to delete exchange credential' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Exchange credential deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/exchanges/credentials/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
