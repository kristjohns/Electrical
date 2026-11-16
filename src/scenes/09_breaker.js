const { W, H, C, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample, rnd, noise1 } = require('../lib/core');
const P = require('../lib/parts');
const S8 = require('./08_home');

const rot = (px, py, cx, cy, a) => { const dx = px - cx, dy = py - cy, c = Math.cos(a), s = Math.sin(a); return [cx + dx * c - dy * s, cy + dx * s + dy * c]; };
function zig(a, b, n, amp) { const pts = [a]; for (let i = 1; i < n; i++) { const u = i / n, x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; pts.push([x - dy / l * amp * (i % 2 ? 1 : -1), y + dx / l * amp * (i % 2 ? 1 : -1)]); } pts.push(b); return pts; }
function jag(a, b, seed, amp = 9, n = 9) { const pts = []; for (let i = 0; i <= n; i++) { const u = i / n, k = i === 0 || i === n ? 0 : 1; pts.push([lerp(a[0], b[0], u) + (rnd(seed + i * 1.7) - 0.5) * 2 * amp * k, lerp(a[1], b[1], u) + (rnd(seed + i * 3.1 + 5) - 0.5) * 2 * amp * k * 0.5]); } return pts; }

// Miniature circuit breaker, cut open. Local coordinates 760 x 520.
// st: {open, handle, heat, bend, plunger, latch, I (0..3 brightness), field, arc (0..1), hi:{}, flow:bool}
function mcb(g, x, y, s, st, t) {
  const open = st.open || 0, heat = st.heat || 0, bend = st.bend || 0, plunger = st.plunger || 0, latch = st.latch || 0;
  const I = st.I === undefined ? 1 : st.I, hi = st.hi || {}, arc = st.arc || 0;
  const A = [500, 300], T0 = [350, 258], ang = -0.61 * open;
  const tip = rot(T0[0], T0[1], A[0], A[1], ang);
  const cur = mix(C.copper, '#ffffff', clamp((I - 1) / 2) * 0.8), hot = clamp((I - 1) / 2);
  const HL = k => hi[k] || 0;
  let pathPts = null;
  g.tf({ x, y, s, a: st.a }, () => {
    // housing
    g.rect(0, 0, 760, 520, { r: 28, fill: '#131c36', c: '#dfe7fa', w: 5 });
    g.rect(14, 14, 732, 492, { r: 18, c: rgba('#dfe7fa', 0.18), w: 2 });
    g.path(c => { c.moveTo(310, 520); c.lineTo(322, 500); c.lineTo(438, 500); c.lineTo(450, 520); }, { c: '#dfe7fa', w: 4, fill: '#0a1122' });
    // terminals
    for (const [tx, k] of [[30, 'tin'], [650, 'tout']]) {
      g.rect(tx, 212, 80, 80, { r: 8, fill: '#3a4666', c: mix('#aab6d3', C.l1, HL('term')), w: 3, glow: HL('term') });
      g.circ(tx + 40, 252, 22, { fill: '#aab6d3', c: '#5c6884', w: 2 }); g.line([[tx + 26, 252], [tx + 54, 252]], { c: '#3a4666', w: 5 });
    }
    // arc chute
    const ch = HL('chute');
    g.rect(158, 240, 172, 144, { r: 6, fill: '#0c1326', c: mix('#55607f', C.warn, ch), w: 2.5, glow: ch });
    const plateHot = clamp(arc > 0.55 ? (1.15 - arc) * 2.2 : 0);
    for (let i = 0; i < 10; i++) { const py = 262 + i * 11; g.line([[176, py], [316, py]], { c: mix('#9aa7bd', C.hot, plateHot * (0.5 + 0.5 * rnd(i))), w: 4, cap: 'butt', glow: plateHot * 0.8 }); }
    g.line([[340, 246], [170, 248]], { c: '#c9b48a', w: 4 }); g.line([[372, 374], [170, 374]], { c: '#c9b48a', w: 4 });
    // coil + plunger
    const co = HL('coil');
    g.rect(150, 108, 160, 84, { r: 8, fill: '#1c2747', c: mix('#55607f', C.l2, co), w: 2.5, glow: co });
    const px = plunger * 86;
    g.rect(166 + px, 138, 130, 24, { r: 5, fill: '#aab6d3', c: '#dfe7fa', w: 2 }); g.rect(296 + px, 144, 40, 12, { r: 4, fill: '#dfe7fa', w: 0 });
    for (let i = 0; i < 10; i++) { const cx = 162 + i * 15; g.line([[cx - 5, 194], [cx + 5, 106]], { c: mix(cur, C.l2, co * 0.5), w: 8, cap: 'round', glow: 0.3 + hot }); }
    if (st.field > 0) for (let k = 0; k < 3; k++) { const rx = 120 + k * 34, ry = 62 + k * 30; g.ell(230, 150, rx, ry, { c: rgba('#c7b6ff', (0.75 - k * 0.2) * st.field), w: 3, dash: [12, 10], off: -t * 90 }); }
    // fixed conductors
    const cond = (pts, k) => g.line(pts, { c: cur, w: 9, round: 8, glow: 0.25 + hot });
    cond([[110, 252], [130, 252], [130, 150], [150, 150]]);
    cond([[310, 150], [350, 150], [350, 240]]);
    g.rect(334, 238, 32, 12, { r: 3, fill: '#f2e2b8', c: mix('#c9b48a', C.warn, HL('contact')), w: 2, glow: HL('contact') });
    cond([[640, 420], [690, 420], [690, 292]]);
    // bimetal strip
    const d = 22 * bend, bm = HL('bimetal');
    const bpt = (u, off) => [640 - d * u * u + off, 420 - 224 * u];
    g.line(sample(u => bpt(u, -4), 0, 1, 20), { c: mix('#aab6d3', C.hot, heat), w: 7, glow: heat * 1.2 + bm });
    g.line(sample(u => bpt(u, 4), 0, 1, 20), { c: mix('#c98d4a', C.warn, heat), w: 7, glow: heat * 1.2 + bm });
    g.rect(622, 414, 36, 16, { r: 3, fill: '#55607f', w: 0 });
    // trip bar + latch
    const push = Math.max(0, d - 8), lt = latch;
    g.line([[474 - push - lt * 6, 196], [622 - push, 196]], { c: mix('#dfe7fa', C.warn, HL('latch')), w: 6, glow: HL('latch') });
    g.circ(622 - push, 196, 6, { fill: '#dfe7fa', w: 0 });
    const L = [456, 206];
    g.tf({ x: L[0], y: L[1], r: -lt * 0.75 }, () => g.path(c => { c.moveTo(-10, -26); c.lineTo(10, -26); c.lineTo(12, 30); c.lineTo(-18, 30); c.lineTo(-18, 18); c.lineTo(-8, 18); c.closePath(); }, { fill: '#55607f', c: mix('#dfe7fa', C.warn, HL('latch')), w: 2.5, glow: HL('latch') }));
    g.circ(L[0], L[1], 5, { fill: '#dfe7fa', w: 0 });
    // spring
    const sp0 = rot(lerp(A[0], T0[0], 0.42), lerp(A[1], T0[1], 0.42), A[0], A[1], ang);
    g.line(zig(sp0, [548, 436], 12, 9), { c: '#8fa3d8', w: 3, join: 'miter' }); g.circ(548, 436, 6, { fill: '#8fa3d8', w: 0 });
    // moving contact arm
    g.line([A, tip], { c: mix('#c9b48a', '#ffffff', hot * 0.6), w: 13, glow: hot });
    g.rect(tip[0] - 15, tip[1] - 9, 30, 11, { r: 3, fill: '#f2e2b8', w: 0 });
    g.circ(A[0], A[1], 11, { fill: '#dfe7fa', c: '#55607f', w: 3 });
    // braid arm -> bimetal top
    const btop = bpt(1, 0);
    const braid = sample(u => { const x = lerp(A[0] + 8, btop[0], u), yv = lerp(A[1] - 6, btop[1], u) - Math.sin(u * Math.PI) * 36 + Math.sin(u * 40) * 2.2; return [x, yv]; }, 0, 1, 40);
    g.line(braid, { c: cur, w: 6, glow: 0.2 + hot });
    // handle + link
    const Hp = [430, 46], ha = lerp(0.5, -0.5, st.handle || 0);
    const hb = rot(430, 96, Hp[0], Hp[1], ha), mid = rot(lerp(A[0], T0[0], 0.55), lerp(A[1], T0[1], 0.55), A[0], A[1], ang);
    g.line([hb, [L[0] + 6, L[1] - 18], mid], { c: '#8fa3d8', w: 5, round: 6 });
    g.tf({ x: Hp[0], y: Hp[1], r: ha }, () => { g.rect(-24, -124, 48, 150, { r: 12, fill: st.handle > 0.5 ? '#3d4b73' : '#2b6de0', c: mix('#dfe7fa', C.l1, HL('handle')), w: 3, glow: HL('handle') }); g.line([[-12, -100], [12, -100]], { c: rgba('#fff', 0.5), w: 3 }); g.line([[-12, -88], [12, -88]], { c: rgba('#fff', 0.5), w: 3 }); });
    g.circ(Hp[0], Hp[1], 9, { fill: '#dfe7fa', w: 0 });
    // current path (for flow + highlights)
    pathPts = [[70, 252], [130, 252], [130, 150], [150, 150], [310, 150], [350, 150], [350, 246], tip, A, ...braid.slice(4), ...sample(u => bpt(1 - u, 0), 0, 1, 10), [690, 420], [690, 292], [690, 252]];
    if (st.flow !== false && open < 0.04 && I > 0) g.flow(pathPts, { c: mix(C.energy, '#ffffff', hot), w: 7 + hot * 4, gap: 40, speed: 120 + 500 * hot, t, glow: 0.9 + hot });
    if (st.pathHi > 0) g.line(pathPts, { c: C.energy, w: 5, trim: st.pathHi, glow: 1.2, a: 0.9 });
    // arc
    if (arc > 0 && arc < 1) {
      const c = g.c, seed = Math.floor(t * 60);
      const drawArc = (pts, a, w = 5) => { g.line(pts, { c: '#9fd0ff', w: w + 10, a: a * 0.35, glow: 1.5 }); g.line(pts, { c: '#ffffff', w, a, glow: 2 }); };
      if (arc < 0.34) { // between the parting contacts
        drawArc(jag([350, 250], [tip[0], tip[1] - 6], seed, 7, 7), 1); g.glowDot((350 + tip[0]) / 2, (250 + tip[1]) / 2, 90, '#bfe0ff', 0.9);
      } else if (arc < 0.62) { // running along the arc runners
        const k = (arc - 0.34) / 0.28, ax = lerp(350, 300, k);
        const pts = jag([ax, 249], [ax + 16 * (1 - k), 372], seed, 12, 10).map(([px2, py2], i, arr) => [px2 - Math.sin(i / (arr.length - 1) * Math.PI) * 30 * k, py2]);
        drawArc(pts, 1); g.glowDot(ax - 16, 310, 110, '#bfe0ff', 0.9);
      } else { // split between the plates
        const k = (arc - 0.62) / 0.38, a = clamp(1.25 - k * 1.25);
        for (let i = 0; i < 11; i++) { const y0 = i === 0 ? 248 : 262 + (i - 1) * 11, y1 = i === 10 ? 374 : 262 + i * 11, ax = lerp(290, 228, clamp(k * 1.6)) + (rnd(seed + i * 9) - 0.5) * 30; drawArc([[ax, y0 + 2], [ax + (rnd(seed * 3 + i) - 0.5) * 8, (y0 + y1) / 2], [ax, y1 - 2]], a, 3.5); }
        g.glowDot(250, 312, 120, '#bfe0ff', 0.7 * a);
      }
    }
  });
  const toS = p => [x + p[0] * s, y + p[1] * s];
  return { toS, tip: toS(tip) };
}

