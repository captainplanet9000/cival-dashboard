'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { User, Session } from '@supabase/supabase-js';

/**
 * Hook for handling authentication state
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    
    // Get initial session
    const initAuth = async () => {
      try {
        setLoading(true);
        
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        setSession(currentSession);
        
        if (currentSession) {
          setUser(currentSession.user);
        }
      } catch (err: any) {
        console.error('Error initializing auth:', err);
        setError(err.message || 'Authentication failed');
      } finally {
        setLoading(false);
      }
    };
    
    // Initialize
    initAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user || null);
        setLoading(false);
      }
    );
    
    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Login with email and password
  const signInWithPassword = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const supabase = createBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        throw signInError;
      }
      
      return { success: true, data };
    } catch (err: any) {
      console.error('Error signing in:', err);
      setError(err.message || 'Failed to sign in');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const supabase = createBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (signUpError) {
        throw signUpError;
      }
      
      return { success: true, data };
    } catch (err: any) {
      console.error('Error signing up:', err);
      setError(err.message || 'Failed to sign up');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const supabase = createBrowserClient();
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        throw signOutError;
      }
      
      return { success: true };
    } catch (err: any) {
      console.error('Error signing out:', err);
      setError(err.message || 'Failed to sign out');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Refresh session to fix JWT issues
  const refreshSession = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const supabase = createBrowserClient();
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        throw refreshError;
      }
      
      // Update session and user if refresh was successful
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      
      return { success: true, data };
    } catch (err: any) {
      console.error('Error refreshing session:', err);
      setError(err.message || 'Failed to refresh session');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    session,
    loading,
    error,
    signInWithPassword,
    signUp,
    signOut,
    refreshSession,
    isAuthenticated: !!user
  };
}