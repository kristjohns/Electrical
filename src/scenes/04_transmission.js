const { W, H, C, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample, rnd } = require('../lib/core');
const P = require('../lib/parts');
const PH = [C.l1, C.l2, C.l3];

function gear(g, x, y, r, n, ang, col) {
  const pts = [], th = TAU / n, add = r * 0.11;
  for (let i = 0; i < n; i++) { const a = ang + i * th; for (const [da, rr] of [[-0.25, r - add], [-0.12, r + add], [0.12, r + add], [0.25, r - add]]) pts.push([x + Math.cos(a + da * th * 2) * rr, y + Math.sin(a + da * th * 2) * rr]); }
  g.line(pts, { close: true, c: col, w: 3, fill: rgba(col, 0.12), join: 'round' });
  g.circ(x, y, r * 0.22, { c: col, w: 3 }); for (let i = 0; i < 3; i++) g.line([[x + Math.cos(ang + i * TAU / 3) * r * 0.22, y + Math.sin(ang + i * TAU / 3) * r * 0.22], [x + Math.cos(ang + i * TAU / 3) * r * 0.78, y + Math.sin(ang + i * TAU / 3) * r * 0.78]], { c: rgba(col, 0.5), w: 3 });
}
// iron core with two windings. flux = -1..1, returns nothing
function transformer(g, x, y, s, t, o = {}) {
  const fl = o.flux === undefined ? Math.sin(t * 3) : o.flux, n1 = o.n1 || 3, n2 = o.n2 || 30, c1 = o.c1 || C.l1, c2 = o.c2 || C.l2;
  g.tf({ x, y, s }, () => {
    const cw = 230, ch = 230, th = 86;
    // core (laminated)
    g.path(c => { c.rect(-cw, -ch, cw * 2, ch * 2); c.rect(-cw + th, -ch + th, (cw - th) * 2, (ch - th) * 2); }, { fill: '#27324f', nostroke: true });
    g.c.save(); g.c.beginPath(); g.c.rect(-cw, -ch, cw * 2, ch * 2); g.c.rect(-cw + th, -ch + th, (cw - th) * 2, (ch - th) * 2); g.c.clip('evenodd');
    for (let i = -ch; i < ch; i += 7) g.line([[-cw, i], [cw, i]], { c: rgba('#8b9bc4', 0.13), w: 1.5 });
    g.c.restore();
    g.rect(-cw, -ch, cw * 2, ch * 2, { c: '#8b9bc4', w: 3 }); g.rect(-cw + th, -ch + th, (cw - th) * 2, (ch - th) * 2, { c: '#8b9bc4', w: 3 });
    // flux loop
    const m = cw - th / 2, loop = [[-m, 0], [-m, -m], [m, -m], [m, m], [-m, m], [-m, 0]];
    const fa = o.fluxA === undefined ? 1 : o.fluxA;
    for (const d of [-16, 0, 16]) { const mm = m + d, lp = [[-mm, 0], [-mm, -mm], [mm, -mm], [mm, mm], [-mm, mm], [-mm, 0]]; g.line(lp, { c: rgba('#c7b6ff', 0.25 + 0.7 * Math.abs(fl)), w: 3, dash: [16, 14], off: -(o.fluxPos || 0), round: 30, a: fa, glow: Math.abs(fl) * 0.7 }); }
    // windings: front half of each turn
    const turn = (lx, yy, col, w) => { g.line([[lx - th / 2 - 12, yy + 5], [lx + th / 2 + 12, yy - 5]], { c: col, w, cap: 'round', glow: 0.4 }); };
    const h1 = 250; for (let i = 0; i < n1; i++) turn(-m, -h1 / 2 + (i + 0.5) * h1 / n1, c1, 20);
    const h2 = 280; for (let i = 0; i < n2; i++) turn(m, -h2 / 2 + (i + 0.5) * h2 / n2, c2, 4.5);
    // leads
    g.line([[-m - th / 2 - 12, -h1 / 2 + h1 / n1 / 2 + 5], [-cw - 120, -h1 / 2 + h1 / n1 / 2 + 5]], { c: c1, w: 8 }); g.line([[-m - th / 2 - 12, h1 / 2 - h1 / n1 / 2 + 5], [-cw - 120, h1 / 2 - h1 / n1 / 2 + 5]], { c: c1, w: 8 });
    g.line([[m + th / 2 + 12, -h2 / 2], [cw + 120, -h2 / 2]], { c: c2, w: 4 }); g.line([[m + th / 2 + 12, h2 / 2 - 10], [cw + 120, h2 / 2 - 10]], { c: c2, w: 4 });
  });
}
function city(g, x, y, s = 1, a = 1, lit = 1) {
  g.tf({ x, y, s, a }, () => {
    const b = [[-80, 70, 40], [-36, 120, 44], [12, 90, 36], [52, 140, 40], [96, 60, 34]];
    b.forEach(([bx, h, w], i) => { g.rect(bx, -h, w, h, { fill: '#18244a', c: '#8fa3d8', w: 2 }); for (let r = 0; r < Math.floor(h / 22); r++) for (let cc = 0; cc < 2; cc++) g.rect(bx + 8 + cc * (w - 24), -h + 10 + r * 22, 8, 10, { fill: rgba('#ffe07a', (0.25 + 0.75 * rnd(i * 7 + r * 3 + cc)) * lit), w: 0 }); });
  });
}

