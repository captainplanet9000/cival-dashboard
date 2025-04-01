import { Pool } from 'pg';

// Initialize the connection pool only on the server
let pool: Pool | null = null;

if (typeof window === 'undefined') {
  pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Required for Neon's SSL certificate
    },
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 2000, // How long to wait for a connection
  });
}

/**
 * Get a client from the connection pool
 * @returns A client from the connection pool
 */
export async function getClient() {
  if (!pool) {
    throw new Error('Database pool not initialized - this should only be called server-side');
  }
  return await pool.connect();
}

/**
 * Execute a query on the database with parameters
 * @param text SQL query text
 * @param params Query parameters
 * @returns Query result
 */
export async function query(text: string, params: any[] = []) {
  if (!pool) {
    throw new Error('Database pool not initialized - this should only be called server-side');
  }
  
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

/**
 * Update NFT ownership after minting
 * @param tokenId The token ID
 * @param ownerAddress The owner's wallet address
 * @param txHash Transaction hash
 */
export async function recordNFTOwnership(
  tokenId: number,
  ownerAddress: string,
  txHash: string
) {
  // First ensure the metadata record exists
  await query(
    `INSERT INTO sonic_nft.metadata (token_id, name, description, is_revealed)
     VALUES ($1, $2, $3, false)
     ON CONFLICT (token_id) DO NOTHING`,
    [tokenId, `Sonic NFT #${tokenId}`, 'Sonic NFT is a collection of generative art pieces.']
  );
  
  // Then record ownership
  await query(
    `INSERT INTO sonic_nft.ownership (token_id, owner_address, transaction_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (token_id) DO UPDATE SET
       owner_address = $2,
       transaction_hash = $3,
       acquired_at = CURRENT_TIMESTAMP`,
    [tokenId, ownerAddress, txHash]
  );
  
  // Update collection stats
  await query(
    `UPDATE sonic_nft.collection_stats
     SET minted_count = minted_count + 1,
         holder_count = (SELECT COUNT(DISTINCT owner_address) FROM sonic_nft.ownership),
         last_updated = CURRENT_TIMESTAMP
     WHERE id = 1`
  );
  
  // Record minting activity
  await query(
    `INSERT INTO sonic_nft.minting_activity (wallet_address, token_id, transaction_hash, status)
     VALUES ($1, $2, $3, 'success')`,
    [ownerAddress, tokenId, txHash]
  );
}

/**
 * Update IPFS gateway status and response time
 * @param gatewayUrl The gateway URL
 * @param status Status of the gateway ('online' or 'offline')
 * @param responseTime Response time in milliseconds
 */
export async function updateGatewayStatus(
  gatewayUrl: string,
  status: 'online' | 'offline',
  responseTime?: number
) {
  await query(
    `UPDATE sonic_nft.ipfs_gateways
     SET 
       status = $2,
       last_checked = CURRENT_TIMESTAMP,
       average_response_time = $3
     WHERE gateway_url = $1`,
    [gatewayUrl, status, responseTime]
  );
}

/**
 * Get active IPFS gateways sorted by performance
 */
export async function getActiveGateways() {
  const result = await query(
    `SELECT gateway_url, priority, average_response_time
     FROM sonic_nft.ipfs_gateways
     WHERE is_active = true AND (status = 'online' OR status = 'unknown')
     ORDER BY 
       CASE WHEN status = 'online' THEN 0 ELSE 1 END,
       CASE WHEN average_response_time IS NULL THEN 999999 ELSE average_response_time END,
       priority`
  );
  
  return result.rows;
}

/**
 * Check if a token ID exists
 * @param tokenId The token ID to check
 * @returns Whether the token ID exists
 */
export async function tokenExists(tokenId: number): Promise<boolean> {
  const result = await query(
    'SELECT EXISTS(SELECT 1 FROM sonic_nft.metadata WHERE token_id = $1)',
    [tokenId]
  );
  
  return result.rows[0].exists;
}

/**
 * Get NFTs owned by a wallet address
 * @param ownerAddress The owner's wallet address
 * @returns Array of owned NFTs with metadata
 */
export async function getNFTsByOwner(ownerAddress: string) {
  const result = await query(
    `SELECT 
       m.token_id,
       m.name,
       m.description,
       m.image_uri,
       m.ipfs_uri,
       m.is_revealed,
       m.external_url,
       m.background_color,
       o.acquired_at,
       o.transaction_hash
     FROM 
       sonic_nft.ownership o
     JOIN 
       sonic_nft.metadata m ON o.token_id = m.token_id
     WHERE 
       o.owner_address = $1
     ORDER BY 
       o.acquired_at DESC`,
    [ownerAddress]
  );
  
  return result.rows;
}

/**
 * Update metadata for a token
 * @param tokenId The token ID
 * @param metadata The metadata to update
 */
export async function updateMetadata(
  tokenId: number,
  metadata: {
    name?: string;
    description?: string;
    image_uri?: string;
    ipfs_uri?: string;
    external_url?: string;
    background_color?: string;
    is_revealed?: boolean;
    raw_metadata?: any;
  }
) {
  const fields = [];
  const values = [tokenId];
  let paramIndex = 2;
  
  // Build dynamic SQL query based on provided fields
  Object.entries(metadata).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(key === 'raw_metadata' ? JSON.stringify(value) : value);
      paramIndex++;
    }
  });
  
  if (fields.length === 0) return;
  
  fields.push('last_updated = CURRENT_TIMESTAMP');
  
  await query(
    `UPDATE sonic_nft.metadata
     SET ${fields.join(', ')}
     WHERE token_id = $1`,
    values
  );
}

/**
 * Get full collection stats
 */
export async function getCollectionStats() {
  const result = await query(
    `SELECT 
       total_supply,
       minted_count,
       revealed_count,
       holder_count,
       floor_price,
       volume_traded,
       is_revealed,
       reveal_date,
       last_updated
     FROM
       sonic_nft.collection_stats
     WHERE
       id = 1`
  );
  
  return result.rows[0];
} 