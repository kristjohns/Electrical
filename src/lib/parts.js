// Shared drawn components: sky, landscape, pylons, the cutaway house, UI helpers
const { W, H, C, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample, rnd, noise1, createCanvas } = require('./core');

// ---------- UI helpers ------------------------------------------------------
function heading(g, str, p, o = {}) {
  g.text(str, o.x || 64, o.y || 126, { s: o.s || 50, f: 'disp', wt: 700, p, c: o.c || C.ink });
}
function sub(g, str, p, o = {}) {
  g.text(str, o.x || 64, o.y || 180, { s: o.s || 28, wt: 400, c: o.c || C.dim, p });
}
function panel(g, x, y, w, h, a = 1, o = {}) {
  g.rect(x, y, w, h, { r: o.r === undefined ? 18 : o.r, fill: o.fill || rgba(C.panel, 0.82), c: o.c || rgba('#6f86c9', 0.28), w: 1.5, a });
}
// leader-line callout: dot at (x,y), text block at (tx,ty)
function callout(g, x, y, tx, ty, title, subt, p, o = {}) {
  if (p <= 0.003) return;
  const col = o.c || C.ink, al = o.al || (tx >= x ? 'l' : 'r');
  const ex = al === 'l' ? tx - 12 : al === 'r' ? tx + 12 : tx, ey = ty;
  g.circ(x, y, 5, { fill: col, w: 0, a: p });
  g.circ(x, y, 5 + 10 * p, { c: col, w: 1.5, a: 0.5 * p });
  g.line([[x, y], [ex, ey]], { c: rgba(col, 0.7), w: 1.8, trim: p });
  g.text(title, tx, ty - (subt ? (o.s || 26) * 0.55 : 0), { s: o.s || 26, wt: 650, c: col, al, p: pr(p, 0.3, 0.7, E.lin) });
  if (subt) g.text(subt, tx, ty + (o.s || 26) * 0.62, { s: o.ss || 20, wt: 400, c: C.dim, al, p: pr(p, 0.45, 0.55, E.lin) });
}
// big key statement along the bottom
function caption(g, str, p, o = {}) {
  g.text(str, W / 2, o.y || H - 112, { s: o.s || 38, wt: 600, al: 'c', c: o.c || C.ink, p, shadow: 18 });
}
// a boxed formula
function formula(g, str, x, y, p, o = {}) {
  if (p <= 0.003) return;
  const s = o.s || 52;
  const tw = g.rich(str, -9999, -9999, { s, wt: o.wt || 600 });
  const bw = (o.w || tw) + s * 1.1, bh = s * 1.75;
  if (!o.bare) g.rect(x - bw / 2, y - bh / 2 + (1 - p) * 12, bw, bh, { r: 16, fill: rgba(o.c || C.l2, 0.09), c: rgba(o.c || C.l2, 0.5), w: 1.5, a: p });
  g.rich(str, x, y, { s, wt: o.wt || 600, al: 'c', c: o.tc || C.ink, p });
}
// analogue style gauge needle. v 0..1
function gauge(g, x, y, r, v, o = {}) {
  const a = o.a === undefined ? 1 : o.a, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
  g.arc(x, y, r, a0, a1, { c: C.line, w: 8, a });
  g.arc(x, y, r, a0, lerp(a0, a1, clamp(v)), { c: o.c || C.l2, w: 8, a, glow: 0.6 });
  const an = lerp(a0, a1, clamp(v));
  g.line([[x, y], [x + Math.cos(an) * (r - 14), y + Math.sin(an) * (r - 14)]], { c: C.ink, w: 4, a });
  g.circ(x, y, 7, { fill: C.ink, w: 0, a });
  if (o.label) g.text(o.label, x, y + r * 0.62, { s: o.ls || 22, c: C.dim, al: 'c', a });
  if (o.val) g.text(o.val, x, y + r * 0.2 + 34, { s: o.vs || 30, f: 'mono', wt: 700, al: 'c', a, c: o.c || C.l2 });
}

