const { W, H, C, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample, rnd } = require('../lib/core');
const P = require('../lib/parts');
const PH = [C.l1, C.l2, C.l3];

function coilH(g, x0, y, x1, col, o = {}) { // horizontal inductor symbol
  const n = o.n || 5, w = (x1 - x0) / n;
  g.path(c => { c.moveTo(x0, y); for (let i = 0; i < n; i++) c.arc(x0 + w * (i + 0.5), y, w / 2, Math.PI, 0); }, { c: col, w: o.w || 5, glow: o.glow === undefined ? 0.5 : o.glow, a: o.a });
}
function earthSym(g, x, y, col = C.pe, a = 1, s = 1) {
  g.line([[x, y - 24 * s], [x, y]], { c: col, w: 4, a });
  for (let i = 0; i < 3; i++) g.line([[x - (22 - i * 7) * s, y + i * 9 * s], [x + (22 - i * 7) * s, y + i * 9 * s]], { c: col, w: 4, a });
}
function bracket(g, x, y0, y1, label, col, p, o = {}) {
  if (p <= 0.003) return;
  g.line([[x - 10, y0], [x + 10, y0]], { c: col, w: 2.5, a: p }); g.line([[x - 10, y1], [x + 10, y1]], { c: col, w: 2.5, a: p });
  const m = (y0 + y1) / 2;
  g.arrow(x, m, x, lerp(m, y0 + 4, p), { c: col, w: 2.5, head: 11, a: p }); g.arrow(x, m, x, lerp(m, y1 - 4, p), { c: col, w: 2.5, head: 11, a: p });
  g.tag(label, x + (o.dx === undefined ? 0 : o.dx), m, { s: o.s || 26, c: col, f: 'mono', bg: rgba('#0a1124', 0.95), p });
}
function ground(g, y, a = 1, x0 = 60, x1 = W - 60) {
  g.line([[x0, y], [x1, y]], { c: rgba(C.pe, 0.55), w: 3, a });
  for (let x = x0 + 10; x < x1; x += 26) g.line([[x, y + 3], [x - 12, y + 16]], { c: rgba(C.pe, 0.25), w: 2, a });
}

