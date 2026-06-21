/**
 * app.js — Main application logic.
 * Handles: scroll reveal, state, upload/color extraction,
 * AI generation, level cards, community grid, modal.
 */

// ══════════════════════════════════════════════════
// SCROLL REVEAL
// ══════════════════════════════════════════════════
const revObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('visible');
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => revObs.observe(el));


// ══════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════
let currentLevel  = 1;
let currentStyle  = 'Chevron';
let uploadedImageData = null;

const LV_DESCS = {
  1: 'Beginner — 4 strings, forward knots only, candy stripe',
  2: 'Easy — 6 strings, FK + BK, chevron and V shapes',
  3: 'Intermediate — 8 strings, all 4 knot types, diamonds & arrows',
  4: 'Advanced — 12 strings, complex multi-row patterns, alpha text',
  5: 'Expert — 16+ strings, alpha pixel art, Pokémon & portraits'
};
const STR_CNT = { 1: 4,  2: 6,  3: 8,  4: 12, 5: 16 };
const ROW_CNT = { 1: 8,  2: 12, 3: 16, 4: 20, 5: 26 };

// ── Level selector ────────────────────────────────
function setLevel(n, btn) {
  currentLevel = n;
  document.querySelectorAll('.lv-btn').forEach(b => b.classList.remove('active'));
  (btn || document.querySelector(`[data-lv="${n}"]`)).classList.add('active');
  document.getElementById('lvDesc').textContent = LV_DESCS[n];
}

// ── Style chips ───────────────────────────────────
function setSt(el, name) {
  currentStyle = name;
  document.querySelectorAll('.sc').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

// ── Color swatches ────────────────────────────────
function toggleSw(el) { el.classList.toggle('active'); }

function getActiveColors() {
  return [...document.querySelectorAll('#colorRow .csw.active')]
    .map(s => s.dataset.c)
    .filter(Boolean);
}


// ══════════════════════════════════════════════════
// UPLOAD & COLOR EXTRACTION
// ══════════════════════════════════════════════════
function handleUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    uploadedImageData = ev.target.result;
    const img = document.getElementById('previewImg');
    img.src = uploadedImageData;
    img.style.display = 'block';
    document.getElementById('uploadPh').style.display = 'none';
    document.getElementById('uploadZone').classList.add('has-image');
    extractColors(uploadedImageData);
  };
  reader.readAsDataURL(file);
}

function extractColors(dataUrl) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const img = new Image();
  img.onload = () => {
    c.width = 60; c.height = 60;
    ctx.drawImage(img, 0, 0, 60, 60);
    const d = ctx.getImageData(0, 0, 60, 60).data;
    const samples = [];
    for (let y = 0; y < 60; y += 4) {
      for (let x = 0; x < 60; x += 4) {
        const i = (y * 60 + x) * 4;
        samples.push([d[i], d[i + 1], d[i + 2]]);
      }
    }
    const colors = kMeans(samples, 6, 10);
    showExtracted(colors);
    detectVibe(colors);
  };
  img.src = dataUrl;
}

// k-means colour quantisation (k clusters, it iterations)
function dist3(a, b) {
  return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
}
function r2h(r, g, b) {
  return '#' + [r, g, b]
    .map(x => Math.max(0, Math.min(255, x | 0)).toString(16).padStart(2, '0'))
    .join('');
}
function kMeans(samples, k, iters) {
  let centers = samples.slice(0, k).map(x => [...x]);
  for (let i = 0; i < iters; i++) {
    const buckets = Array.from({ length: k }, () => []);
    samples.forEach(p => {
      let bi = 0, bd = Infinity;
      centers.forEach((c, idx) => {
        const d = dist3(p, c);
        if (d < bd) { bd = d; bi = idx; }
      });
      buckets[bi].push(p);
    });
    centers = centers.map((c, i) => {
      if (!buckets[i].length) return c;
      const n = buckets[i].length;
      return [
        buckets[i].reduce((a, p) => a + p[0], 0) / n,
        buckets[i].reduce((a, p) => a + p[1], 0) / n,
        buckets[i].reduce((a, p) => a + p[2], 0) / n,
      ];
    });
  }
  return centers.map(([r, g, b]) => r2h(r, g, b));
}

function showExtracted(colors) {
  const wrap = document.getElementById('extColors');
  const sw   = document.getElementById('extSwatches');
  sw.innerHTML = '';
  colors.forEach(c => {
    const el = document.createElement('div');
    el.className = 'ex-sw sel';
    el.style.background = c;
    el.title = c;
    el.onclick = () => { el.classList.toggle('sel'); syncExtracted(colors); };
    sw.appendChild(el);
  });
  wrap.style.display = 'flex';
  syncExtracted(colors);
}

