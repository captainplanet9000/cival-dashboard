import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Smart contract ABI (minimal for this endpoint)
const SONIC_NFT_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function mintedByAddress(address owner) external view returns (uint256)"
];

const SONIC_NFT_ADDRESS = process.env.NEXT_PUBLIC_SONIC_NFT_ADDRESS || "";

// Stats cache to prevent too many requests
const statsCache: Record<string, {
  data: any,
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
    const cachedStats = statsCache[cacheKey];
    
    if (cachedStats && now - cachedStats.timestamp < CACHE_EXPIRATION) {
      return res.status(200).json(cachedStats.data);
    }
    
    // Connect to database
    const client = await pool.connect();
    
    try {
      // Get user NFT count from database
      const countResult = await client.query(
        'SELECT COUNT(*) as nft_count FROM sonic_nft.nft_ownership WHERE owner_address = $1',
        [normalizedAddress]
      );
      
      const ownedCount = parseInt(countResult.rows[0].nft_count, 10);
      
      // Get blockchain data about minted tokens
      let mintedByUser = 0;
      
      try {
        const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
        const contract = new ethers.Contract(SONIC_NFT_ADDRESS, SONIC_NFT_ABI, provider);
        
        // Get minted count directly from contract
        mintedByUser = (await contract.mintedByAddress(normalizedAddress)).toNumber();
      } catch (contractError) {
        console.error("Error fetching contract data for user:", contractError);
        // Fallback to database count for minted (less accurate, but better than nothing)
        // This could be improved with transaction tracking in a real system
        mintedByUser = ownedCount;
      }
      
      // Build stats object
      const stats = {
        address: normalizedAddress,
        ownedCount,
        mintedByUser,
        lastUpdated: new Date().toISOString()
      };
      
      // Update cache
      statsCache[cacheKey] = {
        data: stats,
        timestamp: now
      };
      
      return res.status(200).json(stats);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`Error fetching NFT stats for address ${address}:`, error);
    return res.status(500).json({ error: 'Failed to fetch user NFT stats' });
  }
} 