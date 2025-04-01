import { useState, useEffect } from 'react';
import { fetchIpfsJson, getMetadataUri } from '@/lib/ipfs';

interface NFTAttribute {
  trait_type: string;
  value: string;
}

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  animation_url?: string;
  background_color?: string;
  attributes: NFTAttribute[];
}

/**
 * Hook for fetching NFT metadata
 * @param tokenId The token ID to fetch metadata for
 * @param isRevealed Whether the collection is revealed
 * @param enabled Whether to enable the fetch (default: true)
 * @returns Metadata and loading state
 */
export function useNFTMetadata(tokenId: number | null, isRevealed: boolean, enabled: boolean = true) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reset state when tokenId changes
    setMetadata(null);
    setError(null);
    
    // Don't fetch if disabled or tokenId is null
    if (!enabled || tokenId === null) {
      return;
    }
    
    let isMounted = true;
    
    const fetchMetadata = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // First try to fetch from our API
        const apiUrl = `/api/metadata/${tokenId}?revealed=${isRevealed}`;
        const response = await fetch(apiUrl);
        
        // If API fails or returns 404, try IPFS directly
        if (!response.ok && isRevealed) {
          const ipfsUri = getMetadataUri(tokenId, isRevealed);
          const ipfsData = await fetchIpfsJson<NFTMetadata>(ipfsUri);
          
          if (isMounted) {
            setMetadata(ipfsData);
            setIsLoading(false);
          }
          return;
        }
        
        // Handle API response
        const data = await response.json();
        
        if (isMounted) {
          setMetadata(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching metadata:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch metadata'));
          setIsLoading(false);
        }
      }
    };
    
    fetchMetadata();
    
    return () => {
      isMounted = false;
    };
  }, [tokenId, isRevealed, enabled]);
  
  return { metadata, isLoading, error };
}

/**
 * Hook for fetching multiple NFT metadata in batch
 * @param tokenIds Array of token IDs to fetch metadata for
 * @param isRevealed Whether the collection is revealed
 * @param enabled Whether to enable the fetch (default: true)
 * @returns Array of metadata and loading state
 */
export function useBatchNFTMetadata(tokenIds: number[], isRevealed: boolean, enabled: boolean = true) {
  const [metadataList, setMetadataList] = useState<(NFTMetadata | null)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    // Reset state when tokenIds changes
    setMetadataList([]);
    setError(null);
    
    // Don't fetch if disabled or no tokenIds
    if (!enabled || tokenIds.length === 0) {
      return;
    }
    
    let isMounted = true;
    
    const fetchAllMetadata = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Create array of promises for all token IDs
        const promises = tokenIds.map(async (id) => {
          try {
            // First try API endpoint
            const apiUrl = `/api/metadata/${id}?revealed=${isRevealed}`;
            const response = await fetch(apiUrl);
            
            // If API fails, try IPFS directly
            if (!response.ok && isRevealed) {
              const ipfsUri = getMetadataUri(id, isRevealed);
              return await fetchIpfsJson<NFTMetadata>(ipfsUri);
            }
            
            return await response.json();
          } catch (err) {
            console.error(`Error fetching metadata for token ${id}:`, err);
            return null;
          }
        });
        
        // Wait for all promises to resolve
        const results = await Promise.all(promises);
        
        if (isMounted) {
          setMetadataList(results);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching batch metadata:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch batch metadata'));
          setIsLoading(false);
        }
      }
    };
    
    fetchAllMetadata();
    
    return () => {
      isMounted = false;
    };
  }, [tokenIds, isRevealed, enabled]);
  
  return { metadataList, isLoading, error };
}

export default useNFTMetadata; 