// ---------- sky & land -------------------------------------------------------
let auCv = null;
function sky(g, t, o = {}) {
  const c = g.c, a = o.a === undefined ? 1 : o.a;
  c.save(); c.globalAlpha *= a;
  const gr = c.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#040714'); gr.addColorStop(0.55, '#0a1530'); gr.addColorStop(1, '#122347');
  c.fillStyle = gr; c.fillRect(-200, -200, W + 400, H + 400);
  // stars
  for (let i = 0; i < 170; i++) {
    const x = rnd(i * 3.1) * W, y = rnd(i * 7.7) * H * 0.62, tw = 0.5 + 0.5 * Math.sin(t * (0.6 + rnd(i) * 1.6) + i);
    c.fillStyle = rgba('#dfe8ff', (0.25 + 0.6 * rnd(i * 1.3)) * (0.55 + 0.45 * tw));
    c.beginPath(); c.arc(x, y, 0.7 + rnd(i * 5.3) * 1.5, 0, TAU); c.fill();
  }
  // aurora curtains (drawn small, upscaled => soft)
  if (o.aurora !== 0) {
    const au = o.aurora === undefined ? 1 : o.aurora, AW = 240, AH = 135, k = AW / (W + 100);
    if (!auCv) auCv = createCanvas(AW, AH);
    const ac = auCv.getContext('2d'); ac.globalCompositeOperation = 'source-over'; ac.clearRect(0, 0, AW, AH); ac.globalCompositeOperation = 'lighter';
    const N = 120;
    for (let i = 0; i < N; i++) {
      const u = i / N;
      const n = noise1(u * 6 + t * 0.07) * 0.6 + noise1(u * 17 - t * 0.11) * 0.4;
      const band = Math.pow(clamp(Math.sin(u * Math.PI * 1.15 + 0.2 + Math.sin(t * 0.05) * 0.3)), 0.8);
      const al = clamp(n * 1.5 - 0.4) * band * 0.36 * au;
      if (al < 0.004) continue;
      const top = (50 + 150 * noise1(u * 5 + 9) + 40 * Math.sin(u * 9 + t * 0.2)) * k, hgt = (280 + 200 * noise1(u * 11 + t * 0.05)) * k;
      const gg = ac.createLinearGradient(0, top, 0, top + hgt);
      gg.addColorStop(0, rgba('#7a5cff', 0)); gg.addColorStop(0.25, rgba('#48f0b0', al * 0.55)); gg.addColorStop(0.7, rgba('#39e08f', al)); gg.addColorStop(1, rgba('#39e08f', 0));
      ac.fillStyle = gg; ac.fillRect(u * AW - 1, top, AW / N + 2.5, hgt);
    }
    c.globalCompositeOperation = 'lighter'; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(auCv, -50, 0, W + 100, H);
    c.globalCompositeOperation = 'source-over';
  }
  c.restore();
}
// mountain ridge polygon. fn(x)->y
function ridge(g, fn, o = {}) {
  const c = g.c, x0 = o.x0 === undefined ? -50 : o.x0, x1 = o.x1 === undefined ? W + 50 : o.x1, base = o.base || H + 50;
  c.save(); c.globalAlpha *= o.a === undefined ? 1 : o.a;
  c.beginPath(); c.moveTo(x0, base);
  for (let x = x0; x <= x1; x += 8) c.lineTo(x, fn(x));
  c.lineTo(x1, base); c.closePath();
  const gr = c.createLinearGradient(0, o.top || 200, 0, base);
  gr.addColorStop(0, o.c0 || '#22325c'); gr.addColorStop(1, o.c1 || '#0b1326');
  c.fillStyle = gr; c.fill();
  if (o.snow) {
    c.beginPath();
    const dep = x => { const y = fn(x); return clamp((o.snow - y) * 0.5, 0, 80) * (0.55 + 0.6 * noise1(x * 0.021 + 3)) + (o.snow > y ? 5 * Math.sin(x * 0.21) + 3 * Math.sin(x * 0.53) : 0); };
    c.moveTo(x0, fn(x0));
    for (let x = x0; x <= x1; x += 6) c.lineTo(x, fn(x) - 1);
    for (let x = x1; x >= x0; x -= 6) c.lineTo(x, fn(x) + Math.max(0, dep(x)));
    c.closePath(); c.fillStyle = rgba('#dfeaff', 0.55); c.fill();
  }
  c.restore();
}
const ridgeFn = (seed, base, amp, f = 0.004) => x => base - amp * (0.55 * noise1(x * f + seed) + 0.3 * noise1(x * f * 2.7 + seed * 3) + 0.15 * noise1(x * f * 7 + seed * 5));

