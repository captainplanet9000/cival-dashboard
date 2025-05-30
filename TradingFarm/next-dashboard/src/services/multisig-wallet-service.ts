/**
 * MultisigWalletService
 * Handles the deployment and management of chain-native multisig wallets across different blockchains
 * Supports Safe (EVM/Sonic), MSafe (Sui), and Squads (Solana)
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import type { Database } from '@/types/database.types';

// Interfaces for MultisigWallet configuration
export interface MultisigDeployParams {
  vaultId: string;
  chainSlug: 'evm' | 'sonic' | 'sui' | 'solana';
  initialOwners: string[];
  threshold: number;
  policyConfig?: Record<string, any>;
}

export interface PolicyConfig {
  maxPositionUSD?: number;
  maxTransactionUSD?: number;
  maxDailyVolumeUSD?: number;
  allowedProtocols?: string[];
  allowedAssets?: string[];
  restrictedFunctions?: string[];
  cooldownPeriod?: number; // in seconds
  withdrawalLimit?: number;
  bridgeLimit?: number;
}

export interface MultisigWalletInfo {
  id: string;
  vaultId: string;
  chainSlug: string;
  multisigAddress: string;
  multisigType: string;
  policyConfig: PolicyConfig;
  status: string;
  owners: {
    address: string;
    type: string;
    weight: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

/**
 * MultisigWalletService - Handles deploying and managing multisig wallets across different chains
 */
