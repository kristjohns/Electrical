// Core drawing + animation toolkit (Canvas 2D, rendered headless with @napi-rs/canvas)
const { createCanvas, Path2D } = require('@napi-rs/canvas');

const W = 1920, H = 1080;

// ---- palette -------------------------------------------------------------
const C = {
  bg: '#070b16', bg2: '#0e1629', panel: '#111b33', panel2: '#17233f', grid: '#1a2644',
  ink: '#eef3ff', dim: '#93a1c4', faint: '#4a5880', line: '#2b3a61',
  l1: '#ffb020', l2: '#35c8ff', l3: '#ff5fa8', n: '#5b8dff', pe: '#b9e53c',
  hot: '#ff5a3c', warm: '#ff9a3c', cold: '#49b4ff', water: '#2f9bff',
  ok: '#3ddc97', warn: '#ffd23f', bad: '#ff4d5e', copper: '#e9935a', steel: '#a7b4cc',
  energy: '#ffe58a', white: '#ffffff', violet: '#9d7bff',
};

// ---- math / easing -------------------------------------------------------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const E = {
  lin: t => t,
  i: t => t * t * t,
  o: t => 1 - Math.pow(1 - t, 3),
  o5: t => 1 - Math.pow(1 - t, 5),
  io: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  io2: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  el: t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};
// eased progress 0..1 starting at time a lasting d
const pr = (t, a, d = 0.6, e = E.io) => e(clamp((t - a) / d));

// distance travelled when speed ramps linearly from v0 to v1 during [T, T+dT]
function integ(t, T, dT, v0, v1) {
  if (t <= T) return v0 * t;
  if (t < T + dT) { const u = t - T; return v0 * T + v0 * u + (v1 - v0) * u * u / (2 * dT); }
  return v0 * T + (v0 + v1) / 2 * dT + v1 * (t - T - dT);
}

function hexToRgb(c) {
  if (c[0] !== '#') { const m = c.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2]]; }
  if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (c, a = 1) => { const [r, g, b] = hexToRgb(c); return `rgba(${r},${g},${b},${clamp(a)})`; };
const mix = (c1, c2, k) => {
  const a = hexToRgb(c1), b = hexToRgb(c2); k = clamp(k);
  return `rgb(${Math.round(lerp(a[0], b[0], k))},${Math.round(lerp(a[1], b[1], k))},${Math.round(lerp(a[2], b[2], k))})`;
};

// ---- polyline helpers ----------------------------------------------------
function plen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
function pat(pts, d) {
  if (d <= 0) return [pts[0][0], pts[0][1], Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0])];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], l = Math.hypot(dx, dy);
    if (d <= l) { const k = l ? d / l : 0; return [pts[i - 1][0] + dx * k, pts[i - 1][1] + dy * k, Math.atan2(dy, dx)]; }
    d -= l;
  }
  const n = pts.length - 1;
  return [pts[n][0], pts[n][1], Math.atan2(pts[n][1] - pts[n - 1][1], pts[n][0] - pts[n - 1][0])];
}
function psub(pts, d0, d1) {
  const out = []; let acc = 0;
  if (d1 <= d0) return out;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const s = acc, e = acc + l;
    if (e >= d0 && s <= d1 && l > 0) {
      const k0 = clamp((d0 - s) / l), k1 = clamp((d1 - s) / l);
      if (!out.length) out.push([lerp(a[0], b[0], k0), lerp(a[1], b[1], k0)]);
      out.push([lerp(a[0], b[0], k1), lerp(a[1], b[1], k1)]);
    }
    acc = e;
  }
  return out;
}
// sample a function into a polyline
function sample(fn, a, b, n = 100) { const pts = []; for (let i = 0; i <= n; i++) { const u = a + (b - a) * i / n; pts.push(fn(u)); } return pts; }
// deterministic pseudo random
function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function noise1(x) { const i = Math.floor(x), f = x - i; const u = f * f * (3 - 2 * f); return lerp(rnd(i), rnd(i + 1), u); }

function parseRich(str) {
  const out = []; let i = 0, buf = '';
  const flush = () => { if (buf) { out.push({ t: buf, m: 0 }); buf = ''; } };
  while (i < str.length) {
    const ch = str[i];
    if (ch === '^' || ch === '_') {
      flush(); let seg;
      if (str[i + 1] === '{') { const j = str.indexOf('}', i); seg = str.slice(i + 2, j); i = j + 1; }
      else { seg = str[i + 1]; i += 2; }
      out.push({ t: seg, m: ch === '^' ? 1 : -1 });
    } else { buf += ch; i++; }
  }
  flush(); return out;
}

