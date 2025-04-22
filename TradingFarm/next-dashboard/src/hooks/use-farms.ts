'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import { PostgrestError } from '@supabase/supabase-js';
import { CreateFarmInput, UpdateFarmInput } from '@/schemas/farm-schemas';
import { toast } from "@/components/ui/use-toast";
import { useAuth } from './use-auth';
import { refreshSupabaseSession, validateSession } from '@/utils/NavigationService';

// Query keys for farms
export const farmKeys = {
  all: ['farms'] as const,
  lists: () => [...farmKeys.all, 'list'] as const,
  list: (filters: object) => [...farmKeys.lists(), filters] as const,
  details: () => [...farmKeys.all, 'detail'] as const,
  detail: (id: number) => [...farmKeys.details(), id] as const,
  agents: (farmId: number) => [...farmKeys.detail(farmId), 'agents'] as const,
};

// Define Farm type based on database schema
export type Farm = Database['public']['Tables']['farms']['Row'];

// Fetch multiple farms (optionally by user ID)
const fetchFarms = async (userId?: string): Promise<Farm[]> => {
  const supabase = createBrowserClient();
  let query = supabase.from('farms').select('*').order('created_at', { ascending: false });
  if (userId) {
    query = query.eq('owner_id', userId);
  }
  const { data, error } = await query;
  if (error) {
      console.error("Error fetching farms:", error);
      throw error;
  }
  return data || [];
};

// Fetch single farm
const fetchFarm = async (farmId: number): Promise<Farm | null> => {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.from('farms').select('*').eq('id', farmId).single();
  // PGRST116: Row not found, which is expected for non-existent ID
  if (error && error.code !== 'PGRST116') { 
      console.error(`Error fetching farm ${farmId}:`, error);
      throw error;
  }
  return data;
};

// Create farm
const createFarm = async (farmData: CreateFarmInput, ownerId: string): Promise<Farm> => {
  // Validate session before creating farm
  const isSessionValid = await validateSession();
  if (!isSessionValid) {
    throw new Error("Authentication session invalid. Please sign in again.");
  }
  
  const supabase = createBrowserClient();
  try {
    const { data, error } = await supabase
      .from('farms')
      // Ensure owner_id is included
      .insert({ ...farmData, owner_id: ownerId })
      .select()
      .single();
      
    if (error) {
      // If we get a JWT error, try to refresh the session and retry once
      if (error.message?.includes('jwt') || error.message?.includes('JWS')) {
        await refreshSupabaseSession();
        
        // Retry the operation with a new client after session refresh
        const refreshedClient = createBrowserClient();
        const { data: retryData, error: retryError } = await refreshedClient
          .from('farms')
          .insert({ ...farmData, owner_id: ownerId })
          .select()
          .single();
          
        if (retryError) {
          console.error("Error creating farm after session refresh:", retryError);
          throw retryError;
        }
        
        if (!retryData) {
          throw new Error("Farm created successfully, but no data returned from Supabase.");
        }
        
        return retryData as Farm;
      } else {
        console.error("Error creating farm:", error);
        throw error;
      }
    }
    
    if (!data) {
      throw new Error("Farm created successfully, but no data returned from Supabase.");
    }
    
    return data as Farm;
  } catch (err: any) {
    if (err.message?.includes('jwt') || err.message?.includes('JWS')) {
      toast({ 
        title: "Authentication Error", 
        description: "Your session has expired. Please sign in again.", 
        variant: "destructive" 
      });
    }
    throw err;
  }
};

// Update farm
const updateFarm = async ({ farmId, farmData }: { farmId: number; farmData: UpdateFarmInput }): Promise<Farm> => {
  const supabase = createBrowserClient();
   // Filter out undefined values before sending update
  const updatePayload: Partial<UpdateFarmInput> = {};
  Object.keys(farmData).forEach(key => {
    if ((farmData as any)[key] !== undefined) {
      (updatePayload as any)[key] = (farmData as any)[key];
    }
  });
  if (Object.keys(updatePayload).length === 0) {
     console.warn("Update farm called with no changes.");
     // Re-fetch current data if no changes sent
     const currentData = await fetchFarm(farmId);
     if (!currentData) throw new Error("Farm not found after empty update attempt.");
     return currentData;
  }

  const { data, error } = await supabase
    .from('farms')
    .update(updatePayload) 
    .eq('id', farmId)
    .select()
    .single();
  if (error) {
      console.error(`Error updating farm ${farmId}:`, error);
      throw error;
  }
  if (!data) {
    throw new Error("Farm updated successfully, but no data returned from Supabase.");
  }
  return data as Farm;
};

