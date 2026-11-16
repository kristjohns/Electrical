const { W, H, C, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample, rnd, integ } = require('../lib/core');
const P = require('../lib/parts');

const PEN = [[566, 432], [650, 476], [1130, 792], [1218, 836]];
const TAIL = [[1322, 846], [1420, 880], [1560, 902]];
function hydroSection(g, t, o = {}) {
  const flow = o.flow === undefined ? 1 : o.flow;
  P.sky(g, t, { aurora: 0.8 });
  P.ridge(g, P.ridgeFn(5, 560, 360, 0.0022), { c0: '#18254a', c1: '#0c1428', a: 0.9, snow: 380 });
  const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  const prof = x => {
    const wob = 7 * Math.sin(x * 0.05) + 4 * Math.sin(x * 0.13);
    if (x < 110) return lerp(240, 332, sm(-60, 110, x)) + wob * (1 - sm(60, 110, x));
    if (x < 560) return 448 + 6 * Math.sin(x * 0.03);
    if (x < 640) return 332;
    return lerp(332, 884, Math.pow(sm(640, 1530, x), 1.25)) + wob * sm(640, 700, x) * (1 - sm(1440, 1530, x));
  };
  // fjord
  g.rect(1380, 884, 700, 300, { fill: g.lin(0, 884, 0, 1080, [[0, '#17437e'], [1, '#081a36']]), w: 0 });
  g.line(sample(u => [1500 + u * 440, 884 + Math.sin(u * 40 + t * 1.6) * 1.5], 0, 1, 50), { c: rgba('#9fd0ff', 0.6), w: 2 });
  P.ridge(g, prof, { c0: '#283a66', c1: '#0c1428', x0: -80, x1: 1560, snow: 330, top: 240, base: 1200 });
  // reservoir
  g.path(c => { c.moveTo(112, 352); c.lineTo(556, 352); c.lineTo(556, 446); for (let x = 556; x >= 112; x -= 12) c.lineTo(x, Math.min(448 + 6 * Math.sin(x * 0.03), 352 + (x - 100) * 2.2)); c.closePath(); }, { fill: g.lin(0, 352, 0, 450, [[0, '#3aa8ff'], [1, '#164f9c']]), w: 0 });
  g.line(sample(u => [112 + u * 444, 352 + Math.sin(u * 46 + t * 1.8) * 1.6], 0, 1, 60), { c: rgba('#cfeaff', 0.9), w: 2.5 });
  // dam
  g.path(c => { c.moveTo(556, 334); c.lineTo(582, 334); c.lineTo(640, 452); c.lineTo(556, 452); c.closePath(); }, { fill: '#8d9cc0', c: '#d5def5', w: 2 });
  // penstock + cavern + tailrace
  g.line(PEN, { c: '#060b17', w: 26, round: 40 }); g.line(PEN, { c: '#184684', w: 16, round: 40 });
  g.line(TAIL, { c: '#060b17', w: 26, round: 30 }); g.line(TAIL, { c: '#184684', w: 16, round: 30 });
  g.rect(1196, 722, 152, 150, { r: 18, fill: '#0a1122', c: '#3a4b7a', w: 2.5 });
  if (flow > 0) { g.flow(PEN, { c: '#9fd8ff', w: 8, gap: 34, speed: 230 * flow, t, round: 40, glow: 0.5 }); g.flow(TAIL, { c: '#9fd8ff', w: 8, gap: 44, speed: 120 * flow, t, round: 30, glow: 0.4 }); }
  // turbine + shaft + generator
  const tx = 1270, ty = 838, an = t * 7 * flow;
  g.circ(tx, ty, 28, { fill: '#0f2548', c: C.l2, w: 3, glow: 0.6 });
  for (let i = 0; i < 7; i++) { const a = an + i * TAU / 7; g.path(c => { c.moveTo(tx + Math.cos(a) * 7, ty + Math.sin(a) * 7); c.quadraticCurveTo(tx + Math.cos(a + 0.7) * 18, ty + Math.sin(a + 0.7) * 18, tx + Math.cos(a + 0.5) * 26, ty + Math.sin(a + 0.5) * 26); }, { c: C.l2, w: 2.5 }); }
  g.line([[tx, ty - 28], [tx, 790]], { c: C.steel, w: 6, cap: 'butt' });
  g.rect(tx - 44, 742, 88, 50, { r: 8, fill: '#2a2110', c: C.l1, w: 3, glow: 0.6 });
  for (let i = 0; i < 5; i++) { const u = ((an / TAU * 0.8 + i / 5) % 1 + 1) % 1; g.line([[tx - 38 + u * 76, 748], [tx - 38 + u * 76, 786]], { c: rgba(C.l1, 0.55 * Math.sin(u * Math.PI)), w: 3 }); }
  // cable shaft to surface + pylon
  const up = [[tx + 44, 760], [1390, 760], [1390, 700]];
  g.line(up, { c: mix(C.line, C.l1, 0.7), w: 3, round: 10 });
  const att = P.pylon(g, 1420, prof(1420) + 4, 200, { c: '#93a4cf' });
  for (let k = 0; k < 3; k++) { g.line(P.span([1390, 700], att[k], 6), { c: rgba(C.l1, 0.7), w: 1.8 }); g.line(P.span(att[k], [1960, att[k][1] - 60 - k * 6], 46), { c: rgba([C.l1, C.l2, C.l3][k], 0.8), w: 2, glow: 0.4 }); }
  if (flow > 0) g.flow(up.concat(P.span([1390, 700], att[2], 6), P.span(att[2], [1960, att[2][1] - 72], 46)), { c: C.energy, w: 5, gap: 60, speed: 260, t, a: flow });
}

