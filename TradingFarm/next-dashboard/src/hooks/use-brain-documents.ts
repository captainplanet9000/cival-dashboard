'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import { PostgrestError } from '@supabase/supabase-js';

// Type for a single brain document
export type BrainDocument = Database['public']['Tables']['brain_documents']['Row'];

// Function to fetch documents for a specific brain
const fetchBrainDocuments = async (brainId: string): Promise<BrainDocument[]> => {
  if (!brainId) return []; // Don't fetch if no brainId

  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('brain_documents')
    .select('*') 
    .eq('brain_id', brainId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching documents for brain ${brainId}:`, error);
    throw error;
  }

  return data || [];
};

/**
 * Hook to fetch documents associated with a specific brain ID.
 */
export function useBrainDocuments(brainId: string | null | undefined) {
  const queryKey = ['brainDocuments', brainId];

  const { 
    data: documents = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery<BrainDocument[], PostgrestError>({ 
    queryKey,
    queryFn: () => fetchBrainDocuments(brainId!), // Pass brainId, assured by 'enabled' option
    enabled: !!brainId, // Only run query if brainId is truthy
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    documents,
    isLoading,
    error: error ? error.message : null,
    refetch,
  };
} 