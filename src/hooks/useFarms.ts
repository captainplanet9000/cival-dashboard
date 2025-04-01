'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

export interface Farm {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  risk_profile?: Record<string, any>;
  performance_metrics?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useFarms() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFarms() {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('farms')
          .select('*')
          .eq('is_active', true)
          .order('name');
        
        if (error) {
          throw new Error(error.message);
        }
        
        setFarms(data as Farm[]);
      } catch (err: any) {
        console.error('Error fetching farms:', err);
        setError(err.message || 'Failed to fetch farms');
        setFarms([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchFarms();
    
    // Set up realtime subscription for farm changes
    const subscription = supabase
      .channel('farms-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'farms' 
        },
        () => {
          // Reload farms when changes occur
          fetchFarms();
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Reload farms manually
  const reloadFarms = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        throw new Error(error.message);
      }
      
      setFarms(data as Farm[]);
      setError(null);
    } catch (err: any) {
      console.error('Error reloading farms:', err);
      setError(err.message || 'Failed to reload farms');
    } finally {
      setLoading(false);
    }
  };

  // Get a specific farm by ID
  const getFarmById = (id: string): Farm | undefined => {
    return farms.find(farm => farm.id === id);
  };

  return {
    farms,
    loading,
    error,
    reloadFarms,
    getFarmById
  };
} 