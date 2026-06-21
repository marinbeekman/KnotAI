"""
color_extraction.py
Advanced color extraction using Pillow + k-means clustering.
Matches extracted colors to the nearest real DMC embroidery floss number.
"""

import math
from PIL import Image
import io

# A curated subset of popular DMC embroidery thread colors
DMC_COLORS = {
    "White":  (255, 255, 255, "White"),
    "Ecru":   (240, 234, 218, "Ecru"),
    "B5200":  (255, 255, 255, "Snow White"),
    "310":    (0,   0,   0,   "Black"),
    "317":    (119, 115, 118, "Pewter Gray"),
    "321":    (205, 36,  50,  "Red"),
    "666":    (237, 28,  52,  "Red Bright"),
    "700":    (0,   141, 43,  "Green Bright"),
    "743":    (255, 214, 98,  "Yellow Medium"),
    "996":    (32,  187, 233, "Electric Blue Medium"),
    "603":    (255, 130, 168, "Cranberry"),
    "210":    (205, 164, 208, "Lavender Medium"),
    "722":    (244, 162, 99,  "Orange Spice Light"),
}

def color_distance(c1, c2):
    """Calculates weighted distance between two RGB colors based on human perception."""
    return math.sqrt(
        0.30 * (c1[0] - c2[0]) ** 2 +
        0.59 * (c1[1] - c2[1]) ** 2 +
        0.11 * (c1[2] - c2[2]) ** 2
    )

def rgb_to_hex(r, g, b):
    return f"#{r:02x}{g:02x}{b:02x}"

def find_closest_dmc(r, g, b):
    """Finds the closest matching real-world DMC thread color."""
    best_num, best_name, best_hex, best_dist = None, None, None, float("inf")
    for num, (dr, dg, db, name) in DMC_COLORS.items():
        d = color_distance((r, g, b), (dr, dg, db))
        if d < best_dist:
            best_dist, best_num, best_name, best_hex = d, num, name, rgb_to_hex(dr, dg, db)
    return {"dmc": best_num, "name": best_name, "hex": best_hex}

def kmeans_colors(pixels, k=6, iterations=10):
    """Groups similar pixels together to find the primary color theme."""
    import random
    if not pixels: return []
    centers = random.sample(pixels, min(k, len(pixels)))
    for _ in range(iterations):
        buckets = [[] for _ in range(len(centers))]
        for p in pixels:
            dists = [color_distance(p, c) for c in centers]
            buckets[dists.index(min(dists))].append(p)
        new_centers = []
        for i, bucket in enumerate(buckets):
            if bucket:
                n = len(bucket)
                new_centers.append((
                    round(sum(p[0] for p in bucket) / n),
                    round(sum(p[1] for p in bucket) / n),
                    round(sum(p[2] for p in bucket) / n)
                ))
            else:
                new_centers.append(centers[i])
        centers = new_centers
    return centers

def detect_vibe(colors_rgb):
    """Detects a style aesthetic based on the color palette rules."""
    warm = cool = bright = 0
    for r, g, b in colors_rgb:
        lum = (r + g + b) / 3
        if r > b + 20: warm += 1
        if b > r + 20: cool += 1
        if lum > 180: bright += 1
    if warm >= 2 and bright >= 1: return "🌅 Warm sunset vibes detected"
    if cool >= 2: return "🌊 Deep ocean energy detected"
    return "✨ Bright & cheerful vibes detected"

def extract_colors_from_image(image_bytes: bytes, num_colors: int = 6) -> dict:
    """Main function wrapper used by main.py."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img.thumbnail((100, 100), Image.Resampling.LANCZOS)
    pixels = [img.getpixel((x, y)) for y in range(img.height) for x in range(img.width)]
    
    rgbs = kmeans_colors(pixels, k=num_colors)
    hex_colors = [rgb_to_hex(r, g, b) for r, g, b in rgbs]
    dmc_matches = [find_closest_dmc(r, g, b) for r, g, b in rgbs]
    vibe = detect_vibe(rgbs)
    
    return {
        "hex_colors": hex_colors,
        "dmc_matches": dmc_matches,
        "vibe": vibe
    }