import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { ethers } from 'ethers';

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// NFT contract details
const SONIC_NFT_ABI = [
  "function totalSupply() external view returns (uint256)",
  "function maxSupply() external view returns (uint256)",
  "function maxPerWallet() external view returns (uint256)",
  "function mintPrice() external view returns (uint256)",
];

const SONIC_NFT_ADDRESS = process.env.NEXT_PUBLIC_SONIC_NFT_ADDRESS || "";

// Stats cache to prevent too many requests
let statsCache: any = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 30 * 1000; // 30 seconds

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Check cache first
    const now = Date.now();
    if (statsCache && now - lastCacheUpdate < CACHE_DURATION) {
      return res.status(200).json(statsCache);
    }
    
    // Connect to database
    const client = await pool.connect();
    
    try {
      // Get minted count from database
      const countResult = await client.query(
        'SELECT COUNT(*) as minted_count FROM nft_ownership'
      );
      
      const mintedCount = parseInt(countResult.rows[0].minted_count, 10);
      
      // Get blockchain data directly using ethers provider
      let totalSupply = 5000; // Default fallback
      let maxPerWallet = 5; // Default fallback
      let mintPrice = "0"; // Default fallback (free mint)
      
      try {
        const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
        const contract = new ethers.Contract(SONIC_NFT_ADDRESS, SONIC_NFT_ABI, provider);
        
        // Get blockchain data in parallel
        const [totalSupplyResult, maxPerWalletResult, mintPriceResult] = await Promise.all([
          contract.totalSupply(),
          contract.maxPerWallet(),
          contract.mintPrice()
        ]);
        
        totalSupply = totalSupplyResult.toNumber();
        maxPerWallet = maxPerWalletResult.toNumber();
        mintPrice = mintPriceResult.toString();
      } catch (contractError) {
        console.error("Error fetching contract data:", contractError);
        // Continue with fallback values
      }
      
      // Build stats object
      const stats = {
        totalSupply,
        mintedCount,
        maxPerWallet,
        mintPrice,
        percentComplete: (mintedCount / totalSupply) * 100,
        lastUpdated: new Date().toISOString()
      };
      
      // Update cache
      statsCache = stats;
      lastCacheUpdate = now;
      
      return res.status(200).json(stats);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching collection stats:", error);
    return res.status(500).json({ error: 'Failed to fetch collection stats' });
  }
} 