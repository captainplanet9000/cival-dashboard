# Houdini Generative Art for Sonic NFT Collection

This directory contains five professional VEX-based generative art workflows for creating unique NFT artworks for the Sonic blockchain. Each generator produces highly customizable and visually distinctive pieces.

## Generators Overview

### 1. Fractal Crystalline Structures (`1_fractal_crystalline.vfl`)
Creates complex crystalline formations with fractal patterns and intricate surface details.
- **Features**: Recursive fractal patterns, surface details, edge highlighting
- **Ideal For**: Mineral-like structures, crystal art, abstract geometry

### 2. Organic Flow Fields (`2_organic_flow_fields.vfl`)
Generates flowing, organic patterns using curl noise and particle systems.
- **Features**: Multiple flow layers, curl noise, dynamic particle trails
- **Ideal For**: Fluid dynamics, organic forms, abstract flowing patterns

### 3. Geometric Pattern Weaver (`3_geometric_pattern_weaver.vfl`)
Creates intricate geometric patterns inspired by various cultural motifs.
- **Features**: Islamic patterns, Celtic knots, Mandalas with customizable complexity
- **Ideal For**: Ornamental designs, cultural motifs, symmetric patterns

### 4. Cosmic Nebula Generator (`4_cosmic_nebula.vfl`)
Produces volumetric space nebulas with complex color interactions.
- **Features**: Volumetric density fields, spiral arms, dust particles, color mixing
- **Ideal For**: Space-themed artwork, volumetric effects, atmospheric nebulas

### 5. Abstract Architecture Generator (`5_abstract_architecture.vfl`)
Generates futuristic architectural structures with procedural details.
- **Features**: Procedural windows, symmetry options, weathering effects
- **Ideal For**: Abstract buildings, futuristic structures, architectural forms

## Setting Up Houdini for NFT Generation

### Basic Setup Requirements
1. Houdini 19.0 or later (Apprentice, Indie, or Commercial license)
2. Basic knowledge of Houdini's interface and node-based workflow
3. Understanding of parameter controls and VEX basics

### Project Setup Steps

1. Create a new Houdini project
2. For each generator:
   - Create a new Geometry node in `/obj`
   - Add the specified base geometry (Grid/Box/Volume)
   - Add a Point/Volume Wrangle node
   - Copy the VEX code from the corresponding `.vfl` file
   - Configure parameters as described in the code comments
   - Add any additional nodes mentioned in the setup instructions

## Configuration for Each Generator

### Fractal Crystalline Setup
```
Grid SOP → Point Wrangle → PolyExtrude → Normal → Material
```
Key Parameters:
- `seed`: Global seed for randomization (0-1000)
- `iterations`: Number of fractal iterations (3-7 recommended)
- `scale`: Overall scale (0.1-2.0)
- `roughness`: Surface roughness (0.1-1.0)
- `crystal_size`: Base size of crystals (0.5-3.0)
- `color1`/`color2`: Primary/Secondary colors

### Organic Flow Fields Setup
```
Grid SOP (high res) → Point Wrangle → Add SOP → Point Wrangle (movement) → Convert Line
```
Key Parameters:
- `seed`: Global seed (0-1000)
- `flow_scale`: Scale of flow field (0.01-0.5)
- `curl`: Amount of curl noise (0.1-2.0)
- `speed`: Particle movement speed (0.01-1.0)
- `steps`: Integration steps (10-100)
- `flow_col1`/`flow_col2`: Color gradient

### Geometric Pattern Weaver Setup
```
Grid SOP → Point Wrangle → PolyExtrude → Normal → Material
```
Key Parameters:
- `seed`: Global seed (0-1000)
- `pattern_type`: Pattern type (0=Islamic, 1=Celtic, 2=Mandala)
- `scale`: Pattern scale (1.0-20.0)
- `complexity`: Pattern complexity (0.5-5.0)
- `variation`: Random variation (0.0-1.0)
- `base_color`/`accent_color`: Color scheme

### Cosmic Nebula Setup
```
Volume SOP → Volume Wrangle → Volume Visualization
```
Key Parameters:
- `seed`: Global seed (0-1000)
- `density`: Overall density (0.1-5.0)
- `detail`: Detail level (0.1-2.0)
- `brightness`: Overall brightness (0.5-5.0)
- `center`: Center point of nebula
- `color1`/`color2`/`color3`: Color schemes

### Abstract Architecture Setup
```
Box SOP → Point Wrangle → PolyExtrude → Subdivide → Material
```
Key Parameters:
- `seed`: Global seed (0-1000)
- `height`: Building height (1.0-10.0)
- `complexity`: Building complexity (0.5-5.0)
- `symmetry`: Symmetry amount (0.0-1.0)
- `color1`/`color2`: Building colors
- `windows`: Window density (0.0-0.9)

## Generating Variations for NFTs

To create a collection of unique NFTs:

1. **Set Up a Seed Parameter**:
   - Create a slider for the seed value
   - Each unique seed will generate a different variation

2. **Batch Rendering**:
   - Use a simple Python script to iterate through seeds
   - Set up a Mantra/Karma render node for high-quality output
   - Configure output paths to save each variation

3. **Recommended Parameters to Vary**:
   - Seed (primary variation control)
   - Color schemes
   - Complexity/detail levels
   - Scale parameters

## Exporting for NFTs

1. **Render Settings**:
   - Resolution: 2048×2048 or 3000×3000 for high-quality NFTs
   - Format: PNG (lossless) with alpha channel
   - Use ray tracing for best quality
   - Enable reflections and global illumination

2. **Metadata Generation**:
   - Record parameter values for each NFT
   - Use the seed value as unique identifier
   - Store attributes like complexity, pattern type, etc.

## Tips for Best Results

- Experiment with each generator's unique parameters
- Create test renders at lower resolution while exploring
- Use complementary color schemes for visual appeal
- For Fractal Crystalline and Geometric Pattern, play with lighting to enhance details
- For Cosmic Nebula, adjust density and color carefully for best results
- Balance complexity with clarity - too much noise can reduce visual impact

## Need Help?

If you encounter issues or need to customize these generators:
- Check the VEX code comments for parameter details
- Refer to Houdini's VEX documentation for function references
- Modify the code to create your own unique variations

## Next Steps

After generating your artwork, proceed to:
1. Deploy your NFT smart contract on Sonic blockchain
2. Upload artwork to IPFS or similar decentralized storage
3. Create metadata JSON files for each NFT
4. Mint your collection on the Sonic blockchain 