const { W, H, C, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample, rnd } = require('../lib/core');
const P = require('../lib/parts');
const S7 = require('./07_systems');
const PH = [C.l1, C.l2, C.l3];

// summation current transformer ring; draw in two passes (back, then front) around the wires
function ringPart(g, x, y, rx, ry, front, o = {}) {
  const a0 = front ? Math.PI / 2 : -Math.PI / 2, a1 = front ? Math.PI * 1.5 : Math.PI / 2;
  g.ell(x, y, rx, ry, { a0, a1, c: '#59648a', w: 46, cap: 'butt', a: o.a }); g.ell(x, y, rx, ry, { a0, a1, c: mix('#3a4466', '#c7b6ff', o.net || 0), w: 38, cap: 'butt', a: o.a, glow: (o.net || 0) * 1.2 });
}
function ringFlux(g, x, y, rx, ry, t, bal, net) {
  const pts = sample(u => [x + Math.cos(u * TAU) * rx, y + Math.sin(u * TAU) * ry], 0, 1, 80);
  if (bal > 0) { g.line(pts, { c: rgba(PH[0], 0.75 * bal), w: 4, dash: [14, 30], off: -t * 70 }); g.line(pts, { c: rgba(PH[1], 0.75 * bal), w: 4, dash: [14, 30], off: t * 70 + 22 }); }
  if (net > 0) g.line(pts, { c: '#ffffff', w: 6, dash: [18, 16], off: -t * 160, a: net, glow: 1.6 });
}