// time-current characteristic helpers
const tHi = I => 60 * Math.pow(5.5 / (I * I - 1), 2.55), tLo = I => 1 * Math.pow(5.5 / (I * I - 1), 2.74);

module.exports = api => {
  api.chapter('The Circuit Breaker', 'Overload and short circuit: two mechanisms in one device');
  const MX = 96, MY = 262, MS = 1.3;

  // ---------------------------------------------------------------- overload
  api.scene('mcb-overload', {
    lines: [
      '@inside|This is a miniature circuit breaker, cut open. The current enters at one terminal, and has to pass through every one of these parts on its way out. A coil. A pair of contacts. And a bimetal strip.',
      '@over|First fault type: overload. Too many appliances on one circuit. Say, twenty five amperes on a sixteen ampere circuit. Nothing dramatic happens. But the cable in your wall slowly overheats.',
      '@bimetal|The breaker mimics that heating with a bimetal strip: two metals with different thermal expansion, bonded together. The current heats the strip, and it bends.',
      '@trip|The more current, the faster it bends. Eventually it pushes the trip bar. The latch lets go, and a spring snaps the contacts apart. A small overload takes minutes. A large one, seconds. It is a thermal model of the very cable it protects.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'Inside a circuit breaker  ·  automatsikring', s.p(0.3, 0.8, E.o));
      const tOver = s.at('over', 5.2), tTrip = s.at('trip', 4.6);
      const over = pr(t, tOver, 0.8), tripped = t >= tTrip;
      const heatRaw = clamp((t - tOver - 0.5) / (tTrip - tOver - 0.5));
      const cool = tripped ? clamp(1 - (t - tTrip) / 9) : 1;
      const bend = E.io2(heatRaw) * (tripped ? lerp(0.55, 1, cool) : 1), heat = Math.pow(heatRaw, 0.7) * cool;
      const op = pr(t, tTrip, 0.14, E.o);
      const amps = tripped ? 0 : lerp(10, 25, over);
      const hi = {};
      const hl = (k, a, d = 2.4) => { const v = s.in('inside', a, 0.4) * (1 - pr(t, s.at('inside', a + d), 0.5)); if (v > 0) hi[k] = v; };
      hl('term', 3.0, 1.6); hl('coil', 9.6, 1.4); hl('contact', 10.8, 1.8); hl('bimetal', 12.8, 2.2);
      if (s.on('bimetal')) hi.bimetal = Math.max(hi.bimetal || 0, 0.6 * s.out('trip', 5.5));
      if (tripped) hi.latch = clamp(1 - (t - tTrip) / 2);
      const m = mcb(g, MX, MY, MS, { a: s.p(0.5, 0.9, E.o), open: op, handle: op, heat, bend, latch: op, I: tripped ? 0 : 1 + over * 0.7, hi, pathHi: s.in('inside', 3.0, 5.6, E.lin) * s.out('inside', 9.2) }, t);
      // part labels
      const lab = (pt, tx, ty, a, b, key, d, col, al) => P.callout(g, ...m.toS(pt), tx, ty, a, b, s.in('inside', d) * s.out('over', 2.5), { c: col || C.ink, s: 22, ss: 17, al });
      lab([70, 230], 104, 228, 'Terminal', null, 'inside', 3.0, null, 'l');
      lab([230, 112], 290, 228, 'Magnetic coil', 'spole', 'inside', 9.6, C.l2, 'l');
      lab([352, 240], 790, 200, 'Contacts', null, 'inside', 10.8, C.warn, 'l');
      lab([648, 300], 960, 228, 'Bimetal strip', null, 'inside', 12.8, C.hot, 'l');
      lab([240, 384], 250, 985, 'Arc chute', 'slukkekammer', 'inside', 14.2);
      lab([548, 436], 700, 985, 'Spring + latch', null, 'inside', 14.8);
      // intro panel: the same breaker as seen in the board
      const ip = s.in('inside', 0.8, 0.8, E.o) * s.out('over', -0.4);
      if (ip > 0) {
        P.panel(g, 1170, 215, 670, 765, ip);
        g.alpha(ip, () => {
          g.text('AS YOU SEE IT IN THE BOARD', 1200, 252, { s: 20, c: C.l1, wt: 700, ls: 3 });
          g.tf({ x: 1230, y: 320, s: 4.2 }, () => S8.module_(g, 0, 0, 78, 130, { kind: 'rcbo', rating: 'B16' }));
        });
        P.callout(g, 1440, 429, 1600, 360, 'B 16', 'type B, 16 A rated', ip * s.in('inside', 2.0), { c: C.l1, al: 'l', s: 24, ss: 18 });
        P.callout(g, 1420, 590, 1600, 640, 'Lever', 'on / off / tripped', ip * s.in('inside', 3.0), { c: C.ink, al: 'l', s: 24, ss: 18 });
        P.callout(g, 1516, 446, 1600, 500, 'Test button', 'earth-fault part', ip * s.in('inside', 4.0), { c: C.warn, al: 'l', s: 24, ss: 18 });
        g.text('36 mm wide  ·  two poles', 1505, 930, { s: 22, c: C.dim, al: 'c', p: ip * s.in('inside', 5.0) });
      }
      // right panel: current gauge + cable temperature
      const rp = s.in('over', 0.3, 0.8, E.o), rx = 1170;
      P.panel(g, rx, 215, 670, 360, rp);
      g.alpha(rp, () => {
        g.text('CIRCUIT CURRENT', rx + 30, 252, { s: 20, c: C.l1, wt: 700, ls: 3 });
        P.gauge(g, rx + 180, 420, 130, amps / 40, { c: amps > 16.5 ? C.bad : C.ok });
        g.text(amps.toFixed(0) + ' A', rx + 180, 500, { s: 54, f: 'mono', wt: 800, al: 'c', c: amps > 16.5 ? C.bad : C.ok });
        g.text('rated 16 A', rx + 180, 548, { s: 20, c: C.dim, al: 'c' });
        // appliances on the circuit
        const apps = [['kettle', '2.0 kW', 0], ['heater', '1.5 kW', 0.25], ['oven', '2.3 kW', 0.6]];
        apps.forEach(([n, w, k], i) => { const a = i === 0 ? 1 : clamp((over - k) * 5); g.rect(rx + 380, 290 + i * 86, 250, 66, { r: 10, fill: rgba(C.l1, 0.1), c: rgba(C.l1, 0.5), w: 1.5, a: a * (tripped ? 0.3 : 1) }); g.text(n, rx + 400, 323 + i * 86, { s: 24, wt: 600, a: a * (tripped ? 0.3 : 1) }); g.text(w, rx + 612, 323 + i * 86, { s: 22, f: 'mono', c: C.l1, al: 'r', a: a * (tripped ? 0.3 : 1) }); });
      });
      // cable temperature
      const cp = s.in('over', 9.0, 0.8, E.o);
      P.panel(g, rx, 600, 670, 170, cp);
      g.alpha(cp, () => {
        const temp = lerp(30, 30 + 72 * heatRaw, 1) * (tripped ? lerp(0.4, 1, cool) : 1) + (tripped ? 18 * (1 - cool) : 0);
        g.text('CABLE IN THE WALL', rx + 30, 636, { s: 20, c: C.hot, wt: 700, ls: 3 });
        g.rect(rx + 30, 670, 480, 44, { r: 22, fill: mix('#3a2a20', C.hot, clamp((temp - 30) / 70)), c: C.copper, w: 3, glow: clamp((temp - 50) / 50) });
        g.text(temp.toFixed(0) + ' °C', rx + 640, 692, { s: 40, f: 'mono', wt: 800, al: 'r', c: temp > 70 ? C.bad : C.ink });
        g.text('PVC insulation is rated for 70 °C', rx + 30, 744, { s: 18, c: C.dim });
      });
      // bimetal explainer
      const bp = s.in('bimetal', 1.6, 0.8, E.o);
      P.panel(g, rx, 795, 670, 185, bp);
      g.alpha(bp, () => {
        g.text('BIMETAL', rx + 30, 830, { s: 20, c: C.warn, wt: 700, ls: 3 });
        const k = 0.5 + 0.5 * Math.sin(t * 1.4), bx = rx + 60, by = 900;
        const curve = off => sample(u => [bx + u * 300, by + off - k * 46 * u * u], 0, 1, 20);
        g.line(curve(-6), { c: '#c98d4a', w: 11 }); g.line(curve(6), { c: '#aab6d3', w: 11 });
        g.text('expands more', bx + 330, by - 22 - k * 30, { s: 20, c: '#e0a868' }); g.text('expands less', bx + 330, by + 22 - k * 30, { s: 20, c: '#aab6d3' });
        g.text('heat  →  bend', rx + 640, 830, { s: 22, c: C.dim, al: 'r' });
      });
      // time-lapse clock / trip message
      const mins = heatRaw * 4;
      if (s.on('over', 5.2) && !tripped) g.tag('time-lapse   ' + Math.floor(mins) + ' min ' + String(Math.floor((mins % 1) * 60)).padStart(2, '0') + ' s', 600, 985, { s: 24, c: C.l2, f: 'mono' });
      if (tripped) { const tp = pr(t, tTrip, 0.4, E.o); g.tag('TRIPPED  ·  thermal release', 600, 985, { s: 26, c: C.ok, p: tp }); }
    },
  });

  // ---------------------------------------------------------------- short circuit
  api.scene('mcb-short', {
    lines: [
      '@short|Second fault type: short circuit. Two conductors touch. Now the current is limited only by the resistance of the wiring itself, and can reach thousands of amperes within milliseconds. A bimetal is far too slow for that.',
      '@coil|So the current also runs through a coil. At normal current, its magnetic pull is too weak to do anything. At a short circuit, the force, which grows with the square of the current, slams a plunger into the latch.',
      '@arc|The contacts fly apart within a few milliseconds. But the current does not want to stop. It jumps the gap as an arc: a plasma at several thousand degrees.',
      "@chute|The breaker's own magnetic field drives the arc into a stack of steel plates, the arc chute. There it is chopped into a dozen short arcs, cooled, and stretched, until it cannot sustain itself. All of it, in less than a hundredth of a second.",
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'Short circuit: the magnetic release', s.p(0.3, 0.8, E.o));
      const tF = s.at('short', 4.2), tPl = s.at('coil', 11.4), tOpen = s.at('arc', 0.3), tRun = s.at('chute', 2.6), tSplit = s.at('chute', 6.0), tEnd = s.at('chute', 12.5);
      const fault = t >= tF, plunger = pr(t, tPl, 0.22, E.i) * (1 - pr(t, tOpen + 2, 1.2)), latch = pr(t, tPl + 0.2, 0.15), op = pr(t, tOpen, 1.6, E.o);
      let arc = 0;
      if (t >= tOpen) arc = t < tRun ? lerp(0.02, 0.33, clamp((t - tOpen) / (tRun - tOpen))) : t < tSplit ? lerp(0.34, 0.62, (t - tRun) / (tSplit - tRun)) : lerp(0.62, 1, clamp((t - tSplit) / (tEnd - tSplit)));
      const live = fault && arc < 1;
      // slow-motion clock (ms): piecewise mapping of narration time to physical time
      const ms = !fault ? 0 : t < tPl ? lerp(0, 0.8, (t - tF) / (tPl - tF)) : t < tOpen ? lerp(0.8, 1.6, (t - tPl) / (tOpen - tPl)) : t < tRun ? lerp(1.6, 3.4, (t - tOpen) / (tRun - tOpen)) : t < tSplit ? lerp(3.4, 5.2, (t - tRun) / (tSplit - tRun)) : lerp(5.2, 8.0, clamp((t - tSplit) / (tEnd - tSplit)));
      const hi = {}; if (s.on('coil') && t < tOpen) hi.coil = 0.7; if (s.on('chute')) hi.chute = 0.6 * s.out('chute', 13);
      const I = !fault ? 1 : arc >= 1 ? 0 : 3;
      const m = mcb(g, MX, MY, MS, { open: op, handle: pr(t, tOpen + 0.4, 0.5), plunger, latch, I, field: fault && t < tOpen + 1 ? pr(t, tF, 0.4) * (1 - pr(t, tOpen, 1)) * (s.on('coil') ? 1 : 0.5) : 0, arc, hi, flow: arc === 0 }, t);
      if (fault && t < tF + 0.5) g.rect(0, 0, W, H, { fill: rgba('#ffffff', 0.25 * (1 - (t - tF) / 0.5)), w: 0 });
      // slow-mo badge
      if (fault) { g.tag('SLOW MOTION', 250, 985, { s: 22, c: C.l2, p: pr(t, tF, 0.4) }); g.text(ms.toFixed(1) + ' ms', 600, 985, { s: 44, f: 'mono', wt: 800, al: 'c', c: C.ink, a: pr(t, tF, 0.4) }); }
      if (arc >= 1) g.tag('current interrupted', 890, 985, { s: 24, c: C.ok, p: pr(t, tEnd, 0.5) });
      P.callout(g, ...m.toS([330 + plunger * 86, 150]), 480, 215, 'Plunger', 'struck by the magnetic force', s.in('coil', 9.8) * s.out('arc', 2), { c: C.l2, s: 22, ss: 17 });
      P.callout(g, m.tip[0] - 10, m.tip[1] - 30, 930, 215, 'Arc', 'plasma, several thousand °C', s.in('arc', 5.4) * s.out('chute', 2), { c: '#bfe0ff', s: 22, ss: 17 });
      // right: current vs time
      const rx = 1170, rp = s.in('short', 0.6, 0.8, E.o);
      P.panel(g, rx, 215, 670, 470, rp);
      g.alpha(rp, () => {
        g.text('CURRENT THROUGH THE BREAKER', rx + 30, 252, { s: 20, c: C.bad, wt: 700, ls: 3 });
        const px = rx + 90, py = 290, pw = 540, ph = 320;
        g.line([[px, py + ph], [px + pw, py + ph]], { c: C.faint, w: 2 }); g.line([[px, py], [px, py + ph]], { c: C.faint, w: 2 });
        for (let k = 0; k <= 4; k++) { g.text(k + ' kA', px - 12, py + ph - k * ph / 4.5, { s: 16, f: 'mono', c: C.dim, al: 'r' }); g.line([[px, py + ph - k * ph / 4.5], [px + pw, py + ph - k * ph / 4.5]], { c: rgba(C.faint, 0.35), w: 1 }); }
        for (let k = 0; k <= 10; k += 2) g.text(k + '', px + pw * k / 10, py + ph + 22, { s: 16, f: 'mono', c: C.dim, al: 'c' });
        g.text('ms', px + pw + 14, py + ph + 22, { s: 16, c: C.dim });
        const prosp = x => 4.24 * Math.sin(Math.PI * x / 10), act = x => x < 1.6 ? prosp(x) : x > 8 ? 0 : prosp(1.6) + (2.25 - prosp(1.6)) * Math.sin(clamp((x - 1.6) / 2.4) * Math.PI / 2) * (x < 4 ? 1 : 1) - (x > 4 ? 2.25 * Math.pow((x - 4) / 4, 1.25) : 0);
        g.plot(prosp, px, py, pw, ph, { xr: [0, 10], yr: [0, 4.5], c: C.bad, w: 3, dash: [9, 8], a: 0.9 });
        g.text('without a breaker', px + pw * 0.56, py + 26, { s: 18, c: C.bad });
        if (fault) { g.plot(act, px, py, pw, ph, { xr: [0, 10], yr: [0, 4.5], c: C.energy, w: 5, glow: 1, trim: ms / 10, area: true, areaA: 0.2 }); g.glowDot(px + pw * ms / 10, py + ph - act(ms) / 4.5 * ph, 20, C.energy, 1); }
        g.text('actual: cut off early', px + pw * 0.34, py + ph - 60, { s: 18, c: C.energy, a: pr(ms, 5, 1) });
        const marks = [[0.8, 'plunger'], [1.6, 'contacts part'], [5.2, 'arc split'], [8, 'zero']];
        marks.forEach(([x, lab], i) => { const a = clamp((ms - x + 0.05) * 6); g.line([[px + pw * x / 10, py + ph], [px + pw * x / 10, py + ph - 14]], { c: C.ink, w: 2, a }); });
      });
      const fp = s.in('coil', 6.4, 0.8, E.o);
      P.formula(g, 'F ∝ I^2', rx + 150, 770, fp, { c: C.l2, s: 50 });
      g.text('16 A   →   force × 1', rx + 300, 748, { s: 24, f: 'mono', c: C.dim, p: fp }); g.text('3 000 A →   force × 35 000', rx + 300, 792, { s: 24, f: 'mono', c: C.ink, wt: 700, p: s.in('coil', 8.0) });
      const ep = s.in('chute', 5.0, 0.8, E.o);
      P.panel(g, rx, 850, 670, 130, ep);
      g.text('each small arc needs ≈ 20–30 V to survive', rx + 30, 892, { s: 24, wt: 600, p: ep }); g.text('12 arcs in series  →  more than the 230 V available', rx + 30, 940, { s: 22, c: C.dim, p: s.in('chute', 6.4) });
    },
  });

  // ---------------------------------------------------------------- trip curve + cables
  api.scene('mcb-curve', {
    lines: [
      "@curve|Put both mechanisms on one chart, and you get the breaker's characteristic curve. Current along the bottom, as a multiple of the rated current. Trip time up the side.",
      '@thermal|The sloping part is the bimetal: slower for small overloads. The vertical cliff is the magnetic release.',
      '@bc|Type B trips magnetically at three to five times the rated current. That is the standard in homes. Type C waits until five to ten times, and is used for loads with a large inrush current, such as motors.',
      '@cable|And the rating itself? It is chosen to protect the cable, not the appliance. One and a half square millimetres of copper: ten or thirteen amperes. Two and a half: sixteen. Six square millimetres for a thirty two ampere car charger. The weakest link sets the fuse.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'The trip curve', s.p(0.3, 0.8, E.o));
      const px = 190, py = 230, pw = 880, ph = 680, pa = s.in('curve', 0.6, 0.8, E.o);
      const X = I => px + Math.log(I) / Math.log(30) * pw, Y = tt => py + ph - (Math.log10(tt) + 2) / 6 * ph;
      P.panel(g, 90, 200, 1010, 790, pa);
      g.alpha(pa, () => {
        [1, 2, 3, 5, 10, 20, 30].forEach(I => { g.line([[X(I), py], [X(I), py + ph]], { c: rgba(C.faint, 0.4), w: 1 }); g.text(I + '×', X(I), py + ph + 26, { s: 20, f: 'mono', c: C.dim, al: 'c' }); });
        [[0.01, '10 ms'], [0.1, '0.1 s'], [1, '1 s'], [10, '10 s'], [60, '1 min'], [600, '10 min'], [3600, '1 h']].forEach(([tt, lab]) => { g.line([[px, Y(tt)], [px + pw, Y(tt)]], { c: rgba(C.faint, 0.4), w: 1 }); g.text(lab, px - 14, Y(tt), { s: 19, f: 'mono', c: C.dim, al: 'r' }); });
        g.line([[px, py], [px, py + ph], [px + pw, py + ph]], { c: C.dim, w: 2 });
        g.text('current  ( × rated current )', px + pw / 2, py + ph + 62, { s: 20, c: C.dim, al: 'c' });
        g.text('trip time', px - 96, py - 6, { s: 20, c: C.dim });
      });
      const band = (m0, m1, col, a, trim = 1) => {
        if (a <= 0) return;
        const up = [], lo = [];
        for (let I = 1.45; I <= m1; I *= 1.02) up.push([X(I), Y(Math.min(9000, tHi(I)))]);
        up.push([X(m1), Y(tHi(m1))], [X(m1), Y(Math.min(0.1, tHi(m1)))], [X(30), Y(0.012)]);
        for (let I = 1.13; I <= m0; I *= 1.02) lo.push([X(I), Y(Math.min(9000, tLo(I)))]);
        lo.push([X(m0), Y(tLo(m0))], [X(m0), Y(0.01)], [X(30), Y(0.01)]);
        const c = g.c; c.save(); c.globalAlpha *= a * 0.22; c.fillStyle = col; c.beginPath(); up.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); lo.slice().reverse().forEach(p => c.lineTo(p[0], p[1])); c.closePath(); c.fill(); c.restore();
        g.line(up, { c: col, w: 4, a, glow: 0.7, trim }); g.line(lo, { c: col, w: 4, a, glow: 0.7, trim });
      };
      const cP = s.in('bc', 8.6, 0.9);
      band(5, 10, C.l3, cP);
      band(3, 5, C.l2, s.in('curve', 2.4, 0.6), s.in('curve', 2.4, 2.2, E.io2));
      // region labels
      const th = s.in('thermal', 0.3, 0.7), mg = s.in('thermal', 4.6, 0.7);
      g.tag('thermal  ·  bimetal', X(7), Y(200), { s: 24, c: C.hot, p: th }); g.arrow(X(7) - 110, Y(160), X(2.75), Y(34), { c: C.hot, w: 2.5, a: th });
      g.tag('magnetic  ·  coil', X(14), Y(6), { s: 24, c: C.l2, p: mg }); g.arrow(X(14) - 100, Y(4.5), X(5.25), Y(0.5), { c: C.l2, w: 2.5, a: mg });
      g.text('B', X(3.9), Y(0.022), { s: 46, f: 'disp', wt: 800, c: C.l2, al: 'c', p: s.in('bc', 0.2) }); g.text('3 – 5 ×', X(3.9), Y(0.022) - 46, { s: 20, f: 'mono', c: C.l2, al: 'c', p: s.in('bc', 1.6) });
      g.text('C', X(7.2), Y(0.022), { s: 46, f: 'disp', wt: 800, c: C.l3, al: 'c', p: cP }); g.text('5 – 10 ×', X(7.2), Y(0.022) - 46, { s: 20, f: 'mono', c: C.l3, al: 'c', p: cP });
      // marker examples
      const ex = (I, tt, lab, d, al) => { const p = s.in('thermal', d, 0.6); g.circ(X(I), Y(tt), 8, { fill: '#fff', w: 0, a: p }); g.glowDot(X(I), Y(tt), 26, '#fff', p); g.text(lab, X(I) + (al === 'r' ? -16 : 16), Y(tt) - 22, { s: 19, c: C.ink, wt: 600, p, al, shadow: 8 }); };
      ex(1.56, tLo(1.56) * 6, '25 A on B16: minutes', 1.6); ex(22, 0.011, 'short circuit: milliseconds', 5.6, 'r');
      // cable table
      const rx = 1140, cp2 = s.in('cable', 0.3, 0.8, E.o);
      P.panel(g, rx, 200, 700, 790, cp2);
      g.alpha(cp2, () => {
        g.text('THE BREAKER PROTECTS THE CABLE', rx + 30, 240, { s: 20, c: C.copper, wt: 700, ls: 3 });
        g.text('copper area', rx + 136, 300, { s: 19, c: C.dim }); g.text('breaker', rx + 380, 300, { s: 19, c: C.dim, al: 'c' }); g.text('typical use', rx + 670, 300, { s: 19, c: C.dim, al: 'r' });
      });
      const rows = [['1.5 mm²', 1.5, '10 / 13 A', 'lighting', 5.0], ['2.5 mm²', 2.5, '16 A', 'sockets', 9.0], ['4 mm²', 4, '20 A', 'sauna, big heaters', 11.0], ['6 mm²', 6, '25 / 32 A', 'cooker, car charger', 11.6], ['10 mm²', 10, '50 A', 'sub-board', 12.4]];
      rows.forEach(([mm, a, amp, use, d], i) => {
        const p = s.in('cable', d, 0.7, E.o), y = 380 + i * 122, r = Math.sqrt(a) * 13;
        g.alpha(p, () => {
          g.circ(rx + 80, y, r + 9, { fill: '#39424f', c: '#6b778f', w: 2 }); g.circ(rx + 80, y, r, { fill: C.copper, c: '#ffd2a8', w: 2, glow: 0.4 });
          g.text(mm, rx + 136, y, { s: 28, f: 'mono', wt: 700 }); g.text(amp, rx + 380, y, { s: 32, f: 'mono', wt: 800, c: C.l1, al: 'c' }); g.text(use, rx + 670, y, { s: 21, c: C.dim, al: 'r' });
          g.line([[rx + 30, y + 60], [rx + 670, y + 60]], { c: rgba(C.faint, 0.4), w: 1 });
        });
      });
    },
  });
};
module.exports.mcb = mcb;
