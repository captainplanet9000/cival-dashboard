# Sonic NFT Collection

A modern NFT minting website built for the Sonic blockchain, allowing users to mint unique generative art NFTs for 500 SONIC tokens.

## Features

- **Sonic Blockchain Integration**: Direct connection to the Sonic blockchain
- **ERC-20 Token Payment**: Pay with SONIC tokens instead of native currency
- **Wallet Connectivity**: Support for MetaMask, WalletConnect, and other injected wallets
- **Responsive Design**: Mobile-friendly UI that works across all devices
- **Analytics Tracking**: Track user interactions and mint events
- **Error Monitoring**: Robust error handling with Sentry integration
- **SEO Optimization**: Structured data and meta tags for better discoverability
- **Health Monitoring**: API endpoints for monitoring system health
- **ERC-2981 Royalties**: 7% royalty on secondary sales via PaintSwap and other marketplaces

## PaintSwap Marketplace Integration

This project is fully integrated with [PaintSwap](https://paintswap.io), the leading NFT marketplace on the Sonic blockchain:

- **Royalties**: 7% royalty on secondary sales enforced via ERC-2981
- **Collection Page**: Custom collection page with traits and statistics
- **Verified Collection**: Fully verifiable smart contract for transparency
- **Floor Price Tracking**: Automatic floor price aggregation
- **Offer System**: Support for making offers on NFTs

## Getting Started

### Prerequisites

- Node.js 16+
- Yarn or npm
- A Sonic blockchain wallet with SONIC tokens

### Installation

1. Clone this repository
```bash
git clone https://github.com/your-username/sonic-nft.git
cd sonic-nft/frontend
```

2. Install dependencies
```bash
yarn install
# or
npm install
```

3. Set up environment variables
```bash
cp .env.local.example .env.local
```

4. Edit `.env.local` with your configuration:
   - Add your Sonic RPC URL
   - Add your NFT contract address
   - Add your SONIC token address
   - Configure other settings as needed

5. Start the development server
```bash
yarn dev
# or
npm run dev
```

## Minting NFTs

1. Connect your wallet to the Sonic blockchain
2. Ensure you have at least 500 SONIC tokens per NFT you wish to mint
3. The minting process involves two transactions:
   - First transaction: Approve the NFT contract to use your SONIC tokens
   - Second transaction: Mint the NFT(s)

## Smart Contract Integration

The frontend interacts with two main contracts:
- **NFT Contract**: Handles the minting of NFTs
- **SONIC Token Contract**: ERC-20 token used for payment

Make sure to update the contract addresses in your `.env.local` file.

## Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/your-username/sonic-nft)

### Build for Production

```bash
yarn build
# or
npm run build
```

### Docker

```bash
docker build -t sonic-nft .
docker run -p 3000:3000 sonic-nft
```

## Development

### File Structure

- `/components` - Reusable UI components
- `/pages` - Next.js pages including API routes
- `/hooks` - Custom React hooks
- `/utils` - Utility functions
- `/styles` - Global CSS and styling
- `/public` - Static assets

## Troubleshooting

### Common Issues

1. **Wallet Not Connecting**: Ensure you're on the Sonic blockchain network in your wallet
2. **Insufficient SONIC Balance**: You need at least 500 SONIC tokens per NFT
3. **Transaction Failing**: Check gas settings and ensure the contract addresses are correct

## License

This project is licensed under the MIT License - see the LICENSE file for details. 