#!/usr/bin/env python3
"""
NFT Variation Generator for Sonic Blockchain
This script automates the generation of NFT artwork variations using Houdini Engine.
"""

import os
import json
import random
import time
import argparse
from datetime import datetime
try:
    import hou
    HOUDINI_AVAILABLE = True
except ImportError:
    HOUDINI_AVAILABLE = False
    print("Warning: Running in standalone mode. To run with Houdini Engine, run within Houdini Python shell.")


class NFTGenerator:
    def __init__(self, output_dir="./output", metadata_dir="./metadata", collection_name="SonicNFT"):
        self.output_dir = output_dir
        self.metadata_dir = metadata_dir
        self.collection_name = collection_name
        self.generators = {
            "fractal_crystalline": {
                "file": "../houdini/vex_examples/1_fractal_crystalline.vfl",
                "param_ranges": {
                    "seed": (1, 1000),
                    "iterations": (3, 7),
                    "scale": (0.1, 2.0),
                    "roughness": (0.1, 1.0),
                    "crystal_size": (0.5, 3.0)
                },
                "colors": [
                    {"color1": (0.9, 0.2, 0.2), "color2": (0.2, 0.2, 0.8)},
                    {"color1": (0.8, 0.8, 0.2), "color2": (0.2, 0.7, 0.4)},
                    {"color1": (0.7, 0.3, 0.7), "color2": (0.2, 0.5, 0.8)},
                    {"color1": (0.6, 0.6, 0.9), "color2": (0.1, 0.3, 0.6)},
                    {"color1": (0.9, 0.5, 0.1), "color2": (0.3, 0.1, 0.5)}
                ]
            },
            "organic_flow_fields": {
                "file": "../houdini/vex_examples/2_organic_flow_fields.vfl",
                "param_ranges": {
                    "seed": (1, 1000),
                    "flow_scale": (0.01, 0.5),
                    "curl": (0.1, 2.0),
                    "speed": (0.01, 1.0),
                    "steps": (10, 100)
                },
                "colors": [
                    {"flow_col1": (0.9, 0.1, 0.1), "flow_col2": (0.1, 0.1, 0.9)},
                    {"flow_col1": (0.1, 0.7, 0.3), "flow_col2": (0.8, 0.3, 0.6)},
                    {"flow_col1": (0.8, 0.8, 0.1), "flow_col2": (0.2, 0.5, 0.1)},
                    {"flow_col1": (0.5, 0.0, 0.5), "flow_col2": (0.0, 0.5, 0.5)},
                    {"flow_col1": (0.9, 0.5, 0.0), "flow_col2": (0.0, 0.5, 0.9)}
                ]
            },
            "geometric_pattern_weaver": {
                "file": "../houdini/vex_examples/3_geometric_pattern_weaver.vfl",
                "param_ranges": {
                    "seed": (1, 1000),
                    "pattern_type": (0, 2),
                    "scale": (1.0, 20.0),
                    "complexity": (0.5, 5.0),
                    "variation": (0.0, 1.0)
                },
                "colors": [
                    {"base_color": (0.9, 0.1, 0.1), "accent_color": (0.1, 0.1, 0.9)},
                    {"base_color": (0.1, 0.7, 0.3), "accent_color": (0.8, 0.3, 0.6)},
                    {"base_color": (0.8, 0.8, 0.1), "accent_color": (0.2, 0.5, 0.1)},
                    {"base_color": (0.5, 0.0, 0.5), "accent_color": (0.0, 0.5, 0.5)},
                    {"base_color": (0.9, 0.5, 0.0), "accent_color": (0.0, 0.5, 0.9)}
                ]
            },
            "cosmic_nebula": {
                "file": "../houdini/vex_examples/4_cosmic_nebula.vfl",
                "param_ranges": {
                    "seed": (1, 1000),
                    "density": (0.1, 5.0),
                    "detail": (0.1, 2.0),
                    "brightness": (0.5, 5.0)
                },
                "colors": [
                    {"color1": (0.9, 0.1, 0.1), "color2": (0.1, 0.1, 0.9), "color3": (0.5, 0.5, 0.9)},
                    {"color1": (0.1, 0.7, 0.3), "color2": (0.8, 0.3, 0.6), "color3": (0.2, 0.2, 0.5)},
                    {"color1": (0.8, 0.8, 0.1), "color2": (0.2, 0.5, 0.1), "color3": (0.7, 0.2, 0.7)},
                    {"color1": (0.5, 0.0, 0.5), "color2": (0.0, 0.5, 0.5), "color3": (0.7, 0.7, 0.2)},
                    {"color1": (0.9, 0.5, 0.0), "color2": (0.0, 0.5, 0.9), "color3": (0.5, 0.0, 0.0)}
                ]
            },
            "abstract_architecture": {
                "file": "../houdini/vex_examples/5_abstract_architecture.vfl",
                "param_ranges": {
                    "seed": (1, 1000),
                    "building_height": (1.0, 10.0),
                    "complexity": (0.5, 5.0),
                    "symmetry": (0.0, 1.0),
                    "window_density": (0.0, 0.9)
                },
                "colors": [
                    {"primary_color": (0.9, 0.1, 0.1), "accent_color": (0.1, 0.1, 0.9)},
                    {"primary_color": (0.1, 0.7, 0.3), "accent_color": (0.8, 0.3, 0.6)},
                    {"primary_color": (0.8, 0.8, 0.1), "accent_color": (0.2, 0.5, 0.1)},
                    {"primary_color": (0.5, 0.0, 0.5), "accent_color": (0.0, 0.5, 0.5)},
                    {"primary_color": (0.9, 0.5, 0.0), "accent_color": (0.0, 0.5, 0.9)}
                ]
            }
        }

    def ensure_directories(self):
        """Create output and metadata directories if they don't exist."""
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.metadata_dir, exist_ok=True)

    def random_params(self, generator_name):
        """Generate random parameters for a specific generator."""
        generator = self.generators.get(generator_name)
        if not generator:
            raise ValueError(f"Unknown generator: {generator_name}")

        params = {}
        for param, (min_val, max_val) in generator["param_ranges"].items():
            if param == "pattern_type" or param == "steps":
                params[param] = random.randint(min_val, max_val)
            else:
                params[param] = random.uniform(min_val, max_val)

        # Select random color scheme
        colors = random.choice(generator["colors"])
        params.update(colors)

        return params

    def generate_metadata(self, token_id, generator_name, params):
        """Generate metadata JSON for the NFT."""
        pattern_type_names = ["Islamic", "Celtic", "Mandala"]
        
        attributes = []
        for param, value in params.items():
            attribute_type = param
            
            # Special handling for color attributes
            if "color" in param.lower():
                if isinstance(value, tuple):
                    value = f"rgb({int(value[0]*255)},{int(value[1]*255)},{int(value[2]*255)})"
            
            # Special handling for pattern_type
            if param == "pattern_type" and generator_name == "geometric_pattern_weaver":
                value = pattern_type_names[int(value)]
            
            attributes.append({
                "trait_type": attribute_type,
                "value": value
            })
            
        metadata = {
            "name": f"{self.collection_name} #{token_id}",
            "description": f"A unique generative artwork created by {generator_name} generator for the Sonic blockchain.",
            "image": f"ipfs://TOKEN_CID_PLACEHOLDER/{token_id}.png",
            "edition": token_id,
            "date": int(time.time()),
            "artist": "Sonic NFT Generator",
            "attributes": attributes,
            "generator": generator_name
        }
        
        metadata_path = os.path.join(self.metadata_dir, f"{token_id}.json")
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
            
        return metadata_path

    def run_houdini_generation(self, generator_name, params, token_id):
        """
        Run Houdini generation process.
        This requires being run inside Houdini Python shell.
        """
        if not HOUDINI_AVAILABLE:
            print(f"Simulating Houdini generation for {generator_name} with token_id {token_id}")
            print(f"Parameters: {params}")
            return f"{token_id}.png (simulated)"
        
        # Create the Houdini node network
        obj = hou.node("/obj")
        geo = obj.createNode("geo", f"{generator_name}_{token_id}")
        
        # Different base geometry based on generator type
        if generator_name == "cosmic_nebula":
            base = geo.createNode("volume", "base_volume")
        else:
            base = geo.createNode("grid", "base_grid")
            base.parm("rows").set(100)
            base.parm("cols").set(100)
        
        # Create wrangle node
        wrangle = geo.createNode("attribwrangle", "generator")
        wrangle.setInput(0, base)
        
        # Load VEX code from file
        generator = self.generators.get(generator_name)
        with open(generator["file"], 'r') as f:
            vex_code = f.read()
        
        wrangle.parm("snippet").set(vex_code)
        
        # Set parameters
        for param, value in params.items():
            if isinstance(value, tuple):  # Handle color parameters
                for i, component in enumerate(['r', 'g', 'b']):
                    parm_name = f"{param}_{component}"
                    if wrangle.parm(parm_name):
                        wrangle.parm(parm_name).set(value[i])
            else:
                if wrangle.parm(param):
                    wrangle.parm(param).set(value)
        
        # Add material if needed
        if generator_name != "cosmic_nebula":
            material = geo.createNode("material", "color")
            material.setInput(0, wrangle)
            
            # Add additional nodes based on generator
            if generator_name == "fractal_crystalline" or generator_name == "geometric_pattern_weaver":
                normal = geo.createNode("normal", "surface_normal")
                normal.setInput(0, wrangle)
                material.setInput(0, normal)
            
            output_node = material
        else:
            # For nebula, add volume visualization
            volume_vis = geo.createNode("volumevisualization", "volume_render")
            volume_vis.setInput(0, wrangle)
            output_node = volume_vis
        
        # Set display flag
        output_node.setDisplayFlag(True)
        output_node.setRenderFlag(True)
        
        # Setup camera and render
        cam = obj.createNode("cam", f"render_cam_{token_id}")
        render = obj.createNode("ifd", f"render_{token_id}")
        
        # Position camera
        cam.parmTuple("t").set((0, 0, 5))
        cam.parm("focal").set(50)
        
        # Setup render
        render.parm("camera").set(cam.path())
        render.parm("vm_picture").set(os.path.join(self.output_dir, f"{token_id}.png"))
        render.parm("vm_renderengine").set("pbrraytrace")
        render.parm("vm_samples").set(4)
        render.parm("res_override").set(True)
        render.parm("res1").set(2048)
        render.parm("res2").set(2048)
        
        # Render
        render.parm("execute").pressButton()
        
        return os.path.join(self.output_dir, f"{token_id}.png")

    def generate_collection(self, count=10, generator=None):
        """Generate a collection of NFTs with specified count."""
        self.ensure_directories()
        
        results = []
        generators_to_use = [generator] if generator else list(self.generators.keys())
        
        for i in range(1, count + 1):
            # Cycle through generators if multiple
            if not generator:
                gen_name = generators_to_use[i % len(generators_to_use)]
            else:
                gen_name = generator
                
            token_id = i
            params = self.random_params(gen_name)
            
            print(f"Generating NFT #{token_id} using {gen_name} generator...")
            
            # Generate the NFT
            image_path = self.run_houdini_generation(gen_name, params, token_id)
            
            # Create metadata
            metadata_path = self.generate_metadata(token_id, gen_name, params)
            
            results.append({
                "token_id": token_id,
                "generator": gen_name,
                "image_path": image_path,
                "metadata_path": metadata_path,
                "params": params
            })
            
            print(f"NFT #{token_id} generated successfully!")
        
        # Create collection info file
        collection_info = {
            "name": self.collection_name,
            "count": count,
            "generators_used": generators_to_use,
            "created_at": datetime.now().isoformat(),
            "items": results
        }
        
        with open(os.path.join(self.metadata_dir, "collection_info.json"), 'w') as f:
            json.dump(collection_info, f, indent=2)
            
        return results


def main():
    parser = argparse.ArgumentParser(description="Generate NFT variations for Sonic blockchain")
    parser.add_argument("--count", type=int, default=10, help="Number of NFTs to generate")
    parser.add_argument("--generator", type=str, help="Specific generator to use")
    parser.add_argument("--output", type=str, default="../assets/images", help="Output directory for images")
    parser.add_argument("--metadata", type=str, default="../assets/metadata", help="Output directory for metadata")
    parser.add_argument("--collection", type=str, default="SonicNFT", help="Collection name")
    
    args = parser.parse_args()
    
    generator = NFTGenerator(
        output_dir=args.output,
        metadata_dir=args.metadata,
        collection_name=args.collection
    )
    
    results = generator.generate_collection(count=args.count, generator=args.generator)
    print(f"Generated {len(results)} NFTs successfully!")
    print(f"Images saved to: {args.output}")
    print(f"Metadata saved to: {args.metadata}")
    
    if not HOUDINI_AVAILABLE:
        print("\nNote: This was run in simulation mode. To generate actual NFTs, run this script inside Houdini Python shell.")


if __name__ == "__main__":
    main() 