// The supply system schematic. it = 0 (TN) .. 1 (IT)
function system(g, t, o) {
  const it = o.it || 0, tn = 1 - it, ys = [330, 450, 570], yN = 680, GND = 830, xa = 200, xb = 430, xh = 1250;
  const a = o.a === undefined ? 1 : o.a;
  g.alpha(a, () => {
    ground(g, GND, o.gnd === undefined ? 1 : o.gnd);
    g.text('EARTH', 80, GND + 40, { s: 18, c: rgba(C.pe, 0.7), wt: 700, ls: 3, a: o.gnd === undefined ? 1 : o.gnd });
    // transformer
    g.rect(120, 250, 400, 500, { r: 20, c: rgba(C.steel, 0.5), w: 2, dash: [10, 8] });
    g.text('TRANSFORMER  ·  secondary', 140, 225, { s: 18, c: C.steel, wt: 700, ls: 2 });
    const wp = o.wind === undefined ? 1 : o.wind;
    g.line([[xa, ys[0]], [xa, ys[2]]], { c: C.steel, w: 5, a: wp });
    g.circ(xa, ys[1], 9, { fill: C.steel, w: 0, a: wp });
    ys.forEach((y, k) => {
      coilH(g, xa, y, xb, PH[k], { a: wp });
      const lp = o.lines === undefined ? 1 : o.lines;
      g.wire([[xb, y], [xh, y]], { c: PH[k], w: 5, trim: lp, flow: o.flow, t, off: -Math.cos(t * 2.4 - k * TAU / 3) * 50, gap: 60 });
      g.text('L' + (k + 1), xb + 46, y - 24, { s: 28, wt: 800, c: PH[k], a: lp });
    });
    // winding voltage labels
    const wv = o.windV || 0;
    ys.forEach((y, k) => g.text(it > 0.5 ? '133 V' : '230 V', (xa + xb) / 2, y + 30, { s: 20, f: 'mono', c: C.dim, al: 'c', a: wv * Math.abs(it * 2 - 1) }));
    // neutral / PEN (TN)
    const np = (o.neutral === undefined ? 1 : o.neutral) * tn;
    if (np > 0) {
      g.line([[xa, ys[2]], [xa, yN]], { c: C.n, w: 5, a: np });
      g.wire([[xa, yN], [xh, yN]], { c: C.n, w: 5, a: np, trim: o.neutral === undefined ? 1 : o.neutral, flow: o.flow, t, off: 0, gap: 60, on: 0.9 });
      g.text('N', xb + 46, yN - 24, { s: 28, wt: 800, c: C.n, a: np }); g.text('(PEN)', xb + 76, yN - 22, { s: 20, c: C.dim, a: np });
    }
    // earthing of the star point
    const ep = o.earth === undefined ? 1 : o.earth;
    g.line([[xa, tn > 0.5 ? yN : ys[2]], [xa, GND - 60]], { c: C.pe, w: 4, a: ep * tn });
    g.line([[xa, GND - 60], [xa, GND - 24]], { c: C.pe, w: 4, a: ep });
    earthSym(g, xa, GND, C.pe, ep);
    if (it > 0) { // isolated: open gap with spark-gap symbol
      g.line([[xa, ys[2]], [xa, 700]], { c: C.steel, w: 4, a: it * ep });
      g.path(c => { c.moveTo(xa - 12, 700); c.lineTo(xa + 12, 700); c.lineTo(xa, 722); c.closePath(); }, { fill: C.steel, w: 0, a: it * ep });
      g.path(c => { c.moveTo(xa - 12, GND - 60); c.lineTo(xa + 12, GND - 60); c.lineTo(xa, GND - 82); c.closePath(); }, { fill: C.pe, w: 0, a: it * ep });
      g.text('isolated', xa + 26, 728, { s: 22, wt: 700, c: C.warn, a: it * ep }); g.text('(only a surge arrester)', xa + 26, 756, { s: 17, c: C.dim, a: it * ep });
    }
    // stray capacitance (IT)
    const cp = (o.stray || 0) * it;
    if (cp > 0) ys.forEach((y, k) => {
      const x = 640 + k * 90;
      g.line([[x, y], [x, 740]], { c: rgba(PH[k], 0.6), w: 2, dash: [5, 6], a: cp }); g.line([[x - 14, 740], [x + 14, 740]], { c: PH[k], w: 3, a: cp }); g.line([[x - 14, 752], [x + 14, 752]], { c: C.pe, w: 3, a: cp }); g.line([[x, 752], [x, GND]], { c: rgba(C.pe, 0.6), w: 2, dash: [5, 6], a: cp });
    });
    if (cp > 0) g.text('stray capacitance of the cables', 870, 772, { s: 20, c: C.dim, a: cp });
    // house
    const hp = o.house === undefined ? 1 : o.house;
    if (hp > 0) g.alpha(hp, () => {
      g.path(c => { c.moveTo(xh - 20, 270); c.lineTo(xh + 290, 170); c.lineTo(xh + 600, 270); }, { c: '#7f93c8', w: 5 });
      g.rect(xh, 270, 580, 490, { c: '#7f93c8', w: 4, fill: rgba('#141f3b', 0.7) });
      g.text('YOUR HOME', xh + 290, 232, { s: 20, c: '#9fb2e6', wt: 700, ls: 3, al: 'c' });
      ys.forEach((y, k) => g.line([[xh, y], [xh + 540, y]], { c: rgba(PH[k], 0.85), w: 4 }));
      if (tn > 0) g.line([[xh, yN], [xh + 540, yN]], { c: C.n, w: 4, a: tn });
      // PE in the house
      g.line([[xh + 40, 730], [xh + 540, 730]], { c: C.pe, w: 4, dash: [14, 8], cap: 'butt' });
      g.text('PE', xh + 552, 730, { s: 20, wt: 800, c: C.pe });
      g.line([[xh + 40, yN], [xh + 40, 730]], { c: C.pe, w: 4, a: tn }); g.circ(xh + 40, yN, 7, { fill: C.pe, w: 0, a: tn });
      g.line([[xh + 90, 730], [xh + 90, GND - 24]], { c: C.pe, w: 4 }); earthSym(g, xh + 90, GND, C.pe, 1);
      // loads
      const lp = o.loads || 0;
      const load = (x, ya, yb, label, ca, cb, vis, big) => {
        if (vis <= 0) return; const ym = (ya + yb) / 2;
        g.alpha(vis, () => {
          g.line([[x, ya], [x, ym - 26]], { c: ca, w: 3.5 }); g.line([[x, ym + 26], [x, yb]], { c: cb, w: 3.5 }); g.circ(x, ya, 7, { fill: ca, w: 0 }); g.circ(x, yb, 7, { fill: cb, w: 0 });
          g.rect(x - 44, ym - 26, 88, 52, { r: 10, fill: '#1c2a52', c: '#c9d6ff', w: 2.5 }); g.text(label, x, ym + 1, { s: 19, wt: 700, al: 'c' });
          g.glowDot(x, ym, 60, C.energy, 0.25 + 0.2 * Math.sin(t * 3 + x));
        });
      };
      // TN loads: line-to-neutral ; IT loads: line-to-line
      load(xh + 170, ys[0], yN, '230 V', PH[0], C.n, lp * tn);
      load(xh + 290, ys[1], yN, '230 V', PH[1], C.n, lp * tn);
      load(xh + 170, ys[0], ys[1], '230 V', PH[0], PH[1], lp * it);
      load(xh + 290, ys[1], ys[2], '230 V', PH[1], PH[2], lp * it);
      // three-phase load
      const p3 = o.load3 || 0;
      if (p3 > 0) g.alpha(p3, () => { const x = xh + 440; ys.forEach((y, k) => { g.line([[x - 24 + k * 24, y], [x - 24 + k * 24, 632]], { c: PH[k], w: 3.5 }); g.circ(x - 24 + k * 24, y, 7, { fill: PH[k], w: 0 }); }); g.rect(x - 54, 620, 108, 60, { r: 10, fill: '#1c2a52', c: '#c9d6ff', w: 2.5 }); g.text(it > 0.5 ? '3 × 230 V' : '3 × 400 V', x, 651, { s: 19, wt: 700, al: 'c' }); });
    });
  });
  return { ys, yN, GND, xh };
}