/**
 * Hook to fetch multiple farms, optionally filtered by the current user.
 */
export function useFarms(filterByUser: boolean = false) {
  const { user } = useAuth();
  // Use user.id directly in queryKey for dependency tracking
  const queryKey = filterByUser ? ['farms', 'user', user?.id] : ['farms', 'all'];

  return useQuery<Farm[], PostgrestError>({ 
    queryKey,
    // Pass user?.id directly to fetch function
    queryFn: () => fetchFarms(filterByUser ? user?.id : undefined),
    // Disable query if filtering by user and user ID is not yet available
    enabled: !filterByUser || !!user?.id, 
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch a single farm by ID.
 */
export function useFarm(farmId: number | null | undefined) {
  // Ensure farmId is treated consistently (e.g., always string or number in key)
  const queryKey = ['farm', farmId]; 
  return useQuery<Farm | null, PostgrestError>({ 
    queryKey,
    queryFn: () => fetchFarm(farmId!), // Use non-null assertion guarded by 'enabled'
    enabled: typeof farmId === 'number' && !isNaN(farmId), // Ensure farmId is a valid number
    staleTime: 5 * 60 * 1000, 
    gcTime: 10 * 60 * 1000, 
  });
}

/**
 * Hook to create a new farm, associating it with the authenticated user.
 */
export function useCreateFarm() {
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Get user ID for owner_id

  return useMutation<Farm, PostgrestError, CreateFarmInput>({
    mutationFn: async (farmData) => { 
      if (!user?.id) { // Check if user is available
        toast({ title: "Authentication Error", description: "You must be logged in to create a farm.", variant: "destructive" });
        throw new Error("User not authenticated"); 
      }
      
      // Validate session before attempting to create farm
      try {
        const isSessionValid = await validateSession();
        if (!isSessionValid) {
          toast({ 
            title: "Session Expired", 
            description: "Your session has expired. Please sign in again.", 
            variant: "destructive" 
          });
          throw new Error("Session expired, please login again");
        }
      } catch (error) {
        console.error("Session validation failed:", error);
        throw new Error("Authentication error, please try again");
      }
      
      return createFarm(farmData, user.id);
    },
    onSuccess: (newFarm) => {
      // Invalidate all farm list queries
      queryClient.invalidateQueries({ queryKey: ['farms'] }); 
      // Update cache for the new farm's detail view
      queryClient.setQueryData(['farm', newFarm.id], newFarm); 
      toast({ title: "Farm Created", description: `Farm '${newFarm.name}' created successfully.` });
    },
    onError: (error) => {
      // Special handling for JWT errors
      if (error.message?.includes('jwt') || error.message?.includes('JWS') || 
          error.message?.includes('session') || error.message?.includes('authentication')) {
        toast({ 
          title: "Authentication Error", 
          description: "Your session has expired. Please sign in again.", 
          variant: "destructive" 
        });
      } else {
        // General error handling
        toast({ 
          title: "Error Creating Farm", 
          description: error.message || "An unexpected error occurred.", 
          variant: "destructive" 
        });
      }
    },
  });
}

/**
 * Hook to update an existing farm.
 */
export function useUpdateFarm(farmId: number) {
  const queryClient = useQueryClient();

  return useMutation<Farm, PostgrestError, UpdateFarmInput>({
    mutationFn: (farmData) => updateFarm({ farmId, farmData }),
    onSuccess: (updatedFarm) => {
      // Invalidate all farm list queries
      queryClient.invalidateQueries({ queryKey: ['farms'] }); 
      // Update the specific farm's detail cache
      queryClient.setQueryData(['farm', farmId], updatedFarm); 
      toast({ title: "Farm Updated", description: `Farm '${updatedFarm.name}' updated successfully.` });
    },
    onError: (error) => {
       // Toast handled here
      toast({ title: "Error Updating Farm", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    },
  });
}

/**
 * Fetch agents for a specific farm
 */
const fetchAgents = async (farmId: number) => {
  const supabase = createBrowserClient();
  
  try {
    // Validate session before fetching
    await validateSession();
    
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('farm_id', farmId);
      
    if (error) {
      console.error(`Error fetching agents for farm ${farmId}:`, error);
      throw error;
    }
    
    return data || [];
  } catch (err) {
    console.error('Error in fetchAgents:', err);
    throw err;
  }
};

/**
 * Hook to fetch all agents for a farm
 */
export function useFarmAgents(farmId: number) {
  return useQuery({
    queryKey: farmKeys.agents(farmId),
    queryFn: () => fetchAgents(farmId),
    enabled: !!farmId, // Only run the query if we have a farmId
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