module.exports = api => {
  api.chapter('Transmission', 'Why the grid runs at 420 000 volts');

  // ---------------------------------------------------------------- transformer
  api.scene('tx-transformer', {
    lines: [
      '@gen_v|The generator produces something like ten to twenty kilovolts. To send power across the country, we need to go far higher. Enter the transformer.',
      '@how|Two coils share one iron core. Alternating current in the first coil creates an alternating magnetic flux in the core. That flux induces a voltage in every single turn of the second coil.',
      '@ratio|So the voltage ratio is simply the turns ratio. Ten times more turns gives ten times more voltage. And because power is conserved, ten times less current.',
      '@gear|It is a gearbox for electricity. It trades voltage against current, just as a gearbox trades speed against torque. And it is astonishingly efficient. Large units exceed ninety nine percent.',
      '@dc|But it only works while the flux is changing. Feed it direct current, and nothing comes out. That is why the grid is A C.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'The transformer', s.p(0.3, 0.8, E.o));
      const dc = s.in('dc', 3.0, 0.8) * s.out('dc', 6.6, 0.8);     // DC interlude
      const ph = t * 3.2, fl = lerp(Math.sin(ph), 0.9, dc), dfl = lerp(Math.cos(ph), 0, dc);
      const tp = s.in('gen_v', 6.8, 1.0, E.o);
      g.alpha(tp, () => transformer(g, 640, 580, 0.95, t, { flux: fl, fluxA: s.in('how', 3.2, 0.8), fluxPos: lerp(-Math.cos(ph) * 40, 0, dc) }));
      // side meters
      const meter = (x, title, u, i, ut, it, col, p) => {
        if (p <= 0) return;
        P.panel(g, x - 105, 330, 210, 500, p);
        g.text(title, x, 366, { s: 20, wt: 700, c: col, al: 'c', ls: 2, a: p });
        const bar = (bx, v, c, lab, val) => { g.rect(bx - 22, 420, 44, 290, { r: 6, c: C.line, w: 2, a: p }); const h = 290 * v * p; g.rect(bx - 22, 710 - h, 44, h, { r: 6, fill: rgba(c, 0.85), w: 0, a: p, glow: 0.5, c }); g.text(lab, bx, 738, { s: 24, wt: 700, al: 'c', a: p, c }); g.text(val, bx, 782, { s: 20, f: 'mono', al: 'c', a: p, c: C.ink }); };
        bar(x - 45, u, C.warn, 'U', ut); bar(x + 45, i, C.ok, 'I', it);
      };
      const act = 1 - dc;
      meter(190, 'PRIMARY', 0.1, 1.0 * (0.25 + 0.75 * 1), '20 kV', '5 000 A', C.l1, s.in('ratio', 0.3, 0.8, E.o));
      meter(1090, 'SECONDARY', 1.0 * act, 0.1 * act, dc > 0.5 ? '0 kV' : '200 kV', dc > 0.5 ? '0 A' : '500 A', C.l2, s.in('ratio', 3.0, 0.8, E.o));
      // coil labels
      P.callout(g, 430, 500, 420, 300, 'N₁ turns', 'primary winding', s.in('how', 0.4) * s.out('gear'), { al: 'r', c: C.l1 });
      P.callout(g, 858, 480, 880, 300, 'N₂ turns', 'secondary winding', s.in('how', 1.2) * s.out('gear'), { al: 'l', c: C.l2 });
      P.callout(g, 640, 398, 640, 300, 'alternating flux Φ', null, s.in('how', 4.4) * s.out('gear'), { al: 'c', c: '#c7b6ff' });
      // formulas on the right
      const fx = 1540;
      P.formula(g, 'U_2 / U_1 = N_2 / N_1', fx, 330, s.in('ratio', 1.0, 0.8, E.o), { c: C.warn, s: 46 });
      P.formula(g, 'U_1 · I_1 = U_2 · I_2', fx, 440, s.in('ratio', 6.6, 0.8, E.o), { c: C.ok, s: 46 });
      g.text('power in = power out', fx, 502, { s: 22, c: C.dim, al: 'c', p: s.in('ratio', 7.0) });
      // gearbox analogy
      const gp = s.in('gear', 0.3, 0.9, E.o) * s.out('dc', 0.2);
      if (gp > 0) {
        P.panel(g, fx - 290, 560, 580, 400, gp);
        g.alpha(gp, () => {
          const r1 = 46, r2 = 138, a = t * 2.4;
          gear(g, fx - 160, 730, r1, 10, a, C.l1); gear(g, fx - 160 + r1 + r2 + 4, 730, r2, 30, -a / 3 + Math.PI / 30, C.l2);
          g.text('fast · low torque', fx - 190, 810, { s: 20, c: C.l1, al: 'c' }); g.text('slow · high torque', fx + 60, 900, { s: 20, c: C.l2, al: 'c' });
          g.rich('P = T · ω', fx - 180, 915, { s: 34, wt: 700, al: 'c', c: C.ink, p: s.in('gear', 4.5) });
          g.text('η > 99 %', fx + 205, 596, { s: 30, f: 'disp', wt: 800, c: C.ok, al: 'c', p: s.in('gear', 9.5, 0.8, E.o) });
        });
      }
      const dp = s.in('dc', 0.3, 0.8, E.o);
      if (dp > 0) {
        P.panel(g, fx - 290, 560, 580, 400, dp);
        g.alpha(dp, () => {
          g.text('input', fx - 250, 610, { s: 22, c: C.l1 }); g.text('output', fx - 250, 790, { s: 22, c: C.l2 });
          g.plot(x => lerp(Math.sin(x - ph), 0.9, dc), fx - 250, 630, 500, 110, { xr: [0, TAU * 3], yr: [-1.2, 1.2], c: C.l1, w: 4, glow: 0.7 });
          g.plot(x => lerp(Math.sin(x - ph) * 1, 0, dc), fx - 250, 810, 500, 110, { xr: [0, TAU * 3], yr: [-1.2, 1.2], c: C.l2, w: 4, glow: 0.7 });
          g.tag(dc > 0.5 ? 'DC  →  constant flux  →  no output' : 'AC  →  changing flux  →  output', fx, 590, { s: 20, c: dc > 0.5 ? C.bad : C.ok });
        });
      }
      g.text('dΦ/dt = 0', 640, 580, { s: 44, f: 'mono', wt: 800, al: 'c', c: C.bad, a: dc, shadow: 20 });
    },
  });

  // ---------------------------------------------------------------- why high voltage
  api.scene('tx-why-hv', {
    lines: [
      '@loss|Why go to such extremes? Because every conductor has resistance, and the heat loss in a line is current squared, times resistance.',
      '@same|The same power can be sent as a high current at low voltage, or a low current at high voltage. Imagine sending one hundred megawatts down a hundred kilometre line.',
      '@lv|At twenty two kilovolts, that takes more than two and a half thousand amperes. Well over half the power would be lost, just heating the conductors.',
      '@hv|At four hundred and twenty kilovolts, the current drops to about a hundred and forty amperes. Nineteen times less current means roughly three hundred and sixty times less loss. A fraction of one percent.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'Why high voltage?', s.p(0.3, 0.8, E.o));
      P.formula(g, 'P_{loss} = 3 · I^2 · R', 1500, 130, s.in('loss', 4.6, 0.8, E.o), { c: C.hot, s: 44 });
      P.formula(g, 'P = √3 · U · I', 1060, 130, s.in('same', 0.4, 0.8, E.o), { c: C.l2, s: 44 });
      const rows = [
        { y: 400, kv: '22 kV', amp: '2 624 A', key: 'lv', heat: 1, lossT: '62 MW lost', pct: '62 %', del: '38 MW', frac: 0.38, col: C.bad },
        { y: 760, kv: '420 kV', amp: '137 A', key: 'hv', heat: 0.02, lossT: '0.17 MW lost', pct: '0.17 %', del: '99.8 MW', frac: 0.998, col: C.ok },
      ];
      const x0 = 380, x1 = 1480;
      rows.forEach((r, ri) => {
        const p = s.in('same', 4.6 + ri * 0.4, 0.9, E.o), on = s.in(r.key, 0.2, 0.8);
        P.panel(g, 90, r.y - 150, 1740, 300, p);
        g.alpha(p, () => {
          // source
          g.circ(210, r.y, 62, { fill: '#2a2110', c: C.l1, w: 3, glow: 0.5 }); g.text('100', 210, r.y - 12, { s: 34, wt: 800, al: 'c', c: C.l1 }); g.text('MW', 210, r.y + 22, { s: 22, wt: 600, al: 'c', c: C.l1 });
          // line of three conductors
          for (let k = 0; k < 3; k++) {
            const yy = r.y - 26 + k * 26, pts = [[x0, yy], [x1, yy]];
            g.line([[272, r.y], [x0 - 20, r.y], [x0, yy]], { c: C.line, w: 3 });
            g.line(pts, { c: mix('#55607f', C.hot, on * r.heat), w: 5, glow: on * r.heat * 1.3 });
            // energy thinning out
            const n = 22; for (let i = 0; i < n; i++) { const u = ((t * 0.25 + i / n) % 1), keep = rnd(i * 3 + k) > u * (1 - r.frac) * on; if (keep) g.circ(lerp(x0, x1, u), yy, 5, { fill: C.energy, w: 0, a: 0.95 }); }
            g.line([[x1, yy], [x1 + 20, r.y], [x1 + 60, r.y]], { c: C.line, w: 3 });
          }
          // heat shimmer
          if (r.heat > 0.5) for (let i = 0; i < 40; i++) { const u = (t * 0.6 + rnd(i * 5)) % 1, hx = x0 + rnd(i) * (x1 - x0); g.line(sample(v => [hx + Math.sin(v * 8 + i) * 5, r.y - 40 - (u + v * 0.3) * 34], 0, 1, 6), { c: rgba(C.hot, 0.5 * on * (1 - u)), w: 2.5 }); }
          g.text('100 km', (x0 + x1) / 2, r.y + 62, { s: 20, c: C.faint, al: 'c' });
          city(g, 1640, r.y + 56, 0.9, 1, 0.2 + 0.8 * lerp(1, r.frac, on));
        });
        g.text(r.kv, x0, r.y - 108, { s: 46, f: 'disp', wt: 800, c: C.warn, p: s.in(r.key, 0.2, 0.7, E.o) });
        g.text(r.amp, x0 + 260, r.y - 106, { s: 36, f: 'mono', wt: 700, c: C.ok, p: s.in(r.key, ri ? 3.4 : 2.4, 0.7, E.o) });
        g.tag(r.lossT + '  ·  ' + r.pct, x1 - 170, r.y - 108, { s: 26, c: r.col, f: 'mono', p: s.in(r.key, ri ? 12.4 : 5.6, 0.7, E.o) });
        g.text('delivered', 1640, r.y + 82, { s: 18, c: C.dim, al: 'c', p: s.in(r.key, ri ? 13 : 6.4) }); g.text(r.del, 1640, r.y + 112, { s: 28, f: 'mono', wt: 700, c: r.col, al: 'c', p: s.in(r.key, ri ? 13 : 6.4) });
      });
      g.text('÷ 19 current   →   ÷ 364 loss', W / 2, 580, { s: 36, wt: 700, al: 'c', c: C.ink, p: s.in('hv', 6.6, 0.8, E.o) });
    },
  });

  // ---------------------------------------------------------------- grid levels
  api.scene('tx-levels', {
    lines: [
      '@levels|The Norwegian grid has three levels. At the top, the transmission grid: the motorways. Three hundred, and four hundred and twenty kilovolts, operated by Statnett.',
      '@regional|Below it, the regional grid, typically sixty six and a hundred and thirty two kilovolts, linking the motorways to towns and industry.',
      '@dist|And finally the distribution grid, usually twenty two or eleven kilovolts, run by your local grid company. It feeds the small substations in your neighbourhood.',
      '@pylon|At every step down there is a substation, with transformers, circuit breakers, and protection relays that can isolate a faulty line in less than a tenth of a second.',
    ],
    draw(g, s) {
      const t = s.t, GY = 640;
      P.heading(g, 'Three levels of grid', s.p(0.3, 0.8, E.o));
      g.line([[0, GY], [W, GY]], { c: '#2a3b66', w: 2.5, a: s.p(0.4, 0.8) });
      const st = [s.in('levels', 2.6, 1.0, E.o), s.in('regional', 0.2, 1.0, E.o), s.in('dist', 0.2, 1.0, E.o)];
      // faulty span logic (stage 1, second span)
      const ft = s.since('pylon') - 7.2, fault = ft > 0 && ft < 0.5, cleared = ft >= 0.35;
      // --- stage 1: 420 kV
      g.alpha(st[0], () => {
        const a = [P.pylon(g, 170, GY, 340), P.pylon(g, 470, GY, 340)];
        for (let k = 0; k < 3; k++) {
          const sp1 = P.span([-40, a[0][k][1] - 20], a[0][k], 30), sp2 = P.span(a[0][k], a[1][k], 44), sp3 = P.span(a[1][k], [690 + (k - 1) * 22, GY - 96], 22);
          g.wire(sp1.concat(sp2), { c: PH[k], w: 2.5, flow: true, t, speed: 200, gap: 70 });
          g.wire(sp3, { c: PH[k], w: 2.5, flow: true, t, speed: 200, gap: 70 });
        }
      });
      g.alpha(s.in('regional', 0, 0.8), () => P.substation(g, 700, GY, 1.05));
      // --- stage 2: 132 kV (with fault demo)
      g.alpha(st[1], () => {
        const a = [P.pylon(g, 900, GY, 220), P.pylon(g, 1110, GY, 220)];
        for (let k = 0; k < 3; k++) {
          const sp1 = P.span([722 + (k - 1) * 22, GY - 96], a[0][k], 16), sp2 = P.span(a[0][k], a[1][k], 30), sp3 = P.span(a[1][k], [1300 + (k - 1) * 20, GY - 80], 14);
          const on = cleared ? 0.05 : 1;
          g.wire(sp1.concat(sp2, sp3), { c: PH[k], w: 2.2, flow: !cleared, on, t, speed: 170, gap: 60 });
        }
        if (fault) { const fx = 1005, fy = GY - 190; g.glowDot(fx, fy, 130 * (1 - ft), '#ffffff', 1); g.line([[fx - 10, fy - 70], [fx + 14, fy - 30], [fx - 8, fy - 26], [fx + 12, fy + 30]], { c: '#fff', w: 5, glow: 2 }); }
      });
      g.alpha(s.in('dist', 0, 0.8), () => P.substation(g, 1310, GY, 0.85));
      // breaker indicator at substation 1
      const bp = s.in('pylon', 5.4, 0.6, E.o);
      if (bp > 0) {
        g.rect(748, GY - 150, 34, 34, { r: 6, fill: cleared ? rgba(C.bad, 0.3) : rgba(C.ok, 0.3), c: cleared ? C.bad : C.ok, w: 3, a: bp, glow: 1 });
        g.line(cleared ? [[755, GY - 123], [771, GY - 146]] : [[755, GY - 133], [775, GY - 133]], { c: '#fff', w: 3, a: bp });
        g.text(cleared ? 'breaker open  ·  fault isolated in < 0.1 s' : 'circuit breaker  ·  closed', 765, GY - 180, { s: 22, wt: 600, c: cleared ? C.bad : C.ok, al: 'c', a: bp, shadow: 10 });
      }
      // --- stage 3: 22 kV
      g.alpha(st[2], () => {
        const px = [1440, 1560, 1680];
        px.forEach(x => { g.line([[x, GY], [x, GY - 120]], { c: '#8a7256', w: 6, cap: 'butt' }); g.line([[x - 26, GY - 108], [x + 26, GY - 108]], { c: '#8a7256', w: 5 }); });
        for (let k = 0; k < 3; k++) { const dx = (k - 1) * 22; let pts = P.span([1330 + (k - 1) * 18, GY - 76], [px[0] + dx, GY - 110], 8); for (let i = 0; i < 2; i++) pts = pts.concat(P.span([px[i] + dx, GY - 110], [px[i + 1] + dx, GY - 110], 14)); pts = pts.concat([[1760, GY - 60]]); g.wire(pts, { c: PH[k], w: 2, flow: true, t, speed: 140, gap: 54 }); }
        P.kiosk(g, 1770, GY, 0.9);
        P.house(g, { x: 1832, y: GY, s: 0.075, show: { ground: false, car: false }, lamp: 1 });
      });
      // --- cards
      const cards = [
        [90, 'TRANSMISSION GRID', 'transmisjonsnett', '300 – 420 kV', 'Statnett  ·  the motorways', C.l3],
        [690, 'REGIONAL GRID', 'regionalnett', '66 – 132 kV', 'towns and industry  ·  the main roads', C.l2],
        [1290, 'DISTRIBUTION GRID', 'distribusjonsnett', '11 – 22 kV', 'local grid company  ·  the streets', C.l1],
      ];
      cards.forEach(([x, name, no, kv, who, col], i) => {
        const p = st[i]; if (p <= 0) return;
        P.panel(g, x, 700 + (1 - p) * 20, 540, 270, p, { c: rgba(col, 0.45) });
        g.text(name, x + 30, 742, { s: 22, wt: 700, c: col, ls: 3, a: p }); g.text(no, x + 510, 742, { s: 20, c: C.dim, al: 'r', it: true, a: p });
        g.text(kv, x + 30, 826, { s: 74, f: 'disp', wt: 800, a: p }); g.text(who, x + 30, 918, { s: 24, c: C.dim, a: p });
      });
    },
  });
};
module.exports.transformer = transformer;
module.exports.city = city;
