import { NextResponse } from 'next/server';

/**
 * API route for fetching configuration values
 * This endpoint provides configuration values for the frontend
 * without requiring a database query
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    // Return all config values if no key is specified
    if (!key) {
      // Simplify by using the current host for socket.io to avoid connection errors
      const host = request.headers.get('host') || 'localhost:3002';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const defaultSocketUrl = `${protocol}://${host}`;
      
      const configValues: Record<string, string> = {
        // Socket.io configuration - use same host to avoid connection errors
        socket_io_url: process.env.NEXT_PUBLIC_SOCKET_URL || defaultSocketUrl,
        
        // API base URL
        api_base_url: process.env.NEXT_PUBLIC_API_URL || `${protocol}://${host}/api`,
        
        // ElizaOS API URL - use ElizaOS server on port 3003
        elizaos_api_url: process.env.NEXT_PUBLIC_ELIZAOS_API_URL || 'http://localhost:3003',
        
        // Other configuration values as needed
        auth_provider: 'supabase',
        theme_default: 'system',
        socket_reconnect_attempts: '3', // Enable reconnection attempts
        socket_reconnect_delay: '1000',
        socket_enabled: 'true', // Enable socket connection attempts
        elizaos_model_default: 'gpt-4',
        mock_api_enabled: 'true', // Enable mock API responses for development
        force_mock_mode: 'false' // Allow real connections where possible
      };

      return NextResponse.json(configValues);
    }
    
    // Simplify by using the current host for socket.io to avoid connection errors
    const host = request.headers.get('host') || 'localhost:3002';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const defaultSocketUrl = `${protocol}://${host}`;
    
    const configValues: Record<string, string> = {
      // Socket.io configuration - use same host to avoid connection errors
      socket_io_url: process.env.NEXT_PUBLIC_SOCKET_URL || defaultSocketUrl,
      
      // API base URL
      api_base_url: process.env.NEXT_PUBLIC_API_URL || `${protocol}://${host}/api`,
      
      // ElizaOS API URL - use ElizaOS server on port 3003
      elizaos_api_url: process.env.NEXT_PUBLIC_ELIZAOS_API_URL || 'http://localhost:3003',
      
      // Other configuration values as needed
      auth_provider: 'supabase',
      theme_default: 'system',
      socket_reconnect_attempts: '3',
      socket_reconnect_delay: '1000',
      socket_enabled: 'true',
      elizaos_model_default: 'gpt-4',
      mock_api_enabled: 'true',
      force_mock_mode: 'false'
    };
    
    // Return the specific config value
    return NextResponse.json({ [key]: configValues[key] || '' });
  } catch (error) {
    console.error('Error in config API:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve configuration' },
      { status: 500 }
    );
  }
}