// ---- turbines ----
function pelton(g, x, y, R, t, hi) {
  const an = t * 2.6;
  g.circ(x, y, R + 34, { c: rgba(C.steel, 0.35), w: 2, dash: [8, 8] });
  g.circ(x, y, R - 16, { fill: '#13203f', c: C.steel, w: 3 }); g.circ(x, y, 16, { fill: C.steel, w: 0 });
  for (let i = 0; i < 6; i++) { const a = an + i * TAU / 6; g.line([[x + Math.cos(a) * 16, y + Math.sin(a) * 16], [x + Math.cos(a) * (R - 16), y + Math.sin(a) * (R - 16)]], { c: rgba(C.steel, 0.5), w: 3 }); }
  for (let i = 0; i < 18; i++) {
    const a = an + i * TAU / 18;
    g.tf({ x: x + Math.cos(a) * R, y: y + Math.sin(a) * R, r: a + Math.PI / 2 }, () => g.path(c => { c.moveTo(-15, -6); c.quadraticCurveTo(-15, 14, 0, 12); c.quadraticCurveTo(15, 14, 15, -6); c.lineTo(0, 2); c.closePath(); }, { fill: '#2b3d6e', c: mix(C.steel, C.l2, hi), w: 2 }));
  }
  // nozzle + jet (hits the bottom of the wheel, moving right-to-left tangent)
  const jy = y + R + 4, nx = x + 150;
  g.path(c => { c.moveTo(nx + 120, jy - 26); c.lineTo(nx + 30, jy - 26); c.lineTo(nx, jy - 7); c.lineTo(nx, jy + 7); c.lineTo(nx + 30, jy + 26); c.lineTo(nx + 120, jy + 26); }, { fill: '#184684', c: C.steel, w: 3 });
  g.path(c => { c.moveTo(nx + 120, jy - 5); c.lineTo(nx + 36, jy - 5); c.lineTo(nx + 6, jy); c.lineTo(nx + 36, jy + 5); c.lineTo(nx + 120, jy + 5); }, { fill: C.steel, w: 0 });
  g.line([[nx, jy], [x + 6, jy]], { c: '#bfe6ff', w: 9, glow: 1, cap: 'butt' });
  g.flow([[nx, jy], [x + 6, jy]], { c: '#ffffff', w: 4, len: 26, gap: 44, speed: 900, t, glow: 0 });
  for (let i = 0; i < 26; i++) { // splash
    const u = (t * 1.4 + rnd(i)) % 1, dir = i % 2 ? 1 : -1, a0 = Math.PI * 0.5 + dir * (0.5 + rnd(i * 3) * 0.7);
    g.circ(x + 4 + Math.cos(a0) * u * 70 + dir * 6, jy + 8 + Math.abs(Math.sin(a0)) * u * 60 + u * u * 50, 3 * (1 - u) + 1, { fill: rgba('#bfe6ff', 0.8 * (1 - u)), w: 0 });
  }
}
function francis(g, x, y, R, t, hi, open = 1) {
  const an = -t * 2.2;
  // spiral casing
  const sp = sample(u => { const a = -u * TAU * 1.02, r = R + 46 + (1 - u) * 62; return [x + Math.cos(a) * r, y + Math.sin(a) * r]; }, 0, 1, 80);
  g.line(sp.concat([[x + R + 46, y]]), { c: C.steel, w: 3 });
  g.line([[x + R + 108, y], [x + R + 108, y - 190]], { c: C.steel, w: 3 }); g.line([[x + R + 46, y - 30], [x + R + 46, y - 190]], { c: C.steel, w: 3 });
  g.circ(x, y, R + 44, { c: rgba(C.steel, 0.25), w: 1.5 });
  // water particles spiralling in
  for (let i = 0; i < 70; i++) {
    const u = (t * 0.35 + rnd(i * 1.7)) % 1, a = -(rnd(i * 9.1) * TAU + u * 3.3), r = lerp(R + 96 - rnd(i) * 40, 14, Math.pow(u, 1.25));
    g.circ(x + Math.cos(a) * r, y + Math.sin(a) * r, 3.4, { fill: rgba('#8fd4ff', 0.85 * Math.sin(Math.min(1, u * 1.2) * Math.PI)), w: 0 });
  }
  for (let i = 0; i < 6; i++) { const u = (t * 0.9 + i / 6) % 1; g.circ(x + R + 77, y - 190 + u * 190, 3.4, { fill: rgba('#8fd4ff', 0.8), w: 0 }); }
  // guide vanes
  for (let i = 0; i < 16; i++) {
    const a = i * TAU / 16, vx = x + Math.cos(a) * (R + 22), vy = y + Math.sin(a) * (R + 22), va = a + Math.PI / 2 + lerp(0.15, 0.85, open);
    g.line([[vx - Math.cos(va) * 17, vy - Math.sin(va) * 17], [vx + Math.cos(va) * 17, vy + Math.sin(va) * 17]], { c: mix(C.steel, C.warn, hi), w: 5, glow: hi * 0.8 });
    g.circ(vx, vy, 3, { fill: '#0b1222', w: 0 });
  }
  // runner
  g.circ(x, y, R, { fill: rgba('#13203f', 0.7), c: C.l2, w: 3 });
  for (let i = 0; i < 11; i++) { const a = an + i * TAU / 11; g.path(c => { c.moveTo(x + Math.cos(a) * R, y + Math.sin(a) * R); c.quadraticCurveTo(x + Math.cos(a - 0.6) * R * 0.62, y + Math.sin(a - 0.6) * R * 0.62, x + Math.cos(a - 0.5) * R * 0.3, y + Math.sin(a - 0.5) * R * 0.3); }, { c: C.l2, w: 3.5 }); }
  g.circ(x, y, R * 0.28, { fill: '#0a1326', c: C.steel, w: 3 });
}
function kaplan(g, x, y, R, t, hi) {
  // tube
  const w = R + 18;
  g.path(c => { c.moveTo(x - w - 60, y - 210); c.quadraticCurveTo(x - w, y - 150, x - w, y - 60); c.lineTo(x - w, y + 70); c.quadraticCurveTo(x - w - 8, y + 150, x - w - 50, y + 215); }, { c: C.steel, w: 3 });
  g.path(c => { c.moveTo(x + w + 60, y - 210); c.quadraticCurveTo(x + w, y - 150, x + w, y - 60); c.lineTo(x + w, y + 70); c.quadraticCurveTo(x + w + 8, y + 150, x + w + 50, y + 215); }, { c: C.steel, w: 3 });
  for (let i = 0; i < 46; i++) {
    const u = (t * 0.5 + rnd(i * 2.3)) % 1, lane = rnd(i * 5.1) * 2 - 1, yy = y - 205 + u * 415;
    const widen = 1 + Math.pow(Math.abs(u - 0.5) * 2, 2) * 0.45;
    g.circ(x + lane * (w - 10) * widen + Math.sin(u * 9 + i) * (u > 0.5 ? 8 : 2), yy, 3.4, { fill: rgba('#8fd4ff', 0.8 * Math.sin(u * Math.PI)), w: 0 });
  }
  g.line([[x, y - 215], [x, y - 30]], { c: C.steel, w: 12, cap: 'butt' });
  // hub + blades (fake 3D rotation)
  const an = t * 3.4;
  const blades = [0, 1, 2, 3].map(i => an + i * TAU / 4).sort((a, b) => Math.sin(a) - Math.sin(b));
  const hub = () => g.path(c => { c.moveTo(x - 26, y - 34); c.lineTo(x + 26, y - 34); c.lineTo(x + 26, y + 20); c.quadraticCurveTo(x + 20, y + 62, x, y + 76); c.quadraticCurveTo(x - 20, y + 62, x - 26, y + 20); c.closePath(); }, { fill: '#1c2a52', c: C.steel, w: 3 });
  let hubDone = false;
  for (const a of blades) {
    if (!hubDone && Math.sin(a) >= 0) { hub(); hubDone = true; }
    const cx = Math.cos(a), dep = Math.sin(a), len = (R - 4) * cx, tilt = 26 * dep;
    g.path(c => { c.moveTo(x + cx * 22, y - 10); c.quadraticCurveTo(x + len * 0.6, y - 30 - tilt, x + len, y - 14 - tilt * 0.6); c.quadraticCurveTo(x + len * 1.02, y + 6, x + len * 0.9, y + 18 + tilt * 0.6); c.quadraticCurveTo(x + len * 0.5, y + 22 + tilt, x + cx * 22, y + 12); c.closePath(); }, { fill: rgba(mix('#2b3d6e', C.l2, 0.25 + 0.2 * dep), 0.95), c: C.l2, w: 2.5 });
  }
  if (!hubDone) hub();
}

