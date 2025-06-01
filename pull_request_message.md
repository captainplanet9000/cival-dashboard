# Pull Request: Enhanced Fractal Crystalline Generator

## Description
I've made improvements to the fractal crystalline generator by adding new parameters for color intensity and edge highlighting. These changes provide more control over the visual output while maintaining compatibility with the existing pipeline.

## Changes Made
- Added `color_intensity` parameter (range 0.1-2.0) to control color vibrancy
- Added `edge_highlight` parameter (range 0-1) to adjust edge highlighting strength
- Added sparkle effects on edges for more crystalline feel
- Added parameter storage for metadata generation
- Created documentation in a readme file

## Testing
I've tested these changes with various parameter combinations and they produce great results. The edge highlighting in particular creates a more three-dimensional appearance.

## Working with Nebula Generator
I noticed you're working on animation features for the nebula generator. My changes don't conflict with your work, but we should coordinate on the metadata parameter naming convention to keep it consistent across generators.

## Next Steps
Once this PR is approved, I'd like to look at adding similar color control improvements to the other generators. Please let me know if you have any suggestions or concerns about my implementation.

## Screenshot
(Would attach screenshot of the improved fractal output here)

@Winsurf 