/**
 * IPFS utility functions for the Sonic NFT frontend
 * Provides gateway fallbacks, URL formatting, and caching mechanisms
 */

// Default IPFS gateways to use as fallback
const DEFAULT_IPFS_GATEWAYS = [
  'https://nftstorage.link/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
];

// Default gateway to use
let DEFAULT_GATEWAY = DEFAULT_IPFS_GATEWAYS[0];

// Cache for previously resolved IPFS URLs (simple in-memory cache)
const urlCache: Record<string, string> = {};

// Cache for active gateways
let gatewaysCache: { gateway_url: string; priority: number; average_response_time: number }[] = [];
let gatewaysCacheExpiry = 0;

/**
 * Fetch active IPFS gateways from the API
 * @returns Array of active gateways sorted by performance
 */
export async function fetchActiveGateways(): Promise<string[]> {
  try {
    // If cache is still valid, return from cache
    if (gatewaysCache.length > 0 && gatewaysCacheExpiry > Date.now()) {
      return gatewaysCache.map(g => g.gateway_url);
    }
    
    // Fetch active gateways from the API
    const response = await fetch('/api/ipfs/healthcheck');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch IPFS gateways: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Update cache if we got valid data
    if (data.gateways && Array.isArray(data.gateways)) {
      gatewaysCache = data.gateways;
      gatewaysCacheExpiry = Date.now() + 5 * 60 * 1000; // Cache for 5 minutes
      
      // Update default gateway if we have active gateways
      if (gatewaysCache.length > 0) {
        DEFAULT_GATEWAY = gatewaysCache[0].gateway_url;
      }
      
      return gatewaysCache.map(g => g.gateway_url);
    }
    
    return DEFAULT_IPFS_GATEWAYS;
  } catch (err) {
    console.warn('Error fetching active IPFS gateways:', err);
    return DEFAULT_IPFS_GATEWAYS;
  }
}

/**
 * Get all available IPFS gateways
 * @returns Array of IPFS gateway URLs
 */
export async function getIpfsGateways(): Promise<string[]> {
  try {
    const gateways = await fetchActiveGateways();
    return gateways.length > 0 ? gateways : DEFAULT_IPFS_GATEWAYS;
  } catch (err) {
    return DEFAULT_IPFS_GATEWAYS;
  }
}

/**
 * Formats an IPFS URI to use a specific gateway
 * @param ipfsUri - The IPFS URI (can be ipfs://{CID} or just {CID})
 * @param gateway - The gateway URL to use (defaults to first in list)
 * @returns Formatted HTTP URL
 */