module.exports = api => {
  api.chapter('Generation', 'Where Norwegian electricity comes from');

  api.scene('gen-hydro', {
    lines: [
      '@water|In Norway, the journey almost always begins with water. About ninety percent of all Norwegian electricity is hydropower. Most of the rest is wind.',
      '@res|More than seventeen hundred hydropower plants, and over a thousand reservoirs, act together as one gigantic rechargeable battery, charged by rain and melting snow.',
      '@head|The principle is beautifully simple. Store water high up. Let it fall through a pressure tunnel, the penstock. And extract its energy in a turbine at the bottom.',
      '@eq|The power is efficiency, times density, times gravity, times flow rate, times height.',
      '@num|Take a head of five hundred metres, and a flow of twenty cubic metres per second. With an efficiency above ninety percent, that single unit delivers about ninety megawatts. Enough to cover the average consumption of roughly fifty thousand homes.',
    ],
    draw(g, s) {
      const t = s.t;
      hydroSection(g, t, { flow: 1 });
      // stat tiles
      const stats = [['≈ 90 %', 'of all electricity is hydropower', C.l2, s.in('water', 3.6, 0.8, E.o)], ['1 700+', 'hydropower plants', C.l1, s.in('res', 0.3, 0.8, E.o)], ['1 000+', 'reservoirs  ·  ≈ 87 TWh of storage', C.ok, s.in('res', 3.0, 0.8, E.o)]];
      const so = s.out('eq', -0.6);
      stats.forEach(([big, small, col, p], i) => {
        const x = 700 + i * 400, y = 96;
        P.panel(g, x, y + (1 - p) * 16, 372, 138, p * so, { fill: rgba('#0a1124', 0.8) });
        g.text(big, x + 28, y + 52, { s: 54, f: 'disp', wt: 800, c: col, p, a: so }); g.text(small, x + 28, y + 106, { s: 21, c: C.dim, p, a: so });
      });
      // labels
      const lo = 1;
      P.callout(g, 330, 400, 330, 270, 'Reservoir', 'potential energy', s.in('head', 2.0), { al: 'c', c: C.ink });
      P.callout(g, 880, 628, 760, 720, 'Penstock', 'pressure tunnel', s.in('head', 4.4), { al: 'r' });
      P.callout(g, 1250, 850, 1130, 950, 'Turbine', 'pressure → rotation', s.in('head', 7.6), { al: 'r', c: C.l2 });
      P.callout(g, 1310, 760, 1500, 640, 'Generator', 'rotation → electricity', s.in('head', 8.6), { al: 'l', c: C.l1 });
      // head dimension
      const hp = s.in('eq', 2.6, 0.9, E.o);
      if (hp > 0) {
        g.line([[556, 352], [1100, 352]], { c: rgba(C.ink, 0.5), w: 1.5, dash: [8, 8], trim: hp }); g.line([[1100, 838], [1240, 838]], { c: rgba(C.ink, 0.5), w: 1.5, dash: [8, 8], trim: hp });
        g.arrow(1100, 595, 1100, 595 - 240 * hp, { c: C.ink, w: 2.5 }); g.arrow(1100, 595, 1100, 595 + 240 * hp, { c: C.ink, w: 2.5 });
        g.tag('head  H', 1100, 595, { s: 26, c: C.ink, bg: rgba('#0a1124', 0.9), p: hp });
      }
      // formula panel
      const fp = s.in('eq', 0.2, 0.8, E.o);
      if (fp > 0) {
        P.panel(g, 720, 80 + (1 - fp) * 16, 1140, 250, fp, { fill: rgba('#0a1124', 0.86) });
        const terms = [['P', 0, C.ink], ['=', 0, C.dim], ['η', 0.7, C.ok], ['·', 0.7, C.dim], ['ρ', 1.6, C.cold], ['·', 1.6, C.dim], ['g', 2.3, C.ink], ['·', 2.3, C.dim], ['Q', 3.0, C.l2], ['·', 3.0, C.dim], ['H', 4.0, C.l1]];
        let x = 790; terms.forEach(([tx, d, col]) => { g.text(tx, x, 150, { s: 72, f: 'disp', wt: 700, c: col, al: 'c', p: s.in('eq', d * 0.9 + 0.2, 0.5, E.o), it: tx.length === 1 && tx !== '=' && tx !== '·' }); x += tx === '=' || tx === 'P' ? 74 : 54; });
        const np = k => s.in('num', k, 0.6, E.o);
        const vals = [['0.92', C.ok, 9.4, 'efficiency'], ['1000 kg/m³', C.cold, 1, 'density'], ['9.81 m/s²', C.ink, 1, 'gravity'], ['20 m³/s', C.l2, 3.4, 'flow'], ['500 m', C.l1, 0.8, 'head']];
        let vx = 760; vals.forEach(([v, col, d, lab], i) => { const wv = g.textW(v, { s: 30, f: 'mono', wt: 600 }); g.text(v, vx, 232, { s: 30, f: 'mono', wt: 600, c: col, p: np(d) }); g.text(lab, vx, 268, { s: 18, c: C.dim, p: np(d) }); vx += wv + 34; if (i < 4) g.text('×', vx - 22, 232, { s: 24, c: C.faint, al: 'c', p: np(d) }); });
        g.text('≈ 90 MW', 1826, 150, { s: 76, f: 'disp', wt: 800, c: C.energy, al: 'r', p: np(11.6) });
        g.text('≈ 50 000 average homes', 1826, 250, { s: 26, c: C.ink, al: 'r', wt: 600, p: np(16.4) });
      }
    },
  });

  api.scene('gen-turbines', {
    lines: [
      '@types|Which turbine you use depends on the head.',
      '@pelton|For very high heads, the Pelton wheel. Nozzles turn all the pressure into a free jet, moving at more than three hundred kilometres per hour, which strikes spoon shaped buckets.',
      '@francis|For medium heads, the Francis turbine, the workhorse of Norwegian hydropower. Water spirals inwards through adjustable guide vanes, and leaves along the axis.',
      "@kaplan|And for low heads with large flows, in river power plants, the Kaplan turbine. Essentially a ship's propeller running in reverse.",
      '@gov|In every case, guide vanes or needle valves control the flow of water. That is the throttle of the power system, and we will come back to it.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'Three turbines for three kinds of site', s.p(0.3, 0.8, E.o));
      const cols = [[330, 'PELTON', 'high head', '> 500 m', 'pelton'], [960, 'FRANCIS', 'medium head', '30 – 600 m', 'francis'], [1590, 'KAPLAN', 'low head, big flow', '< 40 m', 'kaplan']];
      const gov = s.in('gov', 0.6, 0.8), open = 0.55 + 0.45 * Math.sin(Math.max(0, s.since('gov') - 0.6) * 1.5 + Math.PI / 2);
      cols.forEach(([x, name, d1, d2, key], i) => {
        const p = s.p(0.6 + i * 0.25, 0.9, E.o);
        const focus = clamp(s.in(key, 0, 0.6) - (i < 2 ? s.in(cols[i + 1][4], 0, 0.6) : s.in('gov', 0, 0.6)));
        const dimmed = s.on('pelton') && !s.on('gov') ? lerp(0.35, 1, focus) : 1;
        P.panel(g, x - 290, 210 + (1 - p) * 20, 580, 760, p * lerp(0.6, 1, dimmed), { c: rgba(C.l2, 0.2 + 0.5 * focus) });
        g.alpha(p * dimmed, () => {
          if (i === 0) pelton(g, x - 40, 500, 140, t, gov);
          if (i === 1) francis(g, x - 20, 560, 100, t, gov, s.on('gov') ? open : 1);
          if (i === 2) kaplan(g, x, 545, 120, t, gov);
          g.text(name, x, 840, { s: 44, f: 'disp', wt: 800, al: 'c', ls: 4 });
          g.text(d1, x, 892, { s: 26, c: C.dim, al: 'c' });
          g.tag(d2, x, 938, { s: 24, c: [C.l3, C.l2, C.ok][i], f: 'mono' });
        });
      });
      g.tag('needle valve', 500, 590, { s: 20, c: C.warn, p: gov }); g.tag('guide vanes', 960 - 20, 400, { s: 20, c: C.warn, p: gov }); g.tag('blade pitch + guide vanes', 1590, 290, { s: 20, c: C.warn, p: gov });
      g.tag('jet  ≈ 100 m/s', 370, 700, { s: 20, c: C.l2, f: 'mono', p: s.in('pelton', 4.5) * s.out('francis') });
    },
  });
};
module.exports.hydroSection = hydroSection;