function syncExtracted(all) {
  // Remove previously injected extracted swatches
  document.querySelectorAll('.csw.ext-added').forEach(e => e.remove());
  // Add currently selected extracted colours to the main colour row
  document.querySelectorAll('#extSwatches .ex-sw.sel').forEach(s => {
    const el = document.createElement('div');
    el.className = 'csw active ext-added';
    el.style.background = s.style.background;
    el.dataset.c = s.title;
    el.onclick = () => el.classList.toggle('active');
    const row = document.getElementById('colorRow');
    row.insertBefore(el, row.querySelector('.add-sw'));
  });
}

function detectVibe(colors) {
  let warm = 0, cool = 0, bright = 0, dark = 0, pink = 0;
  colors.forEach(h => {
    const r = parseInt(h.slice(1, 3), 16);
    const g = parseInt(h.slice(3, 5), 16);
    const b = parseInt(h.slice(5, 7), 16);
    const lum = (r + g + b) / 3;
    if (r > g + 30 && r > b + 30) warm++;
    if (b > r + 20 && b > g + 10) cool++;
    if (lum > 190) bright++;
    if (lum < 70)  dark++;
    if (r > 160 && b > 80 && g < 130) pink++;
  });

  let vibe = '🌸 Soft romantic vibes detected';
  if (pink   >= 2) vibe = '🩷 Dreamy pink energy detected';
  else if (warm  >= 3 && bright >= 2) vibe = '🌅 Warm sunset vibes detected';
  else if (cool  >= 3 && dark   >= 2) vibe = '🌊 Deep ocean energy detected';
  else if (cool  >= 3 && bright >= 2) vibe = '☁️ Airy dreamy mood detected';
  else if (warm  >= 2 && dark   >= 2) vibe = '🍂 Earthy autumn vibes detected';
  else if (bright >= 4)               vibe = '✨ Bright & cheerful vibes detected';
  else if (dark   >= 3)               vibe = '🌙 Moody night aesthetic detected';

  document.getElementById('vibeText').textContent = vibe;
  const badge = document.getElementById('vibeBadge');
  badge.style.display = 'inline-flex';
}


// ══════════════════════════════════════════════════
// AI GENERATION
// ══════════════════════════════════════════════════

/**
 * Calls the Anthropic API to get pattern metadata,
 * then renders the bracelet canvas.
 *
 * NOTE: For production, proxy this request through a
 * serverless function (e.g. /api/generate) so your
 * API key is never exposed in the browser.
 */
async function generate() {
  const btn     = document.getElementById('genBtn');
  const loading = document.getElementById('loadingDiv');
  const out     = document.getElementById('patOut');

  btn.disabled = true;
  loading.className = 'loading show';
  out.className = 'pat-out';

  const msgs = [
    'Weaving your pattern...',
    'Computing string paths...',
    'Choosing knot harmony...',
    'Finalizing your chart...'
  ];
  let mi = 0;
  const lt = document.getElementById('loadingT');
  const ticker = setInterval(() => { lt.textContent = msgs[++mi % msgs.length]; }, 1400);

  const prompt     = document.getElementById('promptInput').value || '';
  const colors     = getActiveColors();
  const numStrings = STR_CNT[currentLevel];
  const numRows    = ROW_CNT[currentLevel];

  const systemPrompt = `You are a friendship bracelet pattern designer. Return ONLY a JSON object — no markdown fences, no preamble.

{
  "name": "creative 3-5 word bracelet name",
  "description": "one evocative sentence",
  "vibe": "2-3 word vibe label",
  "colorNames": ["name1", "name2", ...],
  "suggestedColors": ["#hex1", "#hex2", ...],
  "patternNotes": "why this pattern fits the vibe",
  "tip": "one practical tip for this level"
}

Level: ${currentLevel} — ${LV_DESCS[currentLevel]}
Style requested: ${currentStyle}
Thread colors provided: ${colors.join(', ')}
${uploadedImageData ? 'An image has been provided — analyse its colours and overall mood.' : ''}
Return exactly ${numStrings} hex values in suggestedColors.`;

  try {
    const userContent = [];
    if (uploadedImageData) {
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: uploadedImageData.split(';')[0].split(':')[1],
          data: uploadedImageData.split(',')[1]
        }
      });
    }
    userContent.push({
      type: 'text',
      text: prompt || 'Generate a beautiful bracelet pattern.'
    });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }]
      })
    });

    const data = await res.json();
    const text = (data.content || []).map(i => i.text || '').join('');

    let info = {
      name: 'Custom Bracelet',
      description: 'A beautiful AI-generated pattern.',
      vibe: '',
      colorNames: [],
      suggestedColors: colors,
      patternNotes: '',
      tip: 'Keep tension consistent for clean results.'
    };
    try {
      Object.assign(info, JSON.parse(text.replace(/```json|```/g, '').trim()));
    } catch (_) { /* use defaults */ }

    clearInterval(ticker);
    loading.className = 'loading';
    btn.disabled = false;

    const finalColors = (info.suggestedColors && info.suggestedColors.length >= 2)
      ? info.suggestedColors
      : colors;
    showPattern(info, finalColors, numStrings, numRows, out);

  } catch (err) {
    console.error('Generation error:', err);
    clearInterval(ticker);
    loading.className = 'loading';
    btn.disabled = false;

    const fallback = colors.length >= 2
      ? colors
      : ['#f7538a', '#ffb3d1', '#534AB7', '#1D9E75'];
    showPattern(
      {
        name: 'Custom Bracelet',
        description: 'Your handcrafted pattern.',
        vibe: '',
        colorNames: [],
        patternNotes: '',
        tip: 'Pull each knot firmly for even rows.'
      },
      fallback, numStrings, numRows, out
    );
  }
}