module.exports = api => {
  api.chapter('Earth Fault Protection', 'The jordfeilbryter: the device that saves lives');

  // ---------------------------------------------------------------- principle
  api.scene('rcd-principle', {
    lines: [
      '@third|The third fault type is the one that kills people. An earth fault. Current leaking out of the circuit, through damaged insulation, a wet appliance, or a human body.',
      '@amount|The amounts involved are tiny. Far too small for a fuse to notice. A sixteen ampere breaker will happily pass a current three hundred times smaller than its rating, straight through your chest.',
      '@toroid|The residual current device solves this with a beautifully simple idea. Both conductors of the circuit pass through an iron ring. Whatever goes out through one, must come back through the other. Their magnetic fields cancel exactly, and the ring stays magnetically silent.',
      '@leak|But if some of the current escapes to earth, the outgoing and returning currents no longer match. The difference magnetises the ring. A sense winding picks it up, and trips a sensitive relay that releases the contacts.',
      '@thirty|In homes, the threshold is thirty milliamperes, and the device must disconnect within a few hundredths of a second. Fast enough that most people survive a direct contact.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'The residual current device  ·  jordfeilbryter', s.p(0.3, 0.8, E.o));
      const y1 = 440, y2 = 560, GND = 900, xs = 110, tx = 700, ax = 1330;
      const tF = s.at('leak', 2.6), tTrip = s.at('leak', 13.6);
      const early = s.in('third', 3.2, 0.8) * s.out('toroid', -0.6);          // illustrative leak before the RCD exists
      const fault = t >= tF && t < tTrip, tripped = t >= tTrip, op = pr(t, tTrip, 0.18, E.o);
      const leakmA = fault ? 44 * (1 - Math.exp(-(t - tF) / 0.7)) : 0;
      const ms = fault ? lerp(0, 24, (t - tF) / (tTrip - tF)) : tripped ? 24 : 0;
      const rcd = s.in('toroid', 0.4, 1.0, E.o), net = clamp(leakmA / 40), live = !tripped;
      const ca = s.p(0.5, 0.9, E.o);
      // earth
      S7.ground(g, GND, ca);
      g.text('EARTH', 80, GND + 40, { s: 18, c: rgba(C.pe, 0.7), wt: 700, ls: 3, a: ca });
      // ring back half
      if (rcd > 0) ringPart(g, tx, 500, 62, 190, false, { a: rcd, net });
      // lines
      g.alpha(ca, () => {
        const swx0 = 330, swx1 = 440;
        [[y1, 0], [y2, 1]].forEach(([y, k]) => {
          const col = PH[k];
          g.wire([[xs, y], [rcd > 0 ? swx0 : ax, y]], { c: col, w: 6, flow: true, t, off: -Math.cos(t * 2.4 - k * Math.PI) * 44, gap: 56 });
          if (rcd > 0) {
            g.wire([[swx1, y], [ax, y]], { c: col, w: 6, on: live ? 1 : 0.08, flow: live, t, off: -Math.cos(t * 2.4 - k * Math.PI) * 44, gap: 56 });
            g.alpha(rcd, () => { g.circ(swx0, y, 9, { fill: col, w: 0 }); g.circ(swx1, y, 9, { fill: mix(col, C.line, op), w: 0 }); g.line([[swx0, y], [swx0 + Math.cos(-op * 0.55) * 112, y + Math.sin(-op * 0.55) * 112]], { c: '#fff', w: 7 }); });
          }
          g.text('L' + (k + 1), xs + 10, y - 28, { s: 26, wt: 800, c: col });
        });
        // appliance
        g.rect(ax, 380, 210, 250, { r: 16, fill: '#1a2747', c: mix('#c9d6ff', C.bad, clamp(early + net)), w: 4, glow: clamp(early + net) }); g.circ(ax + 105, 520, 62, { c: rgba('#c9d6ff', 0.7), w: 3 }); g.rect(ax + 26, 400, 70, 22, { r: 5, c: rgba('#c9d6ff', 0.6), w: 2.5 });
        g.arc(ax + 105, 520, 40, t * 3 * (live ? 1 : 0), t * 3 * (live ? 1 : 0) + 4, { c: rgba('#c9d6ff', 0.5), w: 3 });
      });
      // person touching the appliance
      const hand = [ax + 212, 470], lk = clamp(early + (fault ? 1 : 0));
      P.person(g, 1690, GND, 1.0, { hand, a: ca, c: mix('#c9d6ff', C.bad, lk), shake: lk, glow: lk * 0.8 });
      // leak path
      const leakPath = [[ax + 150, y1], [ax + 190, 455], hand, [1690, 664], [1690, 770], [1705, GND], [1705, GND + 22], [150, GND + 22], [150, y2 + 60]];
      if (lk > 0) g.flow(leakPath, { c: C.bad, w: 7, gap: 34, speed: 200, t, a: lk, glow: 1.2 });
      g.tag('leak to earth', 1560, 790, { s: 22, c: C.bad, p: clamp(early + (fault ? 1 : 0)) });
      // amount comparison
      const am = s.in('amount', 0.6, 0.8, E.o) * s.out('toroid', -0.4);
      if (am > 0) {
        P.panel(g, 150, 620, 1020, 250, am, { fill: rgba('#0a1124', 0.95) });
        g.text('breaker rating', 180, 690, { s: 24, c: C.dim, a: am }); g.rect(400, 668, 700 * am, 44, { r: 8, fill: rgba(C.l1, 0.85), w: 0, c: C.l1, glow: 0.4 }); g.text('16 000 mA', 1090, 690, { s: 24, f: 'mono', wt: 700, c: '#1a1408', al: 'r', a: am });
        g.text('can stop a heart', 180, 780, { s: 24, c: C.dim, a: am }); g.rect(400, 758, Math.max(3, 700 * 50 / 16000), 44, { r: 2, fill: C.bad, w: 0, c: C.bad, glow: 1 }); g.text('50 mA', 420, 780, { s: 24, f: 'mono', wt: 700, c: C.bad, a: am });
        g.text('320 × too small for the breaker to notice', 660, 838, { s: 22, c: C.ink, wt: 600, al: 'c', p: s.in('amount', 6.0) * am });
      }
      // RCD internals
      if (rcd > 0) {
        g.alpha(rcd, () => {
          g.rect(270, 300, 620, 560, { r: 24, c: rgba(C.pe, 0.6), w: 2.5, dash: [12, 9] });
          g.text('RCD', 290, 276, { s: 22, wt: 800, c: C.pe, ls: 3 });
          ringFlux(g, tx, 500, 62, 190, t, (1 - net) * s.in('toroid', 12.0, 0.8) * (live ? 1 : 0), net * (live ? 1 : 0));
        });
        ringPart(g, tx, 500, 62, 190, true, { a: rcd, net });
        g.alpha(rcd, () => {
          // sense winding at the bottom of the ring + relay + link to contacts
          const sw = s.in('leak', 8.0, 0.6);
          for (let i = 0; i < 6; i++) { const a = Math.PI / 2 + (i - 2.5) * 0.11; g.line([[tx + Math.cos(a) * 36, 500 + Math.sin(a) * 164], [tx + Math.cos(a) * 88, 500 + Math.sin(a) * 216]], { c: mix(C.copper, '#fff', net), w: 7, glow: net }); }
          g.line([[tx - 20, 708], [tx - 20, 760]], { c: C.copper, w: 4 }); g.line([[tx + 20, 708], [tx + 20, 760]], { c: C.copper, w: 4 });
          g.rect(tx - 90, 760, 180, 70, { r: 10, fill: mix('#1c2a52', C.warn, net * 0.6), c: mix('#c9d6ff', C.warn, net), w: 3, glow: net });
          g.text('trip relay', tx, 795, { s: 22, wt: 700, al: 'c' });
          g.line([[tx - 90, 795], [385, 795], [385, y2 + 14 - op * 30]], { c: mix(C.steel, C.warn, net), w: 3, dash: [9, 8], round: 10 });
          g.line([[385, y2 - 14 - op * 30], [385, y1 + 10 - op * 30]], { c: C.steel, w: 3, dash: [9, 8] });
          // meters
          const out = 8.7, back = out - leakmA / 1000;
          const mv = (y, lab, v, col) => { g.rect(480, y - 23, 150, 46, { r: 8, fill: '#0a1124', c: rgba(col, 0.7), w: 2 }); g.text(live ? v.toFixed(3) + ' A' : '0.000 A', 555, y, { s: 22, f: 'mono', wt: 700, al: 'c', c: col }); g.text(lab, 480, y - 40, { s: 17, c: C.dim }); };
          const mp = s.in('toroid', 8.0, 0.6);
          g.alpha(mp, () => { mv(y1 - 54, 'out', out, PH[0]); mv(y2 + 78, 'back', back, PH[1]); });
        });
        // difference display
        const dp = s.in('toroid', 12.4, 0.7, E.o);
        P.panel(g, 930, 660, 330, 170, dp * rcd, { fill: rgba('#0a1124', 0.95), c: rgba(leakmA > 30 ? C.bad : C.ok, 0.6) });
        g.text('DIFFERENCE', 955, 694, { s: 18, c: C.dim, wt: 700, ls: 3, a: dp }); g.text((live ? leakmA : 0).toFixed(0) + ' mA', 1095, 762, { s: 66, f: 'mono', wt: 800, al: 'c', c: leakmA > 30 ? C.bad : C.ok, a: dp });
        g.text('fields cancel  ·  ring is silent', tx, 268, { s: 22, c: C.ok, al: 'c', wt: 600, p: s.in('toroid', 13.0) * s.out('leak', 2.0) });
        P.callout(g, tx + 46, 370, 960, 330, 'Iron ring', 'summation current transformer', s.in('toroid', 5.4) * s.out('leak', 0), { c: '#c7b6ff', s: 22, ss: 17 });
        P.callout(g, tx + 70, 700, 960, 880, 'Sense winding', null, s.in('leak', 8.0) * s.out('thirty', 0), { c: C.copper, s: 22 });
        if (fault) { g.tag('SLOW MOTION', 350, 960, { s: 22, c: C.l2 }); g.text(ms.toFixed(0) + ' ms', 560, 960, { s: 40, f: 'mono', wt: 800, al: 'c' }); }
        if (tripped) { g.tag('disconnected in ≈ 25 ms', 520, 960, { s: 26, c: C.ok, p: pr(t, tTrip, 0.4) }); }
        g.text('30 mA', 1110, 262, { s: 104, f: 'disp', wt: 800, c: C.pe, al: 'c', p: s.in('thirty', 1.0, 0.8, E.o) }); g.text('household trip threshold', 1110, 338, { s: 24, c: C.dim, al: 'c', p: s.in('thirty', 1.6) });
      }
    },
  });

  // ---------------------------------------------------------------- body current, types, test button
  api.scene('rcd-details', {
    lines: [
      '@scale|To put numbers on it. Around one milliampere, you feel a tingle. Above ten, your muscles can lock, and you cannot let go. From about fifty milliamperes across the chest, the heart can go into fibrillation.',
      '@body|The human body is roughly one to two thousand ohms. At two hundred and thirty volts, that means well over a hundred milliamperes. Without protection, mains voltage is easily lethal.',
      '@types|These devices come in types. Type A detects alternating and pulsating fault currents, and is the household standard. Type B also detects smooth direct current leakage, which electronics such as car chargers can produce, and which can blind a type A device.',
      '@test|Every device has a test button. It routes a small current around the ring, creating a deliberate imbalance. Press it a couple of times a year. If it does not trip, call an electrician.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'How much current is dangerous?', s.p(0.3, 0.8, E.o));
      // log scale 0.1 .. 1000 mA
      const x0 = 150, x1 = 1770, y = 520, X = mA => x0 + Math.log10(mA / 0.1) / 4 * (x1 - x0), pa = s.p(0.5, 0.9, E.o);
      P.panel(g, 90, 210, 1740, 420, pa);
      g.alpha(pa, () => {
        const zones = [[0.1, 0.5, '#3ddc97'], [0.5, 10, '#ffd23f'], [10, 30, '#ff9a3c'], [30, 1000, '#ff4d5e']];
        zones.forEach(([a, b, col]) => g.rect(X(a), y - 16, X(b) - X(a), 32, { fill: rgba(col, 0.55), w: 0 }));
        g.rect(x0, y - 16, x1 - x0, 32, { r: 4, c: rgba('#fff', 0.3), w: 1.5 });
        [0.1, 1, 10, 100, 1000].forEach(v => { g.line([[X(v), y + 16], [X(v), y + 30]], { c: C.dim, w: 2 }); g.text(v + ' mA', X(v), y + 52, { s: 20, f: 'mono', c: C.dim, al: 'c' }); });
        g.text('current through the body  (50 Hz, hand to feet)', x0, 250, { s: 20, c: C.dim });
      });
      const mark = (mA, title, subt, col, p, up = 1, dy = 0) => { if (p <= 0) return; const x = X(mA); g.line([[x, y - 22], [x, y - 70 - dy]], { c: col, w: 3, a: p }); g.circ(x, y, 9, { fill: '#fff', c: col, w: 3, a: p }); g.text(title, x, y - 122 - dy, { s: 26, wt: 700, c: col, al: 'c', p }); g.text(subt, x, y - 90 - dy, { s: 19, c: C.dim, al: 'c', p }); };
      mark(1, '1 mA', 'tingle', '#ffd23f', s.in('scale', 3.0));
      mark(10, '10 mA', "muscles lock: can't let go", '#ff9a3c', s.in('scale', 6.2), 1, 70);
      mark(50, '50 mA', 'heart fibrillation', '#ff4d5e', s.in('scale', 11.6));
      mark(150, '≈ 150 mA', '230 V ÷ 1 500 Ω', '#ffffff', s.in('body', 5.0), 1, 70);
      const rp = s.in('body', 10.5, 0.8);
      if (rp > 0) { const x = X(30); g.line([[x, y - 60], [x, y + 86]], { c: C.pe, w: 5, a: rp, glow: 1 }); g.tag('RCD trips at 30 mA', x, y + 96, { s: 22, c: C.pe, p: rp }); }
      // types
      const ty = 670, tp = s.in('types', 0.3, 0.8, E.o);
      const types = [['Type AC', 'sine only', 'no longer installed', x => Math.sin(x), C.dim, 0.3], ['Type A', 'sine + pulsating DC', 'the household standard', x => Math.max(0, Math.sin(x)), C.ok, 2.4], ['Type B', 'also smooth DC', 'car chargers, inverters', x => 0.7 + 0.06 * Math.sin(x * 6), C.l2, 9.6]];
      types.forEach(([name, desc, desc2, fn, col, d], i) => {
        const p = s.in('types', d, 0.7, E.o), x = 90 + i * 390;
        P.panel(g, x, ty + (1 - p) * 16, 370, 310, p * tp, { c: rgba(col, 0.5) });
        g.alpha(p * tp, () => { g.text(name, x + 26, ty + 44, { s: 34, f: 'disp', wt: 800, c: col }); g.line([[x + 26, ty + 155], [x + 344, ty + 155]], { c: C.faint, w: 1.5 }); g.plot(v => fn(v - t * 2), x + 26, ty + 80, 318, 150, { xr: [0, TAU * 2.5], yr: [-1.2, 1.2], c: col, w: 4, glow: 0.7 }); g.text(desc, x + 26, ty + 256, { s: 20, c: C.ink, wt: 600 }); g.text(desc2, x + 26, ty + 284, { s: 19, c: C.dim }); });
      });
      // test button
      const bp = s.in('test', 0.3, 0.8, E.o), bx = 1270;
      P.panel(g, bx, ty + (1 - bp) * 16, 560, 310, bp, { c: rgba(C.warn, 0.5) });
      if (bp > 0) g.alpha(bp, () => {
        g.text('TEST BUTTON', bx + 26, ty + 40, { s: 20, c: C.warn, wt: 700, ls: 3 });
        const press = ((s.since('test') - 3) % 6) > 0 && ((s.since('test') - 3) % 6) < 2.4 && s.since('test') > 3, cy = ty + 170, rx2 = bx + 250;
        ringPart(g, rx2, cy, 30, 86, false, { net: press ? 1 : 0 });
        [cy - 30, cy + 30].forEach((yy, k) => g.wire([[bx + 40, yy], [bx + 420, yy]], { c: PH[k], w: 5, flow: !press || ((s.since('test') - 3) % 6) < 0.5, on: press && ((s.since('test') - 3) % 6) > 0.5 ? 0.1 : 1, t, off: -Math.cos(t * 2.4 - k * Math.PI) * 40, gap: 50 }));
        ringPart(g, rx2, cy, 30, 86, true, { net: press ? 1 : 0 });
        // bypass: from L1 before the ring, around it, to L2 after the ring
        const byp = [[bx + 150, cy - 30], [bx + 150, cy - 112], [bx + 350, cy - 112], [bx + 350, cy + 30]];
        g.line(byp, { c: press ? C.warn : C.faint, w: 3.5, round: 10, glow: press ? 1 : 0 }); g.rect(bx + 216, cy - 124, 60, 24, { r: 4, fill: '#1c2a52', c: press ? C.warn : C.faint, w: 2.5 }); g.text('R', bx + 246, cy - 111, { s: 16, wt: 800, al: 'c', c: press ? C.warn : C.dim });
        if (press) g.flow(byp, { c: C.warn, w: 6, gap: 30, speed: 140, t });
        g.rect(bx + 440, cy - 60, 90, 90, { r: 14, fill: press ? C.warn : '#3a3413', c: C.warn, w: 3, glow: press ? 1 : 0 }); g.text('T', bx + 485, cy - 14, { s: 50, wt: 800, al: 'c', c: press ? '#1a1408' : C.warn });
        g.text(press ? 'imbalance on purpose  →  trip' : 'test it a couple of times a year', bx + 26, ty + 286, { s: 19, c: press ? C.warn : C.dim, wt: 600 });
      });
    },
  });

  // ---------------------------------------------------------------- SPD, AFDD, old fuses
  api.scene('protect-extra', {
    lines: [
      '@surge|Three more devices deserve a mention. Surge protection, required in new Norwegian homes since two thousand and ten. Its heart is a varistor: a component that is practically an insulator at normal voltage, but turns into a conductor above a threshold. When lightning, or switching in the grid, sends a voltage spike down the line, it shunts the surge to earth within nanoseconds.',
      '@afdd|Arc fault detection. A loose terminal can spark quietly for months, at a current too low to trip anything, until one day it starts a fire. An arc fault device listens for the high frequency signature of that sparking, and disconnects.',
      '@old|And if you live in an older house, you may still have screw in fuses. A thin wire, in a ceramic body filled with sand. Too much current melts the wire, and the sand quenches the arc. Simple and reliable. But use once only.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'Three more guardians', s.p(0.3, 0.8, E.o));
      const cols = [[90, 'SURGE PROTECTION', 'overspenningsvern  ·  SPD', C.l2, s.in('surge', 2.4, 0.8, E.o)], [680, 'ARC FAULT DETECTION', 'lysbuevern  ·  AFDD', C.warn, s.in('afdd', 0.2, 0.8, E.o)], [1270, 'SCREW FUSE', 'skrusikring', C.l3, s.in('old', 0.2, 0.8, E.o)]];
      cols.forEach(([x, a, b, col, p]) => { P.panel(g, x, 210 + (1 - p) * 20, 560, 770, p, { c: rgba(col, 0.45) }); g.text(a, x + 30, 252, { s: 22, c: col, wt: 700, ls: 3, a: p }); g.text(b, x + 30, 286, { s: 20, c: C.dim, it: true, a: p }); });
      // --- SPD
      g.alpha(cols[0][4], () => {
        const x = 90, cyc = (s.since('surge') - 14) % 5.5, hit = s.since('surge') > 14 && cyc >= 0 && cyc < 1.2, k = hit ? Math.exp(-cyc * 4) : 0;
        // waveform incoming vs clamped
        const wx = x + 40, ww = 480, spike = xv => Math.sin(xv) * 0.22 + 1.0 * Math.exp(-Math.pow((xv - 7.6) / 0.11, 2));
        g.text('incoming', wx, 336, { s: 18, c: C.bad }); g.plot(spike, wx, 340, ww, 150, { xr: [0, TAU * 2.4], yr: [-0.3, 1.1], c: C.bad, w: 3.5, glow: 0.6, n: 300 });
        g.text('after the SPD', wx, 520, { s: 18, c: C.ok }); g.plot(xv => Math.min(0.42, spike(xv)), wx, 524, ww, 150, { xr: [0, TAU * 2.4], yr: [-0.3, 1.1], c: C.ok, w: 3.5, glow: 0.6, n: 300 });
        g.text('6 000 V', wx + ww * 0.62, 356, { s: 18, f: 'mono', c: C.bad }); g.text('clamped  ≈ 1 500 V', wx + ww * 0.6, 592, { s: 18, f: 'mono', c: C.ok });
        // circuit: line, varistor to earth
        const ly = 760, vx = x + 280;
        g.wire([[x + 40, ly], [x + 520, ly]], { c: C.l1, w: 5, flow: true, t, gap: 50 });
        g.line([[vx, ly], [vx, ly + 40]], { c: C.steel, w: 4 }); g.rect(vx - 22, ly + 40, 44, 74, { r: 6, fill: mix('#1c2a52', C.l2, k), c: C.l2, w: 3, glow: k * 2 }); g.line([[vx - 30, ly + 104], [vx + 30, ly + 50]], { c: C.l2, w: 3 });
        g.line([[vx, ly + 114], [vx, ly + 150]], { c: C.pe, w: 4 }); S7.earthSym(g, vx, ly + 174, C.pe);
        g.text('varistor', vx + 40, ly + 78, { s: 20, c: C.l2, wt: 600 });
        if (hit) { g.line([[x + 80, ly - 150], [x + 110, ly - 90], [x + 86, ly - 84], [x + 120, ly - 10]], { c: '#fff', w: 5, glow: 2, a: k }); g.flow([[x + 110, ly], [vx, ly], [vx, ly + 170]], { c: '#fff', w: 10, gap: 26, speed: 900, t, a: k }); g.glowDot(x + 110, ly - 40, 120, '#bfe0ff', k); }
      });
      // --- AFDD
      g.alpha(cols[1][4], () => {
        const x = 680, cx = x + 280, cy = 430;
        // terminal with loose wire
        g.rect(cx - 110, cy - 60, 220, 120, { r: 12, fill: '#2a3350', c: C.steel, w: 3 });
        g.circ(cx, cy - 20, 26, { fill: '#aab6d3', c: '#5c6884', w: 2.5 }); g.line([[cx - 16, cy - 30], [cx + 16, cy - 10]], { c: '#3a4666', w: 5 });
        g.line([[x + 40, cy + 30], [cx - 36, cy + 30]], { c: C.copper, w: 12, cap: 'butt' }); g.line([[cx + 6, cy + 34], [x + 520, cy + 34]], { c: C.copper, w: 12, cap: 'butt' });
        const fl = Math.max(0, Math.sin(t * 23) * Math.sin(t * 7.3) * Math.sin(t * 3.1));
        g.glowDot(cx - 14, cy + 30, 60 * fl + 14, C.warn, fl + 0.2); for (let i = 0; i < 5; i++) { const a = rnd(Math.floor(t * 30) + i) * TAU; g.line([[cx - 14, cy + 30], [cx - 14 + Math.cos(a) * 30 * fl, cy + 30 + Math.sin(a) * 30 * fl]], { c: '#fff', w: 2.5, a: fl }); }
        g.text('loose terminal', cx, cy + 96, { s: 20, c: C.dim, al: 'c' });
        // current waveform with HF noise
        const wx = x + 40, ww = 480, wy = 580;
        g.text('circuit current', wx, wy - 12, { s: 18, c: C.dim });
        g.plot(xv => { const v = Math.sin(xv - t * 2); const sh = Math.abs(v) < 0.35 ? 1 : 0.15; return v * (1 - 0.1 * sh) + (rnd(Math.floor(xv * 40) + Math.floor(t * 30)) - 0.5) * 0.3 * sh; }, wx, wy, ww, 170, { xr: [0, TAU * 2.5], yr: [-1.3, 1.3], c: C.warn, w: 3, n: 400 });
        const dp = s.in('afdd', 12.6, 0.7);
        g.rect(x + 60, 800, 440, 120, { r: 14, fill: rgba(C.warn, 0.1), c: rgba(C.warn, 0.6), w: 2, a: dp }); g.text('high-frequency noise pattern', x + 280, 842, { s: 22, al: 'c', a: dp }); g.text('recognised  →  disconnect', x + 280, 882, { s: 22, wt: 700, c: C.warn, al: 'c', a: dp });
      });
      // --- old fuse
      g.alpha(cols[2][4], () => {
        const x = 1270, cx = x + 280, top = 340, bot = 760;
        const cyc = Math.max(0, s.since('old') - 9.5) % 9, blowing = s.since('old') > 9.5, heat = blowing ? clamp(cyc / 2.2) : 0, gap = blowing ? clamp((cyc - 2.2) / 1.2) : 0;
        // ceramic body
        g.path(c => { c.moveTo(cx - 70, top); c.lineTo(cx + 70, top); c.lineTo(cx + 94, bot - 60); c.lineTo(cx + 50, bot); c.lineTo(cx - 50, bot); c.lineTo(cx - 94, bot - 60); c.closePath(); }, { fill: '#e9e3d6', c: '#b9ae96', w: 4 });
        g.path(c => { c.moveTo(cx - 50, top + 26); c.lineTo(cx + 50, top + 26); c.lineTo(cx + 68, bot - 66); c.lineTo(cx + 36, bot - 26); c.lineTo(cx - 36, bot - 26); c.lineTo(cx - 68, bot - 66); c.closePath(); }, { fill: '#c9b48a', w: 0 });
        for (let i = 0; i < 260; i++) { const yy = top + 34 + rnd(i * 3.3) * (bot - top - 70), half = lerp(46, 62, (yy - top) / (bot - top)) * (yy > bot - 70 ? 0.6 : 1); g.circ(cx + (rnd(i * 7.1) * 2 - 1) * half, yy, 2.2, { fill: rgba('#8a7a55', 0.7), w: 0 }); }
        g.rect(cx - 76, top - 22, 152, 26, { r: 5, fill: '#aab6d3', c: '#5c6884', w: 2.5 }); g.rect(cx - 30, bot - 4, 60, 30, { r: 5, fill: '#aab6d3', c: '#5c6884', w: 2.5 });
        // fuse wire
        const wcol = mix('#dfe7fa', C.hot, heat), mid = (top + bot) / 2, gh = gap * 90;
        g.line([[cx, top + 4], [cx, mid - gh]], { c: wcol, w: 5, glow: heat * 1.6 }); g.line([[cx, mid + gh], [cx, bot - 4]], { c: wcol, w: 5, glow: heat * 1.6 });
        if (gap > 0 && gap < 0.6) { g.glowDot(cx, mid, 80 * (1 - gap), '#fff', 1 - gap); }
        if (gap > 0) { g.circ(cx - 6, mid - gh, 5, { fill: '#55607f', w: 0 }); g.circ(cx + 5, mid + gh, 5, { fill: '#55607f', w: 0 }); }
        g.text('sand', cx + 120, mid - 60, { s: 20, c: '#c9b48a' }); g.text('fuse wire', cx + 120, mid, { s: 20, c: '#dfe7fa' }); g.text('ceramic', cx + 120, mid + 60, { s: 20, c: '#e9e3d6' });
        g.text(gap > 0.5 ? 'blown: replace the fuse' : heat > 0 ? 'overcurrent: the wire heats up…' : 'normal: current flows through the wire', cx, 850, { s: 21, al: 'c', c: gap > 0.5 ? C.bad : heat > 0 ? C.warn : C.dim, wt: 600 });
        g.text('no earth-fault protection', cx, 906, { s: 20, al: 'c', c: C.dim, p: s.in('old', 14) });
      });
    },
  });
};
