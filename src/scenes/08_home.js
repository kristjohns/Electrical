const { W, H, C, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample, rnd } = require('../lib/core');
const P = require('../lib/parts');
const PH = [C.l1, C.l2, C.l3];
const HS = { x: 430, y: 862, s: 1 };

// a DIN-rail module, front view. kind: 'rcbo' | 'main' | 'spd' | 'mcb'
function module_(g, x, y, w, h, o = {}) {
  const on = o.on === undefined ? 1 : o.on, hi = o.hi || 0, col = o.c || '#dfe7fa';
  g.rect(x, y, w, h, { r: 5, fill: mix('#e9edf7', '#ffffff', hi * 0.5), c: mix('#8f9bb8', C.l1, hi), w: 2 + hi * 2, glow: hi * 1.2 });
  g.rect(x + 3, y + h * 0.3, w - 6, h * 0.36, { r: 3, fill: '#cfd6e6', w: 0 });
  if (o.kind === 'spd') {
    g.rect(x + w / 2 - 9, y + h * 0.36, 18, 14, { r: 2, fill: C.ok, w: 0 }); g.text('SPD', x + w / 2, y + h * 0.6, { s: 13, wt: 800, al: 'c', c: '#33405e' });
  } else {
    const lw = Math.min(w - 12, o.kind === 'main' ? w - 16 : 26), lx = x + w / 2 - lw / 2, ly = y + h * 0.34;
    g.rect(lx, ly, lw, h * 0.28, { r: 3, fill: '#aeb8cf', w: 0 });
    g.rect(lx + 2, ly + (on > 0.5 ? 2 : h * 0.14), lw - 4, h * 0.13, { r: 3, fill: o.lever || (o.kind === 'main' ? '#d23b3b' : '#2b3a61'), w: 0 });
    if (o.kind === 'rcbo') { g.rect(x + w - 15, y + h * 0.3 - 13, 10, 9, { r: 2, fill: C.warn, w: 0 }); }
    if (o.rating) g.text(o.rating, x + w / 2, y + h * 0.2, { s: 14, wt: 800, al: 'c', c: '#33405e', f: 'mono' });
  }
  if (o.label) g.text(o.label, x + w / 2, y + h + 17, { s: o.ls || 14.5, c: mix('#cdd8f5', C.l1, hi), al: 'c', wt: 600 });
}
const CIRC = [['Lys 1.etg', 'B10'], ['Lys 2.etg', 'B10'], ['Stue', 'B16'], ['Soverom', 'B16'], ['Kjøkken 1', 'B16'], ['Kjøkken 2', 'B16'], ['Komfyr', 'B25'], ['Oppvask', 'B16'],
  ['Bad', 'B16'], ['Gulvvarme', 'B16'], ['Vask/tørk', 'B16'], ['VVB', 'B16'], ['Varmepumpe', 'C16'], ['Ute', 'B16'], ['Elbil', 'C32'], ['Reserve', 'B16']];
// the distribution board, front view. returns module rectangles
function board(g, x, y, s, o = {}) {
  const hi = o.hi || {}, rects = {};
  g.tf({ x, y, s, a: o.a }, () => {
    g.rect(0, 0, 780, 700, { r: 16, fill: '#f1f3f8', c: '#b9c3d9', w: 4 });
    g.rect(22, 22, 736, 656, { r: 8, fill: '#19233f', c: '#8f9bb8', w: 2 });
    const rowY = [56, 268, 476], mh = 130;
    rowY.forEach(ry => { g.rect(40, ry + 52, 700, 22, { fill: '#7f8aa6', w: 0 }); });
    // row 1: main switch, SPD, a few spare
    module_(g, 60, rowY[0], 150, mh, { kind: 'main', rating: '63A', label: 'Hovedbryter', hi: hi.main });
    module_(g, 226, rowY[0], 110, mh, { kind: 'spd', label: 'Overspenningsvern', ls: 13, hi: hi.spd });
    g.text('JORD', 600, rowY[0] + 30, { s: 13, wt: 800, c: C.pe, al: 'c' });
    g.rect(480, rowY[0] + 44, 240, 26, { r: 4, fill: '#c9a24a', c: mix('#e9d08a', C.pe, hi.pe || 0), w: 2, glow: (hi.pe || 0) * 1.2 });
    for (let i = 0; i < 9; i++) g.circ(498 + i * 25.5, rowY[0] + 57, 6, { fill: '#5a4416', c: '#e9d08a', w: 1 });
    for (let i = 0; i < 9; i++) g.line([[498 + i * 25.5, rowY[0] + 63], [498 + i * 25.5, rowY[0] + 128 + (i % 3) * 6]], { c: C.pe, w: 3, dash: [9, 5], cap: 'butt' });
    // rows 2,3: RCBOs
    CIRC.forEach(([lab, rat], i) => {
      const r = Math.floor(i / 8), cx = 52 + (i % 8) * 86, on = o.off && o.off[i] ? 0 : 1;
      module_(g, cx, rowY[1 + r], 78, mh, { kind: 'rcbo', rating: rat, label: lab, hi: Math.max(hi.all || 0, hi['c' + i] || 0), on });
    });
  });
  return rects;
}

