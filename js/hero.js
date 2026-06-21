/**
 * hero.js — Interactive string canvas for the hero section.
 * Strings react to mouse position with spring physics.
 */
(function () {
  const canvas = document.getElementById('heroCanvas');
  const ctx = canvas.getContext('2d');

  const COLORS = [
    '#f7538a', '#ffb3d1', '#c41f62', '#fff0f6',
    '#534AB7', '#AFA9EC', '#1D9E75', '#5DCAA5',
    '#EF9F27', '#FAC775', '#E24B4A', '#185FA5',
    '#ff80b3', '#e8347a'
  ];

  let W, H, strings = [], mouse = { x: -999, y: -999 };
  const STRING_COUNT = 14;
  const SEGMENTS = 18;
  const REPEL_RADIUS = 80;
  const REPEL_FORCE = 5;
  const SPRING = 0.04;
  const DAMPING = 0.85;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    initStrings();
  }

  function initStrings() {
    strings = [];
    for (let i = 0; i < STRING_COUNT; i++) {
      const x = (W / (STRING_COUNT + 1)) * (i + 1);
      const pts = [];
      for (let j = 0; j <= SEGMENTS; j++) {
        const y = (H / SEGMENTS) * j;
        pts.push({ x, y, ox: x, oy: y, vx: 0, vy: 0 });
      }
      strings.push({
        pts,
        color: COLORS[i % COLORS.length],
        width: 2.5 + Math.random() * 2
      });
    }
  }

  function update() {
    strings.forEach(s => {
      s.pts.forEach((p, i) => {
        // Pin endpoints
        if (i === 0 || i === s.pts.length - 1) {
          p.x = p.ox;
          p.y = p.oy;
          return;
        }
        // Mouse repulsion
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPEL_RADIUS && dist > 0) {
          const force = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * REPEL_FORCE;
          p.vx -= (dx / dist) * force;
          p.vy -= (dy / dist) * force;
        }
        // Spring back to rest
        p.vx += (p.ox - p.x) * SPRING;
        p.vy += (p.oy - p.y) * SPRING;
        // Damping
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x += p.vx;
        p.y += p.vy;
      });
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    strings.forEach(s => {
      ctx.beginPath();
      ctx.moveTo(s.pts[0].x, s.pts[0].y);
      for (let i = 1; i < s.pts.length - 2; i++) {
        const mx = (s.pts[i].x + s.pts[i + 1].x) / 2;
        const my = (s.pts[i].y + s.pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(s.pts[i].x, s.pts[i].y, mx, my);
      }
      const n = s.pts.length;
      ctx.quadraticCurveTo(
        s.pts[n - 2].x, s.pts[n - 2].y,
        s.pts[n - 1].x, s.pts[n - 1].y
      );
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mouseleave', () => {
    mouse.x = -999;
    mouse.y = -999;
  });

  window.addEventListener('resize', resize);
  resize();
  loop();
})();
