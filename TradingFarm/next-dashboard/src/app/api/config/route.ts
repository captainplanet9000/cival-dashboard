import { NextRequest, NextResponse } from 'next/server';

/**
 * API route for fetching configuration values
 * This endpoint provides configuration values for the frontend
 * without requiring a database query
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json(
        { error: 'Key parameter is required' },
        { status: 400 }
      );
    }
    
    // Return configuration values directly without database dependency
    // These values are used by the frontend to connect to various services
    
    // Simplify by using the current host for socket.io to avoid connection errors
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const defaultSocketUrl = `${protocol}://${host}`;
    
    const configValues: Record<string, string> = {
      // Socket.io configuration - use same host to avoid connection errors
      socket_io_url: process.env.NEXT_PUBLIC_SOCKET_URL || defaultSocketUrl,
      
      // API base URL
      api_base_url: process.env.NEXT_PUBLIC_API_URL || `${protocol}://${host}/api`,
      
      // ElizaOS API URL - use same host when not explicitly configured
      elizaos_api_url: process.env.NEXT_PUBLIC_ELIZAOS_API_URL || `${protocol}://${host}/api/elizaos`,
      
      // Other configuration values as needed
      auth_provider: 'supabase',
      theme_default: 'system',
      socket_reconnect_attempts: '5',
      socket_reconnect_delay: '1000',
      socket_enabled: process.env.SOCKET_ENABLED || 'true',
      elizaos_model_default: 'gpt-4',
      mock_api_enabled: 'true' // Enable mock API responses
    };
    
    // Check if the requested key exists
    if (key in configValues) {
      return NextResponse.json({ value: configValues[key] });
    }
    
    // If key doesn't exist, return a 404
    return NextResponse.json(
      { error: 'Configuration key not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error in config API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}