// lattice transmission pylon. returns conductor attachment points
function pylon(g, x, y, h, o = {}) {
  const a = o.a === undefined ? 1 : o.a, col = o.c || C.steel, w = o.w || Math.max(1.5, h / 90);
  const L = (pts, ww) => g.line(pts.map(p => [x + p[0] * h, y - p[1] * h]), { c: col, w: ww || w, a, join: 'miter' });
  L([[-0.15, 0], [-0.045, 0.72], [-0.03, 1]]); L([[0.15, 0], [0.045, 0.72], [0.03, 1]]);
  L([[-0.03, 1], [0.03, 1]]);
  const lv = [0, 0.18, 0.36, 0.54, 0.72];
  for (let i = 0; i < lv.length - 1; i++) {
    const wa = lerp(0.15, 0.045, lv[i] / 0.72), wb = lerp(0.15, 0.045, lv[i + 1] / 0.72);
    L([[-wa, lv[i]], [wb, lv[i + 1]]], w * 0.7); L([[wa, lv[i]], [-wb, lv[i + 1]]], w * 0.7); L([[-wb, lv[i + 1]], [wb, lv[i + 1]]], w * 0.7);
  }
  const arms = [[0.74, 0.3], [0.9, 0.2]];
  const att = [];
  for (const [ay, aw] of arms) {
    L([[-aw, ay], [aw, ay]]); L([[-aw, ay], [-0.04, ay + 0.07]], w * 0.7); L([[aw, ay], [0.04, ay + 0.07]], w * 0.7);
  }
  const ins = [[-0.3, 0.74], [0.3, 0.74], [0.2, 0.9]];
  for (const [ix, iy] of ins) {
    g.line([[x + ix * h, y - iy * h], [x + ix * h, y - (iy - 0.07) * h]], { c: mix(col, '#ffffff', 0.3), w: w * 1.6, a, cap: 'butt', dash: [w, w * 0.8] });
    att.push([x + ix * h, y - (iy - 0.075) * h]);
  }
  return att;
}
// sagging conductor between two points
function span(a, b, sag = 30, n = 24) { return sample(u => [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + sag * 4 * u * (1 - u)], 0, 1, n); }

// neighbourhood substation kiosk (nettstasjon)
function kiosk(g, x, y, s = 1, o = {}) {
  const a = o.a === undefined ? 1 : o.a;
  g.tf({ x, y, s, a }, () => {
    g.rect(-46, -80, 92, 80, { r: 4, fill: '#1d3a34', c: '#4ea58c', w: 2.5 });
    g.path(c => { c.moveTo(-54, -80); c.lineTo(0, -104); c.lineTo(54, -80); c.closePath(); }, { fill: '#24473f', c: '#4ea58c', w: 2.5 });
    g.line([[0, -76], [0, -4]], { c: '#4ea58c', w: 1.5 });
    for (let i = 0; i < 4; i++) g.line([[-36, -64 + i * 7], [-10, -64 + i * 7]], { c: '#4ea58c', w: 1.5 });
    // warning sign
    g.path(c => { c.moveTo(22, -62); c.lineTo(34, -40); c.lineTo(10, -40); c.closePath(); }, { fill: C.warn, w: 0 });
    g.path(c => { c.moveTo(23, -57); c.lineTo(19.5, -49); c.lineTo(23, -49); c.lineTo(21, -43); c.lineTo(26, -51.5); c.lineTo(22.5, -51.5); c.closePath(); }, { fill: '#111', w: 0 });
  });
}
// simple substation silhouette
function substation(g, x, y, s = 1, o = {}) {
  const a = o.a === undefined ? 1 : o.a, col = o.c || C.steel;
  g.tf({ x, y, s, a }, () => {
    // gantries
    for (const gx of [-70, 70]) { g.line([[gx - 12, 0], [gx, -90], [gx + 12, 0]], { c: col, w: 2.5 }); g.line([[gx - 8, -30], [gx + 8, -30]], { c: col, w: 2 }); g.line([[gx - 5, -60], [gx + 5, -60]], { c: col, w: 2 }); }
    g.line([[-84, -90], [84, -90]], { c: col, w: 3 });
    // transformer
    g.rect(-30, -52, 60, 52, { r: 4, fill: '#1b2a4b', c: col, w: 2.5 });
    for (let i = -2; i <= 2; i++) g.line([[i * 10, -44], [i * 10, -8]], { c: rgba(col, 0.6), w: 2 });
    for (const bx of [-18, 0, 18]) { g.line([[bx, -52], [bx, -72]], { c: mix(col, '#ffffff', 0.3), w: 4, cap: 'butt', dash: [3, 2.4] }); g.line([[bx, -72], [bx, -90]], { c: col, w: 1.5 }); }
    // fence
    g.line([[-110, 0], [-110, -22], [110, -22], [110, 0]], { c: rgba(col, 0.55), w: 1.5 });
    for (let fx = -100; fx <= 100; fx += 14) g.line([[fx, 0], [fx, -22]], { c: rgba(col, 0.3), w: 1 });
  });
}

