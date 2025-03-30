/**
 * Traits Configuration for Recursives NFT Collection
 * 
 * This file defines the traits and their rarity distributions for the
 * generative art collection. These traits correspond to parameters
 * that will be used in the Houdini VEX generators.
 */

module.exports = {
  // Base traits that affect the fundamental structure
  basePattern: {
    name: "Base Pattern",
    traits: [
      { name: "Fractal", rarity: 30, houdiniParam: { name: "pattern_type", value: 0 } },
      { name: "Cellular", rarity: 20, houdiniParam: { name: "pattern_type", value: 1 } },
      { name: "Flow Field", rarity: 25, houdiniParam: { name: "pattern_type", value: 2 } },
      { name: "Geometric", rarity: 15, houdiniParam: { name: "pattern_type", value: 3 } },
      { name: "Crystalline", rarity: 10, houdiniParam: { name: "pattern_type", value: 4 } },
    ]
  },
  
  // Algorithm traits that modify the generation process
  algorithm: {
    name: "Algorithm",
    traits: [
      { name: "Recursive", rarity: 25, houdiniParam: { name: "algorithm", value: "recursive" } },
      { name: "Mandelbrot", rarity: 15, houdiniParam: { name: "algorithm", value: "mandelbrot" } },
      { name: "Voronoi", rarity: 20, houdiniParam: { name: "algorithm", value: "voronoi" } },
      { name: "L-System", rarity: 10, houdiniParam: { name: "algorithm", value: "l_system" } },
      { name: "Perlin Flow", rarity: 20, houdiniParam: { name: "algorithm", value: "perlin_flow" } },
      { name: "Reaction-Diffusion", rarity: 10, houdiniParam: { name: "algorithm", value: "reaction_diffusion" } },
    ]
  },

  // Color scheme for the artwork
  colorScheme: {
    name: "Color Scheme",
    traits: [
      { name: "Nebula", rarity: 20, houdiniParam: { name: "color_scheme", value: "nebula" } },
      { name: "Sunset", rarity: 15, houdiniParam: { name: "color_scheme", value: "sunset" } },
      { name: "Neon", rarity: 15, houdiniParam: { name: "color_scheme", value: "neon" } },
      { name: "Arctic", rarity: 10, houdiniParam: { name: "color_scheme", value: "arctic" } },
      { name: "Volcanic", rarity: 12, houdiniParam: { name: "color_scheme", value: "volcanic" } },
      { name: "Forest", rarity: 10, houdiniParam: { name: "color_scheme", value: "forest" } },
      { name: "Ocean", rarity: 10, houdiniParam: { name: "color_scheme", value: "ocean" } },
      { name: "Monochrome", rarity: 8, houdiniParam: { name: "color_scheme", value: "monochrome" } },
    ]
  },
  
  // Complexity level of the pattern
  complexity: {
    name: "Complexity",
    traits: [
      { name: "Simple", rarity: 20, houdiniParam: { name: "complexity", value: 1 } },
      { name: "Moderate", rarity: 40, houdiniParam: { name: "complexity", value: 2 } },
      { name: "Complex", rarity: 30, houdiniParam: { name: "complexity", value: 3 } },
      { name: "Intricate", rarity: 10, houdiniParam: { name: "complexity", value: 4 } },
    ]
  },
  
  // Special effect applied to the artwork
  effect: {
    name: "Effect",
    traits: [
      { name: "None", rarity: 30, houdiniParam: { name: "effect", value: "none" } },
      { name: "Glow", rarity: 20, houdiniParam: { name: "effect", value: "glow" } },
      { name: "Distortion", rarity: 15, houdiniParam: { name: "effect", value: "distortion" } },
      { name: "Interference", rarity: 15, houdiniParam: { name: "effect", value: "interference" } },
      { name: "Pixelation", rarity: 10, houdiniParam: { name: "effect", value: "pixelation" } },
      { name: "Chromatic Aberration", rarity: 10, houdiniParam: { name: "effect", value: "chromatic_aberration" } },
    ]
  },
  
  // Dimension/depth of the artwork
  dimension: {
    name: "Dimension",
    traits: [
      { name: "2D", rarity: 60, houdiniParam: { name: "dimension", value: "2d" } },
      { name: "2.5D", rarity: 30, houdiniParam: { name: "dimension", value: "2.5d" } },
      { name: "3D", rarity: 10, houdiniParam: { name: "dimension", value: "3d" } },
    ]
  },
  
  // Background style
  background: {
    name: "Background",
    traits: [
      { name: "Solid", rarity: 30, houdiniParam: { name: "background", value: "solid" } },
      { name: "Gradient", rarity: 25, houdiniParam: { name: "background", value: "gradient" } },
      { name: "Noise", rarity: 20, houdiniParam: { name: "background", value: "noise" } },
      { name: "Starfield", rarity: 15, houdiniParam: { name: "background", value: "starfield" } },
      { name: "Grid", rarity: 10, houdiniParam: { name: "background", value: "grid" } },
    ]
  },

  // Rare special attributes (not all NFTs will have these)
  specialAttributes: {
    name: "Special Attributes",
    probabilityToHave: 15, // 15% chance to have a special attribute
    traits: [
      { name: "Holographic", rarity: 30, houdiniParam: { name: "special", value: "holographic" } },
      { name: "Animated", rarity: 25, houdiniParam: { name: "special", value: "animated" } },
      { name: "Reactive", rarity: 20, houdiniParam: { name: "special", value: "reactive" } },
      { name: "Glitch", rarity: 15, houdiniParam: { name: "special", value: "glitch" } },
      { name: "Recursive Inception", rarity: 10, houdiniParam: { name: "special", value: "recursive_inception" } },
    ]
  },
  
  // Ultra-rare legendary attributes (very few NFTs will have these)
  legendaryAttributes: {
    name: "Legendary Attributes",
    probabilityToHave: 1, // 1% chance to have a legendary attribute
    traits: [
      { name: "Quantum", rarity: 30, houdiniParam: { name: "legendary", value: "quantum" } },
      { name: "Genesis", rarity: 25, houdiniParam: { name: "legendary", value: "genesis" } },
      { name: "Infinite", rarity: 20, houdiniParam: { name: "legendary", value: "infinite" } },
      { name: "Paradox", rarity: 15, houdiniParam: { name: "legendary", value: "paradox" } },
      { name: "Singularity", rarity: 10, houdiniParam: { name: "legendary", value: "singularity" } },
    ]
  },
  
  // Calculate rarity scores and verify that rarity percentages sum to 100%
  validateTraits: function() {
    for (const traitType in this) {
      if (typeof this[traitType] === 'object' && this[traitType].traits) {
        const traits = this[traitType].traits;
        let totalRarity = 0;
        
        for (const trait of traits) {
          totalRarity += trait.rarity;
        }
        
        if (totalRarity !== 100 && traitType !== 'specialAttributes' && traitType !== 'legendaryAttributes') {
          console.warn(`Warning: Rarity percentages for ${traitType} do not sum to 100% (${totalRarity}%)`);
        }
      }
    }
    
    return true;
  },
  
  // Helper function to get a trait based on its rarity
  getRandomTraitForType: function(traitType) {
    const traits = this[traitType].traits;
    const rand = Math.random() * 100;
    let cumulativeRarity = 0;
    
    for (const trait of traits) {
      cumulativeRarity += trait.rarity;
      if (rand < cumulativeRarity) {
        return trait;
      }
    }
    
    return traits[traits.length - 1];
  },
  
  // Generate a complete random set of traits for an NFT
  generateRandomTraits: function() {
    const result = {};
    
    // Add all basic traits
    for (const traitType in this) {
      if (typeof this[traitType] === 'object' && this[traitType].traits && traitType !== 'specialAttributes' && traitType !== 'legendaryAttributes' && traitType !== 'validateTraits' && traitType !== 'getRandomTraitForType' && traitType !== 'generateRandomTraits') {
        result[traitType] = this.getRandomTraitForType(traitType);
      }
    }
    
    // Add special attributes (if lucky)
    if (Math.random() * 100 < this.specialAttributes.probabilityToHave) {
      result.specialAttribute = this.getRandomTraitForType('specialAttributes');
    }
    
    // Add legendary attributes (if very lucky)
    if (Math.random() * 100 < this.legendaryAttributes.probabilityToHave) {
      result.legendaryAttribute = this.getRandomTraitForType('legendaryAttributes');
    }
    
    return result;
  }
}; 