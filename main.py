"""
KnotAI — FastAPI Backend
Handles: AI generation proxy, advanced color extraction, SVG/PDF pattern export
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import anthropic
import json
import io
import os
from typing import Optional
from color_extraction import extract_colors_from_image
from pattern_generator import generate_svg_pattern, generate_pdf_pattern

app = FastAPI(title="KnotAI API", version="1.0.0")

# Allow your frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:5500", "https://yourusername.github.io"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fallback fake key for local testing if you haven't set the environment variable yet
API_KEY = os.environ.get("ANTHROPIC_API_KEY", "mock_key_for_testing")
client = anthropic.Anthropic(api_key=API_KEY)

class GenerateRequest(BaseModel):
    prompt:        Optional[str] = ""
    level:         int           = 1
    style:         str           = "Chevron"
    colors:        list[str]     = []
    image_base64:  Optional[str] = None
    image_mime:    Optional[str] = None

class PatternExportRequest(BaseModel):
    name:        str
    colors:      list[str]
    num_strings: int
    num_rows:    int
    style:       str
    knot_grid:   list[list[dict]]
    format:      str = "svg"

@app.get("/health")
def health():
    return {"status": "ok", "service": "KnotAI API"}

@app.post("/api/extract-colors")
async def extract_colors(file: UploadFile = File(...)):
    image_bytes = await file.read()
    result = extract_colors_from_image(image_bytes)
    return result

@app.post("/api/generate")
async def generate_pattern(req: GenerateRequest):
    LV_DESCS = {
        1: "Beginner — 4 strings, forward knots only",
        2: "Easy — 6 strings, FK + BK",
        3: "Intermediate — 8 strings, all 4 knot types",
        4: "Advanced — 12 strings, complex patterns",
        5: "Expert — 16+ strings, alpha pixel art",
    }
    STR_CNT = {1: 4, 2: 6, 3: 8, 4: 12, 5: 16}
    num_strings = STR_CNT.get(req.level, 6)
    
    # Simple simulated response if using the mock testing key
    if API_KEY == "mock_key_for_testing":
        return {
            "name": f"Testing {req.style} Blend",
            "description": "A gorgeous simulated pattern for your backend preview.",
            "vibe": "🚀 Local Dev Mode",
            "colorNames": ["Custom 1", "Custom 2"],
            "suggestedColors": req.colors if req.colors else ["#ff69b4", "#ffb6c1"],
            "patternNotes": "Your backend is hooked up successfully!",
            "tip": "Make sure to set your real ANTHROPIC_API_KEY env variable later!"
        }

    system_prompt = f"""You are a friendship bracelet pattern designer. Return ONLY a JSON object.
    Level: {req.level} — {LV_DESCS.get(req.level, "")}
    Style: {req.style}
    Colors provided: {", ".join(req.colors)}"""
    
    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": req.prompt or "Generate a beautiful bracelet pattern."}],
        )
        text = "".join(block.text for block in message.content if hasattr(block, "text"))
        return json.loads(text.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))