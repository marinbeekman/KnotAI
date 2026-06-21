/**
 * bracelet.js — Renders a BraceletBook-style knot chart onto a <canvas>.
 *
 * Each string is traced as a diagonal path across rows.
 * At every intersection a knot bubble is drawn with the correct
 * directional symbol: FK →  BK ←  FBK ↘  BFK ↙
 */

const CELL = 36;   // px per grid cell
const R    = 10;   // knot bubble radius
const LPAD = 40;   // left padding (row numbers)
const TPAD = 40;   // top padding (string labels)

/** Map pattern style + position → knot type string */
function getKnotType(style, row, col, cols) {
  const ALL = ['FK', 'BK', 'FBK', 'BFK'];
  switch (style) {
    case 'Chevron': {
      const mid = Math.floor(cols / 2);
      if (col < mid) return 'FK';
      if (col > mid) return 'BK';
      return 'FBK';
    }
    case 'Diamond': {
      const phase = (row + col) % 4;
      return ['FK', 'BK', 'FK', 'BK'][phase];
    }
    case 'Wave':
      return Math.sin((row + col) * 0.8) > 0 ? 'FK' : 'FBK';
    case 'Arrow':
      return col < Math.floor(cols / 2) ? 'FK' : 'BK';
    case 'Heart': {
      const ph = (row * 2 + col) % 8;
      return ['FK', 'FBK', 'BK', 'BFK', 'FK', 'BK', 'FBK', 'FK'][ph];
    }
    case 'Starburst':
      return ALL[(row + col * 2) % 4];
    case 'Alpha':
      return col % 2 === 0 ? 'FBK' : 'BFK';
    default: // Surprise / random-ish
      return ALL[(row * 3 + col * 2) % 4];
  }
}

/**
 * Draw the directional arrow symbol inside a knot bubble.
 * FK  → right arrow
 * BK  → left arrow
 * FBK → down-right arrow
 * BFK → down-left arrow
 */
function drawKnotSymbol(ctx, cx, cy, radius, type) {
  const s = radius * 0.52;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();

  if (type === 'FK') {
    // → horizontal right arrow
    ctx.moveTo(cx - s, cy);
    ctx.lineTo(cx + s, cy);
    ctx.moveTo(cx + s * 0.35, cy - s * 0.5);
    ctx.lineTo(cx + s, cy);
    ctx.lineTo(cx + s * 0.35, cy + s * 0.5);

  } else if (type === 'BK') {
    // ← horizontal left arrow
    ctx.moveTo(cx + s, cy);
    ctx.lineTo(cx - s, cy);
    ctx.moveTo(cx - s * 0.35, cy - s * 0.5);
    ctx.lineTo(cx - s, cy);
    ctx.lineTo(cx - s * 0.35, cy + s * 0.5);

  } else if (type === 'FBK') {
    // ↘ diagonal down-right arrow
    ctx.moveTo(cx - s * 0.6, cy - s * 0.6);
    ctx.lineTo(cx + s * 0.6, cy + s * 0.6);
    ctx.moveTo(cx + s * 0.6, cy);
    ctx.lineTo(cx + s * 0.6, cy + s * 0.6);
    ctx.lineTo(cx, cy + s * 0.6);

  } else {
    // ↙ BFK diagonal down-left arrow
    ctx.moveTo(cx + s * 0.6, cy - s * 0.6);
    ctx.lineTo(cx - s * 0.6, cy + s * 0.6);
    ctx.moveTo(cx - s * 0.6, cy);
    ctx.lineTo(cx - s * 0.6, cy + s * 0.6);
    ctx.lineTo(cx, cy + s * 0.6);
  }
  ctx.stroke();
}

/**
 * Main render function.
 * Simulates string-position swaps row by row (FK/BK swap neighbours,
 * FBK/BFK keep positions), then draws paths and knot bubbles.
 *
 * @param {string[]} palette   - Hex colour for each string
 * @param {number}   numStrings
 * @param {number}   numRows
 * @param {string}   patStyle  - Pattern style name
 * @returns {HTMLCanvasElement}
 */
