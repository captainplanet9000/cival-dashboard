**Step-by-Step Guide to Generating the 10,000-NFT Crudentials Collection with Python (Optional Houdini Support)**

**Introduction**

Creating the 10,000-piece **Crudentials** NFT collection involves combining unique artwork layers in code to produce thousands of distinct images, each paired with descriptive metadata. This guide details the process, from designing your cartoon-style animal characters (inspired by projects like Crudentials itself) with various accessories, to using Python for automated generation. We'll cover layer design, asset organization, image composition, metadata JSON creation, randomizing traits with rarity, and ensuring uniqueness. We'll also touch on optional advanced techniques using SideFX Houdini.

The goal is to generate the image assets and metadata files required for the **Crudentials** collection, which is planned for release on the **Sonic blockchain** at a price point of **250 SONIC**. By the end, you'll have a comprehensive roadmap and practical code examples to produce your large generative NFT collection assets from scratch.

**Example NFT Style:** The Crudentials collection will feature cartoon animal avatars, each with a unique combination of traits derived from layered artwork (e.g., background color, base character type, expression, clothing, accessories). We will use this layered approach, programmatically assembling traits like hats, glasses, and outfits onto a base character to create 10,000 one-of-a-kind images.

**Step 1: Planning the Base Character and Traits**

*   **Concept and Art Style:** Solidify the visual identity for Crudentials. Choose your base cartoon animal(s) and define the overall aesthetic (e.g., quirky, cool, cute).
*   **Trait Categories (Properties):** List all distinct categories that will vary. Common examples include:
    *   `Background`
    *   `Body/Fur Color`
    *   `Eyes`
    *   `Mouth`
    *   `Clothing`
    *   `Headwear` (e.g., Hat, Hair)
    *   `Accessories` (e.g., Glasses, Necklace, Handheld Item)
