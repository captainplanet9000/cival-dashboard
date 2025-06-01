/**
 * Goal Template Service
 * Handles all goal template-related API interactions with Supabase
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { Database } from '@/types/database.types';

// Helper to determine API URL
const getApiUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return `${baseUrl}/api/${path}`;
};

// Define interfaces
export interface GoalTemplate {
  id: string;
  title: string;
  description?: string;
  category?: string;
  target_value: number;
  is_public: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export const goalTemplateService = {
  /**
   * Get all goal templates (both public and owned by the user)
   */
  async getTemplates(category?: string): Promise<ApiResponse<GoalTemplate[]>> {
    try {
      const supabase = createBrowserClient();
      
      let query = supabase
        .from('goal_templates')
        .select('*')
        .or(`is_public.eq.true,owner_id.eq.${supabase.auth.getUser()}`);
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error fetching goal templates:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Get a specific goal template by ID
   */
  async getTemplateById(id: string): Promise<ApiResponse<GoalTemplate>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('goal_templates')
        .select('*')
        .eq('id', id)
        .or(`is_public.eq.true,owner_id.eq.${supabase.auth.getUser()}`)
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error fetching goal template:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Create a new goal template
   */
  async createTemplate(template: Omit<GoalTemplate, 'id' | 'created_at' | 'updated_at' | 'owner_id'>): Promise<ApiResponse<GoalTemplate>> {
    try {
      const supabase = createBrowserClient();
      
      // Add owner_id
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        return { error: 'User not authenticated' };
      }
      
      const { data, error } = await supabase
        .from('goal_templates')
        .insert({
          ...template,
          owner_id: user.user.id
        })
        .select()
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error creating goal template:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Update an existing goal template
   */
  async updateTemplate(id: string, template: Partial<Omit<GoalTemplate, 'id' | 'created_at' | 'updated_at' | 'owner_id'>>): Promise<ApiResponse<GoalTemplate>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('goal_templates')
        .update(template)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error updating goal template:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Delete a goal template
   */
  async deleteTemplate(id: string): Promise<ApiResponse<null>> {
    try {
      const supabase = createBrowserClient();
      
      const { error } = await supabase
        .from('goal_templates')
        .delete()
        .eq('id', id);
      
      if (error) {
        return { error: error.message };
      }
      
      return { data: null };
    } catch (error) {
      console.error('Error deleting goal template:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Create a goal from a template
   */
  async createGoalFromTemplate(templateId: string, farmId: string, customizations?: { title?: string, description?: string, target_value?: number }): Promise<ApiResponse<any>> {
    try {
      // First get the template
      const { data: template, error: templateError } = await this.getTemplateById(templateId);
      
      if (templateError || !template) {
        return { error: templateError || 'Template not found' };
      }
      
      // Create the goal based on template
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('goals')
        .insert({
          title: customizations?.title || template.title,
          description: customizations?.description || template.description,
          target_value: customizations?.target_value || template.target_value,
          farm_id: farmId,
          template_id: templateId,
          status: 'not_started',
          progress: 0,
          current_value: 0
        })
        .select()
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error creating goal from template:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Get goal template categories
   */
  async getCategories(): Promise<ApiResponse<string[]>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('goal_templates')
        .select('category')
        .not('category', 'is', null);
      
      if (error) {
        return { error: error.message };
      }
      
      // Extract unique categories
      const categories = [...new Set(data.map(item => item.category))];
      
      return { data: categories as string[] };
    } catch (error) {
      console.error('Error fetching goal template categories:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
};