// ---- drawing wrapper -----------------------------------------------------
class G {
  constructor(ctx) { this.c = ctx; this.t = 0; }

  alpha(a, fn) { if (a <= 0.003) return; const c = this.c; c.save(); c.globalAlpha *= clamp(a); fn(); c.restore(); }
  tf(o, fn) {
    const c = this.c; c.save();
    if (o.a !== undefined) { if (o.a <= 0.003) { c.restore(); return; } c.globalAlpha *= clamp(o.a); }
    c.translate(o.x || 0, o.y || 0);
    if (o.r) c.rotate(o.r);
    if (o.s !== undefined) c.scale(o.s, o.sy !== undefined ? o.sy : o.s);
    fn(); c.restore();
  }
  // camera: centre (cx,cy) of world placed at screen centre with zoom z
  cam(cx, cy, z, fn) { const c = this.c; c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-cx, -cy); fn(); c.restore(); }
  clip(x, y, w, h, fn, r = 0) { const c = this.c; c.save(); c.beginPath(); if (r) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); c.clip(); fn(); c.restore(); }

  _stroke(o, build) {
    const c = this.c, a = o.a === undefined ? 1 : o.a;
    if (a <= 0.003) return;
    const w = o.w === undefined ? 3 : o.w, col = o.c || C.ink;
    c.save();
    c.lineCap = o.cap || 'round'; c.lineJoin = o.join || 'round';
    if (o.dash) { c.setLineDash(o.dash); c.lineDashOffset = o.off || 0; }
    if (o.fill) { c.globalAlpha *= a * (o.fa === undefined ? 1 : o.fa); c.fillStyle = o.fill; build(); c.fill(); c.globalAlpha /= (a * (o.fa === undefined ? 1 : o.fa)) || 1; }
    if (w > 0 && !o.nostroke) {
      if (o.glow && typeof col === 'string') {
        const gl = o.glow === true ? 1 : o.glow;
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = rgba(col, 0.10 * a * gl); c.lineWidth = w + 18; build(); c.stroke();
        c.strokeStyle = rgba(col, 0.16 * a * gl); c.lineWidth = w + 9; build(); c.stroke();
        c.strokeStyle = rgba(col, 0.25 * a * gl); c.lineWidth = w + 4; build(); c.stroke();
        c.globalCompositeOperation = 'source-over';
      }
      c.globalAlpha *= a; c.strokeStyle = col; c.lineWidth = w; build(); c.stroke();
    }
    c.restore();
  }
  // polyline. o: {c,w,a,glow,dash,off,trim:p|[a,b],close,fill,round:r}
  line(pts, o = {}) {
    if (o.trim !== undefined) {
      const L = plen(pts), tr = Array.isArray(o.trim) ? o.trim : [0, o.trim];
      pts = psub(pts, L * clamp(tr[0]), L * clamp(tr[1]));
      if (pts.length < 2) return;
    }
    const c = this.c;
    this._stroke(o, () => {
      c.beginPath();
      if (o.round && pts.length > 2) {
        c.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length - 1; i++) c.arcTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], o.round);
        c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      } else {
        c.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      }
      if (o.close) c.closePath();
    });
  }
  // free path: fn(ctx) builds a path (after beginPath)
  path(fn, o = {}) { const c = this.c; this._stroke(o, () => { c.beginPath(); fn(c); }); }
  rect(x, y, w, h, o = {}) { const c = this.c; this._stroke(o, () => { c.beginPath(); if (o.r) c.roundRect(x, y, w, h, o.r); else c.rect(x, y, w, h); }); }
  circ(x, y, r, o = {}) { const c = this.c; if (r <= 0) return; this._stroke(o, () => { c.beginPath(); c.arc(x, y, r, 0, TAU); }); }
  ell(x, y, rx, ry, o = {}) { const c = this.c; this._stroke(o, () => { c.beginPath(); c.ellipse(x, y, rx, ry, o.rot || 0, o.a0 || 0, o.a1 === undefined ? TAU : o.a1); }); }
  arc(x, y, r, a0, a1, o = {}) { const c = this.c; this._stroke(o, () => { c.beginPath(); c.arc(x, y, r, a0, a1, a1 < a0); }); }

  arrow(x1, y1, x2, y2, o = {}) {
    const p = o.trim === undefined ? 1 : clamp(o.trim); if (p <= 0.001) return;
    const ex = lerp(x1, x2, p), ey = lerp(y1, y2, p), hd = o.head || 14, w = o.w || 3;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const bx = ex - Math.cos(ang) * hd * 0.8, by = ey - Math.sin(ang) * hd * 0.8;
    this.line([[x1, y1], [bx, by]], { ...o, trim: undefined, w });
    const c = this.c, a = o.a === undefined ? 1 : o.a;
    c.save(); c.globalAlpha *= a; c.fillStyle = o.c || C.ink; c.beginPath();
    c.moveTo(ex, ey);
    c.lineTo(ex - Math.cos(ang - 0.42) * hd, ey - Math.sin(ang - 0.42) * hd);
    c.lineTo(ex - Math.cos(ang + 0.42) * hd, ey - Math.sin(ang + 0.42) * hd);
    c.closePath(); c.fill(); c.restore();
    if (o.both) {
      c.save(); c.globalAlpha *= a; c.fillStyle = o.c || C.ink; c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x1 + Math.cos(ang - 0.42) * hd, y1 + Math.sin(ang - 0.42) * hd);
      c.lineTo(x1 + Math.cos(ang + 0.42) * hd, y1 + Math.sin(ang + 0.42) * hd);
      c.closePath(); c.fill(); c.restore();
    }
  }

  // moving dots/dashes along a polyline (energy or charge flow)
  flow(pts, o = {}) {
    const a = o.a === undefined ? 1 : o.a; if (a <= 0.003) return;
    const gap = o.gap || 46, len = o.len || 0.1, w = o.w || 7;
    const off = o.off !== undefined ? o.off : -(o.t !== undefined ? o.t : this.t) * (o.speed === undefined ? 140 : o.speed);
    this.line(pts, { c: o.c || C.energy, w, a, dash: [len, gap], off, glow: o.glow === undefined ? 0.9 : o.glow, round: o.round, trim: o.trim });
  }
  // a conductor with optional flowing energy. on: 0..1 brightness
  wire(pts, o = {}) {
    const col = o.c || C.l1, w = o.w || 4, on = o.on === undefined ? 1 : o.on, a = o.a === undefined ? 1 : o.a;
    this.line(pts, { c: mix(C.line, col, 0.35 + 0.65 * on), w, a, round: o.round, trim: o.trim, glow: on > 0.5 ? (o.glow === undefined ? 0.6 : o.glow) * on : 0 });
    if (o.flow && on > 0.02) this.flow(pts, { c: o.fc || mix(col, '#ffffff', 0.55), w: w + 2.5, a: a * on, gap: o.gap || 42, speed: o.speed === undefined ? 150 : o.speed, off: o.off, round: o.round, trim: o.trim, glow: 0.7, t: o.t });
  }

  font(o = {}) {
    const size = o.s || 32, wt = o.wt || 500, fam = o.f === 'mono' ? 'JetBrains Mono' : o.f === 'disp' ? 'Inter Display' : 'Inter';
    return `${o.it ? 'italic ' : ''}${wt} ${size}px "${fam}"`;
  }
  // text. o: {s,c,a,al,bl,wt,f,it,ls,p (appear progress), lh, shadow}
  text(str, x, y, o = {}) {
    let a = o.a === undefined ? 1 : o.a;
    if (o.p !== undefined) { a *= clamp(o.p); y += (1 - clamp(o.p)) * (o.rise === undefined ? 14 : o.rise); }
    if (a <= 0.003) return;
    const c = this.c; c.save(); c.globalAlpha *= a;
    c.font = this.font(o); c.fillStyle = o.c || C.ink;
    c.textAlign = o.al === 'c' ? 'center' : o.al === 'r' ? 'right' : 'left';
    c.textBaseline = o.bl === 't' ? 'top' : o.bl === 'b' ? 'bottom' : o.bl === 'a' ? 'alphabetic' : 'middle';
    if (o.ls) c.letterSpacing = o.ls + 'px';
    if (o.shadow) { c.shadowColor = rgba(C.bg, 0.9); c.shadowBlur = o.shadow; }
    const lines = String(str).split('\n'), lh = (o.lh || 1.28) * (o.s || 32);
    if (o.rot) { c.translate(x, y); c.rotate(o.rot); x = 0; y = 0; }
    const y0 = c.textBaseline === 'middle' ? y - (lines.length - 1) * lh / 2 : y;
    lines.forEach((ln, i) => c.fillText(ln, x, y0 + i * lh));
    c.restore();
  }
  textW(str, o = {}) { const c = this.c; c.save(); c.font = this.font(o); if (o.ls) c.letterSpacing = o.ls + 'px'; const w = c.measureText(str).width; c.restore(); return w; }
  // formula text with ^super and _sub
  rich(str, x, y, o = {}) {
    let a = o.a === undefined ? 1 : o.a;
    if (o.p !== undefined) { a *= clamp(o.p); y += (1 - clamp(o.p)) * 14; }
    if (a <= 0.003) return 0;
    const c = this.c, size = o.s || 40, parts = parseRich(str);
    c.save(); c.globalAlpha *= a; c.fillStyle = o.c || C.ink; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    const fMain = this.font({ ...o, s: size }), fSmall = this.font({ ...o, s: size * 0.62 });
    let total = 0;
    for (const p of parts) { c.font = p.m ? fSmall : fMain; p.w = c.measureText(p.t).width; total += p.w; }
    let cx = o.al === 'c' ? x - total / 2 : o.al === 'r' ? x - total : x;
    const by = y + size * 0.35;
    for (const p of parts) {
      c.font = p.m ? fSmall : fMain;
      c.fillText(p.t, cx, by + (p.m === 1 ? -size * 0.42 : p.m === -1 ? size * 0.16 : 0));
      cx += p.w;
    }
    c.restore(); return total;
  }
  // pill label
  tag(str, x, y, o = {}) {
    let a = o.a === undefined ? 1 : o.a;
    if (o.p !== undefined) a *= clamp(o.p);
    if (a <= 0.003) return;
    const s = o.s || 24, col = o.c || C.ink, padX = o.px === undefined ? s * 0.6 : o.px, h = s * 1.7;
    const w = this.textW(str, { s, wt: o.wt || 600, f: o.f }) + padX * 2;
    const x0 = o.al === 'l' ? x : o.al === 'r' ? x - w : x - w / 2;
    const yy = y + (o.p !== undefined ? (1 - clamp(o.p)) * 10 : 0);
    this.rect(x0, yy - h / 2, w, h, { r: h / 2, fill: o.bg || rgba(col, 0.13), c: rgba(col, 0.55), w: 1.5, a });
    this.text(str, x0 + w / 2, yy + 1, { s, c: col, al: 'c', wt: o.wt || 600, a, f: o.f });
    return w;
  }
  glowDot(x, y, r, col, a = 1) {
    if (a <= 0.003 || r <= 0) return;
    const c = this.c; c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, 0.9 * a)); g.addColorStop(0.25, rgba(col, 0.45 * a)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore();
  }
  lin(x0, y0, x1, y1, stops) { const g = this.c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([p, col]) => g.addColorStop(p, col)); return g; }
  rad(x, y, r0, r1, stops) { const g = this.c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([p, col]) => g.addColorStop(p, col)); return g; }

  // plot y=f(x) inside a box. xr=[x0,x1], yr=[y0,y1] ; trim 0..1
  plot(fn, x, y, w, h, o = {}) {
    const xr = o.xr || [0, 1], yr = o.yr || [-1, 1], n = o.n || 160, tr = o.trim === undefined ? 1 : clamp(o.trim);
    if (tr <= 0.001) return;
    const pts = [];
    const m = Math.max(2, Math.round(n * tr));
    for (let i = 0; i <= m; i++) {
      const u = (i / n), xv = lerp(xr[0], xr[1], u), yv = fn(xv);
      pts.push([x + u * w, y + h - (clamp((yv - yr[0]) / (yr[1] - yr[0]), -0.2, 1.2)) * h]);
    }
    if (o.area) {
      const c = this.c, y0 = y + h - ((0 - yr[0]) / (yr[1] - yr[0])) * h;
      c.save(); c.globalAlpha *= (o.a === undefined ? 1 : o.a) * (o.areaA || 0.18); c.fillStyle = o.c || C.ink;
      c.beginPath(); c.moveTo(pts[0][0], y0); pts.forEach(p => c.lineTo(p[0], p[1])); c.lineTo(pts[pts.length - 1][0], y0); c.closePath(); c.fill(); c.restore();
    }
    this.line(pts, { c: o.c, w: o.w || 4, a: o.a, glow: o.glow, dash: o.dash });
    return pts[pts.length - 1];
  }
  // simple axes
  axes(x, y, w, h, o = {}) {
    const a = o.a === undefined ? 1 : o.a, col = o.c || C.faint;
    const y0 = o.zero === undefined ? y + h / 2 : y + h - o.zero * h;
    this.line([[x, y0], [x + w, y0]], { c: col, w: 2, a });
    this.line([[x, y], [x, y + h]], { c: col, w: 2, a });
  }
}

module.exports = { integ, W, H, C, G, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample, rnd, noise1, createCanvas, Path2D };
