import * as React from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useSupabaseRealtime } from './useSupabaseRealtime';
import { logEvent } from '@/utils/logging';

// User profile interface for strictly typed operations
export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string; // From auth.users
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  default_exchange: string;
  default_leverage: number;
  notifications_settings: {
    email: boolean;
    push: boolean;
    trading_alerts: boolean;
    market_updates: boolean;
    security_alerts: boolean;
    newsletter_updates: boolean;
  };
  trading_preferences: {
    confirm_trades: boolean;
    show_pnl_in_header: boolean;
    compact_view: boolean;
  };
  security_settings: {
    two_factor_enabled: boolean;
    session_timeout: number;
  };
  created_at: string;
  updated_at: string;
}

export function useAccountSettings() {
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const supabase = createBrowserClient();
  
  // Subscribe to realtime updates
  const { isConnected } = useSupabaseRealtime('profiles', ['profiles']);

  const fetchUserProfile = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        throw new Error('Not authenticated');
      }
      
      // First, get auth user data for email
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;
      
      // Then get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (profileError) {
        // If the profile doesn't exist yet, create a default one
        if (profileError.code === 'PGRST116') { // Resource not found
          const defaultProfile = {
            user_id: session.user.id,
            name: authUser.user?.user_metadata?.full_name || 'User',
            timezone: 'America/New_York',
            theme: 'system',
            default_exchange: 'binance',
            default_leverage: 3,
            notifications_settings: {
              email: true,
              push: true,
              trading_alerts: true,
              market_updates: false,
              security_alerts: true,
              newsletter_updates: false
            },
            trading_preferences: {
              confirm_trades: true,
              show_pnl_in_header: true,
              compact_view: false
            },
            security_settings: {
              two_factor_enabled: false,
              session_timeout: 60
            }
          };
          
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert(defaultProfile)
            .select()
            .single();
          
          if (createError) throw createError;
          
          setProfile({
            ...newProfile,
            email: authUser.user?.email || '',
          } as UserProfile);
        } else {
          throw profileError;
        }
      } else if (profileData) {
        setProfile({
          ...profileData,
          email: authUser.user?.email || '',
        } as UserProfile);
      }
      
      logEvent({
        category: 'account',
        action: 'fetch_profile',
        label: 'success',
        value: 1
      });
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      logEvent({
        category: 'error',
        action: 'fetch_profile_error',
        label: err instanceof Error ? err.message : String(err),
        value: 1
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Initial fetch
  React.useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // Update user profile
  const updateProfile = async (updatedProfile: Partial<UserProfile>) => {
    if (!profile) return false;
    
    setSaving(true);
    setError(null);
    
    try {
      const { user_id, id, email, ...updatableFields } = profile;
      
      // Only update fields that have changed
      const fieldsToUpdate: Partial<UserProfile> = {};
      
      // Compare and only include changed fields
      Object.keys(updatedProfile).forEach(key => {
        const typedKey = key as keyof UserProfile;
        
        // Handle nested objects by comparing stringified JSON
        if (
          typeof updatedProfile[typedKey] === 'object' && 
          updatedProfile[typedKey] !== null
        ) {
          if (
            JSON.stringify(updatedProfile[typedKey]) !== 
            JSON.stringify(profile[typedKey])
          ) {
            fieldsToUpdate[typedKey] = updatedProfile[typedKey];
          }
        } 
        // Handle primitive fields
        else if (updatedProfile[typedKey] !== profile[typedKey]) {
          fieldsToUpdate[typedKey] = updatedProfile[typedKey];
        }
      });
      
      // If there are no changes, return early
      if (Object.keys(fieldsToUpdate).length === 0) {
        setSaving(false);
        return true;
      }
      
      // Update the profile in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update(fieldsToUpdate)
        .eq('user_id', user_id);
      
      if (updateError) throw updateError;
      
      // Optimistically update local state
      setProfile(prev => {
        if (!prev) return null;
        return { ...prev, ...updatedProfile };
      });
      
      logEvent({
        category: 'account',
        action: 'update_profile',
        label: 'success',
        value: 1
      });
      
      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      logEvent({
        category: 'error',
        action: 'update_profile_error',
        label: err instanceof Error ? err.message : String(err),
        value: 1
      });
      
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Update user password
  const updatePassword = async (currentPassword: string, newPassword: string) => {
    setSaving(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      logEvent({
        category: 'account',
        action: 'update_password',
        label: 'success',
        value: 1
      });
      
      return true;
    } catch (err) {
      console.error('Error updating password:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      logEvent({
        category: 'error',
        action: 'update_password_error',
        label: err instanceof Error ? err.message : String(err),
        value: 1
      });
      
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Enable two-factor authentication
  const enableTwoFactor = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // In a real implementation, this would interact with the auth provider
      // For now, we'll just update the profile
      const updatedProfile = {
        ...profile,
        security_settings: {
          ...profile?.security_settings,
          two_factor_enabled: true
        }
      };
      
      const success = await updateProfile(updatedProfile);
      
      logEvent({
        category: 'account',
        action: 'enable_2fa',
        label: success ? 'success' : 'failure',
        value: 1
      });
      
      return success;
    } catch (err) {
      console.error('Error enabling 2FA:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      logEvent({
        category: 'error',
        action: 'enable_2fa_error',
        label: err instanceof Error ? err.message : String(err),
        value: 1
      });
      
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    profile,
    loading,
    saving,
    error,
    isConnected,
    updateProfile,
    updatePassword,
    enableTwoFactor,
    refreshProfile: fetchUserProfile
  };
}
