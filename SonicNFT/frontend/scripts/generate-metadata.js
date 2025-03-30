/**
 * Generate Metadata Script
 * 
 * This script generates metadata files for your entire NFT collection.
 * It creates a folder structure with JSON files for each token.
 * 
 * Usage:
 * node scripts/generate-metadata.js <collection_size> <image_cid>
 * 
 * Example:
 * node scripts/generate-metadata.js 5000 QmYourImageCIDGoesHere
 */

const fs = require('fs');
const path = require('path');

// Get command line arguments
const collectionSize = parseInt(process.argv[2]);
const imageCid = process.argv[3];

if (isNaN(collectionSize) || collectionSize <= 0 || !imageCid) {
  console.error("Invalid arguments. Usage:");
  console.error("node scripts/generate-metadata.js <collection_size> <image_cid>");
  console.error("Example: node scripts/generate-metadata.js 5000 QmYourImageCIDGoesHere");
  process.exit(1);
}

// Configuration
const OUTPUT_DIR = path.join(__dirname, '..', 'metadata', 'token');
const COLLECTION_NAME = "Sonic NFT";
const COLLECTION_DESCRIPTION = "A unique generative art NFT from the Sonic NFT Collection - the first generative art collection on the Sonic blockchain.";
const EXTERNAL_URL_BASE = "https://your-website.com/nft/";

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Created directory: ${OUTPUT_DIR}`);
}

// Trait options (customize based on your art)
const backgrounds = ['Cosmic', 'Ocean', 'Urban', 'Abstract', 'Geometric'];
const baseForms = ['Wave Form', 'Pixel Grid', 'Fluid', 'Crystalline', 'Nebula'];
const colorSchemes = ['Electric Blue', 'Sunset Orange', 'Neon Green', 'Violet Pulse', 'Rainbow'];
const patterns = ['Fractal', 'Ripple', 'Swirl', 'Scatter', 'Burst'];
const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const rarityWeights = [70, 20, 7, 2, 1]; // Percentages for each rarity

// Function to choose rarity based on weights
function chooseRarity() {
  const randNum = Math.random() * 100;
  let cumulative = 0;
  for (let i = 0; i < rarities.length; i++) {
    cumulative += rarityWeights[i];
    if (randNum <= cumulative) {
      return rarities[i];
    }
  }
  return rarities[0]; // Default to Common
}

console.log(`Generating metadata for ${collectionSize} tokens...`);
console.log(`Image CID: ${imageCid}`);

// Generate metadata for each token
for (let i = 0; i < collectionSize; i++) {
  // Create a deterministic seed based on token ID
  const seed = i * 13337; // Simple seeding method
  
  // Set random seed
  Math.random = () => {
    // Simple xorshift-based RNG with the seed
    let x = seed;
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    return (x % 1000000) / 1000000;
  };
  
  // Randomize traits (now deterministic based on token ID)
  const background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
  const baseForm = baseForms[Math.floor(Math.random() * baseForms.length)];
  const colorScheme = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  const rarity = chooseRarity();
  
  // Random numeric traits based on rarity
  let speedBase = 0;
  let boostBase = 0;
  
  // Set trait values based on rarity
  switch (rarity) {
    case 'Common':
      speedBase = 50;
      boostBase = 5;
      break;
    case 'Uncommon':
      speedBase = 65;
      boostBase = 10;
      break;
    case 'Rare':
      speedBase = 75;
      boostBase = 15;
      break;
    case 'Epic':
      speedBase = 85;
      boostBase = 25;
      break;
    case 'Legendary':
      speedBase = 95;
      boostBase = 40;
      break;
  }
  
  // Add some randomness to the numeric traits
  const speed = Math.floor(speedBase + (Math.random() * 10 - 5));
  const boost = Math.floor(boostBase + (Math.random() * 6 - 3));
  
  // Create metadata object
  const metadata = {
    name: `${COLLECTION_NAME} #${i}`,
    description: COLLECTION_DESCRIPTION,
    image: `ipfs://${imageCid}/${i}.png`,
    external_url: `${EXTERNAL_URL_BASE}${i}`,
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
  
  // Log progress for every 100 tokens or for the last one
  if (i % 100 === 0 || i === collectionSize - 1) {
    console.log(`Generated metadata for token #${i}${i === collectionSize - 1 ? ' (Final)' : ''}`);
  }
}

// Create collection metadata
const collectionMetadata = {
  name: "Sonic NFT Collection",
  description: "The first generative art collection on the Sonic blockchain featuring unique visual patterns and traits.",
  image: `ipfs://${imageCid}/collection.png`,
  external_link: "https://your-website.com",
  seller_fee_basis_points: 700, // 7%
  fee_recipient: "0x0000000000000000000000000000000000000000" // Replace with your wallet address
};

fs.writeFileSync(
  path.join(OUTPUT_DIR, '..', 'collection.json'),
  JSON.stringify(collectionMetadata, null, 2)
);
console.log(`Generated collection metadata`);

// Create unrevealed metadata
const unrevealedMetadata = {
  name: "Unrevealed Sonic NFT",
  description: "This Sonic NFT hasn't been revealed yet. The first generative art collection on the Sonic blockchain will be revealed soon!",
  image: `ipfs://${imageCid}/unrevealed.png`,
  attributes: [
    {
      trait_type: "Status",
      value: "Unrevealed"
    }
  ]
};

fs.writeFileSync(
  path.join(OUTPUT_DIR, '..', 'unrevealed.json'),
  JSON.stringify(unrevealedMetadata, null, 2)
);
console.log(`Generated unrevealed metadata`);

console.log("\nMetadata generation complete!");
console.log(`\nTotal files generated: ${collectionSize + 2}`);
console.log(`\nOutput location: ${OUTPUT_DIR}`);
console.log("\nNext steps:");
console.log("1. Upload the 'metadata' folder to IPFS (using Pinata, NFT.Storage, etc.)");
console.log("2. Use the setup-metadata.js script to configure your contract with the IPFS CIDs");
console.log("   - For unrevealed: node scripts/setup-metadata.js unrevealed ipfs://CID/unrevealed.json");
console.log("   - For revealed: node scripts/setup-metadata.js baseuri ipfs://CID/token/"); 