function renderBraceletCanvas(palette, numStrings, numRows, patStyle) {
  const cols = numStrings - 1;
  const W = LPAD + cols * CELL + LPAD;
  const H = TPAD + numRows * CELL + TPAD;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  canvas.id     = 'braceletCanvas';
  canvas.style.maxWidth = '100%';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // Normalise palette length
  const pal = palette.length >= numStrings
    ? palette.slice(0, numStrings)
    : Array.from({ length: numStrings }, (_, i) => palette[i % palette.length]);

  // ── Simulate knot layout & string swaps ──────────────────────────
  let order = Array.from({ length: numStrings }, (_, i) => i);
  const knotGrid    = [];   // [{col, type, colorIdx}, ...]  per row
  const orderPerRow = [order.slice()];

  for (let r = 0; r < numRows; r++) {
    const rowKnots = [];
    const startCol = r % 2 === 0 ? 0 : 1;
    const newOrder = [...order];

    for (let k = startCol; k < cols; k += 2) {
      const type = getKnotType(patStyle, r, k, cols);
      rowKnots.push({ col: k, type, colorIdx: order[k] });
      // FK and BK swap the two strings; FBK and BFK leave them in place
      if (type === 'FK' || type === 'BK') {
        [newOrder[k], newOrder[k + 1]] = [newOrder[k + 1], newOrder[k]];
      }
    }
    knotGrid.push(rowKnots);
    order = newOrder;
    orderPerRow.push(order.slice());
  }

  // ── Build position-of-string lookup ──────────────────────────────
  // posOfString[stringIdx][row] = column position (0-indexed)
  const posOfString = Array.from({ length: numStrings }, () => []);
  for (let row = 0; row <= numRows; row++) {
    orderPerRow[row].forEach((strIdx, pos) => {
      posOfString[strIdx][row] = pos;
    });
  }

  // ── Draw string paths ─────────────────────────────────────────────
  for (let s = 0; s < numStrings; s++) {
    ctx.beginPath();
    ctx.strokeStyle = pal[s];
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    for (let row = 0; row <= numRows; row++) {
      const pos = posOfString[s][row];
      const x = LPAD + pos * CELL + CELL / 2;
      const y = TPAD + row * CELL;
      if (row === 0) ctx.moveTo(x, y);
      else           ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // ── Draw knot bubbles ─────────────────────────────────────────────
  for (let r = 0; r < numRows; r++) {
    knotGrid[r].forEach(k => {
      const cx = LPAD + k.col * CELL + CELL;   // midpoint between the two strings
      const cy = TPAD + r * CELL + CELL / 2;
      const color = pal[k.colorIdx];

      // Drop shadow
      ctx.shadowColor = 'rgba(0,0,0,0.12)';
      ctx.shadowBlur  = 4;

      // Bubble fill
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle   = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      // Direction symbol
      drawKnotSymbol(ctx, cx, cy, R, k.type);
    });
  }

  // ── Row numbers ───────────────────────────────────────────────────
  ctx.font      = '10px DM Sans,sans-serif';
  ctx.fillStyle = '#b07a90';

  ctx.textAlign = 'right';
  for (let r = 0; r < numRows; r++) {
    ctx.fillText(r + 1, LPAD - 6, TPAD + r * CELL + CELL / 2 + 4);
  }
  ctx.textAlign = 'left';
  for (let r = 0; r < numRows; r++) {
    ctx.fillText(r + 1, LPAD + cols * CELL + CELL + 6, TPAD + r * CELL + CELL / 2 + 4);
  }

  // ── String labels (A B C …) at top ───────────────────────────────
  ctx.font      = '11px DM Sans,sans-serif';
  ctx.textAlign = 'center';
  orderPerRow[0].forEach((strIdx, pos) => {
    const x = LPAD + pos * CELL + CELL / 2;
    ctx.fillStyle = pal[strIdx];
    ctx.fillText(String.fromCharCode(65 + pos), x, TPAD - 10);
  });

  return canvas;
}
