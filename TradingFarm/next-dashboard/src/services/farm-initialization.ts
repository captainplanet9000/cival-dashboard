/**
 * Farm Initialization Service
 * Provides functions to initialize farm data and handle initial loading states
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { mockFarmManager } from '@/utils/supabase/mocks-farm';

export interface FarmData {
  id: string;
  name: string;
  description: string;
  balance: number;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
  user_id: string;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface DashboardLayout {
  id: string;
  name: string;
  is_default: boolean;
  widgets: Widget[];
  farm_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Widget {
  id: string;
  type: string;
  title: string;
  description?: string;
  size: {
    width: number;
    height: number;
  };
  position: number;
  config?: Record<string, any>;
}

/**
 * Default farm layout with essential widgets
 */
export const defaultFarmLayout: DashboardLayout = {
  id: 'default-layout',
  name: 'Default Layout',
  is_default: true,
  farm_id: 'farm-1',
  user_id: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  widgets: [
    {
      id: 'widget-performance',
      type: 'performance_chart',
      title: 'Performance Overview',
      position: 0,
      size: {
        width: 2,
        height: 2
      }
    },
    {
      id: 'widget-balance',
      type: 'balance_overview',
      title: 'Account Balance',
      position: 1,
      size: {
        width: 1,
        height: 1
      }
    },
    {
      id: 'widget-risk',
      type: 'risk_metrics',
      title: 'Risk Metrics',
      position: 2,
      size: {
        width: 1,
        height: 1
      }
    },
    {
      id: 'widget-orders',
      type: 'order_updates',
      title: 'Recent Orders',
      position: 3,
      size: {
        width: 1,
        height: 1
      }
    },
    {
      id: 'widget-positions',
      type: 'positions_table',
      title: 'Open Positions',
      position: 4,
      size: {
        width: 1,
        height: 1
      }
    }
  ]
};

/**
 * Initialize farm data for a user
 * This is used when the dashboard first loads
 */
export async function initializeFarm(userId: string): Promise<FarmData | null> {
  try {
    const supabase = createBrowserClient();
    
    // Get user's default farm
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('Error fetching user data:', userError);
      return null;
    }
    
    if (!userData?.default_farm_id) {
      // Use first farm from mock data if no default
      const mockFarms = mockFarmManager.getAllFarms();
      if (mockFarms.length > 0) {
        return mockFarms[0];
      }
      
      return null;
    }
    
    // Get farm data
    const { data: farmData, error: farmError } = await supabase
      .from('farms')
      .select('*')
      .eq('id', userData.default_farm_id)
      .single();
      
    if (farmError) {
      console.error('Error fetching farm data:', farmError);
      
      // Fall back to mock data
      const mockFarm = mockFarmManager.getFarm(userData.default_farm_id);
      if (mockFarm) {
        return mockFarm;
      }
      
      return null;
    }
    
    return farmData;
  } catch (error) {
    console.error('Farm initialization error:', error);
    
    // Fallback to mock data if API fails
    const mockFarms = mockFarmManager.getAllFarms();
    return mockFarms.length > 0 ? mockFarms[0] : null;
  }
}

/**
 * Get dashboard layouts for a farm
 */
export async function getFarmLayouts(farmId: string): Promise<DashboardLayout[]> {
  try {
    const supabase = createBrowserClient();
    
    const { data: layouts, error } = await supabase
      .from('dashboard_layouts')
      .select('*')
      .eq('farm_id', farmId);
      
    if (error) {
      console.error('Error fetching layouts:', error);
      return [defaultFarmLayout];
    }
    
    return layouts.length > 0 ? layouts : [defaultFarmLayout];
  } catch (error) {
    console.error('Error fetching farm layouts:', error);
    return [defaultFarmLayout];
  }
}

/**
 * Get default layout for a farm
 */
export async function getDefaultLayout(farmId: string): Promise<DashboardLayout> {
  try {
    const supabase = createBrowserClient();
    
    const { data: layout, error } = await supabase
      .from('dashboard_layouts')
      .select('*')
      .eq('farm_id', farmId)
      .eq('is_default', true)
      .single();
      
    if (error) {
      console.error('Error fetching default layout:', error);
      return {
        ...defaultFarmLayout,
        farm_id: farmId
      };
    }
    
    return layout;
  } catch (error) {
    console.error('Error fetching default layout:', error);
    return {
      ...defaultFarmLayout,
      farm_id: farmId
    };
  }
}

/**
 * Initialize dashboard for a farm
 * This returns all the data needed to render the dashboard
 */
export async function initializeDashboard(farmId: string) {
  try {
    // Get farm layouts
    const layouts = await getFarmLayouts(farmId);
    
    // Get default layout
    const defaultLayout = layouts.find(l => l.is_default) || layouts[0];
    
    return {
      farmId,
      layouts,
      defaultLayout,
      isLoaded: true
    };
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    return {
      farmId,
      layouts: [defaultFarmLayout],
      defaultLayout: defaultFarmLayout,
      isLoaded: true,
      error: 'Failed to initialize dashboard. Using default configuration.'
    };
  }
}