function showPattern(info, colors, numStrings, numRows, container) {
  const legend = colors.slice(0, numStrings).map((c, i) => `
    <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#7a4560;margin-right:8px;">
      <span style="width:10px;height:10px;border-radius:50%;background:${c};display:inline-block;"></span>
      ${info.colorNames[i] || 'String ' + (i + 1)}
    </span>`).join('');

  container.innerHTML = `
    <div style="margin-bottom:1rem;">
      <div class="pat-name">${info.name}</div>
      <div class="pat-desc">${info.description}</div>
      <div class="pat-tags">
        <span class="ptag">Level ${currentLevel}</span>
        <span class="ptag">${numStrings} strings</span>
        <span class="ptag">${numRows} rows</span>
        <span class="ptag">${currentStyle}</span>
        ${info.vibe ? `<span class="ptag">✨ ${info.vibe}</span>` : ''}
      </div>
    </div>
    <div style="margin-bottom:.75rem;display:flex;flex-wrap:wrap;">${legend}</div>
    <div class="bracelet-wrap" id="braceletWrap"></div>
    <div class="tip-box">
      <strong>Tip:</strong> ${info.tip}${info.patternNotes ? ' — ' + info.patternNotes : ''}
    </div>
    <div class="pat-actions">
      <button class="btn-act" onclick="openModal()">🤍 Save</button>
      <button class="btn-act">⬇ Download PDF</button>
      <button class="btn-act" onclick="generate()">↺ Regenerate</button>
      <button class="btn-act-pk" onclick="openModal()">Share to community →</button>
    </div>`;

  container.className = 'pat-out show';

  // Render bracelet canvas (defined in bracelet.js)
  const wrap = document.getElementById('braceletWrap');
  wrap.appendChild(renderBraceletCanvas(colors, numStrings, numRows, currentStyle));
}


// ══════════════════════════════════════════════════
// LEVEL CARDS
// ══════════════════════════════════════════════════
const LV_DATA = [
  {
    lv: 1, name: 'Beginner', desc: '4 strings, forward knots. Candy stripes.',
    badge: '#e1f5ee', bc: '#085041',
    colors: ['#f7538a', '#ffb3d1', '#EF9F27', '#fff0f6']
  },
  {
    lv: 2, name: 'Easy', desc: '6 strings, FK + BK. Chevrons.',
    badge: '#eeedfe', bc: '#3C3489',
    colors: ['#f7538a', '#ffb3d1', '#534AB7', '#1D9E75', '#EF9F27', '#c41f62']
  },
  {
    lv: 3, name: 'Intermediate', desc: '8 strings, all 4 knots. Diamonds & arrows.',
    badge: '#faeeda', bc: '#633806',
    colors: ['#f7538a', '#ffb3d1', '#534AB7', '#1D9E75', '#EF9F27', '#E24B4A', '#185FA5', '#c41f62']
  },
  {
    lv: 4, name: 'Advanced', desc: '12 strings, complex patterns, names & logos.',
    badge: '#fcebeb', bc: '#791F1F',
    colors: ['#f7538a', '#ffb3d1', '#534AB7', '#1D9E75', '#EF9F27', '#E24B4A', '#185FA5', '#2C2C2A', '#c41f62', '#888780', '#ffb3d1', '#1D9E75']
  },
  {
    lv: 5, name: 'Expert', desc: '16+ strings, alpha pixel art. Pokémon & portraits.',
    badge: '#fbeaf0', bc: '#72243E',
    colors: ['#f7538a', '#ffb3d1', '#534AB7', '#1D9E75', '#EF9F27', '#E24B4A', '#185FA5', '#2C2C2A', '#c41f62', '#888780', '#ffb3d1', '#1D9E75', '#EF9F27', '#534AB7', '#E24B4A', '#f7538a']
  }
];

