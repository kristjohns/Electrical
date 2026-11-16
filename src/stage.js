// Stage: background, chapter title cards, HUD and frame composition
const { W, H, C, G, E, pr, clamp, lerp, TAU, rgba, mix, createCanvas } = require('./lib/core');
const TL = require('./timeline');

let bgCache = null;
function background(ctx) {
  if (!bgCache) {
    bgCache = createCanvas(W, H); const c = bgCache.getContext('2d');
    const g = c.createRadialGradient(W * 0.5, H * 0.42, 100, W * 0.5, H * 0.5, 1250);
    g.addColorStop(0, '#111c36'); g.addColorStop(0.55, '#0a1124'); g.addColorStop(1, '#05080f');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // dot grid
    c.fillStyle = 'rgba(120,150,220,0.085)';
    for (let y = 30; y < H; y += 60) for (let x = 30; x < W; x += 60) { c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill(); }
  }
  ctx.drawImage(bgCache, 0, 0);
}

function drawCard(g, sc, t) {
  const c = g.c, a = pr(t, 0.15, 0.7) * (1 - pr(t, sc.dur - 0.55, 0.5));
  // three-phase motif
  const cols = [C.l1, C.l2, C.l3];
  for (let k = 0; k < 3; k++) {
    const pts = [];
    for (let i = 0; i <= 200; i++) { const x = i / 200 * W; pts.push([x, H * 0.5 + Math.sin(x / 150 - t * 2.2 - k * TAU / 3) * 150 * (0.55 + 0.45 * Math.sin(i / 200 * Math.PI))]); }
    g.line(pts, { c: cols[k], w: 3, a: 0.22 * a, glow: 0.8, trim: pr(t, 0.05 + k * 0.08, 1.1, E.o) });
  }
  const no = String(sc.chapterNo).padStart(2, '0');
  g.text(`CHAPTER ${no}`, W / 2, H / 2 - 110, { s: 30, c: C.l1, al: 'c', wt: 700, ls: 10, p: pr(t, 0.25, 0.6, E.o), a });
  g.text(sc.chapter, W / 2, H / 2 - 20, { s: 96, f: 'disp', wt: 700, al: 'c', p: pr(t, 0.4, 0.7, E.o), a, shadow: 30 });
  const lw = 420 * pr(t, 0.6, 0.8, E.o);
  g.line([[W / 2 - lw / 2, H / 2 + 52], [W / 2 + lw / 2, H / 2 + 52]], { c: C.l2, w: 3, a: a * 0.9, glow: 1 });
  if (sc.sub) g.text(sc.sub, W / 2, H / 2 + 108, { s: 36, c: C.dim, al: 'c', wt: 400, p: pr(t, 0.75, 0.7, E.o), a, shadow: 20 });
}

function drawHud(g, tl, sc, tAbs, a) {
  if (a <= 0) return;
  // chapter tag
  if (sc.chapterNo) {
    const no = String(sc.chapterNo).padStart(2, '0');
    g.text(no, 64, 58, { s: 22, c: C.l1, wt: 700, f: 'mono', a: a * 0.95 });
    g.text(sc.chapter.toUpperCase(), 104, 58, { s: 20, c: C.dim, wt: 600, ls: 3, a: a * 0.9 });
  }
  // progress bar with chapter ticks
  const x0 = 64, x1 = W - 64, y = H - 34, w = x1 - x0;
  g.line([[x0, y], [x1, y]], { c: C.line, w: 3, a: a * 0.8 });
  g.line([[x0, y], [x0 + w * clamp(tAbs / tl.total), y]], { c: C.l1, w: 3, a: a * 0.95, glow: 0.5 });
  for (const s of tl.scenes) if (s.card) { const x = x0 + w * s.t0 / tl.total; g.line([[x, y - 5], [x, y + 5]], { c: C.faint, w: 2, a }); }
}

// draw one frame at absolute time
function drawFrame(ctx, tl, tAbs) {
  const g = new G(ctx);
  let sc = tl.scenes[tl.scenes.length - 1];
  for (const s of tl.scenes) { if (tAbs < s.t0 + s.dur) { sc = s; break; } }
  const t = clamp(tAbs - sc.t0, 0, sc.dur);
  g.t = t;
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  background(ctx);
  ctx.save();
  if (sc.card) drawCard(g, sc, t);
  else if (sc.draw) sc.draw(g, TL.state(sc, t));
  ctx.restore();
  // scene fade through background
  const fi = sc.fadeIn === undefined ? 0.5 : sc.fadeIn, fo = sc.fadeOut === undefined ? 0.45 : sc.fadeOut;
  let cover = 0;
  if (fi > 0) cover = Math.max(cover, 1 - pr(t, 0, fi, E.o));
  if (fo > 0) cover = Math.max(cover, pr(t, sc.dur - fo, fo, E.i));
  if (cover > 0.003) { ctx.save(); ctx.globalAlpha = cover; background(ctx); ctx.restore(); }
  if (sc.hud !== false) drawHud(g, tl, sc, tAbs, 1 - cover);
  return sc;
}

module.exports = { drawFrame, background };
