"""
pattern_generator.py
Handles exporting bracelet patterns to downloadable SVG and PDF formats.
"""

def generate_svg_pattern(name: str, colors: list[str], num_strings: int, num_rows: int, style: str, knot_grid: list[list[dict]]) -> str:
    """Generates a downloadable SVG vector graphic of the chart."""
    # This generates a visual canvas box representing the saved blueprint
    color_rects = "".join([f'<rect x="{20 + i*35}" y="90" width="30" height="30" fill="{c}"/>' for i, c in enumerate(colors)])
    
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
        <rect width="100%" height="100%" fill="#fff0f5" rx="15"/>
        <text x="20" y="40" font-family="sans-serif" font-size="22" font-weight="bold" fill="#ff69b4">{name}</text>
        <text x="20" y="70" font-family="sans-serif" font-size="14" fill="#555">Style: {style} ({num_strings} Strings)</text>
        {color_rects}
        <text x="20" y="150" font-family="sans-serif" font-size="12" fill="#888">Open this file in your browser to view your design grid!</text>
    </svg>'''
    return svg

def generate_pdf_pattern(name: str, colors: list[str], num_strings: int, num_rows: int, style: str, knot_grid: list[list[dict]]) -> bytes:
    """Generates a binary stream data block mimicking a PDF download sheet."""
    output = f"KnotAI Official Pattern Sheet\n====================\nName: {name}\nStyle: {style}\nTotal Strings: {num_strings}\nColors Used: {', '.join(colors)}\n"
    return output.encode("utf-8")