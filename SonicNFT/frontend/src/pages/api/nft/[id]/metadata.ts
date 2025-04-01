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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { id } = req.query;
  const tokenId = parseInt(id as string, 10);
  
  if (isNaN(tokenId)) {
    return res.status(400).json({ error: 'Invalid token ID' });
  }
  
  try {
    // Check cache first
    const now = Date.now();
    const cachedMetadata = metadataCache[tokenId];
    
    if (cachedMetadata && now - cachedMetadata.timestamp < CACHE_EXPIRATION) {
      return res.status(200).json(cachedMetadata.data);
    }
    
    // Fetch from database
    const client = await pool.connect();
    
    try {
      // Get metadata record from database
      const result = await client.query(
        'SELECT token_id, ipfs_uri, cache_timestamp FROM nft_metadata WHERE token_id = $1',
        [tokenId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'NFT metadata not found' });
      }
      
      const { ipfs_uri } = result.rows[0];
      
      // Fetch metadata from IPFS
      const ipfsUrl = ipfs_uri.startsWith('ipfs://') 
        ? optimizeIpfsUrl(ipfs_uri) 
        : ipfs_uri;
      
      const ipfsResponse = await fetch(ipfsUrl);
      
      if (!ipfsResponse.ok) {
        throw new Error(`Failed to fetch from IPFS: ${ipfsResponse.statusText}`);
      }
      
      const metadata = await ipfsResponse.json();
      
      // Store in cache
      metadataCache[tokenId] = {
        data: metadata,
        timestamp: now
      };
      
      // Update cache timestamp in database
      await client.query(
        'UPDATE nft_metadata SET cache_timestamp = NOW() WHERE token_id = $1',
        [tokenId]
      );
      
      return res.status(200).json(metadata);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`Error fetching metadata for token ID ${tokenId}:`, error);
    return res.status(500).json({ error: 'Failed to fetch NFT metadata' });
  }
} 