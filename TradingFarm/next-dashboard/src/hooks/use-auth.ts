"use client";

// Mock authentication hook for static export
// This prevents authentication errors during build

export function useAuth() {
  // Return mock values for static export
  return {
    user: { id: 'static-user-id', email: 'static@example.com' },
    session: { expires_at: 9999999999 },
    isLoading: false,
    isAuthenticated: true,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => {},
    refreshSession: async () => {},
  };
}

export default useAuth;
