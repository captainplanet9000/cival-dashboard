# Sonic NFT Collection Generator

A complete framework for creating, generating, and deploying generative art NFTs on the Sonic blockchain using Houdini's powerful VEX system.

## Project Overview

This project provides everything needed to create a generative art NFT collection:

1. **Houdini VEX Generators**: Five professionally designed procedural art generators
2. **Python Automation**: Scripts to batch generate NFT variations
3. **Smart Contract**: Full-featured NFT contract with presale, whitelist, and royalties
4. **Deployment Tools**: Scripts for contract deployment and IPFS integration

## Directory Structure

```
SonicNFT/
├── assets/
│   ├── images/         # Generated NFT images
│   └── metadata/       # NFT metadata JSON files
├── contracts/
│   └── SonicNFT.sol    # ERC-721 NFT smart contract
├── houdini/
│   ├── vex_examples/   # VEX code for generators
│   └── README.md       # Houdini setup instructions
└── scripts/
    ├── deploy_contract.js        # Contract deployment
    ├── generate_nft_variations.py # NFT generation script
    └── upload_to_ipfs.js         # IPFS upload utility
```

## Getting Started

Follow these steps to create your own generative art NFT collection:

### Prerequisites

- [Houdini](https://www.sidefx.com/download/) (19.0+ recommended, Apprentice edition works)
- [Node.js](https://nodejs.org/) (14+ recommended)
- [Hardhat](https://hardhat.org/) for smart contract deployment
- [Pinata](https://pinata.cloud/) account for IPFS hosting

### 1. Setting Up Houdini Generators

Refer to the detailed instructions in `houdini/README.md` for setting up each generator.

Quick start:
1. Open Houdini
2. Create a new project
3. Create a Geometry node
4. Add a Point Wrangle and paste one of the VEX examples
5. Configure parameters as described in the README

### 2. Generating NFT Collection

Use the Python script to generate your collection:

```bash
# Navigate to scripts directory
cd scripts

# Generate 10 NFTs using all generators
python generate_nft_variations.py --count 10

# Generate 5 NFTs using only the fractal_crystalline generator
python generate_nft_variations.py --count 5 --generator fractal_crystalline
```

This will:
- Create random parameter variations for each NFT
- Render images to the `assets/images` directory
- Generate metadata files in `assets/metadata`

### 3. Smart Contract Deployment

Set up the Sonic blockchain development environment:

```bash
# Install dependencies
npm install

# Create .env file with your private key and RPC URL
echo "PRIVATE_KEY=your_private_key" > .env
echo "SONIC_RPC_URL=https://sonic.rpc.url" >> .env

# Deploy the contract
npx hardhat run scripts/deploy_contract.js --network sonic
```

### 4. Uploading to IPFS

After generating your NFTs, upload them to IPFS:

```bash
# Install dependencies
npm install

# Add Pinata API keys to .env
echo "PINATA_API_KEY=your_api_key" >> .env
echo "PINATA_SECRET_API_KEY=your_secret_key" >> .env

# Add deployed contract address
echo "CONTRACT_ADDRESS=your_contract_address" >> .env

# Upload to IPFS and update contract
npx hardhat run scripts/upload_to_ipfs.js --network sonic
```

## Generative Art Techniques

This project includes five distinct VEX-based generators:

1. **Fractal Crystalline**: Complex crystalline formations with fractal patterns
2. **Organic Flow Fields**: Flowing patterns using curl noise and particle systems
3. **Geometric Pattern Weaver**: Intricate geometric patterns from various cultures
4. **Cosmic Nebula**: Volumetric space nebulas with complex color interactions
5. **Abstract Architecture**: Futuristic architectural structures with procedural details

Each generator exposes parameters that can be randomized to create unique variations.

## Smart Contract Features

The `SonicNFT.sol` contract includes:

- ERC-721 standard with enumeration and metadata extensions
- Configurable mint price and max mints per transaction
- Presale whitelist functionality
- Owner-only reserved minting for team allocation
- Royalty support (EIP-2981)
- Token metadata linked to IPFS
- Token generator type storage (linking each NFT to its generator)

## Development Workflow

1. **Create Generators**: Design and refine your VEX generators in Houdini
2. **Test Variations**: Generate test NFTs to ensure quality and variety
3. **Deploy Contract**: Deploy the smart contract to Sonic testnet, then mainnet
4. **Generate Collection**: Create your full NFT collection with desired size
5. **Upload to IPFS**: Upload images and metadata to IPFS
6. **Update Contract**: Set the base URI in your deployed contract
7. **Launch**: Configure minting parameters and activate public sale

## Customization

- **Generators**: Modify the VEX code to create your own visual style
- **Parameters**: Adjust parameter ranges in `generate_nft_variations.py`
- **Collection Size**: Set `MAX_SUPPLY` in the smart contract
- **Pricing**: Modify `mintPrice` in the contract

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- SideFX Houdini for the powerful VEX language
- OpenZeppelin for secure smart contract templates
- Sonic blockchain for the NFT platform 