import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Create a connection pool to the Neon database
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon's SSL certificate
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get the wallet address from the query parameters
    const { address } = req.query;
    
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Query the user's NFTs
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          m.token_id,
          m.name,
          m.description,
          m.image_uri,
          m.ipfs_uri,
          m.is_revealed,
          m.external_url,
          o.acquired_at,
          o.transaction_hash
        FROM 
          sonic_nft.ownership o
        JOIN 
          sonic_nft.metadata m ON o.token_id = m.token_id
        WHERE 
          o.owner_address = $1
        ORDER BY 
          o.acquired_at DESC
      `, [address]);

      // Set cache headers - cache for 1 minute
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
      
      // Return the user's NFTs
      return res.status(200).json({
        address,
        count: result.rows.length,
        nfts: result.rows
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching user NFTs:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch user NFTs',
      message: error.message
    });
  }
} 