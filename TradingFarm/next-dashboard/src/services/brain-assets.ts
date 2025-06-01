import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';

// Brain asset types for TypeScript
export interface BrainAsset {
  id: number;
  filename: string;
  title: string;
  description: string | null;
  asset_type: string;
  storage_path: string;
  content_text: string | null;
  summary: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  metadata: any;
  owner_id: string;
}

export interface BrainAssetEmbedding {
  id: number;
  brain_asset_id: number;
  chunk_index: number;
  chunk_text: string;
  embedding: number[];
  created_at: string;
}

export interface SearchResult {
  brain_asset_id: number;
  chunk_index: number;
  chunk_text: string;
  similarity: number;
  asset?: BrainAsset;
}

/**
 * Get all brain assets
 */
export async function getAllBrainAssets() {
  const supabase = createBrowserClient();
  
  const { data, error } = await supabase
    .from('brain_assets')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching brain assets:', error);
    throw error;
  }
  
  return data as BrainAsset[];
}

/**
 * Get brain assets by type
 */
export async function getBrainAssetsByType(assetType: string) {
  const supabase = createBrowserClient();
  
  const { data, error } = await supabase
    .from('brain_assets')
    .select('*')
    .eq('asset_type', assetType)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching brain assets by type:', error);
    throw error;
  }
  
  return data as BrainAsset[];
}

/**
 * Get a brain asset by ID
 */
export async function getBrainAssetById(id: number) {
  const supabase = createBrowserClient();
  
  const { data, error } = await supabase
    .from('brain_assets')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching brain asset:', error);
    throw error;
  }
  
  return data as BrainAsset;
}

/**
 * Download brain asset file content
 */
export async function downloadBrainAsset(storagePath: string) {
  const supabase = createBrowserClient();
  
  const { data, error } = await supabase
    .storage
    .from('farm_brain_assets')
    .download(storagePath);
  
  if (error) {
    console.error('Error downloading brain asset:', error);
    throw error;
  }
  
  return data;
}

/**
 * Get a download URL for a brain asset
 */
export async function getBrainAssetUrl(storagePath: string, expiresIn = 60) {
  const supabase = createBrowserClient();
  
  const { data, error } = await supabase
    .storage
    .from('farm_brain_assets')
    .createSignedUrl(storagePath, expiresIn);
  
  if (error) {
    console.error('Error creating signed URL:', error);
    throw error;
  }
  
  return data.signedUrl;
}

/**
 * Delete a brain asset and its file
 */
export async function deleteBrainAsset(assetId: number) {
  const supabase = createBrowserClient();
  
  // Get the asset to find the storage path
  const { data: asset, error: getError } = await supabase
    .from('brain_assets')
    .select('storage_path')
    .eq('id', assetId)
    .single();
  
  if (getError) {
    console.error('Error getting brain asset for deletion:', getError);
    throw getError;
  }
  
  // Delete the file from storage
  const { error: storageError } = await supabase
    .storage
    .from('farm_brain_assets')
    .remove([asset.storage_path]);
  
  if (storageError) {
    console.error('Error deleting file from storage:', storageError);
    // Continue with database deletion even if storage deletion fails
  }
  
  // Delete the asset record from the database
  const { error: dbError } = await supabase
    .from('brain_assets')
    .delete()
    .eq('id', assetId);
  
  if (dbError) {
    console.error('Error deleting brain asset from database:', dbError);
    throw dbError;
  }
  
  return true;
}

/**
 * Search brain assets by semantic query
 * This is a server-side function due to OpenAI API key requirements
 */
export async function searchBrainAssets(query: string, limit = 5, threshold = 0.7) {
  // This would typically be an API endpoint call
  // For now, we're creating a simulated implementation
  
  try {
    // Make a request to a search API endpoint
    const response = await fetch('/api/brain/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit,
        threshold
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to search brain assets');
    }
    
    const results = await response.json();
    return results as SearchResult[];
  } catch (error) {
    console.error('Error searching brain assets:', error);
    throw error;
  }
}

/**
 * Link a brain asset to a strategy
 */
export async function linkBrainAssetToStrategy(assetId: number, strategyId: number, role: string, configuration?: any) {
  const supabase = createBrowserClient();
  
  const { data, error } = await supabase
    .from('strategy_brain_assets')
    .insert({
      strategy_id: strategyId,
      brain_asset_id: assetId,
      role,
      configuration
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error linking brain asset to strategy:', error);
    throw error;
  }
  
  return data;
}

/**
 * Get brain assets linked to a strategy
 */
export async function getStrategyBrainAssets(strategyId: number) {
  const supabase = createBrowserClient();
  
  const { data, error } = await supabase
    .from('strategy_brain_assets')
    .select(`
      brain_asset_id,
      role,
      configuration,
      brain_assets (*)
    `)
    .eq('strategy_id', strategyId);
  
  if (error) {
    console.error('Error getting strategy brain assets:', error);
    throw error;
  }
  
  return data;
}

/**
 * Get the latest PineScript indicators
 */
export async function getLatestPineScriptIndicators(limit = 5) {
  const supabase = createBrowserClient();
  
  const { data, error } = await supabase
    .from('brain_assets')
    .select('*')
    .eq('asset_type', 'pinescript')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching PineScript indicators:', error);
    throw error;
  }
  
  return data as BrainAsset[];
}
