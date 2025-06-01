const fs = require('fs');
const path = require('path');

// Configuration
const COLLECTION_SIZE = 5000;
const OUTPUT_DIR = path.join(__dirname, '../assets/metadata');
const TEMPLATE_PATH = path.join(__dirname, '../assets/metadata-template.json');

// Generator types and their probabilities
const GENERATOR_TYPES = [
  { name: "Fractal Crystalline", weight: 20 },
  { name: "Organic Flow Field", weight: 20 },
  { name: "Geometric Pattern Weaver", weight: 20 },
  { name: "Cosmic Nebula", weight: 20 },
  { name: "Abstract Architecture", weight: 20 }
];

// Styles for each generator type
const STYLES = {
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

// Utility function to select a weighted random item
function weightedRandom(items) {
  const totalWeight = items.reduce((acc, item) => acc + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= item.weight;
    if (random < 0) {
      return item.name;
    }
  }
  
  return items[0].name; // Fallback
}

// Utility function to select a random item from an array
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read the template
const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));

// Generate metadata for each token
console.log(`Generating metadata for ${COLLECTION_SIZE} NFTs...`);

for (let id = 0; id < COLLECTION_SIZE; id++) {
  // Select random attributes
  const generatorType = weightedRandom(GENERATOR_TYPES);
  const style = randomItem(STYLES[generatorType]);
  const colorPalette = randomItem(COLOR_PALETTES);
  const complexity = randomItem(COMPLEXITY_LEVELS);
  const dimensions = randomItem(DIMENSIONS);
  
  // Create a deep copy of the template
  const metadata = JSON.parse(JSON.stringify(template));
  
  // Fill in the template variables
  metadata.name = metadata.name.replace('$ID', id);
  metadata.description = metadata.description.replace('$GENERATOR_TYPE', generatorType);
  metadata.image = metadata.image.replace('$ID', id);
  metadata.external_url = metadata.external_url.replace('$ID', id);
  
  // Set attributes
  metadata.attributes.forEach(attr => {
    switch (attr.trait_type) {
      case 'Generator Type':
        attr.value = generatorType;
        break;
      case 'Style':
        attr.value = style;
        break;
      case 'Color Palette':
        attr.value = colorPalette;
        break;
      case 'Complexity':
        attr.value = complexity;
        break;
      case 'Dimensions':
        attr.value = dimensions;
        break;
    }
  });
  
  // Write the metadata to a file
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${id}.json`),
    JSON.stringify(metadata, null, 2)
  );
  
  // Log progress
  if ((id + 1) % 500 === 0 || id === COLLECTION_SIZE - 1) {
    console.log(`Progress: ${id + 1}/${COLLECTION_SIZE} metadata files generated`);
  }
}

console.log('Metadata generation complete!');
console.log(`Files saved to: ${OUTPUT_DIR}`); 