/**
 * Mock Authentication
 * Provides mock authentication data and functions for development
 */

// Mock user data
export const mockUsers = [
  {
    id: 'user-1',
    email: 'dev@tradingfarm.com',
    full_name: 'Development User',
    avatar_url: null,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    role: 'admin',
    preferences: {
      theme: 'light',
      notifications: true,
      default_farm_id: 'farm-1'
    }
  }
];

// Mock user session
export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_at: Date.now() + 86400000, // 24 hours from now
  user: mockUsers[0]
};

// Mock auth handlers for Supabase routes
export const mockAuthHandlers = {
  // Create token handler for /auth/v1/token route
  createToken: async (req: Request): Promise<Response> => {
    // Parse the request body if it exists
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      // Ignore parsing errors
    }

    // Simulate successful token creation
    return new Response(
      JSON.stringify({
        access_token: mockSession.access_token,
        refresh_token: mockSession.refresh_token,
        expires_in: 3600,
        expires_at: Math.floor(mockSession.expires_at / 1000),
        token_type: 'bearer',
        user: mockUsers[0]
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  },

  // Get user handler for /auth/v1/user route
  getUser: async (): Promise<Response> => {
    return new Response(
      JSON.stringify(mockUsers[0]),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// Get current user
export function getCurrentUser() {
  return mockUsers[0];
}

// Get current session
export function getCurrentSession() {
  return {
    ...mockSession,
    // Update expires_at to ensure it's always valid during development
    expires_at: Date.now() + 86400000
  };
}

// Check if user is authenticated
export function isAuthenticated() {
  return true; // Always authenticated in mock mode
}

// Get user role
export function getUserRole() {
  return mockUsers[0].role;
}

// Check if user has permission
export function hasPermission(permission: string) {
  // In mock mode, admin has all permissions
  if (mockUsers[0].role === 'admin') {
    return true;
  }
  
  // Add custom permission logic here if needed
  return false;
}