// ---------- the house ---------------------------------------------------------
// local coordinates: origin = ground level at the left outer wall. y up is negative.
const HP = {
  board: [52, -160], boardTop: [52, -205], boardBot: [52, -115], heater: [160, -110], cabinet: [-26, -170], meter: [-26, -186],
  hob: [710, -98], kettle: [830, -112], fridge: [950, -100], washer: [285, -40], floorHeat: [380, -10],
  lampLiving: [640, -452], lampBed: [230, -452], lampKitchen: [760, -238], lampBath: [370, -238],
  panelHeater: [120, -312], tv: [850, -340], hpIn: [930, -464], hpOut: [1062, -292], wallbox: [1017, -148], car: [1200, -52],
  switchLiving: [452, -385], earthBar: [52, -108], electrode: [500, 34],
};
const CIRCUITS = {
  lighting: { c: '#ffe07a', label: 'Lighting', amp: '10 A', mm: '1.5 mm²', paths: [[[44, -205], [44, -490], [640, -490], [640, -472]], [[230, -490], [230, -472]], [[44, -238], [760, -238]], [[370, -238], [370, -238]]] },
  sockets: { c: '#35c8ff', label: 'Sockets', amp: '16 A', mm: '2.5 mm²', paths: [[[50, -205], [50, -281], [880, -281]], [[120, -281], [120, -294]], [[850, -281], [850, -300]]] },
  kitchen: { c: '#5cf0c0', label: 'Kitchen', amp: '16 A', mm: '2.5 mm²', paths: [[[56, -205], [56, -231], [830, -231], [830, -148]]] },
  cooker: { c: '#ff5fa8', label: 'Cooker', amp: '25 A', mm: '6 mm²', paths: [[[62, -205], [62, -224], [710, -224], [710, -100]]] },
  heater: { c: '#ff9a3c', label: 'Water heater', amp: '16 A', mm: '2.5 mm²', paths: [[[80, -150], [128, -150]]] },
  bath: { c: '#ff7a59', label: 'Bathroom', amp: '16 A', mm: '2.5 mm²', paths: [[[44, -115], [44, -9], [238, -9], ...serp(238, 505, -9, 5)], [[150, -9], [150, -9]], [[262, -9], [262, -9]]] },
  heatpump: { c: '#9d7bff', label: 'Heat pump', amp: '16 A', mm: '2.5 mm²', paths: [[[68, -205], [68, -246], [1040, -246], [1040, -262]]] },
  ev: { c: '#b9e53c', label: 'Car charger', amp: '32 A', mm: '6 mm²', paths: [[[34, -115], [34, 20], [1017, 20], [1017, -126]]] },
};
function serp(x0, x1, y, n) { const pts = []; const st = (x1 - x0) / (n * 2); for (let i = 0; i < n * 2; i++) { const x = x0 + i * st; pts.push([x, y - (i % 2 ? 9 : 0)], [x + st, y - (i % 2 ? 9 : 0)]); } return pts; }

function car(g, x, y, s = 1, o = {}) {
  const col = o.c || '#8fb3ff', a = o.a === undefined ? 1 : o.a, ch = o.charge || 0;
  g.tf({ x, y, s, a }, () => {
    g.path(c => {
      c.moveTo(6, -24); c.quadraticCurveTo(2, -44, 22, -52); c.lineTo(66, -60); c.quadraticCurveTo(92, -92, 128, -94); c.lineTo(188, -94);
      c.quadraticCurveTo(226, -90, 250, -62); c.quadraticCurveTo(276, -56, 278, -40); c.lineTo(278, -24); c.closePath();
    }, { fill: rgba(col, 0.14), c: col, w: 3 });
    g.path(c => { c.moveTo(80, -62); c.quadraticCurveTo(98, -84, 126, -86); c.lineTo(150, -86); c.lineTo(150, -62); c.closePath(); c.moveTo(158, -86); c.lineTo(186, -86); c.quadraticCurveTo(214, -82, 232, -62); c.lineTo(158, -62); c.closePath(); }, { fill: rgba(col, 0.22), c: rgba(col, 0.8), w: 1.5 });
    // battery pack in the floor
    g.rect(70, -34, 150, 14, { r: 3, fill: rgba(C.ok, 0.12 + 0.4 * ch), c: rgba(C.ok, 0.5 + 0.5 * ch), w: 1.5 });
    if (ch > 0) for (let i = 0; i < 6; i++) g.rect(74 + i * 24.5, -31, 20, 8, { r: 1.5, fill: rgba(C.ok, 0.3 + 0.7 * clamp(ch * 6 - i)), w: 0 });
    for (const wx of [58, 226]) { g.circ(wx, -20, 20, { fill: '#0b1222', c: col, w: 3 }); g.circ(wx, -20, 8, { c: rgba(col, 0.7), w: 2 }); }
  });
}

