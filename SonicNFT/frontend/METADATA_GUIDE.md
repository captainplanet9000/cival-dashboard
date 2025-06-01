# Metadata Guide for Sonic NFT Collection

This guide provides step-by-step instructions for creating, formatting, and uploading your NFT metadata to make your collection compatible with PaintSwap and other marketplaces.

## Metadata Requirements

PaintSwap requires specific metadata standards:

- Each NFT must have its own JSON metadata file with the following fields:
  - `name`: The name of the NFT (e.g., "Sonic NFT #123")
  - `description`: A detailed description of the NFT
  - `image`: IPFS URL to the image file (e.g., "ipfs://Qm...")
  - `attributes`: Array of traits for filtering and sorting

## Metadata Structure

Your metadata should follow this structure:

```json
{
  "name": "Sonic NFT #123",
  "description": "A unique generative art NFT from the Sonic NFT Collection.",
  "image": "ipfs://QmYourImageCIDGoesHere/123.png",
  "external_url": "https://your-website.com/nft/123",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Cosmic"
    },
    {
      "trait_type": "Base",
      "value": "Wave Form"
    },
    {
      "trait_type": "Rarity",
      "value": "Uncommon"
    },
    {
      "display_type": "number",
      "trait_type": "Speed",
      "value": 75
    }
  ]
}
```

## Attribute Types

PaintSwap supports different attribute types:

1. **Standard Traits** - String values:
   ```json
   {
     "trait_type": "Background",
     "value": "Cosmic"
   }
   ```

2. **Numeric Traits** - For rankings and stats:
   ```json
   {
     "display_type": "number",
     "trait_type": "Speed",
     "value": 75
   }
   ```

3. **Percentage Traits** - For boost stats:
   ```json
   {
     "display_type": "boost_percentage",
     "trait_type": "Sonic Boost",
     "value": 20
   }
   ```

## Generating Metadata Files

1. Create a folder for your metadata files:
   ```
   mkdir -p metadata/token
   ```

2. Create a separate JSON file for each token ID (0 to maxSupply-1):
   ```
   metadata/token/0.json
   metadata/token/1.json
   ...
   ```

3. For large collections, use a script to generate metadata:

```javascript
const fs = require('fs');
const path = require('path');

// Configuration
const COLLECTION_SIZE = 5000;
const OUTPUT_DIR = path.join(__dirname, 'metadata', 'token');
const IMAGE_CID = 'QmYourImageCIDGoesHere';

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Trait options (customize based on your art)
const backgrounds = ['Cosmic', 'Ocean', 'Urban', 'Abstract', 'Geometric'];
const baseForms = ['Wave Form', 'Pixel Grid', 'Fluid', 'Crystalline', 'Nebula'];
const colorSchemes = ['Electric Blue', 'Sunset Orange', 'Neon Green', 'Violet Pulse', 'Rainbow'];
const patterns = ['Fractal', 'Ripple', 'Swirl', 'Scatter', 'Burst'];
const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

// Generate metadata for each token
for (let i = 0; i < COLLECTION_SIZE; i++) {
  // Randomize traits (in production, you'd want deterministic generation)
  const background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
  const baseForm = baseForms[Math.floor(Math.random() * baseForms.length)];
  const colorScheme = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  const rarity = rarities[Math.floor(Math.random() * rarities.length)];
  const speed = Math.floor(Math.random() * 100);
  const boost = Math.floor(Math.random() * 50);
  
  // Create metadata object
  const metadata = {
    name: `Sonic NFT #${i}`,
    description: "A unique generative art NFT from the Sonic NFT Collection - the first generative art collection on the Sonic blockchain.",
    image: `ipfs://${IMAGE_CID}/${i}.png`,
    external_url: `https://your-website.com/nft/${i}`,
    attributes: [
      {
        trait_type: "Background",
        value: background
      },
      {
        trait_type: "Base",
        value: baseForm
      },
      {
        trait_type: "Color Scheme",
        value: colorScheme
      },
      {
        trait_type: "Pattern",
        value: pattern
      },
      {
        trait_type: "Rarity",
        value: rarity
      },
      {
        trait_type: "Generation",
        value: "1"
      },
      {
        display_type: "number",
        trait_type: "Speed",
        value: speed
      },
      {
        display_type: "boost_percentage",
        trait_type: "Sonic Boost",
        value: boost
      }
    ]
  };
  
  // Write metadata to file
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${i}.json`),
    JSON.stringify(metadata, null, 2)
  );
  
  console.log(`Generated metadata for token #${i}`);
}

console.log(`Generated metadata for ${COLLECTION_SIZE} tokens`);
```

## Creating Unrevealed Metadata

Before revealing your collection, you should use a generic "unrevealed" metadata file:

```json
{
  "name": "Unrevealed Sonic NFT",
  "description": "This Sonic NFT hasn't been revealed yet. The first generative art collection on the Sonic blockchain will be revealed soon!",
  "image": "ipfs://QmYourUnrevealedImageCIDGoesHere/unrevealed.png",
  "attributes": [
    {
      "trait_type": "Status",
      "value": "Unrevealed"
    }
  ]
}
```

## Uploading to IPFS

You have several options for uploading your metadata to IPFS:

### Option 1: Pinata (Recommended)

1. Create an account on [Pinata](https://pinata.cloud/)
2. Use their upload tool to upload your metadata folder
3. Get the CID (Content Identifier) for your upload

### Option 2: NFT.Storage

1. Create an account on [NFT.Storage](https://nft.storage/)
2. Use their API or web interface to upload your metadata folder
3. Get the CID for your upload

### Option 3: IPFS Desktop + Pinning Service

1. Install [IPFS Desktop](https://docs.ipfs.io/install/ipfs-desktop/)
2. Add your metadata folder to IPFS
3. Get the CID for your upload
4. Use a pinning service to ensure persistence

## Setting the Base URI

After uploading your metadata to IPFS, you need to set the base URI in your contract:

```javascript
// For unrevealed state
await nftContract.setNotRevealedURI("ipfs://QmUnrevealedCID/unrevealed.json");

// For revealed state (set but keep revealed = false until ready)
await nftContract.setBaseURI("ipfs://QmYourMetadataCID/");

// When ready to reveal
await nftContract.setRevealed(true);
```

## Testing Metadata

Before submitting to PaintSwap, test your metadata:

1. Mint a test NFT
2. Get the token URI: `await nftContract.tokenURI(0)`
3. Check that the URI resolves to the correct metadata
4. Verify that the metadata contains all required fields
5. Ensure the image URL is accessible

## Submitting to PaintSwap

Once your metadata is properly set up:

1. Go to [PaintSwap](https://paintswap.io/)
2. Connect your wallet
3. Navigate to "Collections" and "Submit Collection"
4. Fill in the collection details
5. Submit for verification

PaintSwap will verify that your metadata meets their standards before listing your collection.

## Troubleshooting

- **IPFS Gateway Issues**: If images don't load, ensure you're using a reliable IPFS gateway
- **Metadata Format Errors**: Check that your JSON is valid
- **URI Formatting**: Make sure your base URI ends with a trailing slash
- **TokenID Formatting**: Ensure your tokenURI function properly combines base URI with token ID
- **Reveal Issues**: Verify that the revealed flag is set correctly

## Maintenance

- Keep your IPFS content pinned to ensure it remains accessible
- Consider using a dedicated IPFS pinning service
- Backup your metadata locally
- Consider using a decentralized storage solution like Arweave for permanence 