*   **Trait Variations:** Brainstorm multiple options within each category. Aim for a diverse set. For a 10k collection, having around 100-150+ total unique trait variations across all categories is a good target to ensure sufficient randomness and rarity potential.
*   **Layer Order:** Define the precise stacking order. This is crucial for the visual outcome. A typical order might be: `Background` -> `Body` -> `Clothing` -> `Mouth` -> `Eyes` -> `Accessories` -> `Headwear`. Write this order down; it will directly inform your asset organization and coding logic.
*   **Compatibility:** Sketch or digitally mock up combinations to ensure traits don't clash visually. How does a hat sit with different ear types? Can glasses and masks be worn together? Decide on rules or adjustments if needed.
*   **The "None" Trait:** Explicitly plan for categories where a trait might be absent. Will some Crudentials have no hat? No accessory? Decide whether to handle this with a dedicated transparent PNG layer (e.g., `Hat_None.png`) or purely in code (by sometimes skipping a layer). Using a "None" image is often simpler.
*   **Rarity Planning:** Think about which traits should be common, uncommon, rare, or legendary. Assign preliminary rarity percentages or weights to variations within each category. This guides both the artwork creation (don't spend equal time on a trait seen 0.1% of the time vs. 50%) and the generation script.

**Step 2: Creating and Separating Layered Artwork**

*   **Art Software:** Use layer-based software (Photoshop, Procreate, GIMP, Affinity Designer).
*   **Canvas Consistency:** Set a final image size (e.g., 1000x1000 pixels) and *use this exact canvas size for every single trait layer*. Alignment is critical.
*   **Base Layer:** Create the foundational character outline or shape.
*   **Trait Layers:** Draw each trait variation on its own separate layer, aligned correctly to the base.
    *   **Transparency:** Ensure each trait layer has a transparent background. Only the artwork for that specific trait should be opaque.
    *   **One Trait Per Layer:** Do not combine multiple traits on a single layer file.
*   **Exporting:**
    *   Export each layer individually as a PNG file (preserves transparency).
    *   Use a clear, consistent naming convention. Include the category and the specific variation in the filename. Examples: `Background_SkyBlue.png`, `Eyes_Laser.png`, `Headwear_Beanie.png`, `Accessory_None.png`. This structure aids programmatic access later.
*   **Backup:** Keep your original layered art files (.psd, .procreate, etc.) backed up safely. You may need to revisit them for tweaks.

**Step 3: Organizing Asset Layers and File Structure**

Proper organization is non-negotiable for automation.

*   **Main Asset Directory:** Create a root folder (e.g., `crudentials_assets/`).
*   **Category Subfolders:** Inside the root folder, create one subfolder for *each trait category*. Name these folders exactly as you defined your layers (e.g., `Background`, `Body`, `Eyes`, `Mouth`, `Clothing`, `Headwear`, `Accessory`).
*   **Layer Order:** Arrange or list these folders in the *exact order* they should be layered in the final image (bottom-most layer first). This documented order is vital for the script.
    ```plaintext
    crudentials_assets/
    ├── 01_Background/
    │   ├── SkyBlue.png
    │   ├── RedGradient.png
    │   └── ...
    ├── 02_Body/
    │   ├── Sloth_Purple.png
    │   ├── Cat_Orange.png
    │   └── ...
    ├── 03_Clothing/
    │   ├── Shirt_Blue.png
    │   ├── Hoodie_Green.png
    │   └── ...
    ├── 04_Mouth/
    │   ├── Happy.png
    │   ├── Sad.png
    │   └── ...
    ├── 05_Eyes/
    │   ├── Normal.png
    │   ├── Laser.png
    │   └── ...
    ├── 06_Accessory/
    │   ├── Necklace_Gold.png
    │   ├── Glasses_Pixel.png
    │   ├── None.png
    │   └── ...
    ├── 07_Headwear/
    │   ├── Hat_Beanie.png
    │   ├── Hair_PunkRock.png
    │   ├── None.png
    │   └── ...
    ```
    *(Note: Using numeric prefixes like `01_`, `02_` can help enforce order visually and programmatically if you sort directory listings.)*
*   **Trait Files:** Place the exported PNG files for each variation into their corresponding category folder. Ensure filenames are descriptive and consistent.
*   **Output Directory:** Create a separate directory outside your assets folder to store the generated NFTs and metadata.
    ```plaintext
    crudentials_output/
    ├── images/      # Final PNGs (1.png, 2.png, ...)
    └── metadata/    # Final JSONs (1.json, 2.json, ...)
    ```

**Step 4: Setting Up the Python Environment**

*   **Python Installation:** Ensure you have Python 3.8 or newer installed.
*   **Virtual Environment (Recommended):** Create and activate a virtual environment to isolate project dependencies:
    ```bash
    python -m venv venv
    # On Windows:
    .\venv\Scripts\activate
    # On macOS/Linux:
    source venv/bin/activate
    ```
*   **Install Pillow:** Install the necessary library for image manipulation.
    ```bash
    pip install Pillow
    ```
*   **Project Structure:** Your project directory might look like this:
    ```
    CrudentialsGenerator/
    ├── venv/
    ├── crudentials_assets/
    │   ├── 01_Background/
    │   └── ... (other trait folders)
    ├── crudentials_output/
    │   ├── images/
    │   └── metadata/
    ├── generate_nfts.py   # Your main Python script
    └── config.json        # Optional: For configuration settings
    ```
*   **Initial Test:** Create a simple script (`test_pillow.py`) to verify Pillow is working and can access your assets:
    ```python
    from PIL import Image
    import os

    assets_base_path = "crudentials_assets"
    # Example: Try loading a background and a body part
    try:
        bg_path = os.path.join(assets_base_path, "01_Background", "SkyBlue.png")
        body_path = os.path.join(assets_base_path, "02_Body", "Sloth_Purple.png")

        bg_img = Image.open(bg_path)
        body_img = Image.open(body_path)

        print(f"Background: {bg_img.size}, Mode: {bg_img.mode}")
        print(f"Body: {body_img.size}, Mode: {body_img.mode}")
        print("Pillow setup successful!")

    except FileNotFoundError as e:
        print(f"Error loading image: {e}. Check asset paths and filenames.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

    ```
    Run this script (`python test_pillow.py`). It should print the size (e.g., (1000, 1000)) and mode (likely RGBA) if successful.

**Step 5: Writing the Image Composition Script**

This script combines the individual trait layers into a single final NFT image.

*   **Core Logic:** Load trait images and paste them onto a base canvas in the predefined layer order.
*   **Function for Composition:** Encapsulate the logic in a function for reusability.

    ```python
    from PIL import Image
    import os

    # Assumes all layers share the same dimensions (e.g., 1000x1000)
    IMAGE_WIDTH = 1000
    IMAGE_HEIGHT = 1000

    def compose_image(trait_files, layer_order, assets_base_path, output_path):
        """
        Composes a single NFT image from selected trait files.

        Args:
            trait_files (dict): {category_name: filename.png} for the selected traits.
            layer_order (list): List of category names in the correct layering order.
            assets_base_path (str): Path to the root assets directory.
            output_path (str): Full path to save the composed image.
        """
        # Create a blank canvas with transparency
        canvas = Image.new("RGBA", (IMAGE_WIDTH, IMAGE_HEIGHT))

        for category in layer_order:
            filename = trait_files.get(category)
            if filename and filename.lower() != 'none.png': # Handle 'None' traits if represented by files
                try:
                    layer_path = os.path.join(assets_base_path, category, filename)
                    layer_img = Image.open(layer_path).convert("RGBA")

                    # Ensure layer is the correct size (optional safety check)
                    if layer_img.size != (IMAGE_WIDTH, IMAGE_HEIGHT):
                        print(f"Warning: Layer {layer_path} has incorrect dimensions {layer_img.size}. Resizing might cause issues.")
                        # Optionally resize, but ideally assets are pre-sized
                        # layer_img = layer_img.resize((IMAGE_WIDTH, IMAGE_HEIGHT))

                    # Paste the layer onto the canvas, using its own alpha channel for transparency
                    canvas.paste(layer_img, (0, 0), layer_img)
                except FileNotFoundError:
                    print(f"Error: Trait file not found at {layer_path}")
                    # Decide how to handle: skip layer, stop generation, use default?
                    continue # Simple handling: skip if missing
                except Exception as e:
                    print(f"Error processing layer {layer_path}: {e}")
                    continue

        # Save the final composed image
        try:
            canvas.save(output_path, optimize=True) # Enable basic optimization
        except Exception as e:
            print(f"Error saving final image {output_path}: {e}")

    # --- Example Usage (within your main generation loop later) ---
    # selected_traits = {
    #     "01_Background": "SkyBlue.png",
    #     "02_Body": "Sloth_Purple.png",
    #     "04_Mouth": "Happy.png",
    #     "05_Eyes": "Laser.png",
    #     "07_Headwear": "Hat_Beanie.png",
    #     "06_Accessory": "None.png" # Example of selecting 'None'
    # }
    # defined_layer_order = ["01_Background", "02_Body", "03_Clothing", "04_Mouth", "05_Eyes", "06_Accessory", "07_Headwear"] # Must match folder names/structure
    # output_file = "crudentials_output/images/1.png"
    # compose_image(selected_traits, defined_layer_order, "crudentials_assets", output_file)
    # print("Example image composed successfully.")
    ```
*   **Image Caching (Performance):** Loading images from disk repeatedly for 10,000 NFTs is slow. Pre-load or cache `Image` objects.
    ```python
    # --- Caching Mechanism (Add this to your main script) ---
    image_cache = {}

    def get_image(category, filename, assets_base_path):
        """Loads an image, using a cache to avoid re-loading."""
        cache_key = (category, filename)
        if cache_key in image_cache:
            return image_cache[cache_key]

        if filename and filename.lower() != 'none.png':
            try:
                layer_path = os.path.join(assets_base_path, category, filename)
                img = Image.open(layer_path).convert("RGBA")
                if img.size != (IMAGE_WIDTH, IMAGE_HEIGHT):
                     print(f"Warning: Correcting size for {layer_path}")
                     img = img.resize((IMAGE_WIDTH, IMAGE_HEIGHT)) # Resize if necessary
                image_cache[cache_key] = img
                return img
            except FileNotFoundError:
                print(f"Error: Trait file not found at {layer_path}")
                return None
            except Exception as e:
                print(f"Error loading image {layer_path}: {e}")
                return None
        return None # Handle 'None' or errors

    # Modify compose_image to use the cache:
    def compose_image_cached(trait_files, layer_order, assets_base_path, output_path):
        canvas = Image.new("RGBA", (IMAGE_WIDTH, IMAGE_HEIGHT))
        for category in layer_order:
            filename = trait_files.get(category)
            layer_img = get_image(category, filename, assets_base_path)
            if layer_img:
                 canvas.paste(layer_img, (0, 0), layer_img)
        try:
            canvas.save(output_path, optimize=True)
        except Exception as e:
            print(f"Error saving final image {output_path}: {e}")

    # Pre-load all assets (optional, uses more RAM but fastest generation)
    # def preload_all_images(categories, assets_base_path):
    #     print("Pre-loading all trait images...")
    #     for category in categories:
    #         cat_path = os.path.join(assets_base_path, category)
    #         if os.path.isdir(cat_path):
    #             for filename in os.listdir(cat_path):
    #                 if filename.lower().endswith(".png"):
    #                     get_image(category, filename, assets_base_path) # Loads into cache
    #     print(f"Pre-loaded {len(image_cache)} images.")

    ```

**Step 6: Generating Random Trait Combinations with Rarity and Uniqueness**

This is the core loop that creates the 10,000 unique combinations.

*   **Define Configuration:** Set up categories, file lists, and rarity weights. Consider using a separate `config.json` or keep it in the script.

    ```python
    import random
    import os
    import json
    from tqdm import tqdm # Optional: for a progress bar (pip install tqdm)

    # --- Configuration ---
    COLLECTION_NAME = "Crudentials"
    NUM_NFTS = 10000
    ASSETS_BASE_PATH = "crudentials_assets"
    OUTPUT_PATH = "crudentials_output"
    IMAGE_OUTPUT_PATH = os.path.join(OUTPUT_PATH, "images")
    METADATA_OUTPUT_PATH = os.path.join(OUTPUT_PATH, "metadata")

    # Ensure output directories exist
    os.makedirs(IMAGE_OUTPUT_PATH, exist_ok=True)
    os.makedirs(METADATA_OUTPUT_PATH, exist_ok=True)

    # Define trait categories in EXACT layer order
    # (Using sorted listdir assumes numeric prefixes like 01_, 02_)
    try:
        LAYER_ORDER = sorted([d for d in os.listdir(ASSETS_BASE_PATH) if os.path.isdir(os.path.join(ASSETS_BASE_PATH, d))])
    except FileNotFoundError:
        print(f"Error: Assets directory not found at {ASSETS_BASE_PATH}")
        exit()

    print(f"Detected Layer Order: {LAYER_ORDER}")

    # Load trait file names for each category
    trait_files = {}
    for category in LAYER_ORDER:
        cat_path = os.path.join(ASSETS_BASE_PATH, category)
        try:
            # Filter for PNG files only
            trait_files[category] = [f for f in os.listdir(cat_path) if f.lower().endswith(".png")]
            if not trait_files[category]:
                 print(f"Warning: No PNG files found in category {category}")
        except FileNotFoundError:
             print(f"Warning: Category directory not found: {cat_path}")
             trait_files[category] = []


    # Define rarity weights (example structure - adjust to your needs)
    # Weights are positional, corresponding to the order of files in trait_files[category]
    # Use None for equal probability within a category.
    RARITY_WEIGHTS = {
        "01_Background": None, # Equal chance for all backgrounds
        "02_Body": [0.6, 0.4], # Example: Body 1 is 60%, Body 2 is 40%
        "03_Clothing": None,
        "04_Mouth": None,
        "05_Eyes": [0.5, 0.3, 0.15, 0.05], # Example: Eye type 4 is rarest
        "06_Accessory": [0.8, 0.1, 0.1], # Example: 80% chance of None (if None.png is first file)
        "07_Headwear": None,
    }

    # --- Uniqueness Check ---
    # Calculate total possible combinations (optional but recommended)
    total_combinations = 1
    for category in LAYER_ORDER:
        count = len(trait_files.get(category, []))
        if count > 0:
            total_combinations *= count

    print(f"Total possible unique combinations: {total_combinations:,}")
    if total_combinations < NUM_NFTS:
        print(f"Error: Not enough trait variations ({total_combinations}) to generate {NUM_NFTS} unique NFTs!")
        print("Add more trait variations or reduce the collection size.")
        exit()
    elif total_combinations < NUM_NFTS * 5: # Warning if the space isn't much larger
         print(f"Warning: Total combinations ({total_combinations}) is close to the target size ({NUM_NFTS}). Generation might become slow finding unique combos.")


    # --- Generation Loop ---
    used_combinations = set()
    print(f"Generating {NUM_NFTS} NFTs for {COLLECTION_NAME}...")

    # Optional: Pre-load images for speed
    # preload_all_images(LAYER_ORDER, ASSETS_BASE_PATH)

    # Set random seed for reproducibility
    random.seed(42) # Use a fixed seed

    for token_id in tqdm(range(1, NUM_NFTS + 1)): # Use tqdm for progress bar
        attempts = 0
        max_attempts = 1000 # Safety break to prevent infinite loops

        while True:
            picked_traits = {}
            combo_signature_parts = []

            for category in LAYER_ORDER:
                options = trait_files.get(category, [])
                if not options: # Skip empty categories
                    continue

                weights = RARITY_WEIGHTS.get(category)

                # Adjust weights if length doesn't match options (simple equal weight fallback)
                if weights and len(weights) != len(options):
                     print(f"Warning: Weight mismatch for category {category}. Using equal weights.")
                     weights = None

                if options: # Ensure category has options before choosing
                    chosen_file = random.choices(options, weights=weights, k=1)[0]
                    picked_traits[category] = chosen_file
                    combo_signature_parts.append(f"{category}:{chosen_file}") # More robust signature
                else:
                     # Handle case where category might be empty or skipped
                     # picked_traits[category] = None # Or omit from dict
                     pass


            # Create a unique key for the combination
            combo_key = "|".join(sorted(combo_signature_parts))

            if combo_key not in used_combinations:
                used_combinations.add(combo_key)
                break # Found a unique combination
            else:
                attempts += 1
                if attempts > max_attempts:
                     print(f"\nError: Could not find a unique combination after {max_attempts} attempts for token {token_id}.")
                     print("Check combination space or rarity logic.")
                     # Decide: Stop? Skip?
                     # For now, we break the inner loop and potentially the outer one
                     # This might result in fewer than NUM_NFTS being generated
                     break # Break while loop

        if attempts > max_attempts:
            print("Stopping generation due to difficulty finding unique combinations.")
            break # Break for loop

        # --- Compose Image ---
        image_file_path = os.path.join(IMAGE_OUTPUT_PATH, f"{token_id}.png")
        compose_image_cached(picked_traits, LAYER_ORDER, ASSETS_BASE_PATH, image_file_path)

        # --- Generate Metadata (Covered in next step) ---
        generate_metadata(token_id, picked_traits, LAYER_ORDER, METADATA_OUTPUT_PATH) # Call metadata function here

    print(f"\nGeneration complete. {len(used_combinations)} unique NFTs generated.")

    # --- Post-Generation Rarity Analysis (Optional) ---
    # Call rarity verification function here
    verify_rarity(METADATA_OUTPUT_PATH)

    ```
    *(Added random seed setting and call to metadata/rarity functions)*

**Step 7: Generating Metadata (JSON) for Each NFT**

Metadata describes your NFT's properties. Standard formats like ERC-721 are common, but always check specific requirements for the **Sonic blockchain** and the marketplaces you plan to use (though ERC-721 is a good baseline).

*   **Standard Structure:**
    *   `name`: "Crudentials #1234"
    *   `description`: "A unique member of the Crudentials collection on Sonic."
    *   `image`: URI pointing to the image (e.g., `ipfs://YOUR_CID/1234.png`)
    *   `attributes`: List of `{"trait_type": "Category", "value": "Trait Value"}` objects.
*   **Function for Metadata Generation:**

    ```python
    import json
    import os

    # Placeholder - Replace with your actual IPFS CID or base URL after uploading images
    IMAGE_BASE_URI = "ipfs://REPLACE_WITH_YOUR_IMAGE_FOLDER_CID/" # IMPORTANT! Update this later.

    def clean_trait_name(filename, category_name):
        """Cleans the filename to get a display-friendly trait value."""
        # Remove .png extension
        name = filename.rsplit('.', 1)[0]
        # Optional: Remove category prefix if present (e.g., "Hat_Beanie" -> "Beanie")
        # Determine prefix based on category name structure (e.g., "07_Headwear" -> "Headwear_")
        cat_prefix_part = category_name.split('_', 1)[-1] + "_" if '_' in category_name else category_name + "_"
        if name.startswith(cat_prefix_part):
             name = name[len(cat_prefix_part):]

        # Replace underscores with spaces, capitalize words
        name = name.replace("_", " ").title()

        # Handle "None" specifically if needed
        if name.lower() == "none":
            return "None" # Return "None" as a string value for the trait
        return name

    def generate_metadata(token_id, picked_traits, layer_order, metadata_output_path):
        """Generates and saves the JSON metadata file for a single NFT."""
        attributes_list = []
        for category in layer_order:
            filename = picked_traits.get(category)
            # Decide whether to include "None" traits in metadata
            # if filename and filename.lower() != 'none.png': # Option 1: Exclude None traits
            if filename: # Option 2: Include None traits (if clean_trait_name returns "None")
                # Use the folder name (minus prefix like '01_') as trait_type
                trait_type = category.split('_', 1)[-1] if '_' in category else category
                trait_value = clean_trait_name(filename, category)
                attributes_list.append({"trait_type": trait_type, "value": trait_value})

        metadata = {
            "name": f"{COLLECTION_NAME} #{token_id}",
            "description": f"A unique member of the {COLLECTION_NAME} collection on the Sonic blockchain. Gotta go fast!",
            "image": f"{IMAGE_BASE_URI}{token_id}.png",
            # Add any other Sonic-specific fields if required by marketplaces or standards on Sonic
            "external_url": "https://yourcrudentialswebsite.com/", # Add your project URL
            "attributes": attributes_list,
            "properties": { # Example of additional properties object if needed
                 "collection": COLLECTION_NAME,
                 "blockchain": "Sonic"
            }
            # "compiler": "Crudentials Python Generator v1.0" # Optional
        }

        # Save the metadata file
        metadata_file_path = os.path.join(metadata_output_path, f"{token_id}.json") # Save as .json
        try:
            with open(metadata_file_path, "w") as f:
                json.dump(metadata, f, indent=4)
        except Exception as e:
            print(f"Error writing metadata for token {token_id}: {e}")

    # --- Call this function inside the main generation loop ---
    ```
*   **Image URI (IPFS):**
    *   **Workflow:**
        1.  Generate all 10,000 images locally.
        2.  Upload the *entire* `images` folder (containing `1.png` to `10000.png`) to an IPFS pinning service (e.g., Pinata, NFT.storage, Filebase).
        3.  The service will give you a unique Content Identifier (CID) for the folder (e.g., `QmXyZ...`).
        4.  Your image URI will be `ipfs://YOUR_FOLDER_CID/1.png`, `ipfs://YOUR_FOLDER_CID/2.png`, etc.
        5.  **Update Metadata:** After obtaining the CID, you MUST update the `IMAGE_BASE_URI` variable and either:
            *   Re-run *only* the metadata generation part of your script.
            *   Write a separate script to iterate through all `.json` files in the `metadata` folder and update the `image` field with the correct CID. This is often safer and faster than regenerating everything.

**Step 8: Optional: Integrating Houdini for Procedural Trait Generation**

(Content remains largely the same as the previous version, emphasizing it's optional and adds complexity).

**Step 9: Best Practices for Output Quality and Optimization**

*   **Image Resolution & Format:** (Same as before - 1000x1000 or 2048x2048 PNG recommended).
*   **Optimization:** (Same as before - use Pillow's optimize, consider external tools).
*   **Code Structure & Readability:** (Same - functions, comments, consider config files).
*   **Configuration Management:** Highly recommended for paths, collection size, URIs, rarity weights. A `config.json` or `config.py` is ideal.
*   **Error Handling:** Robust `try...except` blocks are essential. Log errors informatively.
*   **Quality Assurance (QA):**
    *   **Visual Spot Check:** Crucial. Check at least 50-100 images randomly.
    *   **Metadata Validation:** Check JSON structure, trait names/values, and the image URI format.
    *   **Automated Checks:** Verify counts, filenames, JSON validity.
*   **Rarity Verification:** Run the verification script (provided below) after generation.

    ```python
    # --- Rarity Verification Function (Place this in your script) ---
    import json
    import os
    from collections import defaultdict
    from tqdm import tqdm # Assumes tqdm is imported

    def verify_rarity(metadata_dir):
        """Parses generated metadata to report trait counts and percentages."""
        trait_counts = defaultdict(lambda: defaultdict(int))
        total_nfts_checked = 0

        print("\nVerifying trait distribution...")
        if not os.path.exists(metadata_dir):
             print(f"Error: Metadata directory {metadata_dir} not found.")
             return

        metadata_files = [f for f in os.listdir(metadata_dir) if f.endswith('.json')]
        total_nfts_checked = len(metadata_files)
        if total_nfts_checked == 0:
            print("No metadata files found to verify.")
            return

        for filename in tqdm(metadata_files, desc="Analyzing Metadata"):
            filepath = os.path.join(metadata_dir, filename)
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    if 'attributes' in data:
                        for attr in data['attributes']:
                            trait_type = attr.get('trait_type')
                            value = attr.get('value')
                            if trait_type and value is not None: # Ensure value exists
                                trait_counts[trait_type][str(value)] += 1 # Ensure value is string for key
            except json.JSONDecodeError:
                print(f"Warning: Could not decode JSON in {filename}")
            except Exception as e:
                 print(f"Error reading {filename}: {e}")

        print(f"\n--- Trait Rarity Report ({total_nfts_checked} NFTs Analyzed) ---")
        # Sort categories alphabetically
        for trait_type in sorted(trait_counts.keys()):
            print(f"\nCategory: {trait_type}")
            values = trait_counts[trait_type]
            # Sort values by count (most common first)
            sorted_values = sorted(values.items(), key=lambda item: item[1], reverse=True)
            for value, count in sorted_values:
                percentage = (count / total_nfts_checked) * 100 if total_nfts_checked > 0 else 0
                print(f"  - {value}: {count} ({percentage:.2f}%)")

    # --- Call this function at the end of your main script ---
    # verify_rarity(METADATA_OUTPUT_PATH)
    ```
*   **Version Control (Git):** Use Git for code, config. Ignore generated outputs.
*   **Intellectual Property:** (Same - crucial to have rights).
*   **Reproducibility:** Use `random.seed()` at the start of your script. Document the seed used for the final generation run.

**Conclusion**

Generating the 10,000-NFT **Crudentials** collection requires careful planning, asset creation, and robust scripting. This guide provides a detailed framework using Python and Pillow to automate the creation of unique images and metadata suitable for deployment on the **Sonic blockchain**. Remember to prioritize asset organization, implement uniqueness checks, manage rarity effectively, and conduct thorough QA.

After successfully generating and verifying your assets, the next critical phases involve securing your artwork on IPFS, developing and auditing your Sonic-compatible smart contract, and planning your community minting event where collectors can acquire their Crudentials for **250 SONIC**. Good luck bringing Crudentials to life! 