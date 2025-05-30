# Fractal Crystalline Generator - Enhanced Version

## Overview
This is an enhanced version of the Fractal Crystalline generator with improved color controls and edge highlighting effects. The generator creates complex crystalline formations with intricate surface details and can be used to create unique NFT artwork.

## New Features Added

### Color Intensity Control
- **Parameter**: `color_intensity` (float, range 0.1-2.0)
- **Function**: Controls the vibrancy of colors in the crystal structure
- **Usage**: Higher values make colors more saturated and vibrant
- **Technical**: Implemented using color power function `pow(@Cd, 1.0/intensity)`

### Improved Edge Highlighting
- **Parameter**: `edge_highlight` (float, range 0-1)
- **Function**: Controls the strength of edge highlighting effect
- **Usage**: Higher values create more pronounced edge highlights
- **Technical**: Edge detection based on normal angle with adjustable strength

### Sparkling Effect
- **Function**: Adds subtle sparkles on the edges of crystal structures
- **Technical**: Conditional highlight based on edge detection and random value
- **Visual Impact**: Creates a sense of crystalline reflections and light play

## Implementation Notes
- All new parameters are exposed in the UI for easy adjustment
- Parameter values are stored as attributes for metadata generation
- Compatible with the existing NFT generation pipeline
- Maintains backward compatibility with previous parameter sets

## Usage in Houdini
1. Add a Point Wrangle to a Grid SOP
2. Copy this code into the wrangle
3. Add the following parameters:
   - `seed` (float)
   - `iterations` (integer)
   - `scale` (float)
   - `roughness` (float)
   - `crystal_size` (float)
   - `color1` (vector)
   - `color2` (vector)
   - `color_intensity` (float, default 1.0)
   - `edge_highlight` (float, default 0.3)

## Recommended Settings
- For sparkly crystals: `edge_highlight=0.8`, `color_intensity=1.5`
- For subtle matte crystals: `edge_highlight=0.2`, `color_intensity=0.8`
- For vibrant angular crystals: `iterations=7`, `roughness=0.7`, `edge_highlight=0.5` 