import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Subscribe to Supabase realtime changes for a given table.
 * Invalidates provided queryKeys on any change and returns connection status.
 */
export function useSupabaseRealtime(table: string, queryKeys: string[]) {
  const supabase = createBrowserClient();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        queryClient.invalidateQueries(queryKeys);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, table, JSON.stringify(queryKeys)]);

  return { isConnected };
}
