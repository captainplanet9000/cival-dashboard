# Sonic NFT Minting - Quick Start Guide

This guide will help you get the Sonic NFT minting website running in under 5 minutes with test contracts.

## Prerequisites

- Node.js 16+ installed
- MetaMask or compatible wallet
- Git

## Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-username/sonic-nft.git
cd sonic-nft/frontend

# Install dependencies
npm install
# or
yarn install
```

## Step 2: Configure Environment

```bash
# Copy the environment example file
cp .env.local.example .env.local
```

Edit `.env.local` and add your private key (only for testing):

```
PRIVATE_KEY=your_private_key_here
```

## Step 3: Deploy Test Contracts

```bash
# Deploy a test SONIC token (if you don't have one already)
# This step might require a separate ERC20 deployment script

# Deploy the NFT contract
node scripts/deploy-test-contract.js
```

Copy the NFT contract address from the output and update your `.env.local` file:

```
NEXT_PUBLIC_SONIC_NFT_ADDRESS=0x...  # Address from deployment output
```

## Step 4: Mint Test Tokens

```bash
# Mint 1000 test SONIC tokens to your wallet
node scripts/mint-test-tokens.js YOUR_WALLET_ADDRESS 2000
```

## Step 5: Test Contract Integration

```bash
# Test the integration between contracts
node scripts/test-contract-integration.js 1
```

If this succeeds, your contracts are correctly set up!

## Step 6: Start the Frontend

```bash
# Start the development server
npm run dev
# or
yarn dev
```

Access the website at http://localhost:3000

## Step 7: Mint Your NFTs

1. Connect your wallet (click "Connect Wallet" button)
2. Click "Switch to Sonic Network" if prompted
3. Choose quantity (1-5 NFTs)
4. Click "Mint Now"
5. Approve token spending when prompted in your wallet
6. Confirm the minting transaction

## Troubleshooting

### "No Ethereum provider found" error

Make sure MetaMask is installed and unlocked.

### "Failed to switch to Sonic network" error

Try adding the network manually in MetaMask:
- Network Name: Sonic
- RPC URL: https://rpc.sonic.org
- Chain ID: 2930
- Symbol: SONIC
- Block Explorer: https://scan.sonic.org

### "Insufficient SONIC balance" error

Run the token minting script again:
```bash
node scripts/mint-test-tokens.js YOUR_WALLET_ADDRESS 2000
```

## Next Steps

See `INTEGRATION_GUIDE.md` for more detailed information on how the integration works. 