/**
 * Custom hook for farm-related operations
 */
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Database } from '@/types/database.types';

export type Farm = Database['public']['Tables']['farms']['Row'];

interface UseFarmResult {
  farms: Farm[];
  currentFarm: Farm | null;
  isLoading: boolean;
  error: string | null;
  setCurrentFarm: (farm: Farm) => void;
  createFarm: (name: string, description?: string) => Promise<Farm | null>;
  updateFarm: (farmId: string, data: Partial<Farm>) => Promise<boolean>;
  deleteFarm: (farmId: string) => Promise<boolean>;
}

export function useFarm(): UseFarmResult {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [currentFarm, setCurrentFarm] = useState<Farm | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch farms on mount
  useEffect(() => {
    fetchFarms();
  }, []);

  // Set current farm when farms change and none is selected
  useEffect(() => {
    if (farms.length > 0 && !currentFarm) {
      setCurrentFarm(farms[0]);
    }
  }, [farms, currentFarm]);

  // Fetch farms from Supabase
  const fetchFarms = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setFarms(data || []);
    } catch (err: any) {
      console.error('Error fetching farms:', err);
      setError(err.message || 'Failed to fetch farms');
      toast({
        title: 'Error',
        description: 'Failed to load farms. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new farm
  const createFarm = async (name: string, description?: string): Promise<Farm | null> => {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('farms')
        .insert([
          { 
            name, 
            description: description || null,
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      // Add the new farm to the list
      setFarms(prev => [data, ...prev]);
      
      // Set as current farm if it's the first one
      if (farms.length === 0) {
        setCurrentFarm(data);
      }
      
      toast({
        title: 'Success',
        description: `Farm "${name}" created successfully.`,
      });
      
      return data;
    } catch (err: any) {
      console.error('Error creating farm:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to create farm. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update a farm
  const updateFarm = async (farmId: string, data: Partial<Farm>): Promise<boolean> => {
    try {
      const supabase = createBrowserClient();
      
      const { error } = await supabase
        .from('farms')
        .update(data)
        .eq('id', farmId);
      
      if (error) throw error;
      
      // Update the farms list
      setFarms(prev => prev.map(farm => 
        farm.id === farmId ? { ...farm, ...data } : farm
      ));
      
      // Update current farm if it's being edited
      if (currentFarm && currentFarm.id === farmId) {
        setCurrentFarm({ ...currentFarm, ...data });
      }
      
      toast({
        title: 'Success',
        description: 'Farm updated successfully.',
      });
      
      return true;
    } catch (err: any) {
      console.error('Error updating farm:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to update farm. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Delete a farm
  const deleteFarm = async (farmId: string): Promise<boolean> => {
    try {
      const supabase = createBrowserClient();
      
      const { error } = await supabase
        .from('farms')
        .delete()
        .eq('id', farmId);
      
      if (error) throw error;
      
      // Remove from the farms list
      setFarms(prev => prev.filter(farm => farm.id !== farmId));
      
      // If the current farm is deleted, set another one as current
      if (currentFarm && currentFarm.id === farmId) {
        const remainingFarms = farms.filter(farm => farm.id !== farmId);
        setCurrentFarm(remainingFarms.length > 0 ? remainingFarms[0] : null);
      }
      
      toast({
        title: 'Success',
        description: 'Farm deleted successfully.',
      });
      
      return true;
    } catch (err: any) {
      console.error('Error deleting farm:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete farm. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    farms,
    currentFarm,
    isLoading,
    error,
    setCurrentFarm,
    createFarm,
    updateFarm,
    deleteFarm,
  };
}
