'use client';

import { vaultService } from './vault-service';
import { 
  VaultMasterSchema, 
  VaultAccountSchema,
  VaultTransactionSchema,
  VaultSettingsSchema,
  CreateVaultMasterInput,
  CreateVaultAccountInput,
  UpdateVaultMasterInput,
  UpdateVaultAccountInput,
  CreateVaultTransactionInput
} from '@/schemas/vault-schemas';
import { z } from 'zod';

// Define response type with generic for data
type ApiResponse<T> = {
  data?: T;
  error?: string;
  count?: number;
  total?: number;
};

/**
 * Enhanced vault service with Zod validation
 */
export const enhancedVaultService = {
  /**
   * Get all vault masters
   */
  async getVaultMasters(limit = 50, offset = 0): Promise<ApiResponse<z.infer<typeof VaultMasterSchema>[]>> {
    try {
      const response = await vaultService.getVaultMasters(limit, offset);
      
      if (response.error) {
        return { error: response.error };
      }
      
      // Validate response data with Zod
      const validatedData = z.array(VaultMasterSchema).safeParse(response.data);
      
      if (!validatedData.success) {
        console.error('Validation error:', validatedData.error);
        return { error: 'Invalid data received from server' };
      }
      
      return {
        data: validatedData.data,
        count: response.count,
        total: response.total
      };
    } catch (error) {
      console.error('Error getting vault masters:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  /**
   * Get vault master by ID
   */
  async getVaultMasterById(id: number): Promise<ApiResponse<z.infer<typeof VaultMasterSchema>>> {
    try {
      const response = await vaultService.getVaultMasterById(id);
      
      if (response.error) {
        return { error: response.error };
      }
      
      // Validate response data with Zod
      const validatedData = VaultMasterSchema.safeParse(response.data);
      
      if (!validatedData.success) {
        console.error('Validation error:', validatedData.error);
        return { error: 'Invalid data received from server' };
      }
      
      return { data: validatedData.data };
    } catch (error) {
      console.error('Error getting vault master by ID:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  /**
   * Get vault accounts by master ID
   */
  async getVaultAccounts(masterId: number): Promise<ApiResponse<z.infer<typeof VaultAccountSchema>[]>> {
    try {
      const response = await vaultService.getVaultAccounts(masterId);
      
      if (response.error) {
        return { error: response.error };
      }
      
      // Validate response data with Zod
      const validatedData = z.array(VaultAccountSchema).safeParse(response.data);
      
      if (!validatedData.success) {
        console.error('Validation error:', validatedData.error);
        return { error: 'Invalid data received from server' };
      }
      
      return { 
        data: validatedData.data,
        count: response.count,
        total: response.total
      };
    } catch (error) {
      console.error('Error getting vault accounts:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  /**
   * Get vault account by ID
   */
  async getVaultAccountById(id: number): Promise<ApiResponse<z.infer<typeof VaultAccountSchema>>> {
    try {
      const response = await vaultService.getVaultAccountById(id);
      
      if (response.error) {
        return { error: response.error };
      }
      
      // Validate response data with Zod
      const validatedData = VaultAccountSchema.safeParse(response.data);
      
      if (!validatedData.success) {
        console.error('Validation error:', validatedData.error);
        return { error: 'Invalid data received from server' };
      }
      
      return { data: validatedData.data };
    } catch (error) {
      console.error('Error getting vault account by ID:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  /**
   * Get vault transactions by account ID
   */
  async getVaultTransactions(accountId: number, limit = 50, offset = 0): Promise<ApiResponse<z.infer<typeof VaultTransactionSchema>[]>> {
    try {
      const response = await vaultService.getVaultTransactions(accountId, limit, offset);
      
      if (response.error) {
        return { error: response.error };
      }
      
      // Validate response data with Zod
      const validatedData = z.array(VaultTransactionSchema).safeParse(response.data);
      
      if (!validatedData.success) {
        console.error('Validation error:', validatedData.error);
        return { error: 'Invalid data received from server' };
      }
      
      return { 
        data: validatedData.data,
        count: response.count,
        total: response.total
      };
    } catch (error) {
      console.error('Error getting vault transactions:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  /**
   * Create vault master
   */
  async createVaultMaster(data: CreateVaultMasterInput): Promise<ApiResponse<z.infer<typeof VaultMasterSchema>>> {
    try {
      // Validate input data with Zod
      const validatedInput = CreateVaultMasterInput.parse(data);
      
      const response = await vaultService.createVaultMaster(validatedInput);
      
      if (response.error) {
        return { error: response.error };
      }
      
      // Validate response data with Zod
      const validatedData = VaultMasterSchema.safeParse(response.data);
      
      if (!validatedData.success) {
        console.error('Validation error:', validatedData.error);
        return { error: 'Invalid data received from server' };
      }
      
      return { data: validatedData.data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        console.error('Validation error:', error.errors);
        return { error: 'Invalid input data: ' + error.errors.map(e => e.message).join(', ') };
      }
      
      console.error('Error creating vault master:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  /**
   * Update vault master
   */
  async updateVaultMaster(id: number, data: UpdateVaultMasterInput): Promise<ApiResponse<z.infer<typeof VaultMasterSchema>>> {
    try {
      // Validate input data with Zod
      const validatedInput = UpdateVaultMasterInput.parse(data);
      
      const response = await vaultService.updateVaultMaster(id, validatedInput);
      
      if (response.error) {
        return { error: response.error };
      }
      
      // Validate response data with Zod
      const validatedData = VaultMasterSchema.safeParse(response.data);
      
      if (!validatedData.success) {
        console.error('Validation error:', validatedData.error);
        return { error: 'Invalid data received from server' };
      }
      
      return { data: validatedData.data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        console.error('Validation error:', error.errors);
        return { error: 'Invalid input data: ' + error.errors.map(e => e.message).join(', ') };
      }
      
      console.error('Error updating vault master:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  /**
   * Delete vault master
   */
  async deleteVaultMaster(id: number): Promise<ApiResponse<void>> {
    try {
      return await vaultService.deleteVaultMaster(id);
    } catch (error) {
      console.error('Error deleting vault master:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  /**
   * Create vault account
   */
  async createVaultAccount(data: CreateVaultAccountInput): Promise<ApiResponse<z.infer<typeof VaultAccountSchema>>> {
    try {
      // Validate input data with Zod
      const validatedInput = CreateVaultAccountInput.parse(data);
      
      const response = await vaultService.createVaultAccount(validatedInput);
      
      if (response.error) {
        return { error: response.error };
      }
      
      // Validate response data with Zod
      const validatedData = VaultAccountSchema.safeParse(response.data);
      
      if (!validatedData.success) {
        console.error('Validation error:', validatedData.error);
        return { error: 'Invalid data received from server' };
      }
      
      return { data: validatedData.data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        console.error('Validation error:', error.errors);
        return { error: 'Invalid input data: ' + error.errors.map(e => e.message).join(', ') };
      }
      
      console.error('Error creating vault account:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  /**
   * Update vault account
   */
  async updateVaultAccount(id: number, data: UpdateVaultAccountInput): Promise<ApiResponse<z.infer<typeof VaultAccountSchema>>> {
    try {
      // Validate input data with Zod
      const validatedInput = UpdateVaultAccountInput.parse(data);
      
      const response = await vaultService.updateVaultAccount(id, validatedInput);
      
      if (response.error) {
        return { error: response.error };
      }
      
      // Validate response data with Zod
      const validatedData = VaultAccountSchema.safeParse(response.data);
      
      if (!validatedData.success) {
        console.error('Validation error:', validatedData.error);
        return { error: 'Invalid data received from server' };
      }
      
      return { data: validatedData.data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        console.error('Validation error:', error.errors);
        return { error: 'Invalid input data: ' + error.errors.map(e => e.message).join(', ') };
      }
      
      console.error('Error updating vault account:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  /**
   * Delete vault account
   */
  async deleteVaultAccount(id: number): Promise<ApiResponse<void>> {
    try {
      return await vaultService.deleteVaultAccount(id);
    } catch (error) {
      console.error('Error deleting vault account:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  /**
   * Create vault transaction
   */
  async createVaultTransaction(data: CreateVaultTransactionInput): Promise<ApiResponse<z.infer<typeof VaultTransactionSchema>>> {
    try {
      // Validate input data with Zod
      const validatedInput = CreateVaultTransactionInput.parse(data);
      
      const response = await vaultService.createVaultTransaction(validatedInput);
      
      if (response.error) {
        return { error: response.error };
      }
      
      // Validate response data with Zod
      const validatedData = VaultTransactionSchema.safeParse(response.data);
      
      if (!validatedData.success) {
        console.error('Validation error:', validatedData.error);
        return { error: 'Invalid data received from server' };
      }
      
      return { data: validatedData.data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        console.error('Validation error:', error.errors);
        return { error: 'Invalid input data: ' + error.errors.map(e => e.message).join(', ') };
      }
      
      console.error('Error creating vault transaction:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  /**
   * Get vault settings
   */
  async getVaultSettings(masterId: number): Promise<ApiResponse<z.infer<typeof VaultSettingsSchema>>> {
    try {
      const response = await vaultService.getVaultSettings(masterId);
      
      if (response.error) {
        return { error: response.error };
      }
      
      // Validate response data with Zod
      const validatedData = VaultSettingsSchema.safeParse(response.data);
      
      if (!validatedData.success) {
        console.error('Validation error:', validatedData.error);
        return { error: 'Invalid data received from server' };
      }
      
      return { data: validatedData.data };
    } catch (error) {
      console.error('Error getting vault settings:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  
  /**
   * Update vault settings
   */
  async updateVaultSettings(masterId: number, data: Partial<z.infer<typeof VaultSettingsSchema>>): Promise<ApiResponse<z.infer<typeof VaultSettingsSchema>>> {
    try {
      // Validate input data with Zod
      const validatedInput = VaultSettingsSchema.partial().parse(data);
      
      const response = await vaultService.updateVaultSettings(masterId, validatedInput);
      
      if (response.error) {
        return { error: response.error };
      }
      
      // Validate response data with Zod
      const validatedData = VaultSettingsSchema.safeParse(response.data);
      
      if (!validatedData.success) {
        console.error('Validation error:', validatedData.error);
        return { error: 'Invalid data received from server' };
      }
      
      return { data: validatedData.data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        console.error('Validation error:', error.errors);
        return { error: 'Invalid input data: ' + error.errors.map(e => e.message).join(', ') };
      }
      
      console.error('Error updating vault settings:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};
