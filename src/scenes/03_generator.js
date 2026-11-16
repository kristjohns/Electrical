const { W, H, C, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample, rnd } = require('../lib/core');
const P = require('../lib/parts');
const PH = [C.l1, C.l2, C.l3];

// cross-section of a 2-pole synchronous generator. th = rotor angle (math convention, CCW)
function generator(g, x, y, R, th, o = {}) {
  const nph = o.phases === undefined ? 3 : o.phases, coilA = o.coilA === undefined ? 1 : o.coilA;
  const R2 = R, R1 = R * 0.72, rr = R * 0.6;
  const pt = (a, r) => [x + Math.cos(a) * r, y - Math.sin(a) * r];
  // stator
  g.circ(x, y, R2, { fill: '#1a2545', c: C.steel, w: 3 }); g.circ(x, y, R1, { fill: '#0a1122', c: C.steel, w: 2.5 });
  for (let i = 0; i < 48; i++) { const a = i * TAU / 48; g.line([pt(a, R1 + 3), pt(a, R2 - 3)], { c: rgba('#6f80ad', 0.16), w: 1.5 }); }
  // flux through the stator yoke (follows the rotor)
  const fa = o.flux === undefined ? 1 : o.flux;
  if (fa > 0) for (const side of [1, -1]) for (let k = 0; k < 3; k++) {
    const r = R1 + (R2 - R1) * (0.25 + k * 0.25), sp = 1.15 - k * 0.12;
    const pts = sample(u => pt(th + side * (Math.PI / 2 - sp + u * 2 * sp) + (side < 0 ? 0 : 0), r), 0, 1, 30);
    g.line(side > 0 ? pts : pts, { c: rgba('#c7b6ff', 0.55 * fa), w: 2, dash: [10, 9], off: (side > 0 ? 1 : -1) * -g.t * 40 });
  }
  // coils: phase k axis at k*120deg, coil sides at axis +- 90deg
  for (let k = 0; k < 3; k++) {
    const vis = k === 0 ? coilA : clamp(nph - k + 0); if (vis <= 0) continue;
    const e = Math.sin(th - k * TAU / 3), ax = k * TAU / 3;
    for (const sgn of [1, -1]) {
      const [cx, cy] = pt(ax + sgn * Math.PI / 2, (R1 + R2) / 2 - R * 0.02), cr = R * 0.085;
      g.circ(cx, cy, cr, { fill: mix('#0a1122', PH[k], 0.2 + 0.6 * Math.abs(e)), c: PH[k], w: 3, glow: Math.abs(e) * 1.1, a: vis });
      const dir = sgn * Math.sign(e || 1);
      if (dir > 0) g.circ(cx, cy, cr * 0.28, { fill: '#fff', w: 0, a: vis * (0.3 + 0.7 * Math.abs(e)) });
      else { const q = cr * 0.45; g.line([[cx - q, cy - q], [cx + q, cy + q]], { c: '#fff', w: 2.5, a: vis * (0.3 + 0.7 * Math.abs(e)) }); g.line([[cx - q, cy + q], [cx + q, cy - q]], { c: '#fff', w: 2.5, a: vis * (0.3 + 0.7 * Math.abs(e)) }); }
    }
  }
  // rotor
  g.tf({ x, y, r: -th }, () => {
    const L = rr, wd = R * 0.2;
    for (const sgn of [1, -1]) {
      const col = sgn > 0 ? C.hot : C.cold;
      g.path(c => { c.moveTo(0, -wd); c.lineTo(sgn * L * 0.72, -wd); c.lineTo(sgn * L * 0.72, -wd * 2.3); c.arc(0, 0, L, sgn > 0 ? -Math.atan2(wd * 2.3, L * 0.72) - 0.08 : Math.PI + Math.atan2(wd * 2.3, L * 0.72) + 0.08, sgn > 0 ? Math.atan2(wd * 2.3, L * 0.72) + 0.08 : Math.PI - Math.atan2(wd * 2.3, L * 0.72) - 0.08, sgn < 0); c.lineTo(sgn * L * 0.72, wd * 2.3); c.lineTo(sgn * L * 0.72, wd); c.lineTo(0, wd); c.closePath(); }, { fill: mix('#141c33', col, 0.55), c: col, w: 3, glow: 0.5 });
      // field winding
      for (let i = 0; i < 5; i++) g.line([[sgn * (L * 0.2 + i * L * 0.105), -wd - 9], [sgn * (L * 0.2 + i * L * 0.105), wd + 9]], { c: C.copper, w: 7, cap: 'round' });
      g.text(sgn > 0 ? 'N' : 'S', sgn * L * 0.86, 0, { s: R * 0.13, wt: 800, al: 'c', c: '#fff', rot: th });
    }
    g.circ(0, 0, R * 0.09, { fill: C.steel, c: '#dfe7fa', w: 2 });
  });
}

