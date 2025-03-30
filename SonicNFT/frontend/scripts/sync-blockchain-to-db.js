#!/usr/bin/env node

/**
 * Blockchain Synchronization Script for Sonic NFT
 * This script syncs NFT ownership and metadata from the blockchain to the database
 */

const { ethers } = require('ethers');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Blockchain configuration
const RPC_URL = process.env.RPC_URL;
const SONIC_NFT_ADDRESS = process.env.NEXT_PUBLIC_SONIC_NFT_ADDRESS;

// Contract ABI (minimal for events)
const SONIC_NFT_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function totalSupply() external view returns (uint256)",
  "function maxSupply() external view returns (uint256)"
];

// Check for required environment variables
if (!RPC_URL) {
  console.error('RPC_URL environment variable is required');
  process.exit(1);
}

if (!SONIC_NFT_ADDRESS) {
  console.error('NEXT_PUBLIC_SONIC_NFT_ADDRESS environment variable is required');
  process.exit(1);
}

// Initialize ethers provider and contract
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(SONIC_NFT_ADDRESS, SONIC_NFT_ABI, provider);

// Track sync progress
let processedCount = 0;
let totalCount = 0;
let lastBlockProcessed = 0;

// Main sync function
async function syncBlockchainData() {
  const client = await pool.connect();
  
  try {
    console.log(`Starting blockchain sync for contract: ${SONIC_NFT_ADDRESS}`);
    
    // Get the current block number
    const currentBlock = await provider.getBlockNumber();
    console.log(`Current blockchain block: ${currentBlock}`);
    
    // Get last processed block from database or use default
    const lastBlockResult = await client.query(
      'SELECT MAX(last_block_processed) as last_block FROM sonic_nft.sync_status'
    );
    
    // If we have a record, start from there, otherwise start from recent blocks
    lastBlockProcessed = lastBlockResult.rows[0]?.last_block || currentBlock - 10000;
    console.log(`Starting from block ${lastBlockProcessed}`);
    
    // Get total supply from contract
    const totalSupply = await contract.totalSupply();
    totalCount = totalSupply.toNumber();
    console.log(`Total supply: ${totalCount}`);
    
    // Update collection stats
    await client.query(
      'UPDATE sonic_nft.collection_stats SET total_supply = $1 WHERE id = 1',
      [totalCount]
    );
    
    // Process Transfer events in batches to avoid hitting rate limits
    await processTransferEvents(client, lastBlockProcessed, currentBlock);
    
    // Process token ownership and metadata 
    await processTokenMetadata(client, totalCount);
    
    // Update collection stats
    await updateCollectionStats(client);
    
    // Update last processed block
    await client.query(
      'INSERT INTO sonic_nft.sync_status (last_block_processed, last_sync_time) VALUES ($1, NOW()) ON CONFLICT (id) DO UPDATE SET last_block_processed = $1, last_sync_time = NOW()',
      [currentBlock]
    );
    
    console.log('Blockchain sync completed successfully!');
  } catch (error) {
    console.error('Blockchain sync failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Process Transfer events
async function processTransferEvents(client, fromBlock, toBlock) {
  console.log(`Processing Transfer events from block ${fromBlock} to ${toBlock}`);
  
  // Define batch size and calculate number of batches
  const BATCH_SIZE = 2000;
  const batchCount = Math.ceil((toBlock - fromBlock) / BATCH_SIZE);
  
  for (let i = 0; i < batchCount; i++) {
    const batchFromBlock = fromBlock + (i * BATCH_SIZE);
    const batchToBlock = Math.min(batchFromBlock + BATCH_SIZE - 1, toBlock);
    
    console.log(`Processing batch ${i + 1}/${batchCount}: blocks ${batchFromBlock} - ${batchToBlock}`);
    
    const filter = contract.filters.Transfer();
    const events = await contract.queryFilter(filter, batchFromBlock, batchToBlock);
    
    console.log(`Found ${events.length} Transfer events in batch`);
    
    // Process events in a transaction
    await client.query('BEGIN');
    
    try {
      // Process each event
      for (const event of events) {
        const { from, to, tokenId } = event.args;
        const blockNumber = event.blockNumber;
        const txHash = event.transactionHash;
        
        // Skip token burns and mints for this logic
        if (from === ethers.constants.AddressZero || to === ethers.constants.AddressZero) {
          continue;
        }
        
        // Update ownership
        await client.query(
          `INSERT INTO sonic_nft.nft_ownership (token_id, owner_address, transaction_hash) 
           VALUES ($1, $2, $3)
           ON CONFLICT (token_id) DO UPDATE 
           SET owner_address = $2, acquired_at = NOW(), transaction_hash = $3`,
          [tokenId.toString(), to, txHash]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
    // Add small delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Process token metadata
async function processTokenMetadata(client, totalSupply) {
  console.log(`Processing metadata for ${totalSupply} tokens`);
  
  // Process in smaller batches to avoid timeouts
  const BATCH_SIZE = 50;
  const batchCount = Math.ceil(totalSupply / BATCH_SIZE);
  
  for (let i = 0; i < batchCount; i++) {
    const startTokenId = i * BATCH_SIZE;
    const endTokenId = Math.min((i + 1) * BATCH_SIZE, totalSupply);
    
    console.log(`Processing metadata batch ${i + 1}/${batchCount}: tokens ${startTokenId} - ${endTokenId - 1}`);
    
    await client.query('BEGIN');
    
    try {
      // Process each token in the batch
      for (let tokenId = startTokenId; tokenId < endTokenId; tokenId++) {
        try {
          // Check if token exists by trying to get its owner
          const owner = await contract.ownerOf(tokenId);
          
          // Get token URI
          const tokenURI = await contract.tokenURI(tokenId);
          
          // Create a placeholder name
          const name = `Sonic NFT #${tokenId}`;
          
          // Determine if the token has been minted
          const isMinted = owner !== ethers.constants.AddressZero;
          
          // Update metadata
          await client.query(
            `INSERT INTO sonic_nft.nft_metadata (token_id, name, ipfs_uri)
             VALUES ($1, $2, $3)
             ON CONFLICT (token_id) DO UPDATE
             SET name = $2, ipfs_uri = $3`,
            [tokenId, name, tokenURI]
          );
          
          // Update ownership if minted
          if (isMinted) {
            await client.query(
              `INSERT INTO sonic_nft.nft_ownership (token_id, owner_address)
               VALUES ($1, $2)
               ON CONFLICT (token_id) DO UPDATE
               SET owner_address = $2`,
              [tokenId, owner]
            );
          }
          
          processedCount++;
          
          // Log progress every 10 tokens
          if (processedCount % 10 === 0) {
            const progress = (processedCount / totalCount * 100).toFixed(2);
            console.log(`Processed ${processedCount}/${totalCount} tokens (${progress}%)`);
          }
        } catch (error) {
          // Skip tokens that don't exist
          if (error.message.includes('nonexistent token')) {
            continue;
          }
          throw error;
        }
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
    // Add small delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Update collection statistics
async function updateCollectionStats(client) {
  console.log('Updating collection statistics...');
  
  // Calculate minted count
  const mintedCountResult = await client.query(
    'SELECT COUNT(*) FROM sonic_nft.nft_ownership'
  );
  const mintedCount = parseInt(mintedCountResult.rows[0].count, 10);
  
  // Calculate unique holders
  const holdersResult = await client.query(
    'SELECT COUNT(DISTINCT owner_address) FROM sonic_nft.nft_ownership'
  );
  const holderCount = parseInt(holdersResult.rows[0].count, 10);
  
  // Update stats
  await client.query(
    `UPDATE sonic_nft.collection_stats 
     SET minted_count = $1, holder_count = $2, updated_at = NOW() 
     WHERE id = 1`,
    [mintedCount, holderCount]
  );
  
  console.log(`Collection stats updated: ${mintedCount} minted, ${holderCount} holders`);
}

// Create sync_status table if it doesn't exist
async function ensureSyncTable() {
  const client = await pool.connect();
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS sonic_nft.sync_status (
        id INTEGER PRIMARY KEY DEFAULT 1,
        last_block_processed INTEGER NOT NULL,
        last_sync_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } finally {
    client.release();
  }
}

// Run sync process
async function run() {
  try {
    await ensureSyncTable();
    await syncBlockchainData();
  } catch (error) {
    console.error('Unhandled error during blockchain sync:', error);
    process.exit(1);
  }
}

run(); 