# Sonic NFT Integration Guide

This guide provides step-by-step instructions for deploying and integrating the Sonic NFT contract with the frontend application.

## Prerequisites

- Node.js 16+
- npm or yarn
- Access to a Sonic blockchain node (testnet or mainnet)
- MetaMask or compatible wallet with Sonic blockchain network configured
- SONIC tokens for minting (500 SONIC per NFT)

## Setup

1. Clone the repository and install dependencies

```bash
git clone https://github.com/your-username/sonic-nft.git
cd sonic-nft/frontend
npm install
# or
yarn install
```

2. Create your local environment file

```bash
cp .env.local.example .env.local
```

3. Update the `.env.local` file with your configuration:
   - Add your Sonic RPC URL
   - Add your private key (for deployment/testing only)
   - Configure other settings as needed

## Contract Deployment

There are two main contracts needed for this application:
1. The SONIC token contract (ERC20)
2. The SonicNFT contract (ERC721)

### Option 1: Use Existing Contracts

If you already have deployed contracts:

1. Update your `.env.local` file with the contract addresses:
```
NEXT_PUBLIC_SONIC_NFT_ADDRESS=0x...
NEXT_PUBLIC_SONIC_TOKEN_ADDRESS=0x...
```

### Option 2: Deploy Test Contracts

For development and testing, you can deploy your own contracts:

1. Deploy the SONIC token contract first (not included in this repo)
   - This should be a standard ERC20 token with mint capability for testing
   - Set the token decimals to 18
   - Use "SONIC" as the symbol

2. Deploy the SonicNFT contract:
```bash
# Make sure .env.local has PRIVATE_KEY and NEXT_PUBLIC_SONIC_TOKEN_ADDRESS
node scripts/deploy-test-contract.js
```

3. Update your `.env.local` file with the NFT contract address from the deployment output

## Testing the Contract Integration

Before integrating with the frontend, test that your contracts are working correctly:

1. Mint test tokens:
```bash
# Give yourself some test tokens
node scripts/mint-test-tokens.js <your_wallet_address> 1000
```

2. Test the NFT contract integration:
```bash
# Test minting a single NFT
node scripts/test-contract-integration.js 1
```

If these tests succeed, your contracts are correctly set up and ready to be integrated with the frontend.

## Frontend Integration

The frontend is already configured to interact with the Sonic blockchain and your deployed contracts.

1. Start the development server:
```bash
npm run dev
# or
yarn dev
```

2. Access the app at [http://localhost:3000](http://localhost:3000)

3. Connect your wallet (make sure it's configured for the Sonic network)

4. Mint NFTs using the minting interface

## How the Integration Works

The minting process on the frontend involves two transactions:

1. **Approve Transaction**: Authorizes the NFT contract to spend your SONIC tokens
   - Only needed if you haven't already approved enough tokens
   - Calls the `approve` function on the SONIC token contract

2. **Mint Transaction**: Mints the NFT(s)
   - Calls the `mint` function on the NFT contract
   - The contract will then pull the approved SONIC tokens from your wallet

## Contract Functions

### SonicNFT Contract

- `mint(uint256 _quantity)`: Mints `_quantity` NFTs to the caller's address
- `totalSupply()`: Returns the current total supply of minted NFTs
- `maxSupply()`: Returns the maximum supply of NFTs
- `maxPerWallet()`: Returns the maximum NFTs per wallet
- `mintedByAddress(address _address)`: Returns the number of NFTs minted by `_address`
- `mintPrice()`: Returns the price per NFT in SONIC tokens
- `royaltyInfo(uint256 _tokenId, uint256 _salePrice)`: Returns royalty information for marketplaces (receiver and amount)
- `setDefaultRoyalty(address receiver, uint96 feeNumerator)`: Updates royalty information (owner only)

### SONIC Token Contract

- `approve(address spender, uint256 amount)`: Approves `spender` to spend up to `amount` tokens
- `allowance(address owner, address spender)`: Returns the amount of tokens `spender` is allowed to spend on behalf of `owner`
- `balanceOf(address account)`: Returns the token balance of `account`

## Troubleshooting

### Common Issues

1. **Wallet Not Connected**
   - Make sure your wallet is connected to the Sonic blockchain
   - Check the RPC URL settings in MetaMask or your wallet

2. **Transaction Failing**
   - Check you have enough SONIC tokens (500 per NFT)
   - Check you have enough native SONIC for gas
   - Check that you've approved enough tokens

3. **Contract Not Responding**
   - Verify the contract addresses in your `.env.local` file
   - Check that the Sonic RPC URL is correct and accessible

4. **Approval Not Working**
   - Make sure you're approving the correct amount for the NFT contract
   - Check if the SONIC token contract has approval restrictions

## Deployment to Production

1. Build the application:
```bash
npm run build
# or
yarn build
```

2. Make sure your production environment has the necessary environment variables set

3. Deploy to your hosting platform of choice (Vercel, Netlify, etc.)

## Smart Contract Details

The SonicNFT contract is a standard ERC721 token with the following features:
- Minting cost of 500 SONIC tokens per NFT
- Maximum supply of 5000 NFTs
- Maximum of 5 NFTs per wallet
- Payments processed through the SONIC ERC20 token
- 7% royalty on secondary sales (ERC-2981 compliant)

## Royalty Implementation

The contract implements the ERC-2981 NFT Royalty Standard, which allows on-chain royalty information. This ensures creators receive royalties when NFTs are sold on secondary markets.

### How Royalties Work

1. The contract is deployed with a default 7% royalty fee that goes to the contract owner
2. When NFTs are sold on marketplaces that support ERC-2981 (like PaintSwap), the marketplace automatically pays 7% of the sale price to the royalty receiver
3. The royalty receiver is initially set to the contract owner but can be updated later

### Modifying Royalties

The contract owner can modify royalty settings:

```javascript
// To change royalty receiver or percentage
await nftContract.setDefaultRoyalty(newReceiverAddress, 700); // 700 = 7%

// To remove royalties
await nftContract.deleteDefaultRoyalty();
```

Note that some marketplaces may have minimum or maximum royalty limitations. 