module.exports = api => {
  api.chapter('The Generator', 'Rotation becomes three-phase power');

  // ------------------------------------------------------------ generator
  api.scene('generator', {
    lines: [
      '@shaft|The turbine shaft drives a synchronous generator. The rotor is an electromagnet, fed with direct current, so it carries a magnetic field around with it.',
      "@faraday|Faraday's law says: a changing magnetic flux through a coil induces a voltage. As the rotor sweeps past a stator coil, the flux through it rises, falls, and reverses. Out comes a sine wave.",
      '@three|Now place three coils around the stator, a hundred and twenty degrees apart. You get three voltages, identical, but each shifted by a third of a period. This is three-phase power. The three conductors are called L one, L two and L three.',
      '@sync|The frequency is locked to the rotation. A two pole machine needs three thousand revolutions per minute to make fifty hertz. Hydro generators turn more slowly, so they have many poles. With twelve poles, five hundred R P M gives exactly fifty hertz.',
    ],
    draw(g, s) {
      const t = s.t, th = t * 1.5;
      P.heading(g, 'The synchronous generator', s.p(0.3, 0.8, E.o));
      const gx = 470, gy = 590, R = 330;
      const coilA = s.in('faraday', 4.0, 0.8), nph = 1 + s.in('three', 0.6, 0.8) + s.in('three', 1.3, 0.8);
      g.alpha(s.p(0.5, 0.9, E.o), () => generator(g, gx, gy, R, th, { coilA, phases: nph }));
      P.callout(g, gx + Math.cos(th) * 120, gy - Math.sin(th) * 120, 860, 300, 'Rotor', 'DC electromagnet on the turbine shaft', s.in('shaft', 3.4) * s.out('faraday', 1), { al: 'l', c: C.hot });
      P.callout(g, gx + 255, gy + 155, 860, 380, 'Stator', 'stationary iron core with copper coils', s.in('shaft', 6.8) * s.out('faraday', 1), { al: 'l', c: C.steel });
      // scope
      const sx = 930, sy = 330, sw = 880, sh = 360, sa = s.in('faraday', 4.2, 0.8, E.o);
      if (sa > 0) {
        P.panel(g, sx - 30, sy - 40, sw + 60, sh + 80, sa);
        g.alpha(sa, () => {
          g.line([[sx, sy + sh / 2], [sx + sw, sy + sh / 2]], { c: C.faint, w: 2 });
          for (let k = 0; k < 3; k++) {
            const vis = k === 0 ? 1 : clamp(nph - k); if (vis <= 0) continue;
            g.plot(x => Math.sin(th - k * TAU / 3 - x), sx, sy, sw, sh, { xr: [0, TAU * 2.2], yr: [-1.2, 1.2], c: PH[k], w: 4.5, glow: 0.9, a: vis, n: 200 });
            const yv = sy + sh / 2 - Math.sin(th - k * TAU / 3) * sh / 2.4;
            g.glowDot(sx, yv, 20, PH[k], vis); g.circ(sx, yv, 6, { fill: '#fff', w: 0, a: vis });
            g.tag('L' + (k + 1), sx + sw - 40 - (2 - k) * 76, sy - 8, { c: PH[k], s: 24, a: vis });
          }
          g.text('induced voltage', sx, sy - 10, { s: 22, c: C.dim });
        });
      }
      P.formula(g, 'e = – N · dΦ/dt', 1370, 800, s.in('faraday', 1.0, 0.8, E.o) * s.out('three', -0.4), { c: C.violet, s: 50 });
      g.text("Faraday's law of induction", 1370, 866, { s: 24, c: C.dim, al: 'c', p: s.in('faraday', 1.4) * s.out('three', -0.4) });
      g.text('120°  apart in space   →   ⅓ period apart in time', 1370, 810, { s: 34, wt: 600, al: 'c', p: s.in('three', 6.0, 0.8, E.o) * s.out('sync', -0.4) });
      // synchronous speed
      const fp = s.in('sync', 0.3, 0.8, E.o);
      if (fp > 0) {
        P.panel(g, 900, 760, 940, 220, fp, { fill: rgba('#0a1124', 0.9) });
        g.rich('f  =  ', 940, 815, { s: 44, wt: 600, p: fp }); g.rich('poles / 2  ×  rpm / 60', 1050, 815, { s: 44, wt: 600, c: C.l2, p: fp });
        g.text('2 poles   ×  3000 rpm', 940, 890, { s: 30, f: 'mono', c: C.ink, p: s.in('sync', 3.0) }); g.text('→ 50 Hz', 1500, 890, { s: 30, f: 'mono', wt: 700, c: C.ok, p: s.in('sync', 6.0) });
        g.text('12 poles  ×   500 rpm', 940, 940, { s: 30, f: 'mono', c: C.ink, p: s.in('sync', 12.6) }); g.text('→ 50 Hz', 1500, 940, { s: 30, f: 'mono', wt: 700, c: C.ok, p: s.in('sync', 15.0) });
        // 12-pole rotor icon
        const ip = s.in('sync', 11.0, 0.8, E.o), ix = 1740, iy = 900, ir = 62;
        g.alpha(ip, () => { g.circ(ix, iy, ir + 12, { c: C.steel, w: 2 }); for (let i = 0; i < 12; i++) { const a = th / 6 + i * TAU / 12; g.line([[ix + Math.cos(a) * 16, iy - Math.sin(a) * 16], [ix + Math.cos(a) * ir, iy - Math.sin(a) * ir]], { c: i % 2 ? C.cold : C.hot, w: 12, cap: 'butt' }); } g.circ(ix, iy, 16, { fill: C.steel, w: 0 }); });
      }
    },
  });

  // ------------------------------------------------------------ why three-phase
  api.scene('why-three', {
    lines: [
      '@why3|Why three phases? Here is an argument engineers love. In a single-phase system, power pulsates. It drops to zero a hundred times a second. For a large machine, that means pulsating torque, and vibration.',
      '@const|With three balanced phases, the three pulsating powers add up to a perfectly constant total. Smooth torque on the generator shaft, and smooth torque in every three-phase motor.',
      '@wires|And there is a bonus. The three currents sum to zero at every instant, so no return conductor is needed. Three wires carry what would otherwise take six.',
    ],
    draw(g, s) {
      const t = s.t, w = t * 1.6;
      P.heading(g, 'Why three phases?', s.p(0.3, 0.8, E.o));
      const x0 = 120, pw = 1000;
      // single phase
      const a1 = s.in('why3', 2.6, 0.8, E.o);
      P.panel(g, 90, 200, 1740, 250, a1);
      g.alpha(a1, () => {
        g.text('SINGLE-PHASE  ·  instantaneous power', x0, 236, { s: 20, c: C.l1, wt: 700, ls: 2 });
        g.line([[x0, 420], [x0 + pw, 420]], { c: C.faint, w: 2 });
        g.plot(x => Math.pow(Math.sin(x - w), 2), x0, 270, pw, 150, { xr: [0, TAU * 2], yr: [0, 1.05], c: C.l1, w: 4.5, glow: 0.8, area: true, n: 200 });
        // shaking wheel
        const p = Math.pow(Math.sin(-w), 2), ang = w * 1.2 - Math.sin(2 * w) * 0.6 * 1.2 / 2, wx = 1480 + Math.sin(t * 38) * 3 * (1 - 0) * s.in('why3', 9, 1), wy = 325;
        g.circ(wx, wy, 82, { fill: '#16213f', c: C.steel, w: 4 }); for (let i = 0; i < 4; i++) g.line([[wx, wy], [wx + Math.cos(ang + i * TAU / 4) * 78, wy + Math.sin(ang + i * TAU / 4) * 78]], { c: C.steel, w: 4 });
        g.arc(wx, wy, 104, -1.2, -1.2 + 2.2 * p, { c: C.l1, w: 7, glow: 1 });
        g.text('torque', 1640, 300, { s: 24, c: C.dim }); g.text('pulsating', 1640, 340, { s: 30, c: C.bad, wt: 700 });
      });
      // three phase
      const a2 = s.in('const', 0.2, 0.8, E.o);
      P.panel(g, 90, 475, 1740, 250, a2);
      g.alpha(a2, () => {
        g.text('THREE-PHASE  ·  instantaneous power', x0, 511, { s: 20, c: C.l2, wt: 700, ls: 2 });
        g.line([[x0, 695], [x0 + pw, 695]], { c: C.faint, w: 2 });
        for (let k = 0; k < 3; k++) g.plot(x => Math.pow(Math.sin(x - w - k * TAU / 3), 2), x0, 545, pw, 150, { xr: [0, TAU * 2], yr: [0, 1.6], c: PH[k], w: 3.5, glow: 0.5, area: true, areaA: 0.1, n: 200 });
        const sp = s.in('const', 4.2, 1.2);
        g.plot(x => 1.5, x0, 545, pw, 150, { xr: [0, TAU * 2], yr: [0, 1.6], c: '#fff', w: 5.5, glow: 1.3, trim: sp });
        g.tag('sum = constant', x0 + pw - 120, 532, { c: C.ink, s: 22, p: sp });
        const ang = w * 1.2, wx = 1480, wy = 600;
        g.circ(wx, wy, 82, { fill: '#16213f', c: C.steel, w: 4 }); for (let i = 0; i < 4; i++) g.line([[wx, wy], [wx + Math.cos(ang + i * TAU / 4) * 78, wy + Math.sin(ang + i * TAU / 4) * 78]], { c: C.steel, w: 4 });
        g.arc(wx, wy, 104, -1.2, -1.2 + 1.7, { c: C.ok, w: 7, glow: 1 });
        g.text('torque', 1640, 575, { s: 24, c: C.dim }); g.text('smooth', 1640, 615, { s: 30, c: C.ok, wt: 700 });
      });
      // three wires
      const a3 = s.in('wires', 0.2, 0.8, E.o);
      P.panel(g, 90, 750, 1740, 230, a3);
      g.alpha(a3, () => {
        g.text('THREE CURRENTS  ·  always sum to zero', x0, 786, { s: 20, c: C.l3, wt: 700, ls: 2 });
        const ys = [830, 875, 920];
        g.circ(210, 875, 62, { c: C.steel, w: 3 }); g.text('G', 210, 875, { s: 40, wt: 700, al: 'c', c: C.steel });
        g.rect(1020, 815, 110, 120, { r: 10, c: C.steel, w: 3 }); g.text('load', 1075, 875, { s: 26, al: 'c', c: C.steel });
        for (let k = 0; k < 3; k++) {
          const cur = Math.sin(w * 1.5 - k * TAU / 3), line = [[268, ys[k]], [1020, ys[k]]];
          g.line(line, { c: PH[k], w: 4, glow: 0.4 + 0.6 * Math.abs(cur) });
          g.flow(line, { c: '#fff', w: 7, gap: 46, off: -Math.cos(w * 1.5 - k * TAU / 3) * 60, a: 0.9 });
          g.arrow(640 - cur * 70, ys[k] - 14, 640 + cur * 70, ys[k] - 14, { c: PH[k], w: 3, head: 10, a: Math.abs(cur) > 0.12 ? 1 : 0 });
        }
        g.rich('i_1 + i_2 + i_3 = 0', 1480, 850, { s: 44, wt: 700, al: 'c', p: s.in('wires', 2.6, 0.8, E.o) });
        g.text('3 wires instead of 6', 1480, 920, { s: 30, c: C.ok, wt: 600, al: 'c', p: s.in('wires', 8.0, 0.8, E.o) });
      });
    },
  });

  // ------------------------------------------------------------ line vs phase voltage
  api.scene('line-phase', {
    lines: [
      '@two|Three-phase also gives you two voltages to choose from. Between any line and the common star point, the neutral, you measure the phase voltage. Between two lines, you measure more: the phase voltage times the square root of three.',
      '@ex|That is why two hundred and thirty, and four hundred volts, always appear together. Four hundred is simply two hundred and thirty times root three. Keep this picture in mind. It is the key to understanding Norwegian homes.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'Two voltages from one system', s.p(0.3, 0.8, E.o));
      const cx = 480, cy = 640, R = 270, pa = s.p(0.6, 0.9, E.o);
      const tip = k => [cx + Math.cos(Math.PI / 2 - k * TAU / 3) * R, cy - Math.sin(Math.PI / 2 - k * TAU / 3) * R];
      g.alpha(pa, () => {
        g.circ(cx, cy, R, { c: rgba(C.line, 0.9), w: 2, dash: [6, 8] });
        for (let k = 0; k < 3; k++) { const [x, y] = tip(k), p = s.p(0.8 + k * 0.3, 0.8, E.o); g.arrow(cx, cy, lerp(cx, x, p), lerp(cy, y, p), { c: PH[k], w: 6, head: 20, glow: 0.8 }); g.text('L' + (k + 1), cx + (x - cx) * 1.14, cy + (y - cy) * 1.14, { s: 34, wt: 800, c: PH[k], al: 'c', a: p }); }
        g.circ(cx, cy, 10, { fill: C.n, c: '#fff', w: 2 }); g.text('N', cx, cy + 44, { s: 30, wt: 800, c: C.n, al: 'c' });
      });
      // phase voltage label
      const pv = s.in('two', 4.6, 0.8, E.o);
      const [x1, y1] = tip(0), [x2, y2] = tip(1), [x3, y3] = tip(2);
      g.tag('230 V', cx - 90, cy - R * 0.55, { c: C.l1, s: 28, f: 'mono', p: pv });
      g.text('phase voltage', cx - 90, cy - R * 0.55 + 44, { s: 20, c: C.dim, al: 'c', p: pv });
      // line voltage
      const lv = s.in('two', 10.2, 1.0);
      g.line([[x1, y1], [x2, y2]], { c: '#fff', w: 5, glow: 1, trim: lv, dash: [14, 8] });
      g.tag('400 V', (x1 + x2) / 2 + 110, (y1 + y2) / 2 - 40, { c: C.ink, s: 30, f: 'mono', p: s.in('two', 10.8) });
      g.text('line voltage', (x1 + x2) / 2 + 110, (y1 + y2) / 2 + 6, { s: 20, c: C.dim, al: 'c', p: s.in('two', 10.8) });
      const l2 = s.in('ex', 6.0, 1.0);
      g.line([[x2, y2], [x3, y3]], { c: rgba('#ffffff', 0.6), w: 3, trim: l2, dash: [14, 8] }); g.line([[x3, y3], [x1, y1]], { c: rgba('#ffffff', 0.6), w: 3, trim: l2, dash: [14, 8] });
      // waveforms on the right
      const sx = 980, sy = 250, sw = 840, sh = 400, wa = s.in('two', 1.0, 0.8, E.o);
      P.panel(g, sx - 30, sy - 40, sw + 60, sh + 80, wa);
      g.alpha(wa, () => {
        g.line([[sx, sy + sh / 2], [sx + sw, sy + sh / 2]], { c: C.faint, w: 2 });
        const ph = t * 1.3, yr = [-2, 2];
        g.plot(x => Math.sin(x - ph), sx, sy, sw, sh, { xr: [0, TAU * 2], yr, c: C.l1, w: 4, glow: 0.7, n: 200 });
        g.plot(x => Math.sin(x - ph - TAU / 3), sx, sy, sw, sh, { xr: [0, TAU * 2], yr, c: C.l2, w: 4, glow: 0.7, n: 200 });
        g.plot(x => Math.sin(x - ph - 2 * TAU / 3), sx, sy, sw, sh, { xr: [0, TAU * 2], yr, c: C.l3, w: 3, a: 0.45, n: 200 });
        if (lv > 0) g.plot(x => Math.sin(x - ph) - Math.sin(x - ph - TAU / 3), sx, sy, sw, sh, { xr: [0, TAU * 2], yr, c: '#fff', w: 5, glow: 1.1, a: lv, n: 200 });
        g.tag('L1 – N', sx + 70, sy - 6, { c: C.l1, s: 20 }); g.tag('L2 – N', sx + 190, sy - 6, { c: C.l2, s: 20 }); g.tag('L1 – L2', sx + 318, sy - 6, { c: C.ink, s: 20, p: lv });
      });
      P.formula(g, 'U_{line} = √3 · U_{phase}', 1400, 790, s.in('two', 12.6, 0.8, E.o), { c: C.ink, s: 50 });
      g.text('230 V  ×  1.732  =  400 V', 1400, 890, { s: 44, f: 'mono', wt: 700, c: C.ok, al: 'c', p: s.in('ex', 3.6, 0.8, E.o) });
    },
  });
};
module.exports.generator = generator;
