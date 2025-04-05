/**
 * OpenRouter Models API Route
 * 
 * Retrieves available models from OpenRouter API for use in Trading Farm agents.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { createOpenRouterClient } from '@/services/api/openrouter-client';

/**
 * GET handler for retrieving available OpenRouter models
 */
export async function GET(request: NextRequest) {
  try {
    // Get API key from environment or request header
    let apiKey = process.env.OPENROUTER_API_KEY;
    
    // Check for authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // Override with provided API key if available
      apiKey = authHeader.substring(7);
    }
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 401 }
      );
    }
    
    // Instantiate client with API key
    const openRouterClient = createOpenRouterClient(apiKey);
    
    // Fetch available models
    await openRouterClient.initialize();
    const models = openRouterClient.getAvailableModels();
    
    // Group models by provider
    const modelsByProvider: Record<string, any[]> = {};
    models.forEach(model => {
      const provider = model.provider;
      if (!modelsByProvider[provider]) {
        modelsByProvider[provider] = [];
      }
      modelsByProvider[provider].push(model);
    });
    
    return NextResponse.json({
      models,
      modelsByProvider,
      count: models.length
    });
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models from OpenRouter' },
      { status: 500 }
    );
  }
}
