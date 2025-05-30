import { useState, useEffect } from 'react';
import { optimizeIpfsUrl } from '@/utils/ipfs';

export interface NFTMetadata {
  id: number;
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  generatorType?: string;
  generationParams?: Record<string, any>;
}

interface UseNFTMetadataOptions {
  autoFetch?: boolean;
}

export const useNFTMetadata = (
  tokenId: number | null, 
  options: UseNFTMetadataOptions = { autoFetch: true }
) => {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetadata = async (id: number) => {
    if (!id && id !== 0) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch from our API which handles IPFS gateway optimization
      const response = await fetch(`/api/nft/${id}/metadata`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata for NFT #${id}`);
      }
      
      const data = await response.json();
      
      // Optimize the IPFS URL for the image if it's an IPFS URL
      if (data.image && data.image.includes('ipfs://')) {
        data.image = optimizeIpfsUrl(data.image);
      }
      
      setMetadata(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error(`Error fetching metadata for NFT #${id}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch metadata when tokenId changes
  useEffect(() => {
    if (options.autoFetch && tokenId !== null) {
      fetchMetadata(tokenId);
    }
  }, [tokenId, options.autoFetch]);

  return {
    metadata,
    isLoading,
    error,
    fetchMetadata
  };
};

// Hook for fetching multiple NFT metadata in batch
export const useBatchNFTMetadata = (tokenIds: number[]) => {
  const [metadataList, setMetadataList] = useState<Record<number, NFTMetadata>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBatchMetadata = async (ids: number[]) => {
    if (!ids.length) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the batch API endpoint
      const response = await fetch('/api/nft/batch-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tokenIds: ids })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch batch metadata');
      }
      
      const data = await response.json();
      
      // Process all metadata objects for optimized IPFS URLs
      const processedMetadata: Record<number, NFTMetadata> = {};
      
      for (const [id, metadata] of Object.entries(data)) {
        const meta = metadata as NFTMetadata;
        
        if (meta.image && meta.image.includes('ipfs://')) {
          meta.image = optimizeIpfsUrl(meta.image);
        }
        
        processedMetadata[Number(id)] = meta;
      }
      
      setMetadataList(processedMetadata);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Error fetching batch metadata:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch metadata when tokenIds changes
  useEffect(() => {
    if (tokenIds.length > 0) {
      fetchBatchMetadata(tokenIds);
    }
  }, [tokenIds.join(',')]);

  return {
    metadataList,
    isLoading,
    error,
    fetchBatchMetadata
  };
}; 