module.exports = api => {
  api.chapter('The Norwegian Speciality', 'IT, TT and TN: three ways to earth a grid');

  // ------------------------------------------------------------------ TN then IT
  api.scene('sys-compare', {
    lines: [
      "@std|Let's start with the European standard, called TN. The transformer's three secondary windings are connected in a star. The centre of the star, the neutral point, is connected solidly to earth, and brought out as a fourth conductor.",
      '@v|Each winding produces two hundred and thirty volts. So from any line to neutral, you get two hundred and thirty. From line to line, root three times more: four hundred.',
      '@use|Sockets and lights connect between one line and the neutral. Large loads can use all three lines, at four hundred volts.',
      '@new|This is what is built in new Norwegian developments today.',
      '@old|But most existing Norwegian homes are connected to something different: the I T system. Here, each winding produces a hundred and thirty three volts, so that line to line you measure two hundred and thirty.',
      '@noN|There is no neutral conductor at all. And the star point is not connected to earth. The whole system floats, tied to earth only through the tiny stray capacitance of the cables.',
      '@socket|So in an I T home, an ordinary socket is fed by two line conductors. Both pins are live. Neither is a neutral. Each sits at about a hundred and thirty three volts relative to earth.',
      '@why|Why did Norway choose this? Partly history, and partly geology. Norway is built on rock, where good earth connections are hard to make, and an isolated system does not depend on them. It also has a remarkable property.',
    ],
    draw(g, s) {
      const t = s.t, it = s.in('old', 0.6, 2.0);
      const title = it < 0.5 ? 'TN system  ·  400 V' : 'IT system  ·  230 V';
      P.heading(g, title, s.p(0.3, 0.8, E.o) * Math.abs(it * 2 - 1));
      g.tag(it < 0.5 ? 'the European standard  ·  TN-C-S' : 'the Norwegian classic', 760, 126, { s: 22, c: it < 0.5 ? C.l2 : C.l1, p: s.in('std', 1.0) * Math.abs(it * 2 - 1), al: 'l' });
      const sys = system(g, t, {
        it, wind: s.in('std', 3.4, 1.0), lines: s.in('std', 4.6, 1.2), neutral: s.in('std', 12.4, 1.0), earth: s.in('std', 9.6, 0.8), gnd: s.in('std', 8.6, 0.8),
        windV: s.in('v', 0.3, 0.6), house: s.in('use', -0.6, 0.9, E.o), loads: s.in('use', 0.6, 0.8), load3: s.in('use', 4.6, 0.8), flow: true,
        stray: s.in('noN', 6.6, 1.0),
      });
      const { ys, yN, GND, xh } = sys, tn = 1 - it;
      // star point label
      P.callout(g, 200, 450, 60, 380, 'star point', null, s.in('std', 7.0) * s.out('v', -0.5), { al: 'l', c: C.steel, s: 22 });
      // TN voltages
      bracket(g, 700, ys[2], yN, '230 V', C.n, s.in('v', 4.4, 0.7) * tn);
      bracket(g, 880, ys[0], ys[1], '400 V', C.ink, s.in('v', 8.6, 0.7) * tn);
      bracket(g, 1060, ys[1], ys[2], '400 V', C.ink, s.in('v', 9.2, 0.7) * tn);
      g.tag('new Norwegian developments', 880, 220, { s: 26, c: C.ok, p: s.in('new', 0.6) * s.out('old', 0) });
      // IT voltages
      bracket(g, 880, ys[0], ys[1], '230 V', C.ink, s.in('old', 9.6, 0.7) * it);
      bracket(g, 1060, ys[1], ys[2], '230 V', C.ink, s.in('old', 10.2, 0.7) * it);
      const noN = s.in('noN', 0.3, 0.6) * s.out('noN', 4.0);
      g.text('no neutral conductor', 840, yN, { s: 34, wt: 700, c: C.n, al: 'c', a: noN });
      g.line([[560, yN + 26], [1120, yN + 26]], { c: rgba(C.n, 0.5), w: 2, dash: [10, 10], a: noN });
      // socket close-up (IT)
      const sp = s.in('socket', 0.6, 0.9, E.o) * s.out('why', 0.2);
      if (sp > 0) {
        P.panel(g, 560, 610, 620, 300, sp, { fill: rgba('#0a1124', 0.96), c: rgba(C.l1, 0.5) });
        g.alpha(sp, () => {
          const cx = 700, cy = 760;
          g.circ(cx, cy, 92, { fill: '#18244a', c: '#c9d6ff', w: 4 }); g.circ(cx, cy, 72, { c: rgba('#c9d6ff', 0.4), w: 2 });
          g.circ(cx - 32, cy, 13, { fill: '#05080f', c: PH[0], w: 4, glow: 1 }); g.circ(cx + 32, cy, 13, { fill: '#05080f', c: PH[1], w: 4, glow: 1 });
          g.rect(cx - 7, cy - 78, 14, 16, { fill: C.pe, w: 0 }); g.rect(cx - 7, cy + 62, 14, 16, { fill: C.pe, w: 0 });
          g.text('L1', cx - 32, cy + 36, { s: 18, wt: 800, c: PH[0], al: 'c' }); g.text('L2', cx + 32, cy + 36, { s: 18, wt: 800, c: PH[1], al: 'c' });
          g.text('between the pins', 830, 680, { s: 22, c: C.dim }); g.text('230 V', 1040, 680, { s: 34, f: 'mono', wt: 800, c: C.ink });
          g.text('L1 to earth', 830, 750, { s: 22, c: C.dim, a: s.in('socket', 8.5) }); g.text('≈ 133 V', 1010, 750, { s: 34, f: 'mono', wt: 800, c: PH[0], a: s.in('socket', 8.5) });
          g.text('L2 to earth', 830, 820, { s: 22, c: C.dim, a: s.in('socket', 8.9) }); g.text('≈ 133 V', 1010, 820, { s: 34, f: 'mono', wt: 800, c: PH[1], a: s.in('socket', 8.9) });
          g.text('both pins are live', 830, 876, { s: 22, wt: 700, c: C.warn, a: s.in('socket', 4.6) });
        });
      }
      // why: rock
      const wp = s.in('why', 2.6, 0.9, E.o);
      if (wp > 0) {
        P.panel(g, 560, 640, 620, 250, wp, { fill: rgba('#0a1124', 0.96) });
        g.alpha(wp, () => {
          g.path(c => { c.moveTo(590, 860); c.lineTo(640, 760); c.lineTo(700, 800); c.lineTo(760, 720); c.lineTo(830, 790); c.lineTo(880, 750); c.lineTo(930, 860); c.closePath(); }, { fill: '#2a3550', c: C.steel, w: 2.5 });
          g.text('bedrock  =  poor earth', 960, 770, { s: 24, wt: 700, c: C.ink }); g.text('an isolated system', 960, 810, { s: 22, c: C.dim }); g.text("doesn't depend on it", 960, 840, { s: 22, c: C.dim });
          g.text('HISTORY + GEOLOGY', 590, 676, { s: 20, c: C.l1, wt: 700, ls: 3 });
        });
      }
    },
  });

  // ------------------------------------------------------------------ first fault
  api.scene('sys-fault', {
    lines: [
      '@tnfault|In a TN system, if a live wire touches an earthed metal casing, there is a low resistance loop straight back to the transformer. Hundreds of amperes flow, and the breaker trips at once.',
      '@itfault|In an I T system, the same fault has no return path. Only a small capacitive current flows. Nothing burns, nothing trips, and the lights stay on. The fault simply ties that line to earth, and the other two rise to two hundred and thirty volts above ground.',
      "@second|The danger is the second fault. A fault on a different line, perhaps in your neighbour's house, now creates a short circuit through the earth itself.",
      '@rcd|That is why earth fault protection matters so much in Norway. We will open one up shortly.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'What happens at an earth fault?', s.p(0.3, 0.8, E.o));
      const panelW = 860, ys = [330, 400, 470], yN = 540, GND = 840;
      const drawSide = (x0, isIT, p) => {
        if (p <= 0) return;
        P.panel(g, x0, 210, panelW, 770, p, { c: rgba(isIT ? C.l1 : C.l2, 0.4) });
        g.alpha(p, () => {
          g.text(isIT ? 'IT  ·  230 V  ·  isolated' : 'TN  ·  400 V  ·  earthed neutral', x0 + 30, 250, { s: 22, c: isIT ? C.l1 : C.l2, wt: 700, ls: 2 });
          ground(g, GND, 1, x0 + 30, x0 + panelW - 30);
          const xa = x0 + 80, xb = x0 + 210, xe = x0 + panelW - 40;
          g.line([[xa, ys[0]], [xa, ys[2]]], { c: C.steel, w: 4 });
          const trip = !isIT && s.sinceE('tnfault') > 9.4;
          const second = isIT && s.sinceE('second') > 3.2, trip2 = isIT && s.sinceE('second') > 8.4;
          const dead = trip || trip2;
          ys.forEach((y, k) => { coilH(g, xa, y, xb, PH[k], { w: 4 }); g.wire([[xb, y], [xe, y]], { c: PH[k], w: 4, on: dead ? 0.1 : 1, flow: !dead, t, off: -Math.cos(t * 2.4 - k * TAU / 3) * 50, gap: 60 }); g.text('L' + (k + 1), xb + 20, y - 20, { s: 20, wt: 800, c: PH[k] }); });
          if (!isIT) { g.line([[xa, ys[2]], [xa, yN]], { c: C.n, w: 4 }); g.line([[xa, yN], [xe, yN]], { c: C.n, w: 4 }); g.text('PEN', xb + 20, yN - 20, { s: 20, wt: 800, c: C.n }); g.line([[xa, yN], [xa, GND - 24]], { c: C.pe, w: 4 }); earthSym(g, xa, GND); }
          else { g.line([[xa, ys[2]], [xa, 560]], { c: C.steel, w: 4 }); g.text('not earthed', xa + 16, 580, { s: 18, c: C.warn, wt: 700 }); for (let k = 1; k < 3; k++) { const x = x0 + 300 + k * 50; g.line([[x, ys[k]], [x, 700]], { c: rgba(PH[k], 0.6), w: 2, dash: [5, 6] }); g.line([[x - 12, 700], [x + 12, 700]], { c: PH[k], w: 3 }); g.line([[x - 12, 711], [x + 12, 711]], { c: C.pe, w: 3 }); g.line([[x, 711], [x, GND]], { c: rgba(C.pe, 0.6), w: 2, dash: [5, 6] }); } g.text('stray C', x0 + 420, 706, { s: 17, c: C.dim }); }
          // appliance with fault
          const ax = x0 + 600, ay = 650, key = isIT ? 'itfault' : 'tnfault', fp = s.in(key, isIT ? 2.4 : 3.0, 0.3);
          const appliance = (cx, k, fk, live) => {
            g.line([[cx - 20, ys[k]], [cx - 20, ay - 60]], { c: PH[k], w: 3 }); g.circ(cx - 20, ys[k], 6, { fill: PH[k], w: 0 });
            g.rect(cx - 62, ay - 60, 124, 124, { r: 12, fill: '#1a2747', c: mix('#c9d6ff', C.bad, live), w: 3.5, glow: live }); g.circ(cx, ay + 6, 34, { c: rgba('#c9d6ff', 0.7), w: 2.5 }); g.rect(cx - 46, ay - 48, 36, 12, { r: 3, c: rgba('#c9d6ff', 0.6), w: 2 });
            g.line([[cx, ay + 64], [cx, isIT ? GND - 24 : yN + 120]], { c: C.pe, w: 4 }); if (isIT) earthSym(g, cx, GND); g.text('PE', cx + 12, ay + 90, { s: 17, wt: 800, c: C.pe });
            if (fk > 0) { const bx = cx - 20, by = ay - 60; g.line([[bx - 8, by - 34], [bx + 8, by - 14], [bx - 6, by - 10], [bx + 6, by + 14]], { c: '#fff', w: 4, glow: 2, a: 0.6 + 0.4 * Math.sin(t * 30) }); g.glowDot(bx, by - 6, 40, C.warn, fk); }
          };
          appliance(ax, 0, dead ? 0 : fp, 0);
          if (!isIT) { g.line([[ax, yN + 120], [ax + 100, yN + 120], [ax + 100, yN]], { c: C.pe, w: 4 }); g.circ(ax + 100, yN, 6, { fill: C.pe, w: 0 }); }
          // fault current loops
          if (!isIT && fp > 0 && !trip) {
            const loop = [[xb, ys[0]], [ax - 20, ys[0]], [ax - 20, ay - 60], [ax, ay], [ax, yN + 120], [ax + 100, yN + 120], [ax + 100, yN], [xa, yN], [xa, ys[0]], [xb, ys[0]]];
            g.flow(loop, { c: C.bad, w: 13, len: 30, gap: 56, speed: 700, t, a: fp, glow: 1.4 });
            g.tag('fault current: hundreds of amperes', x0 + 300, 770, { s: 24, c: C.bad, p: s.in(key, 5.6) });
          }
          if (trip) { g.tag('breaker tripped in milliseconds', x0 + 300, 770, { s: 26, c: C.ok }); g.text('circuit dead  ·  safe', x0 + 430, 905, { s: 26, wt: 700, c: C.ok, al: 'c' }); }
          if (isIT && fp > 0 && !second) {
            const lp = [[ax - 20, ys[0]], [ax - 20, ay - 60], [ax, ay], [ax, GND], [x0 + 400, GND], [x0 + 400, ys[2]]];
            g.flow(lp, { c: C.warn, w: 5, gap: 70, speed: 60, t, a: fp * 0.9 });
            g.tag('a few milliamperes, through the stray capacitance', x0 + 430, 905, { s: 22, c: C.warn, p: s.in(key, 3.6) });
            const vp = s.in(key, 13.0, 0.7);
            g.tag('L1: 0 V to earth', x0 + 700, 300, { s: 20, c: PH[0], f: 'mono', p: vp }); g.tag('L2: 230 V to earth', x0 + 700, 368, { s: 20, c: PH[1], f: 'mono', p: vp }); g.tag('L3: 230 V to earth', x0 + 700, 436, { s: 20, c: PH[2], f: 'mono', p: vp });
            g.text('lights stay on', x0 + 60, 650, { s: 28, wt: 700, c: C.ok, p: s.in(key, 7.2) });
          }
          if (second) {
            const bx = x0 + 780; appliance(bx, 1, trip2 ? 0 : 1, 0);
            g.text("neighbour's house", bx + 4, 552, { s: 17, c: C.ink, al: 'c', shadow: 8 });
            if (!trip2) { const lp = [[xb, ys[0]], [ax - 20, ys[0]], [ax - 20, ay - 60], [ax, ay], [ax, GND + 8], [bx, GND + 8], [bx, ay], [bx - 20, ay - 60], [bx - 20, ys[1]], [xb, ys[1]]]; g.flow(lp, { c: C.bad, w: 13, len: 30, gap: 56, speed: 600, t, glow: 1.4 }); g.tag('short circuit L1 – L2 through the earth', x0 + 430, 905, { s: 24, c: C.bad }); }
            else g.tag('protection must now disconnect', x0 + 430, 905, { s: 24, c: C.ok });
          }
        });
      };
      drawSide(90, false, s.in('tnfault', 0.2, 0.8, E.o));
      drawSide(970, true, s.in('itfault', 0.2, 0.8, E.o));
    },
  });

  // ------------------------------------------------------------------ consequences
  api.scene('sys-consequences', {
    lines: [
      '@cons|The practical consequences are everywhere. Because both conductors are live, Norwegian circuit breakers are two pole. They disconnect both wires at once.',
      '@pwr|And for the same current, a lower voltage means less power. With a sixty three ampere main fuse, three-phase two hundred and thirty volts gives you twenty five kilowatts. Three-phase four hundred gives nearly forty four.',
      '@tt|There is also a third variant, TT, found in parts of western and southern Norway. From inside the house it looks just like I T: two hundred and thirty volts between lines, and no neutral. But the star point of the transformer is earthed.',
      '@check|Which system you have is the first thing an electrician checks, because it decides how everything downstream must be built.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'What it means in practice', s.p(0.3, 0.8, E.o));
      // two-pole breaker
      const bp = s.in('cons', 0.4, 0.8, E.o);
      P.panel(g, 90, 210, 800, 360, bp);
      g.alpha(bp, () => {
        g.text('TWO-POLE BREAKERS', 120, 250, { s: 20, c: C.l1, wt: 700, ls: 3 });
        const open = pr((t - s.at('cons', 6.4)) % 5, 0, 0.25, E.o) * (s.sinceE('cons') > 6.4 ? 1 : 0) * (((t - s.at('cons', 6.4)) % 5) < 2.6 ? 1 : 0);
        [330, 450].forEach((y, k) => {
          const col = PH[k];
          g.wire([[130, y], [380, y]], { c: col, w: 5, flow: true, t, gap: 50, off: -Math.cos(t * 2.4 - k * Math.PI) * 40 });
          g.wire([[520, y], [850, y]], { c: col, w: 5, on: 1 - open * 0.9, flow: open < 0.5, t, gap: 50, off: -Math.cos(t * 2.4 - k * Math.PI) * 40 });
          g.circ(380, y, 8, { fill: col, w: 0 }); g.circ(520, y, 8, { fill: mix(col, C.line, open), w: 0 });
          g.line([[380, y], [380 + Math.cos(-open * 0.5) * 140, y + Math.sin(-open * 0.5) * 140]], { c: '#fff', w: 6 });
          g.text('L' + (k + 1), 150, y - 26, { s: 24, wt: 800, c: col });
        });
        g.line([[450 - open * 12, 330 - open * 34], [450 - open * 12, 450 - open * 34]], { c: C.steel, w: 3, dash: [8, 7] });
        g.text(open > 0.5 ? 'both poles open  ·  circuit truly dead' : 'both poles closed', 490, 520, { s: 24, wt: 600, c: open > 0.5 ? C.ok : C.dim, al: 'c' });
      });
      // power comparison
      const pp = s.in('pwr', 0.4, 0.8, E.o);
      P.panel(g, 930, 210, 900, 360, pp);
      g.alpha(pp, () => {
        g.text('MAXIMUM POWER WITH A 63 A MAIN FUSE', 960, 250, { s: 20, c: C.ok, wt: 700, ls: 3 });
        const rows = [['1-phase  230 V', 14.5, C.dim, 4.2], ['3-phase  230 V  (IT)', 25.1, C.l1, 7.2], ['3-phase  400 V  (TN)', 43.6, C.l2, 12.6]];
        rows.forEach(([lab, kw, col, d], i) => {
          const p = s.in('pwr', d, 1.0, E.o), y = 320 + i * 82;
          g.text(lab, 960, y, { s: 24, wt: 600, c: col, a: p });
          g.rect(1240, y - 22, 420 * kw / 43.6 * p, 44, { r: 8, fill: rgba(col, 0.85), w: 0, c: col, glow: 0.4 });
          g.text((kw * p).toFixed(1) + ' kW', 1240 + 420 * kw / 43.6 * p + 16, y, { s: 28, f: 'mono', wt: 700, c: col, a: p });
        });
        g.rich('P = √3 · U · I', 1700, 250, { s: 24, c: C.dim, al: 'c' });
      });
      // three system cards
      const cards = [
        ['IT', '230 V', ['230 V between lines', '≈ 133 V line to earth', 'no neutral  ·  isolated from earth', 'most existing homes'], C.l1, s.in('cons', 0.8, 0.8, E.o)],
        ['TT', '230 V', ['230 V between lines', 'no neutral', 'transformer star point earthed', 'parts of western and southern Norway'], C.l3, s.in('tt', 0.4, 0.8, E.o)],
        ['TN', '400 V', ['400 V between lines', '230 V line to neutral', 'neutral earthed  (TN-C-S)', 'all new developments'], C.l2, s.in('cons', 1.2, 0.8, E.o)],
      ];
      cards.forEach(([name, v, rows, col, p], i) => {
        const x = 90 + i * 590, hl = i === 1 ? clamp(s.in('tt', 0.4, 0.6) - s.in('check', 0, 0.6)) : 0;
        P.panel(g, x, 610 + (1 - p) * 20, 560, 370, p, { c: rgba(col, 0.4 + 0.5 * hl) });
        g.alpha(p, () => {
          g.text(name, x + 34, 676, { s: 76, f: 'disp', wt: 800, c: col }); g.text(v, x + 526, 676, { s: 48, f: 'mono', wt: 700, al: 'r', c: C.ink });
          rows.forEach((r, k) => { g.circ(x + 42, 760 + k * 50, 5, { fill: col, w: 0 }); g.text(r, x + 62, 760 + k * 50, { s: 24, c: k === 3 ? C.ink : C.dim, wt: k === 3 ? 600 : 400 }); });
        });
      });
    },
  });
};
module.exports.coilH = coilH; module.exports.earthSym = earthSym; module.exports.ground = ground; module.exports.bracket = bracket;
