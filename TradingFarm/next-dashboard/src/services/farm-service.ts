/**
 * Farm Service
 * Handles all farm-related API interactions
 */

// Define the Farm interface (should match your API response)
export interface Farm {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  agents_count?: number;
  strategies_count?: number;
  user_id?: string;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Farm service
export const farmService = {
  /**
   * Get all farms for the current user
   */
  async getFarms(): Promise<ApiResponse<Farm[]>> {
    try {
      // Use relative URL to ensure it works in development and production
      const response = await fetch('/api/farms?userId=1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error fetching farms:', errorData);
        return { error: `Failed to load farms: ${response.status} ${response.statusText}` };
      }

      const data = await response.json();
      return { data: data.farms };
    } catch (error) {
      console.error('Error fetching farms:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get a specific farm by ID
   */
  async getFarmById(id: string): Promise<ApiResponse<Farm>> {
    try {
      const response = await fetch(`/api/farms/${id}?userId=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Error fetching farm ${id}:`, errorData);
        return { error: `Failed to load farm: ${response.status} ${response.statusText}` };
      }

      const data = await response.json();
      return { data: data.farm };
    } catch (error) {
      console.error(`Error fetching farm ${id}:`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Create a new farm
   */
  async createFarm(farmData: Partial<Farm>): Promise<ApiResponse<Farm>> {
    try {
      const response = await fetch('/api/farms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(farmData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error creating farm:', errorData);
        return { error: `Failed to create farm: ${response.status} ${response.statusText}` };
      }

      const data = await response.json();
      return { data: data.farm };
    } catch (error) {
      console.error('Error creating farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
};
