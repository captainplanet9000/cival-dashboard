# Sonic NFT Collection

A modern NFT collection website with enhanced metadata support using Neon database and IPFS integration.

## Features

- **Responsive Web Interface**: Mint, view, and explore NFTs from any device
- **MetaMask Integration**: Connect your wallet to mint NFTs and view your collection
- **Reveal Mechanics**: NFTs start unrevealed and are revealed at a specified date
- **IPFS Integration**: All NFT metadata and images are stored on IPFS with automatic gateway fallbacks
- **Database-Backed APIs**: Fast metadata retrieval and collection stats

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Web3**: wagmi, viem, RainbowKit
- **Storage**: IPFS with multiple gateway fallbacks
- **Database**: Neon PostgreSQL for metadata caching and stats
- **Animation**: Framer Motion

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- A Neon database account (free tier is sufficient)

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/sonic-nft.git
   cd sonic-nft
   ```

2. Install dependencies
   ```
   cd frontend
   npm install
   ```

3. Set up environment variables
   Create a `.env.local` file in the `frontend` directory with the following variables:
   ```
   # Network configuration
   NEXT_PUBLIC_CHAIN_ID=7700
   NEXT_PUBLIC_TESTNET_CHAIN_ID=7701
   NEXT_PUBLIC_SONIC_NETWORK_RPC_URL=https://rpc.sonic.network
   NEXT_PUBLIC_SONIC_TESTNET_RPC_URL=https://testnet.rpc.sonic.network
   
   # Contract addresses
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
   NEXT_PUBLIC_TESTNET_CONTRACT_ADDRESS=0x...
   
   # Use testnet by default
   NEXT_PUBLIC_USE_TESTNET=true
   
   # WalletConnect Project ID (get from https://cloud.walletconnect.com)
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=YOUR_WALLETCONNECT_PROJECT_ID
   
   # IPFS URLs for unrevealed and revealed collections
   NEXT_PUBLIC_REVEALED_BASE_URI=ipfs://YOUR_REVEALED_CID/
   NEXT_PUBLIC_UNREVEALED_BASE_URI=ipfs://YOUR_UNREVEALED_CID/
   
   # Neon Database Connection
   NEON_DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
   ```

4. Run the development server
   ```
   npm run dev
   ```

## Database Setup

The project uses Neon PostgreSQL for caching metadata and tracking collection statistics.

### Schema

The database schema includes:

- `sonic_nft.metadata`: Caches NFT metadata
- `sonic_nft.ownership`: Tracks NFT ownership
- `sonic_nft.collection_stats`: Stores collection-wide statistics
- `sonic_nft.ipfs_gateways`: Tracks IPFS gateway performance
- `sonic_nft.minting_activity`: Logs all minting transactions

### Database Initialization

Run the SQL queries in `scripts/init-db.sql` to create the schema and tables.

### Syncing Blockchain Data

To sync blockchain data with the database:

```
npm run sync-blockchain
```

This script fetches data from the blockchain and updates the database.

### IPFS Gateway Optimization

To check and optimize IPFS gateway performance:

```
npm run check-gateways
```

This script tests various IPFS gateways and updates the database with performance data.

## API Routes

The following API routes are available:

- `/api/metadata/[tokenId]`: Get metadata for a specific token
- `/api/collection/stats`: Get collection statistics
- `/api/user/nfts`: Get NFTs owned by a wallet address
- `/api/ownership/update`: Update NFT ownership
- `/api/ipfs/healthcheck`: Check IPFS gateway health

## IPFS Integration

IPFS integration includes:

- Multiple gateway fallbacks for better availability
- Automatic gateway selection based on performance
- Caching for faster load times
- Support for both revealed and unrevealed metadata

## License

This project is licensed under the MIT License - see the LICENSE file for details. 