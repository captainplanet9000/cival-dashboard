import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type SubscriptionEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/**
 * Custom hook for subscribing to real-time updates from Supabase tables
 */
export function useRealtime<T = any>(
  table: string,
  options?: {
    event?: SubscriptionEvent;
    filter?: Record<string, any>;
    initialData?: T[];
  }
) {
  const [data, setData] = useState<T[]>(options?.initialData || []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_KEY) {
      setError('Supabase credentials not available');
      setLoading(false);
      return;
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_KEY
    );

    // Fetch initial data
    const fetchData = async () => {
      try {
        let query = supabase.from(table).select('*');

        // Apply filters if provided
        if (options?.filter) {
          Object.entries(options.filter).forEach(([key, value]) => {
            if (value !== undefined) {
              query = query.eq(key, value);
            }
          });
        }

        const { data: initialData, error } = await query;

        if (error) {
          throw error;
        }

        setData(initialData as T[]);
      } catch (err) {
        console.error(`Error fetching data from ${table}:`, err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up real-time subscription
    const event = options?.event || '*';
    const channelName = `public:${table}:${event.toLowerCase()}`;

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table
        },
        async (payload: any) => {
          // Handle the real-time update based on the event type
          if (payload.eventType === 'INSERT') {
            const newRecord = payload.new as T;
            setData((currentData) => [...currentData, newRecord]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedRecord = payload.new as T;
            // @ts-ignore - We're checking for id which is common but may not be in all tables
            const id = (updatedRecord as any).id;
            
            setData((currentData) => 
              // @ts-ignore - We're checking for id which is common but may not be in all tables
              currentData.map((item) => (item as any).id === id ? updatedRecord : item)
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedRecord = payload.old as T;
            // @ts-ignore - We're checking for id which is common but may not be in all tables
            const id = (deletedRecord as any).id;
            
            setData((currentData) => 
              // @ts-ignore - We're checking for id which is common but may not be in all tables
              currentData.filter((item) => (item as any).id !== id)
            );
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [table, options?.event, JSON.stringify(options?.filter)]);

  return { data, error, loading, setData };
}