(function buildLevelCards() {
  const grid = document.getElementById('lvlGrid');
  LV_DATA.forEach(d => {
    const h = d.lv <= 3 ? 36 : d.lv === 4 ? 22 : 16;
    const strings = d.colors
      .map(c => `<div class="ls" style="height:${h}px;background:${c};"></div>`)
      .join('');
    const el = document.createElement('div');
    el.className = 'lvc reveal';
    el.innerHTML = `
      <span class="lv-badge" style="background:${d.badge};color:${d.bc}">Level ${d.lv}</span>
      <div class="lvc-title">${d.name}</div>
      <div class="lvc-desc">${d.desc}</div>
      <div class="ls-row" style="${d.lv >= 4 ? 'flex-wrap:wrap;max-width:90px;' : ''}">${strings}</div>`;
    el.onclick = () => {
      setLevel(d.lv, null);
      document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
    };
    grid.appendChild(el);
    revObs.observe(el);
  });
})();


// ══════════════════════════════════════════════════
// COMMUNITY GRID
// ══════════════════════════════════════════════════
const COMMUNITY_POSTS = [
  { name: 'Sunset Chevron',  user: '@marina_k',      lv: 2, colors: ['#f7538a', '#EF9F27', '#D4537E', '#ffb3d1'], style: 'Chevron',     likes: 142 },
  { name: 'Ocean Waves',     user: '@thread.life',   lv: 3, colors: ['#185FA5', '#85B7EB', '#1D9E75', '#5DCAA5'], style: 'Diamond',     likes: 98  },
  { name: 'Forest Alpha',    user: '@knotqueen',     lv: 4, colors: ['#1D9E75', '#639922', '#2C2C2A', '#EF9F27'], style: 'Alpha',       likes: 311 },
  { name: 'Berry Burst',     user: '@crafts.daily',  lv: 1, colors: ['#D4537E', '#f7538a', '#E24B4A', '#ffb3d1'], style: 'Candy Stripe',likes: 55  },
  { name: 'Midnight Stars',  user: '@braceletbabe',  lv: 5, colors: ['#2C2C2A', '#534AB7', '#888780', '#185FA5'], style: 'Alpha',       likes: 487 },
  { name: 'Candy Pink',      user: '@sofia.makes',   lv: 2, colors: ['#f7538a', '#EF9F27', '#fff0f6', '#ffb3d1'], style: 'Chevron',     likes: 73  },
  { name: 'Spring Blossom',  user: '@yuki.ties',     lv: 3, colors: ['#ffb3d1', '#f7538a', '#c41f62', '#fff0f6'], style: 'Wave',        likes: 201 },
  { name: 'Rainbow Arrow',   user: '@colorcraft',    lv: 3, colors: ['#E24B4A', '#EF9F27', '#1D9E75', '#185FA5'], style: 'Arrow',       likes: 133 },
];

function renderComm(mode) {
  let posts = [...COMMUNITY_POSTS];
  if      (mode === 'new')      posts = [...COMMUNITY_POSTS].reverse();
  else if (mode === 'beginner') posts = COMMUNITY_POSTS.filter(p => p.lv <= 2);
  else if (mode === 'expert')   posts = COMMUNITY_POSTS.filter(p => p.lv >= 4);
  else                          posts = [...COMMUNITY_POSTS].sort((a, b) => b.likes - a.likes);

  document.getElementById('commGrid').innerHTML = posts.map(p => `
    <div class="comm-card">
      <div class="comm-visual">
        ${p.colors.map(c => `
          <div class="ct" style="width:12px;height:${40 + Math.random() * 30 | 0}px;background:${c};border-radius:4px 4px 0 0;"></div>
        `).join('')}
      </div>
      <div class="cm-meta">
        <div class="cm-name">${p.name}</div>
        <div class="cm-info">${p.user} · Level ${p.lv}</div>
        <div class="cm-tags">
          <span class="cm-tag">${p.style}</span>
          <span class="cm-tag">Lv ${p.lv}</span>
        </div>
        <div class="cm-likes">🤍 ${p.likes}</div>
      </div>
    </div>`).join('');
}

function setTab(el, mode) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderComm(mode);
}

// Initial render
renderComm('trending');


// ══════════════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════════════
function openModal()  { document.getElementById('modal').classList.add('open'); }
function closeModal() { document.getElementById('modal').classList.remove('open'); }

function closeModalOutside(e) {
  if (e.target.id === 'modal') closeModal();
}

function switchMTab(el, mode) {
  document.querySelectorAll('.m-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('mName').style.display   = mode === 'up' ? 'block' : 'none';
  document.getElementById('mSubmit').textContent   = mode === 'up' ? 'Create account' : 'Sign in';
}
