# KnotAI - AI Friendship Bracelet Pattern Generator

An AI-powered website that generates friendship bracelet knot patterns from photos, descriptions, or color selections.

## Project Structure

```
knotai/
├── index.html          ← Main HTML (all sections & markup)
├── css/
│   └── styles.css      ← All styling (pink theme, animations, layout)
├── js/
│   ├── hero.js         ← Interactive canvas strings in the hero
│   ├── bracelet.js     ← Knot chart renderer (BraceletBook-style canvas)
│   └── app.js          ← App logic: state, upload, AI call, community, modal
└── README.md
```

## Features

- **Interactive hero** — strings react to mouse movement with spring physics
- **Photo upload** — k-means colour extraction + AI vibe detection
- **AI pattern generator** — calls Claude claude-sonnet-4-6 to name & style your bracelet
- **Correct knot chart** — simulates string swaps row-by-row, draws FK/BK/FBK/BFK symbols
- **5 skill levels** — 4 strings (beginner) → 16+ strings (expert)
- **8 pattern styles** — Chevron, Diamond, Wave, Arrow, Heart, Starburst, Alpha, Surprise
- **Community gallery** — with tab filtering (trending/new/beginner/expert)
- **Sign in / create account** modal
- **Scroll reveal** animations throughout

## Quick Start (local)

Just open `index.html` in a browser. No build step needed.

> **Note:** The AI generator calls `https://api.anthropic.com/v1/messages` directly from the browser.  
> This works for local dev / demos, but **expose your API key in a backend proxy for production.**

## Deploying to GitHub Pages

1. Push this folder to a GitHub repo  
2. Go to **Settings → Pages → Source → main branch / root**  
3. Your site will be live at `https://<your-username>.github.io/<repo-name>/`

## Production: Hiding the API Key

Create a serverless function (Vercel, Netlify, Cloudflare Workers) that proxies requests to Anthropic:

```
Browser → /api/generate (your serverless fn) → api.anthropic.com
```

Then in `app.js`, replace the fetch URL:
```js
// Change this:
const res = await fetch('https://api.anthropic.com/v1/messages', { ... });

// To this:
const res = await fetch('/api/generate', { ... });
```

## Tech Stack

- Vanilla HTML / CSS / JS — no framework, no build step
- Google Fonts: DM Sans + Playfair Display
- Anthropic claude-sonnet-4-6 API for pattern generation
- Canvas 2D API for the hero animation and knot chart

## Knot Types

| Symbol | Name | Arrow | Effect on strings |
|--------|------|-------|-------------------|
| FK  | Forward Knot        | →  | Swaps left+right |
| BK  | Backward Knot       | ←  | Swaps right+left |
| FBK | Forward-Backward    | ↘  | Stays in place   |
| BFK | Backward-Forward    | ↙  | Stays in place   |
