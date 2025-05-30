#!/usr/bin/env node

/**
 * Blockchain to Database Synchronization Script
 * 
 * This script fetches blockchain data about minted NFTs and syncs it to the database.
 * It can be run periodically as a scheduled job to keep the database in sync with on-chain data.
 */

require('dotenv').config({ path: '../frontend/.env.local' });
const { ethers } = require('ethers');
const { Pool } = require('pg');

// Initialize database pool
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// ABI snippet for just the events and functions we need
const ABI = [
  // Minted event
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' }
    ],
    name: 'Minted',
    type: 'event',
  },
  // Transfer event (from ERC-721)
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' }
    ],
    name: 'Transfer',
    type: 'event',
  },
  // Reveal event
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'bool', name: 'revealState', type: 'bool' }
    ],
    name: 'Revealed',
    type: 'event',
  },
  // totalSupply function
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // ownerOf function
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // revealed function
  {
    inputs: [],
    name: 'revealed',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
];

// Use testnet by default if not specified
const isTestnet = process.env.NEXT_PUBLIC_USE_TESTNET !== 'false';

// Contract addresses
const contractAddress = isTestnet 
  ? process.env.NEXT_PUBLIC_TESTNET_CONTRACT_ADDRESS 
  : process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

// RPC URLs
const rpcUrl = isTestnet
  ? process.env.NEXT_PUBLIC_SONIC_TESTNET_RPC_URL
  : process.env.NEXT_PUBLIC_SONIC_NETWORK_RPC_URL;

// Configure provider and contract
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const contract = new ethers.Contract(contractAddress, ABI, provider);

/**
 * Record NFT ownership in the database
 */
async function recordOwnership(tokenId, ownerAddress, transactionHash = null) {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if metadata record exists
    const metadataExists = await client.query(
      'SELECT EXISTS(SELECT 1 FROM sonic_nft.metadata WHERE token_id = $1)',
      [tokenId]
    );
    
    // If metadata doesn't exist, insert it
    if (!metadataExists.rows[0].exists) {
      await client.query(
        `INSERT INTO sonic_nft.metadata 
            (token_id, name, description, is_revealed)
         VALUES ($1, $2, $3, false)`,
        [tokenId, `Sonic NFT #${tokenId}`, 'Sonic NFT is a collection of generative art pieces.']
      );
    }
    
    // Check if ownership record exists
    const ownershipExists = await client.query(
      'SELECT EXISTS(SELECT 1 FROM sonic_nft.ownership WHERE token_id = $1)',
      [tokenId]
    );
    
    // If ownership record exists, update it; otherwise, insert it
    if (ownershipExists.rows[0].exists) {
      await client.query(
        `UPDATE sonic_nft.ownership 
         SET 
           owner_address = $2,
           transaction_hash = COALESCE($3, transaction_hash),
           acquired_at = CURRENT_TIMESTAMP
         WHERE token_id = $1`,
        [tokenId, ownerAddress, transactionHash]
      );
    } else {
      await client.query(
        `INSERT INTO sonic_nft.ownership 
            (token_id, owner_address, transaction_hash)
         VALUES ($1, $2, $3)`,
        [tokenId, ownerAddress, transactionHash]
      );
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log(`Recorded ownership of token ${tokenId} to ${ownerAddress}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Error recording ownership for token ${tokenId}:`, err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Update collection stats in the database
 */
async function updateCollectionStats(isRevealed, totalSupply, holderCount) {
  const client = await pool.connect();
  
  try {
    await client.query(
      `UPDATE sonic_nft.collection_stats
       SET 
         total_supply = $1,
         minted_count = $2,
         holder_count = $3,
         is_revealed = $4,
         last_updated = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [totalSupply, totalSupply, holderCount, isRevealed]
    );
    
    console.log(`Updated collection stats: total=${totalSupply}, holders=${holderCount}, revealed=${isRevealed}`);
  } catch (err) {
    console.error('Error updating collection stats:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Main sync function that fetches blockchain data and updates the database
 */
async function syncBlockchainToDb() {
  console.log('Starting blockchain sync...');
  
  try {
    // Get reveal status and total supply from contract
    const isRevealed = await contract.revealed();
    const totalSupply = (await contract.totalSupply()).toNumber();
    
    console.log(`Contract status: revealed=${isRevealed}, totalSupply=${totalSupply}`);
    
    // Keep track of unique holders
    const holders = new Set();
    
    // Process each token
    for (let tokenId = 0; tokenId < totalSupply; tokenId++) {
      try {
        // Get current owner from blockchain
        const ownerAddress = await contract.ownerOf(tokenId);
        holders.add(ownerAddress);
        
        // Record ownership in database (without transaction hash for bulk sync)
        await recordOwnership(tokenId, ownerAddress);
      } catch (err) {
        console.error(`Error processing token ${tokenId}:`, err.message);
      }
    }
    
    // Update collection stats
    await updateCollectionStats(isRevealed, totalSupply, holders.size);
    
    console.log('Blockchain sync completed successfully.');
  } catch (err) {
    console.error('Sync failed:', err);
  } finally {
    await pool.end();
  }
}

// Run the sync function
syncBlockchainToDb()
  .then(() => console.log('Done'))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  }); 