import type { NextApiRequest, NextApiResponse } from 'next';
import { optimizeIpfsUrl } from '@/utils/ipfs';
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Cache for metadata to improve performance
const metadataCache: Record<number, {
  data: any,
  timestamp: number
}> = {};

// Cache expiration time (10 minutes)
const CACHE_EXPIRATION = 10 * 60 * 1000;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Get token IDs from request body
  const { tokenIds } = req.body;
  
  if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty tokenIds array' });
  }
  
  // Limit to 50 tokens per request to prevent overloading
  if (tokenIds.length > 50) {
    return res.status(400).json({ error: 'Too many token IDs (max 50)' });
  }
  
  try {
    const client = await pool.connect();
    const results: Record<number, any> = {};
    const now = Date.now();
    
    // Keep track of which token IDs need to be fetched from IPFS
    const tokenIdsToFetch: Array<{
      tokenId: number,
      ipfsUri: string
    }> = [];
    
    try {
      // Check cache first for each token ID
      for (const tokenId of tokenIds) {
        const cachedMetadata = metadataCache[tokenId];
        
        if (cachedMetadata && now - cachedMetadata.timestamp < CACHE_EXPIRATION) {
          results[tokenId] = cachedMetadata.data;
        } else {
          // Add to the list of tokens to fetch
          tokenIdsToFetch.push({ tokenId, ipfsUri: '' });
        }
      }
      
      // If we have tokens to fetch from the database
      if (tokenIdsToFetch.length > 0) {
        // Get IPFS URIs for tokens we need to fetch
        const idsToFetch = tokenIdsToFetch.map(item => item.tokenId);
        
        const metadataQuery = await client.query(
          `SELECT token_id, ipfs_uri FROM sonic_nft.nft_metadata 
           WHERE token_id = ANY($1::int[])`,
          [idsToFetch]
        );
        
        // Build a map of token IDs to IPFS URIs
        const ipfsUriMap: Record<number, string> = {};
        
        for (const row of metadataQuery.rows) {
          const id = parseInt(row.token_id, 10);
          ipfsUriMap[id] = row.ipfs_uri;
        }
        
        // Update the tokenIdsToFetch with the correct IPFS URIs
        for (let i = 0; i < tokenIdsToFetch.length; i++) {
          const tokenId = tokenIdsToFetch[i].tokenId;
          if (ipfsUriMap[tokenId]) {
            tokenIdsToFetch[i].ipfsUri = ipfsUriMap[tokenId];
          }
        }
        
        // Fetch metadata from IPFS for each token
        const metadataPromises = tokenIdsToFetch
          .filter(item => item.ipfsUri) // Only process tokens with valid IPFS URIs
          .map(async ({ tokenId, ipfsUri }) => {
            try {
              // Optimize the IPFS URL
              const optimizedUrl = ipfsUri.startsWith('ipfs://') 
                ? optimizeIpfsUrl(ipfsUri) 
                : ipfsUri;
              
              // Fetch metadata from IPFS
              const response = await fetch(optimizedUrl);
              
              if (!response.ok) {
                throw new Error(`Failed to fetch metadata for token ID ${tokenId}: ${response.statusText}`);
              }
              
              const metadata = await response.json();
              
              // Store in cache
              metadataCache[tokenId] = {
                data: metadata,
                timestamp: now
              };
              
              // Add to results
              results[tokenId] = metadata;
              
              // Update cache timestamp in database (do this async without awaiting)
              client.query(
                'UPDATE sonic_nft.nft_metadata SET cache_timestamp = NOW() WHERE token_id = $1',
                [tokenId]
              ).catch(err => console.error(`Error updating cache timestamp for token ${tokenId}:`, err));
              
              return { tokenId, success: true };
            } catch (error) {
              console.error(`Error fetching metadata for token ID ${tokenId}:`, error);
              results[tokenId] = null;
              return { tokenId, success: false, error };
            }
          });
        
        // Wait for all metadata fetches to complete
        if (metadataPromises.length > 0) {
          await Promise.all(metadataPromises);
        }
      }
      
      // Return results including both cached and newly fetched metadata
      return res.status(200).json(results);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in batch metadata fetching:', error);
    return res.status(500).json({ error: 'Failed to fetch batch metadata' });
  }
} 