module.exports = api => {
  api.chapter('Into the Home', 'Service cable, main fuse, meter and earth');

  // ------------------------------------------------------------------ entrance
  api.scene('home-entrance', {
    lines: [
      '@cable|From the street, a service cable runs to your house, in the ground or through the air. Modern homes have a connection cabinet on the outside wall.',
      '@ov|First comes the main overload protection. It caps the current the whole house can draw. Sixty three amperes is typical for a modern detached house. Older homes often have twenty five to fifty.',
      '@meter|Then the meter. Since two thousand and nineteen, every Norwegian home has a smart meter. It samples voltage and current thousands of times per second, multiplies them, and adds it all up. Power, summed over time, is energy: kilowatt hours.',
      '@han|It reports to the grid company automatically. And through a socket on the meter called the [HAN](/ˈeɪtʃ ˈeɪ ˈɛn/) port, you can read your own consumption, live.',
      '@earth|And then the part nobody sees. An earth electrode, usually a bare copper wire buried around the foundation, is connected to the main earthing bar. From there, a protective earth conductor follows every circuit. Metal water pipes and other large metal parts are bonded to it as well, so that nothing you can touch can sit at a dangerous voltage.',
    ],
    draw(g, s) {
      const t = s.t;
      const pan = s.in('ov', 0.0, 0.9) * s.out('earth', -0.6, 0.8);
      const earth = s.in('earth', 1.6, 1.6), pe = s.in('earth', 9.4, 1.4);
      const circuits = {}; if (pe > 0) for (const k in P.CIRCUITS) circuits[k] = { trim: pe, on: 1, a: 0.9 };
      const cOld = {};
      g.alpha(1 - pan * 0.72, () => {
        P.sky(g, t, { aurora: 0.35 });
        P.house(g, { ...HS, t, lamp: 1, lit: { lampKitchen: 1, cabinet: s.in('cable', 6.0, 0.6) * s.out('ov'), meter: 1, board: 0.3 }, show: { service: 1, serviceTrim: s.in('cable', 0.6, 3.6, E.io2), earth: earth > 0 ? 1 : 0, earthTrim: earth }, flowService: s.sinceE('cable') > 4.2, circuits: pe > 0 ? Object.fromEntries(Object.keys(P.CIRCUITS).map(k => [k, { trim: pe, on: 0.2, a: 0.9 }])) : {} });
        // PE overlay on circuits
        if (pe > 0) g.tf({ x: HS.x, y: HS.y, s: HS.s }, () => { for (const k in P.CIRCUITS) P.CIRCUITS[k].paths.forEach(pth => { if (plen(pth) > 1) g.line(pth.map(([x, y]) => [x + 3, y + 3]), { c: C.pe, w: 2.5, dash: [10, 7], cap: 'butt', trim: pe, round: 6 }); }); });
        // bonding
        const bd = s.in('earth', 13.8, 1.2);
        if (bd > 0) g.tf({ x: HS.x, y: HS.y, s: HS.s }, () => { g.line([[58, -30], [144, -30], [144, -16]], { c: C.pe, w: 3.5, trim: bd, glow: 0.6 }); g.line([[58, -14], [200, -14], [200, 22], [490, 22], [490, -8]], { c: C.pe, w: 3.5, trim: bd, glow: 0.6 }); g.circ(144, -16, 6, { fill: C.pe, w: 0, a: bd }); g.circ(490, -10, 6, { fill: C.pe, w: 0, a: bd }); });
      });
      P.heading(g, 'Where the grid ends and your home begins', s.p(0.3, 0.8, E.o));
      const hp = n => P.hpt(HS, n);
      const [cx, cy] = hp('cabinet');
      P.callout(g, HS.x - 200, HS.y + 70, 150, 760, 'Service cable', 'stikkledning', s.in('cable', 1.4) * s.out('ov', -0.3), { al: 'l', c: C.l1 });
      P.callout(g, cx, cy - 20, 170, 560, 'Connection cabinet', 'tilknytningsskap', s.in('cable', 6.0) * s.out('ov', -0.3), { al: 'l', c: C.l1 });
      P.callout(g, ...hp('board'), 250, 460, 'Distribution board', 'sikringsskap', s.in('cable', 8.0) * s.out('ov', -0.3), { al: 'l', c: C.ink });
      // earth callouts
      P.callout(g, HS.x + 640, HS.y + 34, 1180, 990, 'Earth electrode', 'jordelektrode  ·  copper wire around the foundation', s.in('earth', 3.0) * (1 - pan), { al: 'l', c: C.pe });
      P.callout(g, HS.x + 58, HS.y - 100, 170, 560, 'Main earthing bar', 'hovedjordskinne', s.in('earth', 6.6) * (1 - pan), { al: 'l', c: C.pe });
      P.callout(g, HS.x + 300, HS.y + 22, 300, 990, 'Bonding', 'utjevning  ·  pipes tied to earth', s.in('earth', 14.4) * (1 - pan), { al: 'l', c: C.pe });
      g.tag('PE  ·  protective earth follows every circuit', 1280, 210, { s: 24, c: C.pe, p: s.in('earth', 9.8) * (1 - pan) });
      // ---- detail panel: OV and meter
      if (pan > 0) {
        const x0 = 560, mt = s.in('meter', -0.3, 0.9);
        P.panel(g, x0, 200 + (1 - pan) * 30, 1280, 780, pan, { fill: rgba('#0a1124', 0.94) });
        // OV
        g.alpha(pan * (1 - mt), () => {
          g.text('MAIN OVERLOAD PROTECTION  ·  overbelastningsvern (OV)', x0 + 40, 246, { s: 20, c: C.l1, wt: 700, ls: 2 });
          const bx = x0 + 110, by = 330;
          for (let k = 0; k < 3; k++) { g.rect(bx + k * 100, by, 96, 420, { r: 8, fill: '#e9edf7', c: '#8f9bb8', w: 3 }); g.rect(bx + k * 100 + 14, by + 150, 68, 130, { r: 6, fill: '#aeb8cf', w: 0 }); g.rect(bx + k * 100 + 20, by + 158, 56, 58, { r: 5, fill: '#2b3a61', w: 0 }); g.circ(bx + k * 100 + 48, by + 50, 18, { fill: '#8f9bb8', c: '#5c6884', w: 2 }); g.circ(bx + k * 100 + 48, by + 370, 18, { fill: '#8f9bb8', c: '#5c6884', w: 2 }); g.line([[bx + k * 100 + 48, by - 60], [bx + k * 100 + 48, by + 34]], { c: PH[k], w: 8 }); g.line([[bx + k * 100 + 48, by + 386], [bx + k * 100 + 48, by + 480]], { c: PH[k], w: 8 }); g.flow([[bx + k * 100 + 48, by - 60], [bx + k * 100 + 48, by + 480]], { c: '#fff', w: 6, gap: 46, off: -Math.cos(t * 2.4 - k * TAU / 3) * 40, a: 0.8 }); }
          g.text('63 A', bx + 150, by + 110, { s: 44, f: 'mono', wt: 800, al: 'c', c: '#33405e' });
          // current gauge
          const amps = 22 + 16 * Math.sin(t * 0.6) + 8 * Math.sin(t * 1.7);
          P.gauge(g, x0 + 800, 480, 150, amps / 80, { c: amps > 63 ? C.bad : C.ok, label: 'house current', val: amps.toFixed(0) + ' A', vs: 44 });
          g.text('limit 63 A', x0 + 930, 370, { s: 22, c: C.bad, wt: 700 });
          const rows = [['63 A', 'typical modern detached house', s.in('ov', 6.6)], ['25 – 50 A', 'many older homes and flats', s.in('ov', 11.0)]];
          rows.forEach(([a, b, p], i) => { g.text(a, x0 + 560, 760 + i * 70, { s: 44, f: 'mono', wt: 800, c: C.l1, p }); g.text(b, x0 + 840, 762 + i * 70, { s: 26, c: C.dim, p }); });
        });
        // meter
        g.alpha(pan * mt, () => {
          g.text('SMART METER  ·  AMS-måler', x0 + 40, 246, { s: 20, c: C.ok, wt: 700, ls: 2 });
          const mx = x0 + 70, my = 300;
          g.rect(mx, my, 400, 560, { r: 22, fill: '#eef1f7', c: '#aab4cc', w: 4 });
          g.rect(mx + 40, my + 50, 320, 130, { r: 10, fill: '#1c2b1f', c: '#5c6884', w: 3 });
          const kwh = 48213.4 + t * 0.02;
          g.text(kwh.toFixed(1), mx + 340, my + 108, { s: 54, f: 'mono', wt: 700, al: 'r', c: '#8dffb0' }); g.text('kWh', mx + 340, my + 156, { s: 20, f: 'mono', al: 'r', c: '#8dffb0' });
          const blink = (t * 2.2) % 1 < 0.18;
          g.circ(mx + 80, my + 240, 12, { fill: blink ? '#ff4d4d' : '#6b1f1f', w: 0 }); if (blink) g.glowDot(mx + 80, my + 240, 40, '#ff4d4d', 1);
          g.text('1000 imp / kWh', mx + 106, my + 240, { s: 18, c: '#5c6884', wt: 600 });
          g.rect(mx + 40, my + 300, 320, 120, { r: 8, c: '#aab4cc', w: 2 }); g.text('3 × 230 V   ·   63 A', mx + 200, my + 340, { s: 22, f: 'mono', c: '#5c6884', al: 'c', wt: 600 }); g.text('remote breaker inside', mx + 200, my + 384, { s: 18, c: '#7b879f', al: 'c' });
          // HAN port
          const hn = s.in('han', 3.8, 0.7);
          g.rect(mx + 150, my + 470, 100, 60, { r: 6, fill: '#19233f', c: mix('#5c6884', C.l2, hn), w: 3 + hn * 2, glow: hn * 1.4 }); g.text('HAN', mx + 200, my + 500, { s: 18, wt: 800, al: 'c', c: mix('#8f9bb8', C.l2, hn) });
          // sampling plots
          const px = x0 + 560, pw = 640, ph = 110, w0 = t * 2.4, xr = [0, TAU * 2];
          const rowsY = [300, 440, 600];
          g.text('voltage  u', px, rowsY[0] - 14, { s: 20, c: C.l1, wt: 600 }); g.text('current  i', px, rowsY[1] - 14, { s: 20, c: C.l2, wt: 600 }); g.text('power  p = u · i', px, rowsY[2] - 14, { s: 20, c: C.ok, wt: 600 });
          const U = x => Math.sin(x - w0), I = x => 0.8 * Math.sin(x - w0 - 0.3) + 0.12 * Math.sin(3 * (x - w0));
          [[U, C.l1, [-1.2, 1.2]], [I, C.l2, [-1.2, 1.2]], [x => U(x) * I(x), C.ok, [-0.3, 1.2]]].forEach(([fn, col, yr], i) => {
            const y = rowsY[i], hh = i === 2 ? 140 : ph;
            g.line([[px, y + hh * (yr[1] / (yr[1] - yr[0]))], [px + pw, y + hh * (yr[1] / (yr[1] - yr[0]))]], { c: C.faint, w: 1.5 });
            g.plot(fn, px, y, pw, hh, { xr, yr, c: col, w: 3, glow: 0.5, area: i === 2, areaA: 0.3 });
            const sp = s.in('meter', 5.2, 0.8); for (let k = 0; k <= 32; k++) { const xv = xr[1] * k / 32; g.circ(px + pw * k / 32, y + hh - (fn(xv) - yr[0]) / (yr[1] - yr[0]) * hh, 4, { fill: '#fff', w: 0, a: sp * 0.9 }); }
          });
          P.formula(g, 'E = ∫ u · i  dt', px + 180, 840, s.in('meter', 12.6, 0.8, E.o), { c: C.ok, s: 40 });
          g.text('→  kWh', px + 400, 840, { s: 36, wt: 700, c: C.ok, p: s.in('meter', 15.0) });
          // live readout via HAN
          const lp = s.in('han', 5.0, 0.8, E.o);
          if (lp > 0) { g.line([[mx + 250, my + 500], [mx + 470, my + 500], [mx + 470, 906], [px + 440, 906]], { c: C.l2, w: 3, dash: [8, 8], off: -t * 60, trim: lp, round: 10 }); g.rect(px + 440, 800, 200, 150, { r: 16, fill: '#0f1830', c: C.l2, w: 3, a: lp }); g.text('LIVE', px + 540, 830, { s: 16, wt: 800, c: C.l2, al: 'c', ls: 3, a: lp }); g.text((3.2 + 0.4 * Math.sin(t * 1.3)).toFixed(2), px + 540, 878, { s: 44, f: 'mono', wt: 800, al: 'c', a: lp }); g.text('kW', px + 540, 922, { s: 20, c: C.dim, al: 'c', a: lp }); }
        });
      }
    },
  });

  // ------------------------------------------------------------------ the board
  api.scene('home-board', {
    lines: [
      '@heart|And now, the heart of the installation: the distribution board. In Norwegian, the [sikringsskap](/sˈɪkɾɪŋskɑːp/). The fuse cabinet.',
      '@job|Its job is to split the supply into separate circuits, and to protect each one of them.',
      '@list|A modern board contains a main switch. Surge protection. An earthing bar. And for every circuit, a device that protects against overload, short circuit, and earth fault, all combined in a single unit.',
      "@three|Three different faults, detected by three different physical principles. Let's take them apart, one at a time.",
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'The distribution board  ·  sikringsskapet', s.p(0.3, 0.8, E.o));
      const hi = {};
      const pulse = (k, a, d = 2.6) => { const v = s.in('list', a, 0.4) * (1 - pr(t, s.at('list', a + d), 0.5)); if (v > 0) hi[k] = v; };
      pulse('main', 2.2); pulse('spd', 4.2, 2.0); pulse('pe', 6.0, 2.0); if (s.on('list', 8.2)) hi.all = s.in('list', 8.2, 0.5) * s.out('three', 0);
      if (s.on('job') && !s.on('list')) { const k = Math.floor(s.since('job') * 5) % 16; hi['c' + k] = 1; }
      const bp = s.p(0.5, 1.0, E.o);
      board(g, 96, 208 + (1 - bp) * 30, 1.1, { hi, a: bp });
      // right column
      const rx = 1030;
      const items = [['Main switch', 'hovedbryter', 'isolates the whole installation', s.in('list', 2.2)], ['Surge protection', 'overspenningsvern', 'diverts lightning and switching surges', s.in('list', 4.2)], ['Earthing bar', 'jordskinne', 'collects every protective earth wire', s.in('list', 6.0)], ['One combined breaker per circuit', 'jordfeilautomat', 'overload + short circuit + earth fault', s.in('list', 8.2)]];
      const lo = s.out('three', -0.2);
      items.forEach(([a, b, c2, p], i) => {
        const y = 290 + i * 150;
        P.panel(g, rx, y - 56 + (1 - p) * 14, 800, 126, p * lo);
        g.text(a, rx + 30, y - 18, { s: 30, wt: 700, a: p * lo }); g.text(b, rx + 770, y - 18, { s: 24, c: C.l1, al: 'r', it: true, a: p * lo }); g.text(c2, rx + 30, y + 28, { s: 22, c: C.dim, a: p * lo });
      });
      const tp = s.in('three', 0.3, 0.8, E.o);
      const faults = [['OVERLOAD', 'too much for too long', 'bimetal strip', C.warn], ['SHORT CIRCUIT', 'thousands of amperes', 'magnetic coil', C.bad], ['EARTH FAULT', 'current leaking out', 'current-balance ring', C.pe]];
      faults.forEach(([a, b, c2, col], i) => {
        const p = s.in('three', 0.4 + i * 0.9, 0.7, E.o), y = 320 + i * 200;
        P.panel(g, rx, y - 80 + (1 - p) * 14, 800, 170, p, { c: rgba(col, 0.6) });
        g.text(a, rx + 34, y - 30, { s: 34, f: 'disp', wt: 800, c: col, a: p, ls: 2 }); g.text(b, rx + 34, y + 22, { s: 24, c: C.dim, a: p });
        g.text('→', rx + 440, y - 4, { s: 40, c: C.faint, a: p }); g.text(c2, rx + 770, y - 4, { s: 30, wt: 700, al: 'r', a: p });
      });
    },
  });
};
module.exports.board = board; module.exports.HS = HS; module.exports.module_ = module_;
