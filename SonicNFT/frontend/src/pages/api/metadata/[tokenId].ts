import { NextApiRequest, NextApiResponse } from 'next';
import { getBaseIpfsUri } from '@/lib/ipfs';
import { tokenExists, query } from '@/lib/database';

// Generator types and their probabilities
const GENERATOR_TYPES = [
  "Fractal Crystalline",
  "Organic Flow Field",
  "Geometric Pattern Weaver", 
  "Cosmic Nebula",
  "Abstract Architecture"
];

// Styles for each generator type
const STYLES: Record<string, string[]> = {
  "Fractal Crystalline": ["Geometric", "Chaotic", "Symmetric", "Asymmetric", "Recursive"],
  "Organic Flow Field": ["Swirling", "Linear", "Radial", "Turbulent", "Calm"],
  "Geometric Pattern Weaver": ["Grid-based", "Circular", "Interlocking", "Tessellated", "Modular"],
  "Cosmic Nebula": ["Cloudy", "Starry", "Gaseous", "Dense", "Sparse"],
  "Abstract Architecture": ["Futuristic", "Minimalist", "Complex", "Structural", "Floating"]
};

// Color palettes
const COLOR_PALETTES = [
  "Vibrant Neon",
  "Monochromatic Blue", 
  "Sunset Gradient",
  "Earth Tones",
  "Pastel Dream",
  "Dark Matter",
  "Electric Cyan",
  "Gold Rush",
  "Rainbow Prism",
  "Grayscale"
];

// Complexity levels
const COMPLEXITY_LEVELS = ["Low", "Medium", "High", "Very High", "Extreme"];

// Dimensions
const DIMENSIONS = ["1024x1024", "1500x1500", "2000x2000"];

// Utility function to select a random item from an array
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Generate deterministic attributes for a token
function generateAttributes(tokenId: number) {
  // Use the tokenId as a seed to generate deterministic attributes
  const seed = tokenId % 100000;
  const random = (max: number) => (seed * 13 + max) % max;
  
  const generatorType = GENERATOR_TYPES[random(GENERATOR_TYPES.length)];
  const style = STYLES[generatorType][random(STYLES[generatorType].length)];
  const colorPalette = COLOR_PALETTES[random(COLOR_PALETTES.length)];
  const complexity = COMPLEXITY_LEVELS[random(COMPLEXITY_LEVELS.length)];
  const dimensions = DIMENSIONS[random(DIMENSIONS.length)];
  
  return [
    {
      trait_type: "Generator Type",
      value: generatorType
    },
    {
      trait_type: "Style",
      value: style
    },
    {
      trait_type: "Color Palette",
      value: colorPalette
    },
    {
      trait_type: "Complexity",
      value: complexity
    },
    {
      trait_type: "Dimensions",
      value: dimensions
    }
  ];
}

// Cache for generated metadata to prevent repetitive calculations
const metadataCache: Record<string, any> = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Parse tokenId from query parameters
    const { tokenId } = req.query;
    
    if (!tokenId || Array.isArray(tokenId)) {
      return res.status(400).json({ error: 'Invalid token ID' });
    }
    
    const id = parseInt(tokenId);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Token ID must be a number' });
    }
    
    // Check if token exists in the database
    const exists = await tokenExists(id);
    
    // Get collection-wide reveal status
    const statsResult = await query(
      `SELECT is_revealed FROM sonic_nft.collection_stats WHERE id = 1`
    );
    const isRevealed = statsResult.rows[0]?.is_revealed || false;
    
    // Check if we have this in database
    const metadataResult = await query(
      `SELECT 
        token_id, 
        name, 
        description, 
        image_uri, 
        ipfs_uri,
        external_url,
        is_revealed,
        raw_metadata
      FROM sonic_nft.metadata
      WHERE token_id = $1`,
      [id]
    );
    
    // If token is in database and has raw metadata, return it
    if (metadataResult.rows.length > 0 && metadataResult.rows[0].raw_metadata) {
      // Set cache headers
      res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=86400');
      return res.status(200).json(metadataResult.rows[0].raw_metadata);
    }
    
    // Check if we have this in cache
    const cacheKey = `token-${id}-${isRevealed}`;
    if (metadataCache[cacheKey]) {
      return res.status(200).json(metadataCache[cacheKey]);
    }
    
    // Generate base metadata for this token
    const metadata = {
      name: `Sonic NFT #${id}`,
      description: `Sonic NFT is a collection of generative art pieces created using Houdini VEX.`,
      image: `${getBaseIpfsUri(isRevealed)}${id}.png`,
      external_url: `https://sonicnft.example.com/token/${id}`,
      animation_url: "",
      background_color: "",
      attributes: isRevealed ? generateAttributes(id) : [
        {
          trait_type: "Status",
          value: "Unrevealed"
        }
      ]
    };
    
    // Cache the response
    metadataCache[cacheKey] = metadata;
    
    // Store in database if token exists
    if (exists) {
      await query(
        `UPDATE sonic_nft.metadata 
         SET 
           name = $2,
           description = $3,
           image_uri = $4,
           ipfs_uri = $4,
           external_url = $5,
           is_revealed = $6,
           raw_metadata = $7,
           last_updated = CURRENT_TIMESTAMP
         WHERE token_id = $1`,
        [
          id, 
          metadata.name, 
          metadata.description, 
          metadata.image,
          metadata.external_url,
          isRevealed,
          JSON.stringify(metadata)
        ]
      );
    }
    
    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=86400');
    res.status(200).json(metadata);
  } catch (error: any) {
    console.error('Error generating metadata:', error);
    res.status(500).json({ error: 'Failed to generate metadata', message: error.message });
  }
} 