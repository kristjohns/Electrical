const { W, H, C, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample, integ } = require('../lib/core');
const P = require('../lib/parts');

function loopPts(cx, cy, w, h) { return [[cx - w / 2, cy], [cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2], [cx - w / 2, cy]]; }
function resistor(g, x, y0, y1, o = {}) { // vertical zigzag
  const n = 7, a = 16, pts = [[x, y0]]; const seg = (y1 - y0) / (n * 2);
  for (let i = 0; i < n * 2; i++) pts.push([x + (i % 2 ? -a : a) * (i === 0 ? 0.5 : 1) * (i === n * 2 - 1 ? 0 : 1), y0 + seg * (i + 0.5)]);
  pts.push([x, y1]);
  g.line(pts, { join: 'miter', ...o });
}

module.exports = api => {
  api.chapter('The Basics', 'Electricity, translated for mechanical engineers');

  // ------------------------------------------------------------------ analogy
  api.scene('basics-analogy', {
    lines: [
      "@lang|Let's start by translating electricity into a language every mechanical engineer already speaks: hydraulics.",
      '@volt|Voltage is pressure difference. It is what pushes.',
      '@amp|Current is flow rate. It is how much charge passes each second.',
      "@res|And resistance is a restriction in the pipe. For a given pressure, a tighter restriction means less flow. That is Ohm's law: voltage equals resistance times current.",
      '@pow|Power follows the same pattern. Hydraulic power is pressure times flow. Electrical power is voltage times current.',
      '@heater|So a two thousand watt heater, on two hundred and thirty volts, draws just under nine amperes.',
      '@kwh|Leave it on for an hour, and it has used two kilowatt hours of energy. That is the unit on your electricity bill.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'Think of it as hydraulics', s.p(0.3, 0.8, E.o));
      const pa = s.p(0.5, 0.9, E.o);
      const cards = [[90, 210, 830, 470], [1000, 210, 830, 470]];
      cards.forEach((c, i) => { P.panel(g, c[0], c[1] + (1 - pa) * 20, c[2], c[3], pa); g.text(i ? 'ELECTRIC CIRCUIT' : 'HYDRAULIC CIRCUIT', c[0] + 30, c[1] + 40, { s: 20, c: i ? C.l1 : C.cold, wt: 700, ls: 3, a: pa }); });
      const tight = pr(t, s.at('res', 3.4), 1.6);           // restriction tightens
      const dist = integ(t, s.at('res', 3.4), 1.6, 150, 55);
      const hy = loopPts(505, 470, 520, 250), el = loopPts(1415, 470, 520, 250);
      g.alpha(pa, () => {
        // --- hydraulic ---
        g.line(hy, { c: '#27508f', w: 34, join: 'round' }); g.line(hy, { c: '#0f2548', w: 26, join: 'round' });
        g.flow(hy, { c: '#6fc4ff', w: 11, gap: 44, off: -dist, glow: 0.4 });
        // restriction (right side)
        const rx = 765, ry = 470, gapW = lerp(16, 5, tight);
        g.rect(rx - 17, ry - 46, 34, 92, { fill: '#0f2548', w: 0 });
        for (const sgn of [-1, 1]) g.path(c => { c.moveTo(rx + sgn * 17, ry - 46); c.lineTo(rx + sgn * gapW / 2, ry - 10); c.lineTo(rx + sgn * gapW / 2, ry + 10); c.lineTo(rx + sgn * 17, ry + 46); c.closePath(); }, { fill: '#3f74c4', c: '#9fd0ff', w: 2 });
        // pump (left side)
        g.circ(245, 470, 50, { fill: '#122b55', c: '#6fa8ff', w: 4 });
        for (let i = 0; i < 4; i++) { const an = -dist / 40 + i * TAU / 4; g.path(c => { c.moveTo(245, 470); c.quadraticCurveTo(245 + Math.cos(an + 0.9) * 26, 470 + Math.sin(an + 0.9) * 26, 245 + Math.cos(an) * 40, 470 + Math.sin(an) * 40); }, { c: '#9fd0ff', w: 4 }); }
        // --- electric ---
        g.line(el, { c: mix(C.line, C.l1, 0.5), w: 6, join: 'round' });
        g.flow(el, { c: C.energy, w: 9, gap: 44, off: -dist, glow: 0.8 });
        g.rect(1655, 395, 40, 150, { fill: C.panel, w: 0 });
        resistor(g, 1675, 400, 540, { c: mix(C.l1, C.hot, 0.3 + 0.5 * (1 - tight)), w: 5, glow: 0.8 });
        g.circ(1155, 470, 46, { fill: '#2a2110', c: C.l1, w: 4, glow: 0.5 });
        g.text('+', 1155, 448, { s: 34, al: 'c', c: C.l1, wt: 700 }); g.text('–', 1155, 492, { s: 34, al: 'c', c: C.l1, wt: 700 });
      });
      // --- tags ---
      const hl = k => 0.35 + 0.65 * clamp(1 - Math.abs(s.since(k) - 1.6) / 4);
      P.callout(g, 195, 470, 150, 640, 'Pressure  Δp', 'what pushes  ·  pascal', s.in('volt', 0.1), { c: C.cold, al: 'l' });
      P.callout(g, 1109, 470, 1060, 640, 'Voltage  U', 'what pushes  ·  volt (V)', s.in('volt', 0.5), { c: C.l1, al: 'l' });
      P.callout(g, 505, 345, 420, 285, 'Flow rate  Q', 'volume per second', s.in('amp', 0.1), { c: C.cold, al: 'l' });
      P.callout(g, 1415, 345, 1330, 285, 'Current  I', 'charge per second  ·  ampere (A)', s.in('amp', 0.5), { c: C.l1, al: 'l' });
      P.callout(g, 782, 520, 700, 640, 'Restriction', 'opposes flow', s.in('res', 0.1), { c: C.cold, al: 'r' });
      P.callout(g, 1692, 540, 1800, 646, 'Resistance  R', 'opposes current  ·  ohm (Ω)', s.in('res', 0.5), { c: C.l1, al: 'r' });
      // --- formulas ---
      P.formula(g, 'U = R · I', 1230, 772, s.in('res', 8.2, 0.7, E.o), { c: C.l1, s: 56 });
      g.text("Ohm's law", 1230, 838, { s: 22, c: C.dim, al: 'c', p: s.in('res', 8.6) });
      P.formula(g, 'P = Δp · Q', 505, 772, s.in('pow', 1.6, 0.7, E.o), { c: C.cold, s: 56 });
      g.text('hydraulic power', 505, 838, { s: 22, c: C.dim, al: 'c', p: s.in('pow', 2.0) });
      P.formula(g, 'P = U · I', 1600, 772, s.in('pow', 4.6, 0.7, E.o), { c: C.l1, s: 56 });
      g.text('electrical power  ·  watt (W)', 1600, 838, { s: 22, c: C.dim, al: 'c', p: s.in('pow', 5.0) });
      // --- worked example ---
      const ex = s.in('heater', 0.3, 0.8, E.o);
      if (ex > 0) {
        P.panel(g, 420, 884, 1080, 100, ex, { fill: rgba('#1a1408', 0.9), c: rgba(C.l1, 0.5) });
        g.rich('2000 W', 560, 934, { s: 44, wt: 700, al: 'c', c: C.ink, p: s.in('heater', 0.5) });
        g.text('÷', 690, 932, { s: 40, al: 'c', c: C.dim, p: s.in('heater', 1.9) });
        g.rich('230 V', 800, 934, { s: 44, wt: 700, al: 'c', c: C.ink, p: s.in('heater', 1.9) });
        g.text('≈', 912, 932, { s: 40, al: 'c', c: C.dim, p: s.in('heater', 3.9) });
        g.rich('8.7 A', 1010, 934, { s: 46, wt: 800, al: 'c', c: C.l1, p: s.in('heater', 3.9) });
        g.line([[1120, 904], [1120, 964]], { c: C.line, w: 2, a: s.in('kwh', 0.3) });
        g.rich('2 kW × 1 h = ', 1150, 934, { s: 34, wt: 500, c: C.dim, p: s.in('kwh', 0.6) });
        g.rich('2 kWh', 1380, 934, { s: 44, wt: 800, c: C.ok, p: s.in('kwh', 2.0) });
      }
    },
  });

  // ------------------------------------------------------------------ AC
  api.scene('basics-ac', {
    lines: [
      '@ac|The grid does not push in one direction. It uses alternating current. The voltage swings smoothly from positive to negative and back, fifty times every second.',
      '@rms|When we say two hundred and thirty volts, we mean the effective value, the RMS. The actual peak is about three hundred and twenty five volts.',
      '@why_rms|RMS is defined so that the heating power comes out the same as direct current at that voltage.',
      '@jiggle|It also means the electrons in your wires hardly travel at all. They vibrate back and forth, less than a thousandth of a millimetre. What travels is energy, carried by the electromagnetic field around the wires, at a good fraction of the speed of light.',
      '@whyac|Why alternate at all? Because alternating current can be transformed. That single trick is what makes a national grid possible. We will get there.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'Alternating current', s.p(0.3, 0.8, E.o));
      const px = 300, py = 455, R = 195, x0 = 600, x1 = 1800, pw = x1 - x0;
      const pa = s.p(0.6, 0.8, E.o);
      const period = 2.4, T0 = 1.2;                 // seconds of video per cycle
      const cyc = Math.max(0, (t - T0) / period), nShown = 2.5, ph = cyc * TAU;
      const yv = v => py - v * R;
      g.alpha(pa, () => {
        // axes
        g.line([[x0, py], [x1 + 30, py]], { c: C.faint, w: 2 }); g.line([[x0, py - R - 50], [x0, py + R + 50]], { c: C.faint, w: 2 });
        for (let ms = 10; ms <= 50; ms += 10) { const x = x0 + pw * ms / 50; g.line([[x, py - 7], [x, py + 7]], { c: C.faint, w: 2 }); g.text(ms + ' ms', x, py + R + 40, { s: 20, c: C.dim, al: 'c', f: 'mono' }); }
        // phasor
        g.circ(px, py, R, { c: C.line, w: 2 }); g.line([[px - R - 20, py], [px + R + 20, py]], { c: rgba(C.faint, 0.6), w: 1.5 }); g.line([[px, py - R - 20], [px, py + R + 20]], { c: rgba(C.faint, 0.6), w: 1.5 });
        const tx = px + Math.cos(ph) * R, ty = py - Math.sin(ph) * R;
        g.arrow(px, py, tx, ty, { c: C.l1, w: 5, head: 18, glow: 0.8 });
        // wave
        const drawn = clamp(cyc / nShown);
        g.plot(x => Math.sin(x * TAU * nShown), x0, py - R, pw, 2 * R, { xr: [0, 1], yr: [-1, 1], c: C.l1, w: 5, trim: drawn, glow: 0.9, n: 240 });
        const u = (cyc % nShown) / nShown, cxm = x0 + pw * (cyc < nShown ? drawn : u), cym = yv(Math.sin(ph));
        g.line([[tx, ty], [cxm, cym]], { c: rgba(C.l1, 0.35), w: 1.5, dash: [6, 6] });
        g.glowDot(cxm, cym, 26, C.l1, 1); g.circ(cxm, cym, 7, { fill: '#fff', w: 0 });
      });
      // period bracket
      const pp = s.in('ac', 6.2, 0.8, E.o);
      if (pp > 0) { const xa = x0, xb = x0 + pw / nShown, yb = py + R + 84; g.arrow(xa, yb, xa + (xb - xa) * pp, yb, { c: C.l2, w: 2.5, both: true }); g.text('1 period = 20 ms  →  50 Hz', (xa + xb) / 2, yb + 34, { s: 26, c: C.l2, al: 'c', wt: 600, p: pp }); }
      // rms / peak lines
      const lp = s.in('rms', 5.2, 0.8, E.o), lr = s.in('rms', 0.6, 0.8, E.o);
      g.line([[x0, yv(1)], [x0 + pw * lp, yv(1)]], { c: C.l3, w: 2, dash: [10, 8], a: lp }); g.tag('peak  325 V', x0 + pw * 0.7, yv(1) - 28, { c: C.l3, p: lp, s: 22, f: 'mono' });
      g.line([[x0, yv(0.7071)], [x0 + pw * lr, yv(0.7071)]], { c: C.ok, w: 2.5, dash: [10, 8], a: lr }); g.tag('RMS  230 V', x0 + pw * 0.7, yv(0.7071) + 30, { c: C.ok, p: lr, s: 22, f: 'mono' });
      P.formula(g, 'U_{rms} = Û / √2', 300, 800, s.in('why_rms', 0.4, 0.8, E.o), { c: C.ok, s: 40 });
      g.text('same heating as 230 V DC', 300, 862, { s: 22, c: C.dim, al: 'c', p: s.in('why_rms', 1.2) });
      // electrons in a wire
      const jw = s.in('jiggle', 0.2, 0.9, E.o), wy = 880;
      if (jw > 0) g.alpha(jw * s.out('whyac', 0.2), () => {
        g.rect(x0, wy - 26, pw, 52, { r: 26, fill: rgba(C.copper, 0.16), c: rgba(C.copper, 0.8), w: 2.5 });
        const sw = Math.sin(ph) * 16;
        for (let i = 0; i < 40; i++) for (let r = 0; r < 2; r++) g.circ(x0 + 24 + i * (pw - 48) / 39 + sw + (r ? 14 : 0), wy - 9 + r * 18, 5, { fill: C.l2, w: 0, a: 0.9 });
        g.text('electrons: back and forth,  < 0.001 mm', x0 + 10, wy + 56, { s: 24, c: C.l2, wt: 600, p: s.in('jiggle', 3.0) });
        const ep = s.in('jiggle', 8.4, 0.8);
        g.flow([[x0, wy - 52], [x1, wy - 52]], { c: C.energy, w: 5, len: 46, gap: 90, speed: 620, a: ep, glow: 1 });
        g.text('energy: one way, near light speed', x1 - 10, wy + 56, { s: 24, c: C.energy, wt: 600, al: 'r', p: ep });
      });
      const wa = s.in('whyac', 0.3, 0.8, E.o);
      g.text('AC can be transformed', W / 2 + 240, 880, { s: 56, f: 'disp', wt: 700, al: 'c', c: C.ink, p: s.in('whyac', 2.6, 0.8, E.o) });
      g.text('step the voltage up or down with nothing but iron and copper', W / 2 + 240, 944, { s: 28, c: C.dim, al: 'c', p: s.in('whyac', 4.2, 0.8, E.o) });
    },
  });

  // ------------------------------------------------------------------ L, C, power factor
  api.scene('basics-lc', {
    lines: [
      '@L|Two more translations. An inductor, a coil, behaves like mass. It resists changes in current, the way inertia resists changes in velocity.',
      '@C|A capacitor behaves like a spring. It stores energy, and pushes back.',
      '@phi|In an AC circuit, these elements push the current out of step with the voltage. Only the in-step part delivers net power. The ratio is called the power factor, cosine phi.',
    ],
    draw(g, s) {
      const t = s.t, w = t * 2.2;
      P.heading(g, 'Inertia and springs', s.p(0.3, 0.8, E.o));
      // --- inductor = mass
      const a1 = s.in('L', 0.2, 0.8, E.o);
      P.panel(g, 90, 210, 850, 330, a1);
      g.alpha(a1, () => {
        g.text('INDUCTOR  ⇄  MASS', 120, 250, { s: 20, c: C.l2, wt: 700, ls: 3 });
        // coil
        const cx = 190, cy = 370;
        g.line([[cx - 40, cy], [cx, cy]], { c: C.l2, w: 4 });
        g.line(sample(u => [cx + u * 190 + Math.sin(u * TAU * 6) * 16, cy - 30 + Math.cos(u * TAU * 6) * 30 + 30 - 30 * 1], 0, 1, 180).map(([x, y], i) => [x, cy - Math.abs(Math.sin(i / 180 * Math.PI * 6)) * 44]), { c: C.l2, w: 4, glow: 0.6 });
        g.line([[cx + 190, cy], [cx + 230, cy]], { c: C.l2, w: 4 });
        g.flow([[cx - 40, cy + 26], [cx + 230, cy + 26]], { c: C.energy, w: 7, gap: 40, off: Math.cos(w) * 40 });
        // cart
        const mx = 640 - Math.cos(w) * 60;
        g.line([[500, 430], [900, 430]], { c: C.faint, w: 2 });
        g.rect(mx - 60, 350, 120, 62, { r: 8, fill: '#22305a', c: C.steel, w: 3 }); g.text('m', mx, 381, { s: 30, al: 'c', it: true, wt: 600 });
        g.circ(mx - 36, 420, 10, { c: C.steel, w: 3 }); g.circ(mx + 36, 420, 10, { c: C.steel, w: 3 });
        const f = Math.cos(w); g.arrow(mx + (f > 0 ? 64 : -64), 381, mx + (f > 0 ? 64 : -64) + f * 70, 381, { c: C.l1, w: 4, a: Math.abs(f) > 0.1 ? 1 : 0 });
        g.rich('u = L · di/dt', 300, 480, { s: 36, al: 'c', c: C.l2, wt: 600, p: s.in('L', 3.2) });
        g.rich('F = m · dv/dt', 700, 480, { s: 36, al: 'c', c: C.steel, wt: 600, p: s.in('L', 5.4) });
      });
      // --- capacitor = spring
      const a2 = s.in('C', 0.2, 0.8, E.o);
      P.panel(g, 980, 210, 850, 330, a2);
      g.alpha(a2, () => {
        g.text('CAPACITOR  ⇄  SPRING', 1010, 250, { s: 20, c: C.l3, wt: 700, ls: 3 });
        const q = Math.sin(w), cx = 1160, cy = 360;
        g.line([[cx - 90, cy], [cx - 14, cy]], { c: C.l3, w: 4 }); g.line([[cx + 14, cy], [cx + 90, cy]], { c: C.l3, w: 4 });
        g.line([[cx - 14, cy - 54], [cx - 14, cy + 54]], { c: C.l3, w: 6, glow: 0.6 }); g.line([[cx + 14, cy - 54], [cx + 14, cy + 54]], { c: C.l3, w: 6, glow: 0.6 });
        for (let i = 0; i < 5; i++) { const a = clamp(Math.abs(q) * 5 - i); g.text(q > 0 ? '+' : '–', cx - 36, cy - 44 + i * 22, { s: 22, al: 'c', c: C.l1, a }); g.text(q > 0 ? '–' : '+', cx + 36, cy - 44 + i * 22, { s: 22, al: 'c', c: C.l2, a }); }
        // spring + block
        const bx = 1620 + q * 55, x0 = 1400;
        g.line([[x0, 310], [x0, 420]], { c: C.steel, w: 5 });
        g.line(sample(u => [x0 + u * (bx - 40 - x0), 365 + (u > 0.04 && u < 0.96 ? Math.sin(u * TAU * 7) * 22 : 0)], 0, 1, 120), { c: C.steel, w: 3.5 });
        g.rect(bx - 40, 335, 80, 60, { r: 8, fill: '#22305a', c: C.steel, w: 3 });
        g.line([[x0, 430], [1800, 430]], { c: C.faint, w: 2 });
        g.rich('q = C · u', 1160, 480, { s: 36, al: 'c', c: C.l3, wt: 600, p: s.in('C', 1.6) });
        g.rich('x = F / k', 1600, 480, { s: 36, al: 'c', c: C.steel, wt: 600, p: s.in('C', 2.6) });
      });
      // --- power factor
      const a3 = s.in('phi', 0.2, 0.8, E.o);
      P.panel(g, 90, 570, 1740, 410, a3);
      if (a3 > 0) g.alpha(a3, () => {
        const x0 = 150, y0 = 610, pw = 1060, ph = 330, phi = 0.9 * s.in('phi', 2.2, 1.6);
        g.line([[x0, y0 + ph / 2], [x0 + pw, y0 + ph / 2]], { c: C.faint, w: 2 });
        const U = x => Math.sin(x - t * 1.2), I = x => Math.sin(x - t * 1.2 - phi);
        // instantaneous power, shaded
        const c = g.c, n = 220;
        for (const sign of [1, -1]) {
          c.save(); c.beginPath(); c.moveTo(x0, y0 + ph / 2);
          for (let i = 0; i <= n; i++) { const x = i / n * TAU * 2.5, p = U(x) * I(x); const v = sign > 0 ? Math.max(0, p) : Math.min(0, p); c.lineTo(x0 + i / n * pw, y0 + ph / 2 - v * ph * 0.44); }
          c.lineTo(x0 + pw, y0 + ph / 2); c.closePath(); c.fillStyle = rgba(sign > 0 ? C.ok : C.bad, 0.3); c.fill(); c.restore();
        }
        g.plot(U, x0, y0, pw, ph, { xr: [0, TAU * 2.5], yr: [-1.15, 1.15], c: C.l1, w: 4, glow: 0.7 });
        g.plot(I, x0, y0, pw, ph, { xr: [0, TAU * 2.5], yr: [-1.15, 1.15], c: C.l2, w: 4, glow: 0.7 });
        g.tag('voltage u', 1300, 640, { c: C.l1, al: 'l', s: 22 }); g.tag('current i', 1300, 690, { c: C.l2, al: 'l', s: 22 });
        g.tag('power delivered', 1300, 740, { c: C.ok, al: 'l', s: 22, p: s.in('phi', 4.6) }); g.tag('power sent back', 1300, 790, { c: C.bad, al: 'l', s: 22, p: s.in('phi', 4.6) });
        P.formula(g, 'P = U · I · cos φ', 1530, 890, s.in('phi', 7.6, 0.8, E.o), { c: C.ok, s: 46 });
        g.text('φ = ' + Math.round(phi * 180 / Math.PI) + '°', 1620, 665, { s: 34, f: 'mono', wt: 700, c: C.ink });
        g.text('cos φ = ' + Math.cos(phi).toFixed(2), 1620, 715, { s: 26, f: 'mono', c: C.dim });
      });
    },
  });
};