export function formatIpfsUrl(ipfsUri: string, gateway: string = DEFAULT_GATEWAY): string {
  if (!ipfsUri) return '';
  
  // Extract CID from ipfs:// URI
  const cid = ipfsUri.replace(/^ipfs:\/\//, '').replace(/^\/ipfs\//, '');
  
  // If gateway already ends with /ipfs/, don't add it again
  if (gateway.endsWith('/ipfs/')) {
    return `${gateway}${cid}`;
  }
  
  return `${gateway}${cid}`;
}

/**
 * Gets a cached IPFS URL or creates and caches a new one
 * @param ipfsUri - The IPFS URI
 * @param gateway - Optional specific gateway to use
 * @returns HTTP URL for the IPFS content
 */
export function getIpfsUrl(ipfsUri: string, gateway?: string): string {
  if (!ipfsUri) return '';
  
  // Return from cache if available
  if (urlCache[ipfsUri]) {
    return urlCache[ipfsUri];
  }
  
  const url = formatIpfsUrl(ipfsUri, gateway);
  urlCache[ipfsUri] = url;
  return url;
}

/**
 * Creates an image URL with a fallback mechanism that tries multiple gateways
 * @param ipfsUri - The IPFS URI to the image
 * @returns Image URL with srcSet for multiple gateways
 */
export async function getIpfsImageSources(ipfsUri: string): Promise<{
  src: string;
  srcSet: string;
}> {
  if (!ipfsUri) {
    return { src: '', srcSet: '' };
  }
  
  // Get all available gateways
  const gateways = await getIpfsGateways();
  
  // Primary source is the default gateway
  const src = getIpfsUrl(ipfsUri, gateways[0]);
  
  // Create a srcSet with all gateway options for fallback
  const srcSet = gateways.map(gateway => 
    `${formatIpfsUrl(ipfsUri, gateway)} 1x`
  ).join(', ');
  
  return { src, srcSet };
}

// For backward compatibility with the synchronous version
export function getIpfsImageSourcesSync(ipfsUri: string): {
  src: string;
  srcSet: string;
} {
  if (!ipfsUri) {
    return { src: '', srcSet: '' };
  }
  
  // Primary source is the default gateway
  const src = getIpfsUrl(ipfsUri);
  
  // Create a srcSet with default gateways for fallback
  const srcSet = DEFAULT_IPFS_GATEWAYS.map(gateway => 
    `${formatIpfsUrl(ipfsUri, gateway)} 1x`
  ).join(', ');
  
  return { src, srcSet };
}

/**
 * Function to fetch JSON metadata from IPFS with automatic gateway fallback
 * @param ipfsUri - The IPFS URI to the metadata
 * @returns Promise resolving to the JSON data
 */
export async function fetchIpfsJson<T>(ipfsUri: string): Promise<T> {
  if (!ipfsUri) {
    throw new Error('No IPFS URI provided');
  }
  
  // Get all available gateways
  const gateways = await getIpfsGateways();
  
  // Try each gateway in sequence until one works
  for (const gateway of gateways) {
    try {
      const url = formatIpfsUrl(ipfsUri, gateway);
      const response = await fetch(url, { 
        cache: 'force-cache', // Use browser cache when available
      });
      
      if (!response.ok) {
        continue; // Try next gateway if this one fails
      }
      
      return await response.json() as T;
    } catch (error) {
      // Continue to next gateway on error
      console.warn(`Failed to fetch from gateway: ${gateway}`, error);
    }
  }
  
  // If all gateways fail, throw an error
  throw new Error('Failed to fetch IPFS content from all gateways');
}

/**
 * Calculate base IPFS URI for the collection
 * @param revealed Whether the collection is revealed or not
 * @returns The base URI for the collection
 */
export function getBaseIpfsUri(revealed: boolean): string {
  // Use environment variables if available, fallback to defaults
  const revealedUri = typeof window !== 'undefined' 
    ? window.ENV?.NEXT_PUBLIC_REVEALED_BASE_URI || 'ipfs://INSERT_YOUR_REVEALED_IMAGES_CID_HERE/'
    : 'ipfs://INSERT_YOUR_REVEALED_IMAGES_CID_HERE/';
    
  const unrevealedUri = typeof window !== 'undefined'
    ? window.ENV?.NEXT_PUBLIC_UNREVEALED_BASE_URI || 'ipfs://INSERT_YOUR_UNREVEALED_IMAGES_CID_HERE/'
    : 'ipfs://INSERT_YOUR_UNREVEALED_IMAGES_CID_HERE/';
  
  return revealed ? revealedUri : unrevealedUri;
}

/**
 * Get the metadata URI for a specific token
 * @param tokenId The token ID
 * @param revealed Whether the collection is revealed
 * @returns The metadata URI
 */
export function getMetadataUri(tokenId: number, revealed: boolean): string {
  if (revealed) {
    return `${getBaseIpfsUri(true)}${tokenId}.json`;
  } else {
    // For unrevealed tokens, we can either use a common metadata file or generate dynamically
    return `/api/metadata/${tokenId}?revealed=false`;
  }
}

// Add global type for window.ENV
declare global {
  interface Window {
    ENV?: {
      NEXT_PUBLIC_REVEALED_BASE_URI?: string;
      NEXT_PUBLIC_UNREVEALED_BASE_URI?: string;
    };
  }
} 