export class MultisigWalletService {
  /**
   * Deploy a new multisig wallet based on the selected chain
   * This is a placeholder that would integrate with actual blockchain SDKs
   */
  static async deployMultisig(params: MultisigDeployParams): Promise<{ success: boolean; multisigAddress?: string; error?: string }> {
    try {
      // In a real implementation, this would:
      // 1. Use the appropriate SDK based on chainSlug
      // 2. Deploy the multisig contract using appropriate factory
      // 3. Initialize with owners and threshold
      // 4. Save the result to the database
      
      // Mock implementation for development
      let multisigAddress: string;
      let multisigType: string;
      
      switch (params.chainSlug) {
        case 'evm':
        case 'sonic':
          // Would use @safe-global/protocol-kit in real implementation
          multisigAddress = `0x${Math.random().toString(16).substring(2, 42)}`;
          multisigType = 'safe';
          break;
        
        case 'sui':
          // Would use @m-safe/sui-sdk in real implementation
          multisigAddress = `0x${Math.random().toString(16).substring(2, 66)}`;
          multisigType = 'msafe';
          break;
          
        case 'solana':
          // Would use @sqds/core in real implementation
          multisigAddress = `${Math.random().toString(36).substring(2, 14)}${Math.random().toString(36).substring(2, 14)}`;
          multisigType = 'squads';
          break;
          
        default:
          return { success: false, error: `Unsupported chain: ${params.chainSlug}` };
      }
      
      // In production, we would call the appropriate blockchain SDK here
      // For now, we'll just save to the database directly
      
      const supabase = createServerClient();
      
      // Store the newly created multisig wallet in the database
      const { data: multisig, error } = await supabase
        .from('farm_vault_multisigs')
        .insert({
          vault_id: params.vaultId,
          chain_slug: params.chainSlug,
          multisig_address: multisigAddress,
          multisig_type: multisigType,
          policy_config: params.policyConfig || {},
          status: 'active'
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('Error storing multisig wallet:', error);
        return { success: false, error: error.message };
      }
      
      // Add owners to the multisig
      if (multisig?.id) {
        const ownersToInsert = params.initialOwners.map((ownerAddress, index) => ({
          multisig_id: multisig.id,
          owner_address: ownerAddress,
          owner_type: index === 0 ? 'user' : 'backend',
          weight: 1
        }));
        
        const { error: ownersError } = await supabase
          .from('multisig_owners')
          .insert(ownersToInsert);
        
        if (ownersError) {
          console.error('Error storing multisig owners:', ownersError);
          // We don't fail the entire operation if adding owners fails
          // In production, this should be better handled
        }
      }
      
      return { success: true, multisigAddress };
    } catch (error) {
      console.error('Error in deployMultisig:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * Update the policy configuration for a multisig wallet
   */
  static async updatePolicy(
    multisigId: string, 
    policyConfig: PolicyConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createServerClient();
      
      // First get the current multisig details to determine the chain and type
      const { data: multisig, error: fetchError } = await supabase
        .from('farm_vault_multisigs')
        .select('*')
        .eq('id', multisigId)
        .single();
      
      if (fetchError || !multisig) {
        return { success: false, error: fetchError?.message || 'Multisig not found' };
      }
      
      // This is where we would translate the policy config to chain-specific format
      // and apply it to the actual multisig contract on-chain
      // For this implementation, we'll just update the database
      
      const { error: updateError } = await supabase
        .from('farm_vault_multisigs')
        .update({ policy_config: policyConfig })
        .eq('id', multisigId);
      
      if (updateError) {
        return { success: false, error: updateError.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in updatePolicy:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * Get details about a multisig wallet including its owners
   */
  static async getMultisigWalletInfo(multisigId: string): Promise<{ success: boolean; data?: MultisigWalletInfo; error?: string }> {
    try {
      const supabase = createServerClient();
      
      // Get the multisig details
      const { data: multisig, error: fetchError } = await supabase
        .from('farm_vault_multisigs')
        .select('*')
        .eq('id', multisigId)
        .single();
      
      if (fetchError || !multisig) {
        return { success: false, error: fetchError?.message || 'Multisig not found' };
      }
      
      // Get the owners
      const { data: owners, error: ownersError } = await supabase
        .from('multisig_owners')
        .select('*')
        .eq('multisig_id', multisigId);
      
      if (ownersError) {
        return { success: false, error: ownersError.message };
      }
      
      // Format the response
      const multisigInfo: MultisigWalletInfo = {
        id: multisig.id,
        vaultId: multisig.vault_id,
        chainSlug: multisig.chain_slug,
        multisigAddress: multisig.multisig_address,
        multisigType: multisig.multisig_type,
        policyConfig: multisig.policy_config as PolicyConfig,
        status: multisig.status,
        owners: owners.map(owner => ({
          address: owner.owner_address,
          type: owner.owner_type,
          weight: owner.weight
        })),
        createdAt: multisig.created_at,
        updatedAt: multisig.updated_at
      };
      
      return { success: true, data: multisigInfo };
    } catch (error) {
      console.error('Error in getMultisigWalletInfo:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * List all multisig wallets for a vault
   */
  static async listMultisigWallets(vaultId: string): Promise<{ success: boolean; data?: MultisigWalletInfo[]; error?: string }> {
    try {
      const supabase = createServerClient();
      
      // Get all multisigs for the vault
      const { data: multisigs, error: fetchError } = await supabase
        .from('farm_vault_multisigs')
        .select('*')
        .eq('vault_id', vaultId);
      
      if (fetchError) {
        return { success: false, error: fetchError.message };
      }
      
      if (!multisigs || multisigs.length === 0) {
        return { success: true, data: [] };
      }
      
      // Get owners for all multisigs in one query
      const multisigIds = multisigs.map(m => m.id);
      const { data: allOwners, error: ownersError } = await supabase
        .from('multisig_owners')
        .select('*')
        .in('multisig_id', multisigIds);
      
      if (ownersError) {
        return { success: false, error: ownersError.message };
      }
      
      // Format the response
      const formattedMultisigs: MultisigWalletInfo[] = multisigs.map(multisig => {
        const multisigOwners = allOwners?.filter(owner => owner.multisig_id === multisig.id) || [];
        
        return {
          id: multisig.id,
          vaultId: multisig.vault_id,
          chainSlug: multisig.chain_slug,
          multisigAddress: multisig.multisig_address,
          multisigType: multisig.multisig_type,
          policyConfig: multisig.policy_config as PolicyConfig,
          status: multisig.status,
          owners: multisigOwners.map(owner => ({
            address: owner.owner_address,
            type: owner.owner_type,
            weight: owner.weight
          })),
          createdAt: multisig.created_at,
          updatedAt: multisig.updated_at
        };
      });
      
      return { success: true, data: formattedMultisigs };
    } catch (error) {
      console.error('Error in listMultisigWallets:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * Add an owner to a multisig wallet
   */
  static async addOwner(
    multisigId: string,
    ownerAddress: string,
    ownerType: string = 'user',
    weight: number = 1
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createServerClient();
      
      // First verify the multisig exists
      const { data: multisig, error: fetchError } = await supabase
        .from('farm_vault_multisigs')
        .select('*')
        .eq('id', multisigId)
        .single();
      
      if (fetchError || !multisig) {
        return { success: false, error: fetchError?.message || 'Multisig not found' };
      }
      
      // In a real implementation, this would call the appropriate blockchain SDK
      // to add the owner to the on-chain multisig contract
      
      // Add to database
      const { error: insertError } = await supabase
        .from('multisig_owners')
        .insert({
          multisig_id: multisigId,
          owner_address: ownerAddress,
          owner_type: ownerType,
          weight
        });
      
      if (insertError) {
        return { success: false, error: insertError.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in addOwner:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * Remove an owner from a multisig wallet
   */
  static async removeOwner(
    multisigId: string,
    ownerAddress: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createServerClient();
      
      // First verify the multisig exists
      const { data: multisig, error: fetchError } = await supabase
        .from('farm_vault_multisigs')
        .select('*')
        .eq('id', multisigId)
        .single();
      
      if (fetchError || !multisig) {
        return { success: false, error: fetchError?.message || 'Multisig not found' };
      }
      
      // In a real implementation, this would call the appropriate blockchain SDK
      // to remove the owner from the on-chain multisig contract
      
      // Remove from database
      const { error: deleteError } = await supabase
        .from('multisig_owners')
        .delete()
        .eq('multisig_id', multisigId)
        .eq('owner_address', ownerAddress);
      
      if (deleteError) {
        return { success: false, error: deleteError.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in removeOwner:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
