"use client";

import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { DashboardLayout, LayoutItem } from '@/types/database.types';

interface DashboardLayoutState {
  layouts: Record<string, DashboardLayout> | null;
  currentLayout: DashboardLayout | null;
  currentLayoutId: number | null;
  currentLayoutName: string | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
}

/**
 * Hook for managing dashboard layouts
 * Uses the dashboard_layouts table and manage_dashboard_layout function
 */
export function useDashboardLayout() {
  const supabase = createBrowserClient();
  const { toast } = useToast();

  const [state, setState] = useState<DashboardLayoutState>({
    layouts: null,
    currentLayout: null,
    currentLayoutId: null,
    currentLayoutName: null,
    isLoading: true,
    isError: false,
    errorMessage: null
  });

  // Fetch all layouts for the user
  const fetchLayouts = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, isError: false }));

    try {
      const { data, error } = await supabase.rpc('manage_dashboard_layout', {
        p_action: 'list'
      });

      if (error) throw error;

      if (data && data.layouts) {
        const layoutsMap: Record<string, DashboardLayout> = {};
        data.layouts.forEach((layout: any) => {
          layoutsMap[layout.id] = layout;
        });

        setState(prev => ({
          ...prev,
          layouts: layoutsMap,
          isLoading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          layouts: {},
          isLoading: false
        }));
      }
    } catch (error: any) {
      console.error('Error fetching layouts:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isError: true,
        errorMessage: error.message || 'Failed to fetch layouts'
      }));
      toast({
        variant: 'destructive',
        title: 'Error loading layouts',
        description: error.message || 'Failed to fetch dashboard layouts'
      });
    }
  }, [supabase, toast]);

  // Load specific layout
  const loadLayout = useCallback(async (layoutId?: number) => {
    setState(prev => ({ ...prev, isLoading: true, isError: false }));

    try {
      const { data, error } = await supabase.rpc('manage_dashboard_layout', {
        p_action: 'get',
        p_layout_id: layoutId
      });

      if (error) throw error;

      if (data && data.layout) {
        setState(prev => ({
          ...prev,
          currentLayout: data.layout.layout,
          currentLayoutId: data.layout.id,
          currentLayoutName: data.layout.name,
          isLoading: false
        }));
      } else {
        // Handle case when no layouts exist
        setState(prev => ({
          ...prev,
          isLoading: false,
          isError: false,
          errorMessage: null
        }));
        toast({
          title: 'No layouts found',
          description: 'Using default layout'
        });
      }
    } catch (error: any) {
      console.error('Error loading layout:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isError: true,
        errorMessage: error.message || 'Failed to load layout'
      }));
      toast({
        variant: 'destructive',
        title: 'Error loading layout',
        description: error.message || 'Failed to load dashboard layout'
      });
    }
  }, [supabase, toast]);

  // Save layout
  const saveLayout = useCallback(async (
    layoutConfig: DashboardLayout,
    name: string,
    isDefault = false,
    layoutId?: number
  ) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Determine if we're creating or updating
      const action = layoutId ? 'update' : 'create';

      const { data, error } = await supabase.rpc('manage_dashboard_layout', {
        p_action: action,
        p_name: name,
        p_layout: layoutConfig,
        p_is_default: isDefault,
        p_layout_id: layoutId
      });

      if (error) throw error;

      toast({
        title: 'Layout saved',
        description: `Dashboard layout "${name}" has been saved`
      });

      // Refresh layouts
      await fetchLayouts();

      // If we just created a new layout, load it
      if (action === 'create' && data && data.layout_id) {
        await loadLayout(data.layout_id);
      }

      setState(prev => ({
        ...prev,
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Error saving layout:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isError: true,
        errorMessage: error.message || 'Failed to save layout'
      }));
      toast({
        variant: 'destructive',
        title: 'Error saving layout',
        description: error.message || 'Failed to save dashboard layout'
      });
    }
  }, [supabase, toast, fetchLayouts, loadLayout]);

  // Delete layout
  const deleteLayout = useCallback(async (layoutId: number) => {
    if (!layoutId) return;

    try {
      const { data, error } = await supabase.rpc('manage_dashboard_layout', {
        p_action: 'delete',
        p_layout_id: layoutId
      });

      if (error) throw error;

      toast({
        title: 'Layout deleted',
        description: 'Dashboard layout has been deleted'
      });

      // If we just deleted the current layout, load the default
      if (layoutId === state.currentLayoutId) {
        await loadLayout();
      }

      // Refresh layouts
      await fetchLayouts();
    } catch (error: any) {
      console.error('Error deleting layout:', error);
      toast({
        variant: 'destructive',
        title: 'Error deleting layout',
        description: error.message || 'Failed to delete dashboard layout'
      });
    }
  }, [supabase, toast, fetchLayouts, loadLayout, state.currentLayoutId]);

  // Initialize on mount
  useEffect(() => {
    fetchLayouts().then(() => {
      loadLayout();
    });
  }, [fetchLayouts, loadLayout]);

  return {
    ...state,
    fetchLayouts,
    loadLayout,
    saveLayout,
    deleteLayout
  };
}
