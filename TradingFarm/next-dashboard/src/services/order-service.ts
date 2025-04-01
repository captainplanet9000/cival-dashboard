/**
 * Order service for the Trading Farm dashboard
 * Handles all order-related API requests and data transformations
 */

import { createBrowserClient } from '@/utils/supabase/client';

// Order interface matching the database schema
export interface Order {
  id: number;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number | null;
  status: 'new' | 'open' | 'filled' | 'partially_filled' | 'canceled' | 'rejected' | 'expired';
  farm_id: number;
  agent_id?: number;
  exchange_id?: string;
  client_order_id?: string;
  created_at: string;
  updated_at: string;
  filled_quantity?: number;
  average_price?: number;
  metadata?: Record<string, any>;
}

// Order service with methods for CRUD operations
class OrderService {
  // Fetch orders with optional filtering parameters
  async getOrders(params: {
    limit?: number;
    offset?: number;
    farmId?: string | number;
    agentId?: string | number;
    status?: string;
    symbol?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    try {
      const supabase = createBrowserClient();
      
      // Start building the query
      let query = supabase
        .from('orders')
        .select('*');
      
      // Apply filters if they exist
      if (params.farmId && params.farmId !== 'all') {
        query = query.eq('farm_id', params.farmId);
      }
      
      if (params.agentId && params.agentId !== 'all') {
        query = query.eq('agent_id', params.agentId);
      }
      
      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      }
      
      if (params.symbol) {
        query = query.eq('symbol', params.symbol);
      }
      
      if (params.startDate) {
        query = query.gte('created_at', params.startDate);
      }
      
      if (params.endDate) {
        query = query.lte('created_at', params.endDate);
      }
      
      // Apply pagination
      if (params.limit) {
        query = query.limit(params.limit);
      }
      
      if (params.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
      }
      
      // Order by creation date, newest first
      query = query.order('created_at', { ascending: false });
      
      // Execute the query
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching orders:', error);
        return { error: error.message, data: null };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception in getOrders:', error);
      return { 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        data: null 
      };
    }
  }
  
  // Get a single order by ID
  async getOrderById(id: number | string) {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching order:', error);
        return { error: error.message, data: null };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception in getOrderById:', error);
      return { 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        data: null 
      };
    }
  }
  
  // Create a new order
  async createOrder(orderData: Partial<Order>) {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating order:', error);
        return { error: error.message, data: null };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception in createOrder:', error);
      return { 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        data: null 
      };
    }
  }
  
  // Update an existing order
  async updateOrder(id: number, orderData: Partial<Order>) {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('orders')
        .update(orderData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating order:', error);
        return { error: error.message, data: null };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception in updateOrder:', error);
      return { 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        data: null 
      };
    }
  }
  
  // Cancel an order
  async cancelOrder(id: number) {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error canceling order:', error);
        return { error: error.message, data: null };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception in cancelOrder:', error);
      return { 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        data: null 
      };
    }
  }
}

// Create a singleton instance
export const orderService = new OrderService();
