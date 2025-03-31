import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { ExchangeCredentialsService } from '@/services/exchange-credentials-service';
import { z } from 'zod';

// Schema for validating exchange credential creation
const credentialSchema = z.object({
  exchange: z.string(),
  api_key: z.string(),
  api_secret: z.string(),
  farm_id: z.number().optional(),
  additional_params: z.record(z.any()).optional(),
  is_testnet: z.boolean().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

/**
 * GET endpoint to list all exchange credentials for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const exchange = searchParams.get('exchange');
    const farmIdParam = searchParams.get('farm_id');
    const farmId = farmIdParam ? parseInt(farmIdParam) : undefined;
    
    // If specific exchange is requested, get those credentials
    if (exchange) {
      const { data, error } = await ExchangeCredentialsService.getCredentials(
        user.id,
        exchange as any,
        farmId
      );
      
      if (error) {
        return NextResponse.json(
          { error: 'Failed to retrieve exchange credentials' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ credential: data });
    }
    
    // Otherwise, list all credentials
    const { data, error } = await ExchangeCredentialsService.listCredentials(user.id);
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to list exchange credentials' },
        { status: 500 }
      );
    }
    
    // For security, don't return API secrets in the list
    const secureData = data.map(cred => ({
      ...cred,
      api_secret: '••••••••' // Masked for security
    }));
    
    return NextResponse.json({ credentials: secureData });
  } catch (error) {
    console.error('Error in GET /api/exchanges/credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to create a new exchange credential
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse and validate the request body
    const body = await request.json();
    const validation = credentialSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.format() },
        { status: 400 }
      );
    }
    
    // Store the credentials
    const { data, error } = await ExchangeCredentialsService.storeCredentials({
      user_id: user.id,
      ...validation.data,
    });
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to store exchange credentials' },
        { status: 500 }
      );
    }
    
    // Return the credential ID
    return NextResponse.json({
      message: 'Exchange credentials stored successfully',
      credential_id: data.id
    });
  } catch (error) {
    console.error('Error in POST /api/exchanges/credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
