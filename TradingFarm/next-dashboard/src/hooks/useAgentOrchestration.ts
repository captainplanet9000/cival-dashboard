import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';
import type { Database } from '@/types/database.types';

const supabase = createBrowserClient();

// ---- Agent Assignments ----
export function useAgentAssignments(agentId?: string) {
  return useQuery({
    queryKey: ['agent_assignments', agentId],
    queryFn: async () => {
      let query = supabase.from('agent_assignments').select('*');
      if (agentId) query = query.eq('agent_id', agentId);
      const { data, error } = await query.order('assigned_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!agentId,
  });
}

export function useCreateAgentAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assignment: Omit<Database['public']['Tables']['agent_assignments']['Insert'], 'id'>) => {
      const { data, error } = await supabase.from('agent_assignments').insert(assignment).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries(['agent_assignments']),
  });
}

export function useDeleteAgentAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agent_assignments').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries(['agent_assignments']),
  });
}

// ---- Agent Events ----
export function useAgentEvents(agentId?: string) {
  return useQuery({
    queryKey: ['agent_events', agentId],
    queryFn: async () => {
      let query = supabase.from('agent_events').select('*');
      if (agentId) query = query.eq('agent_id', agentId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!agentId,
  });
}

// ---- Agent Anomaly Alerts ----
export function useAgentAnomalyAlerts(agentId?: string) {
  return useQuery({
    queryKey: ['agent_anomaly_alerts', agentId],
    queryFn: async () => {
      let query = supabase.from('agent_anomaly_alerts').select('*');
      if (agentId) query = query.eq('agent_id', agentId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!agentId,
  });
}

export function useResolveAgentAnomalyAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agent_anomaly_alerts').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries(['agent_anomaly_alerts']),
  });
}

// ---- Phase 4: Agent Event & Alert Mutations ----
export function useCreateAgentEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      event: Omit<Database['public']['Tables']['agent_events']['Insert'], 'id' | 'created_at'>
    ) => {
      const { data, error } = await supabase
        .from('agent_events')
        .insert(event)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries(['agent_events']),
  });
}

export function useCreateAgentAnomalyAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      alert: Omit<Database['public']['Tables']['agent_anomaly_alerts']['Insert'], 'id' | 'created_at' | 'resolved'>
    ) => {
      const { data, error } = await supabase
        .from('agent_anomaly_alerts')
        .insert(alert)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries(['agent_anomaly_alerts']),
  });
}
