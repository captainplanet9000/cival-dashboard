import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Cache for user NFTs
const userNftsCache: Record<string, {
  tokenIds: number[],
  timestamp: number
}> = {};

// Cache expiration time (3 minutes)
const CACHE_EXPIRATION = 3 * 60 * 1000;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  let { address } = req.query;
  
  // Ensure the address is a string and normalized
  if (Array.isArray(address)) {
    address = address[0];
  }
  
  // Validate Ethereum address
  if (!address || !ethers.utils.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid Ethereum address' });
  }
  
  try {
    // Normalize the address (convert to checksum address)
    const normalizedAddress = ethers.utils.getAddress(address);
    
    // Check cache first
    const now = Date.now();
    const cacheKey = normalizedAddress.toLowerCase();
    const cachedNfts = userNftsCache[cacheKey];
    
    // Return cached data if valid
    if (cachedNfts && now - cachedNfts.timestamp < CACHE_EXPIRATION) {
      return res.status(200).json({ 
        address: normalizedAddress,
        tokenIds: cachedNfts.tokenIds,
        count: cachedNfts.tokenIds.length,
        fromCache: true
      });
    }
    
    // Query database for user's NFTs
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT token_id FROM sonic_nft.nft_ownership 
         WHERE owner_address = $1
         ORDER BY token_id ASC`,
        [normalizedAddress]
      );
      
      // Extract token IDs
      const tokenIds = result.rows.map(row => parseInt(row.token_id, 10));
      
      // Store in cache
      userNftsCache[cacheKey] = {
        tokenIds,
        timestamp: now
      };
      
      // Return user's NFTs
      return res.status(200).json({
        address: normalizedAddress,
        tokenIds,
        count: tokenIds.length,
        fromCache: false
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`Error fetching NFTs for address ${address}:`, error);
    return res.status(500).json({ error: 'Failed to fetch user NFTs' });
  }
} 