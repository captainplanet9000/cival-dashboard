/**
 * Enhanced Farm Service
 * Adds Zod validation to farm-related API interactions with Supabase
 */

import { createBrowserClient } from "@/utils/supabase/client";
import { createServerClient } from "@/utils/supabase/server";
import { 
  farmSchema, 
  agentSchema, 
  createFarmSchema, 
  updateFarmSchema,
  Farm,
  Agent,
  CreateFarmInput,
  UpdateFarmInput
} from "@/schemas/farm-schemas";
import { farmService, ApiResponse } from "./farm-service";

/**
 * Enhanced farm service with Zod validation
 */
export const enhancedFarmService = {
  /**
   * Get all farms for the current user with Zod validation
   */
  async getFarms(): Promise<ApiResponse<Farm[]>> {
    try {
      const response = await farmService.getFarms();
      
      if (response.error) {
        return response;
      }
      
      // Validate the response data using Zod
      if (response.data) {
        const validationResult = farmSchema.array().safeParse(response.data);
        
        if (validationResult.success) {
          return { data: validationResult.data };
        } else {
          console.error('Farm validation error:', validationResult.error);
          return { 
            data: response.data, // Return the original data
            error: 'Data validation warning: Some farm fields might be invalid' 
          };
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error in enhanced getFarms:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get farms for server components with Zod validation
   */
  async getFarmsServer(): Promise<ApiResponse<Farm[]>> {
    try {
      const response = await farmService.getFarmsServer();
      
      if (response.error) {
        return response;
      }
      
      // Validate the response data using Zod
      if (response.data) {
        const validationResult = farmSchema.array().safeParse(response.data);
        
        if (validationResult.success) {
          return { data: validationResult.data };
        } else {
          console.error('Farm validation error:', validationResult.error);
          return { 
            data: response.data, // Return the original data
            error: 'Data validation warning: Some farm fields might be invalid' 
          };
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error in enhanced getFarmsServer:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get a specific farm by ID with Zod validation
   */
  async getFarmById(id: number): Promise<ApiResponse<Farm>> {
    try {
      const response = await farmService.getFarmById(id);
      
      if (response.error) {
        return response;
      }
      
      // Validate the response data using Zod
      if (response.data) {
        const validationResult = farmSchema.safeParse(response.data);
        
        if (validationResult.success) {
          return { data: validationResult.data };
        } else {
          console.error('Farm validation error:', validationResult.error);
          return { 
            data: response.data, // Return the original data
            error: 'Data validation warning: Some farm fields might be invalid' 
          };
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error in enhanced getFarmById:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Create a new farm with Zod validation
   */
  async createFarm(farmData: CreateFarmInput): Promise<ApiResponse<Farm>> {
    try {
      // Validate the input data using Zod
      const validationResult = createFarmSchema.safeParse(farmData);
      
      if (!validationResult.success) {
        console.error('Create farm validation error:', validationResult.error);
        return { error: 'Invalid farm data: ' + validationResult.error.message };
      }
      
      // Proceed with the validated data
      const response = await farmService.createFarm(validationResult.data);
      
      // Validate the response
      if (response.data && !response.error) {
        const responseValidation = farmSchema.safeParse(response.data);
        
        if (responseValidation.success) {
          return { data: responseValidation.data };
        } else {
          console.error('Farm response validation error:', responseValidation.error);
          return { 
            data: response.data, 
            error: 'Data validation warning: Created farm might have invalid fields' 
          };
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error in enhanced createFarm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update an existing farm with Zod validation
   */
  async updateFarm(id: number, farmData: UpdateFarmInput): Promise<ApiResponse<Farm>> {
    try {
      // Validate the input data using Zod
      const validationResult = updateFarmSchema.safeParse(farmData);
      
      if (!validationResult.success) {
        console.error('Update farm validation error:', validationResult.error);
        return { error: 'Invalid farm data: ' + validationResult.error.message };
      }
      
      // Proceed with the validated data
      const response = await farmService.updateFarm(id, validationResult.data);
      
      // Validate the response
      if (response.data && !response.error) {
        const responseValidation = farmSchema.safeParse(response.data);
        
        if (responseValidation.success) {
          return { data: responseValidation.data };
        } else {
          console.error('Farm response validation error:', responseValidation.error);
          return { 
            data: response.data, 
            error: 'Data validation warning: Updated farm might have invalid fields' 
          };
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error in enhanced updateFarm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Delete a farm (pass-through to original service)
   */
  async deleteFarm(id: number): Promise<ApiResponse<null>> {
    return farmService.deleteFarm(id);
  },

  /**
   * Get agents with validation
   */
  async getAgents(farmId: number): Promise<ApiResponse<Agent[]>> {
    try {
      const response = await farmService.getAgents(farmId);
      
      if (response.error) {
        return response;
      }
      
      // Validate the response data using Zod
      if (response.data) {
        const validationResult = agentSchema.array().safeParse(response.data);
        
        if (validationResult.success) {
          return { data: validationResult.data };
        } else {
          console.error('Agent validation error:', validationResult.error);
          return { 
            data: response.data, // Return the original data
            error: 'Data validation warning: Some agent fields might be invalid' 
          };
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error in enhanced getAgents:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
};
