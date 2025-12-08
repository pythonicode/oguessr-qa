from __future__ import annotations

import os
import requests
from io import BytesIO
from PIL import Image
from urllib.parse import urlparse
from typing import Optional


def process_tile(tile_url: str, output_dir: str = "../tiles") -> Optional[str]:
    """
    Downloads a tile from the given URL and saves it if it contains less than 50% white pixels.
    
    Args:
        tile_url: The URL of the tile to download
        output_dir: Directory to save valid tiles (default: ../tiles relative to this script)
        
    Returns:
        The path to the saved tile if it was saved, None if discarded
    """
    # Download the tile
    response = requests.get(tile_url)
    response.raise_for_status()
    
    # Load image from response
    image = Image.open(BytesIO(response.content))
    
    # Convert to RGB if necessary (handles RGBA, P mode, etc.)
    if image.mode != "RGB":
        image = image.convert("RGB")
    
    # Count white-ish pixels (R, G, B all >= 240 / 0xF0)
    pixels = list(image.getdata())
    total_pixels = len(pixels)
    white_threshold = 240  # 0xF0
    
    white_pixel_count = sum(
        1 for r, g, b in pixels
        if r >= white_threshold and g >= white_threshold and b >= white_threshold
    )
    
    white_ratio = white_pixel_count / total_pixels
    
    # Discard if more than 50% white pixels
    if white_ratio > 0.9:
        return None
    
    # Create output directory if it doesn't exist
    script_dir = os.path.dirname(os.path.abspath(__file__))
    full_output_dir = os.path.normpath(os.path.join(script_dir, output_dir))
    os.makedirs(full_output_dir, exist_ok=True)
    
    # Extract filename from URL
    parsed_url = urlparse(tile_url)
    filename = os.path.basename(parsed_url.path)
    
    # If no filename in path, generate one from the URL hash
    if not filename or "." not in filename:
        import hashlib
        url_hash = hashlib.md5(tile_url.encode()).hexdigest()[:12]
        filename = f"tile_{url_hash}.png"
    
    # Save the tile
    output_path = os.path.join(full_output_dir, filename)
    image.save(output_path)
    
    return output_path


def process_class_tiles(class_id: int) -> dict:
    """
    Fetches class data from Livelox and processes all tiles.
    
    Args:
        class_id: The Livelox class ID to fetch tiles for
        
    Returns:
        Dict with counts of saved and discarded tiles
    """
    from livelox_fetch import fetch_class_storage
    
    print(f"Fetching class data for classId: {class_id}")
    class_data = fetch_class_storage(class_id)
    
    # Extract tiles from the class data
    # Tiles are typically in class_data["tiles"] or similar structure
    map = class_data.get("map", {})
    tiles = map.get("tiles", [])
    
    if not tiles:
        print("No tiles found in class data")
        return {"saved": 0, "discarded": 0}
    
    output_dir = f"../tiles/{class_id}"
    saved_count = 0
    discarded_count = 0
    
    print(f"Processing {len(tiles)} tiles...")
    
    for i, tile in enumerate(tiles):
        # Tile URL might be directly a string or in a "url" field
        tile_url = tile if isinstance(tile, str) else tile.get("url")
        
        if not tile_url:
            continue
            
        try:
            result = process_tile(tile_url, output_dir=output_dir)
            if result:
                saved_count += 1
                print(f"  [{i+1}/{len(tiles)}] Saved: {os.path.basename(result)}")
            else:
                discarded_count += 1
                print(f"  [{i+1}/{len(tiles)}] Discarded (too white)")
        except Exception as e:
            print(f"  [{i+1}/{len(tiles)}] Error: {e}")
    
    print(f"\nDone! Saved: {saved_count}, Discarded: {discarded_count}")
    return {"saved": saved_count, "discarded": discarded_count}


if __name__ == "__main__":
    import sys
    
    # Default to the Japan Orienteering Championships M21E class
    class_id = int(sys.argv[1]) if len(sys.argv) > 1 else 866782
    
    process_class_tiles(class_id)