// o: {x,y,s,a, t, lamp(0..1 living lamp), night, circuits:{name:{trim,on,flow}}, show:{service,earth,car,label}, lit:{...appliance glow 0..1}}
function house(g, o = {}) {
  const t = o.t || 0, lit = o.lit || {}, show = o.show || {}, lamp = o.lamp || 0, cir = o.circuits || {};
  const wallC = o.wallC || '#7f93c8', inC = '#526393';
  g.tf({ x: o.x || 0, y: o.y || 0, s: o.s || 1, a: o.a }, () => {
    const c = g.c;
    // ground
    if (show.ground !== false) {
      g.rect(-700, 0, 2500, 400, { fill: g.lin(0, 0, 0, 200, [[0, '#0d1529'], [1, '#070b16']]), w: 0 });
      g.line([[-700, 0], [1800, 0]], { c: '#2c3d68', w: 3 });
    }
    // room fills
    const room = (x, y, w, h, tint, k) => g.rect(x, y, w, h, { fill: tint ? mix('#141f3b', tint, k) : '#141f3b', w: 0 });
    room(0, -250, 220, 250); room(220, -250, 300, 250, '#3a3520', (lit.lampBath || 0) * 0.5); room(520, -250, 480, 250, '#3a3520', (lit.lampKitchen || 0) * 0.5);
    room(0, -500, 420, 230, '#3a3520', (lit.lampBed || 0) * 0.5); room(420, -500, 580, 230, '#4a3f1e', lamp * 0.6);
    // attic + roof
    g.path(cc => { cc.moveTo(-46, -500); cc.lineTo(500, -690); cc.lineTo(1046, -500); cc.closePath(); }, { fill: '#101a33', c: wallC, w: 7, join: 'miter' });
    g.rect(712, -664, 46, 80, { fill: '#101a33', c: wallC, w: 5 }); // chimney
    g.rect(704, -674, 62, 12, { fill: wallC, w: 0 });
    // lamp light cone in living room
    if (lamp > 0) {
      c.save(); c.beginPath(); c.rect(420, -500, 580, 230); c.clip(); c.globalCompositeOperation = 'lighter';
      const gr = c.createRadialGradient(640, -452, 4, 640, -400, 330);
      gr.addColorStop(0, rgba('#ffe9a8', 0.75 * lamp)); gr.addColorStop(0.3, rgba('#ffcf6a', 0.2 * lamp)); gr.addColorStop(1, rgba('#ffcf6a', 0));
      c.fillStyle = gr; c.fillRect(420, -500, 580, 230); c.restore();
    }
    for (const [k, x, y, rr] of [['lampBed', 230, -452, 240], ['lampKitchen', 760, -236, 250], ['lampBath', 370, -236, 220]]) {
      const v = lit[k] || 0; if (v > 0) g.glowDot(x, y + 30, rr, '#ffd98a', 0.32 * v);
    }
    // ---- furniture & appliances (line art) ----
    const st = (col, a = 1) => ({ c: rgba(col, a), w: 2.5 });
    const fx = '#9fb2e6';
    // technical room: board, water heater
    g.rect(24, -205, 56, 90, { r: 4, fill: '#1c2a4d', c: mix(fx, C.l1, lit.board || 0), w: 2.5, glow: (lit.board || 0) * 0.8 });
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) g.rect(30 + i * 7.6, -196 + r * 27, 5.6, 16, { fill: rgba(i === 0 && r === 0 ? C.l1 : '#c9d6ff', 0.75), w: 0 });
    const hv = lit.heater || 0;
    g.rect(128, -200, 64, 172, { r: 14, fill: mix('#1a2747', '#5a2a1c', hv * 0.8), c: mix(fx, C.warm, hv), w: 2.5, glow: hv * 0.7 });
    g.line([[128, -160], [192, -160]], { c: rgba(fx, 0.5), w: 1.5 }); g.line([[128, -60], [192, -60]], { c: rgba(fx, 0.5), w: 1.5 });
    g.line([[144, -28], [144, 0]], st(C.cold, 0.8)); g.line([[176, -200], [176, -228], [215, -228]], st(C.hot, 0.8));
    // bathroom: washer, shower, basin
    const wv = lit.washer || 0;
    g.rect(250, -84, 70, 84, { r: 5, fill: '#1a2747', c: mix(fx, C.l2, wv), w: 2.5, glow: wv * 0.6 });
    g.circ(285, -38, 22, { c: mix(fx, C.l2, wv), w: 2.5 }); g.arc(285, -38, 13, t * 5 * (wv > 0 ? 1 : 0), t * 5 * (wv > 0 ? 1 : 0) + 4, { c: rgba(fx, 0.6), w: 2 });
    g.line([[490, -8], [490, -218], [455, -218]], st(fx, 0.8)); g.path(cc => { cc.moveTo(440, -218); cc.lineTo(470, -218); cc.lineTo(462, -208); cc.lineTo(448, -208); cc.closePath(); }, { fill: rgba(fx, 0.5), c: fx, w: 2 });
    g.rect(352, -112, 62, 14, { r: 5, c: fx, w: 2.5 }); g.line([[383, -98], [383, 0]], st(fx, 0.6)); g.rect(358, -200, 50, 60, { r: 4, c: rgba(fx, 0.7), w: 2 });
    // floor heating
    const fh = lit.floorHeat || 0;
    g.line(serp(238, 505, -9, 5), { c: mix('#55607f', C.hot, fh), w: 2.5, glow: fh * 0.9 });
    // kitchen: counter, hob, oven, hood, fridge, kettle
    g.rect(600, -98, 300, 98, { fill: '#18244a', c: fx, w: 2.5 }); g.line([[590, -98], [910, -98]], { c: fx, w: 5, cap: 'butt' });
    const hb = lit.hob || 0;
    g.rect(668, -86, 84, 70, { r: 4, c: mix(fx, C.l3, hb * 0.6), w: 2 }); g.rect(678, -74, 64, 40, { r: 3, c: rgba(fx, 0.5), w: 1.5 });
    g.line([[672, -101], [748, -101]], { c: mix('#2a3350', C.hot, hb), w: 5, cap: 'butt', glow: hb });
    g.path(cc => { cc.moveTo(688, -103); cc.lineTo(732, -103); cc.lineTo(732, -122); cc.lineTo(688, -122); cc.closePath(); cc.moveTo(732, -116); cc.lineTo(756, -118); }, { fill: '#22305a', c: fx, w: 2.5 });
    if (hb > 0) for (let i = 0; i < 3; i++) { const u = (t * 0.5 + i / 3) % 1; g.line(sample(v => [700 + i * 10 + Math.sin(v * 9 + i) * 3, -126 - v * 34 - u * 10], 0, 1, 10), { c: rgba('#ffffff', 0.25 * hb * (1 - u)), w: 2 }); }
    g.path(cc => { cc.moveTo(650, -196); cc.lineTo(770, -196); cc.lineTo(752, -222); cc.lineTo(668, -222); cc.closePath(); }, { fill: '#1a2747', c: fx, w: 2.5 }); g.rect(696, -250, 28, 28, { c: rgba(fx, 0.7), w: 2 });
    g.circ(710, -192, 4, { fill: lit.guard ? C.bad : rgba(fx, 0.7), w: 0 }); if (lit.guard) g.glowDot(710, -192, 22, C.bad, lit.guard);
    g.rect(915, -196, 70, 196, { r: 5, fill: '#1a2747', c: fx, w: 2.5 }); g.line([[915, -120], [985, -120]], st(fx, 0.7)); g.line([[925, -150], [925, -132]], st(fx, 0.7));
    const kv = lit.kettle || 0;
    g.path(cc => { cc.moveTo(818, -100); cc.lineTo(842, -100); cc.lineTo(839, -128); cc.lineTo(821, -128); cc.closePath(); cc.moveTo(842, -122); cc.quadraticCurveTo(854, -116, 842, -106); }, { fill: mix('#22305a', C.warm, kv * 0.5), c: mix(fx, C.warm, kv), w: 2.2, glow: kv * 0.6 });
    g.rect(782, -86, 80, 86, { c: rgba(fx, 0.6), w: 2 });
    // bedroom: window, panel heater, bed
    g.rect(70, -456, 104, 84, { fill: '#0c1630', c: fx, w: 2.5 }); g.line([[122, -456], [122, -372]], st(fx, 0.7));
    const pv = lit.panelHeater || 0;
    g.rect(62, -338, 120, 44, { r: 4, fill: mix('#1a2747', '#5a2a1c', pv * 0.8), c: mix(fx, C.warm, pv), w: 2.5, glow: pv * 0.7 });
    for (let i = 0; i < 5; i++) g.line([[78 + i * 22, -330], [78 + i * 22, -302]], { c: rgba(mix(fx, C.warm, pv), 0.5), w: 1.5 });
    g.rect(250, -302, 150, 32, { r: 6, fill: '#1c2a52', c: fx, w: 2.5 }); g.rect(382, -340, 14, 70, { r: 4, c: fx, w: 2.5 }); g.rect(346, -314, 34, 14, { r: 6, c: rgba(fx, 0.7), w: 2 });
    // living: sofa, tv, lamp, heat pump indoor, switch
    g.rect(470, -306, 190, 36, { r: 8, fill: '#1c2a52', c: fx, w: 2.5 }); g.rect(470, -340, 22, 70, { r: 7, c: fx, w: 2.5 }); g.rect(486, -334, 174, 30, { r: 8, c: rgba(fx, 0.7), w: 2 });
    const tv = lit.tv || 0;
    g.rect(790, -372, 124, 72, { r: 4, fill: mix('#0c1630', '#2a5bd6', tv * 0.6), c: mix(fx, C.l2, tv), w: 2.5, glow: tv * 0.5 }); g.line([[852, -300], [852, -286]], st(fx)); g.rect(800, -286, 104, 16, { r: 3, c: fx, w: 2 });
    for (const [lx, ly, v] of [[640, -500, lamp], [230, -500, lit.lampBed || 0]]) {
      g.line([[lx, ly], [lx, ly + 30]], { c: fx, w: 2 });
      g.path(cc => { cc.moveTo(lx - 22, ly + 52); cc.lineTo(lx + 22, ly + 52); cc.lineTo(lx + 12, ly + 30); cc.lineTo(lx - 12, ly + 30); cc.closePath(); }, { fill: mix('#22305a', '#ffe9a8', v), c: mix(fx, '#ffe9a8', v), w: 2.2 });
      if (v > 0) g.glowDot(lx, ly + 56, 60, '#ffe9a8', v);
    }
    for (const [lx, k] of [[760, 'lampKitchen'], [370, 'lampBath']]) { const v = lit[k] || 0; g.rect(lx - 16, -248, 32, 7, { r: 3, fill: mix('#3a4870', '#ffe9a8', v), w: 0 }); if (v > 0) g.glowDot(lx, -240, 46, '#ffe9a8', v); }
    const hpv = lit.heatpump || 0;
    g.rect(880, -484, 104, 34, { r: 8, fill: '#1c2a52', c: mix(fx, C.violet, hpv), w: 2.5, glow: hpv * 0.6 }); g.line([[890, -458], [974, -458]], st(fx, 0.6));
    if (hpv > 0) for (let i = 0; i < 4; i++) { const u = (t * 0.6 + i / 4) % 1; g.line(sample(v => [900 + i * 20 - v * 30, -446 + v * 60 + u * 30], 0, 1, 8), { c: rgba(C.warm, 0.35 * hpv * (1 - u)), w: 2.5 }); }
    g.rect(444, -396, 16, 22, { r: 3, fill: '#22305a', c: mix(fx, C.l1, lit.switch || 0), w: 2, glow: (lit.switch || 0) });
    // structure: slabs and walls on top
    g.rect(0, -270, 1000, 20, { fill: '#2a3963', w: 0 });
    g.line([[0, 0], [0, -500]], { c: wallC, w: 10, cap: 'butt' }); g.line([[1000, 0], [1000, -500]], { c: wallC, w: 10, cap: 'butt' });
    g.line([[-5, -500], [1005, -500]], { c: wallC, w: 6, cap: 'butt' }); g.line([[-5, 0], [1005, 0]], { c: wallC, w: 6, cap: 'butt' });
    for (const [x, y0, y1] of [[220, -250, 0], [520, -250, 0], [420, -500, -270]]) { g.line([[x, y1 - 96], [x, y0]], { c: inC, w: 7, cap: 'butt' }); }
    // carport, car, wallbox, heat pump outdoor unit
    if (show.car !== false) {
      g.line([[1000, -256], [1400, -256]], { c: wallC, w: 8, cap: 'butt' }); g.line([[1388, -252], [1388, 0]], { c: wallC, w: 7, cap: 'butt' });
      car(g, 1068, 0, 1, { charge: lit.car || 0, c: mix('#8fb3ff', C.pe, (lit.car || 0) * 0.5) });
      const ev = lit.wallbox || lit.car || 0;
      g.rect(1005, -172, 26, 46, { r: 5, fill: '#1c2a52', c: mix(fx, C.pe, ev), w: 2.5, glow: ev * 0.8 }); g.circ(1018, -156, 4, { fill: ev > 0 ? C.pe : rgba(fx, 0.6), w: 0 });
      g.path(cc => { cc.moveTo(1018, -126); cc.bezierCurveTo(1018, -60, 1060, -30, 1078, -52); }, { c: mix('#55607f', C.pe, ev), w: 3, glow: ev * 0.6 });
      g.rect(1016, -326, 92, 66, { r: 6, fill: '#1c2a52', c: mix(fx, C.violet, hpv), w: 2.5, glow: hpv * 0.6 });
      g.circ(1050, -293, 23, { c: mix(fx, C.violet, hpv), w: 2 });
      for (let i = 0; i < 3; i++) { const an = (hpv > 0 ? t * 9 : 0.4) + i * TAU / 3; g.line([[1050, -293], [1050 + Math.cos(an) * 20, -293 + Math.sin(an) * 20]], { c: rgba(fx, 0.8), w: 3 }); }
    }
    // service cable + connection cabinet + earth electrode
    if (show.service) {
      const sv = show.service;
      g.wire([[-700, 70], [-26, 70], [-26, -130]], { c: C.l1, w: 5, on: sv, flow: o.flowService, t, round: 10, trim: show.serviceTrim });
      g.rect(-46, -210, 40, 80, { r: 4, fill: '#1c2a52', c: mix(fx, C.l1, lit.cabinet || 0), w: 2.5, glow: (lit.cabinet || 0) * 0.8 });
      g.rect(-40, -200, 28, 22, { r: 2, fill: rgba(C.ok, 0.25 + 0.5 * (lit.meter || 0)), c: rgba(C.ok, 0.8), w: 1.5 });
      g.wire([[-6, -170], [24, -170]], { c: C.l1, w: 4, on: sv, flow: o.flowService, t });
    }
    if (show.earth) {
      const ev = show.earth;
      g.line([[20, 34], [980, 34]], { c: C.pe, w: 3.5, dash: [16, 9], cap: 'butt', a: ev, glow: 0.5, trim: show.earthTrim });
      g.line([[58, 34], [58, -115]], { c: C.pe, w: 3, a: ev, trim: show.earthTrim });
    }
    // circuits
    for (const k in cir) {
      const def = CIRCUITS[k], st2 = cir[k]; if (!st2) continue;
      const trim = st2.trim === undefined ? 1 : st2.trim, on = st2.on === undefined ? 1 : st2.on, a = st2.a === undefined ? 1 : st2.a;
      if (trim <= 0 || a <= 0) continue;
      def.paths.forEach((pth, i) => {
        if (pth.length === 2 && pth[0][0] === pth[1][0] && pth[0][1] === pth[1][1]) return;
        const tr = i === 0 ? trim : clamp(trim * 2 - 1);
        g.wire(pth, { c: def.c, w: st2.w || 3.5, on, a, trim: tr, flow: st2.flow, t, round: 6, gap: 34, speed: 110, glow: 0.5 });
      });
    }
  });
}
// simple human figure standing at (x, y=ground). o.hand = [hx, hy] the point one hand touches
function person(g, x, y, s = 1, o = {}) {
  const col = o.c || '#c9d6ff', a = o.a === undefined ? 1 : o.a, sh = o.shake || 0, t = g.t;
  const jx = sh ? Math.sin(t * 70) * 3 * sh : 0;
  g.tf({ x: x + jx, y, s, a }, () => {
    const w = 15, glow = o.glow || 0;
    g.circ(0, -292, 30, { fill: rgba(col, 0.25), c: col, w: 6, glow });
    g.line([[0, -260], [0, -130]], { c: col, w: w, glow });
    g.line([[0, -130], [-26, 0]], { c: col, w: w - 2, glow }); g.line([[0, -130], [26, 0]], { c: col, w: w - 2, glow });
    g.line([[0, -236], [34, -170], [22, -112]], { c: col, w: w - 4, glow });
    const h = o.hand ? [(o.hand[0] - x) / s, (o.hand[1] - y) / s] : [-70, -150];
    g.line([[0, -236], [h[0] * 0.5, -236 + (h[1] + 236) * 0.5 + 22], h], { c: col, w: w - 4, glow });
    g.circ(h[0], h[1], 8, { fill: col, w: 0 });
  });
}
// convert a house-local point into scene coordinates
const hpt = (o, name) => { const p = Array.isArray(name) ? name : HP[name]; return [(o.x || 0) + p[0] * (o.s || 1), (o.y || 0) + p[1] * (o.s || 1)]; };

module.exports = { person, heading, sub, panel, callout, caption, formula, gauge, sky, ridge, ridgeFn, pylon, span, kiosk, substation, house, hpt, HP, CIRCUITS, car, serp };
