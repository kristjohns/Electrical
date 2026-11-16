const { W, H, C, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample, rnd } = require('../lib/core');
const P = require('../lib/parts');
const PH = [C.l1, C.l2, C.l3];

module.exports = api => {
  api.chapter('The Last Transformer', 'From 22 000 volts to your street');

  api.scene('dist-kiosk', {
    lines: [
      '@kiosk|The last transformer is closer than you think. Somewhere near your home stands a small kiosk, or a transformer up on a pole. In Norwegian: a [nettstasjon](/nˈɛtstɑʃˌuːn/).',
      '@inside|Inside is a distribution transformer of a few hundred kilovolt amperes, sitting in an oil filled tank for cooling and insulation. It steps twenty two thousand volts down to the voltage in your sockets.',
      '@share|One such transformer feeds anything from a single farm, to a hundred homes or more, through low voltage cables in the ground, or lines on wooden poles.',
      '@but|But exactly what comes out of that transformer is where Norway differs from almost every other country.',
    ],
    draw(g, s) {
      const t = s.t, GY = 760;
      P.sky(g, t, { aurora: 0.5 });
      P.ridge(g, P.ridgeFn(21, 640, 260, 0.0025), { c0: '#16223f', c1: '#0a1122', snow: 470 });
      g.rect(-10, GY, W + 20, 400, { fill: g.lin(0, GY, 0, H, [[0, '#0e182f'], [1, '#060a14']]), w: 0 }); g.line([[-10, GY], [W + 10, GY]], { c: '#2a3b66', w: 2.5 });
      P.heading(g, 'The neighbourhood substation', s.p(0.3, 0.8, E.o));
      // incoming 22 kV on poles
      const px = [80, 300];
      px.forEach(x => { g.line([[x, GY], [x, GY - 230]], { c: '#8a7256', w: 9, cap: 'butt' }); g.line([[x - 44, GY - 212], [x + 44, GY - 212]], { c: '#8a7256', w: 7 }); for (const d of [-36, 0, 36]) g.line([[x + d, GY - 212], [x + d, GY - 228]], { c: '#c9d6f5', w: 5, cap: 'butt' }); });
      const kx = 560;
      for (let k = 0; k < 3; k++) { const d = (k - 1) * 36; const pts = P.span([-60, GY - 240 + d * 0.1], [px[0] + d, GY - 230], 12).concat(P.span([px[0] + d, GY - 230], [px[1] + d, GY - 230], 26), [[px[1] + d, GY - 230], [px[1] + 60 + d * 0.3, GY - 120], [px[1] + 60 + d * 0.3, GY + 40 + k * 8], [kx - 70 + k * 16, GY + 40 + k * 8], [kx - 70 + k * 16, GY - 60]]); g.wire(pts, { c: PH[k], w: 3, flow: true, t, speed: 150, gap: 56, round: 12 }); }
      g.tag('22 000 V', 190, GY - 300, { s: 26, c: C.warn, f: 'mono', p: s.in('kiosk', 1.0) });
      // kiosk, with cut-away
      const cut = s.in('inside', 0.2, 1.0);
      P.kiosk(g, kx, GY, 2.9, { a: 1 - cut * 0.82 });
      if (cut > 0) g.alpha(cut, () => {
        // transformer tank with fins + bushings
        g.rect(kx - 84, GY - 160, 168, 150, { r: 8, fill: '#1b2a4b', c: C.steel, w: 3 });
        for (let i = 0; i < 9; i++) g.line([[kx - 72 + i * 18, GY - 146], [kx - 72 + i * 18, GY - 24]], { c: rgba(C.steel, 0.5), w: 4 });
        for (const [d, k] of [[-44, 0], [0, 1], [44, 2]]) { g.line([[kx + d, GY - 160], [kx + d, GY - 205]], { c: '#dfe7fa', w: 9, cap: 'butt', dash: [5, 3.5] }); g.circ(kx + d, GY - 210, 6, { fill: PH[k], w: 0 }); }
        // oil shimmer
        for (let i = 0; i < 8; i++) { const u = (t * 0.25 + i / 8) % 1; g.circ(kx - 60 + i * 17, GY - 20 - u * 120, 3, { fill: rgba('#ffd98a', 0.35 * Math.sin(u * Math.PI)), w: 0 }); }
        g.text('3-phase', kx, GY - 104, { s: 22, wt: 700, al: 'c', c: C.ink, shadow: 8 }); g.text('transformer', kx, GY - 76, { s: 22, wt: 700, al: 'c', c: C.ink, shadow: 8 });
      });
      P.callout(g, kx + 40, GY - 250, kx + 150, GY - 400, 'Nettstasjon', 'neighbourhood substation', s.in('kiosk', 4.2) * s.out('inside', 3), { c: C.ok });
      P.callout(g, kx + 70, GY - 60, kx + 170, GY - 330, 'Distribution transformer', '100 – 800 kVA  ·  oil-cooled', s.in('inside', 2.0) * s.out('but'), { c: C.steel });
      // low-voltage feeders to houses
      const hs = [[900, 0.2], [1170, 0.2], [1440, 0.2], [1710, 0.17]];
      hs.forEach(([hx, sc], i) => {
        const p = s.in('share', 0.4 + i * 0.5, 1.0);
        const feed = [[kx + 60, GY - 30], [kx + 60, GY + 70 + i * 0], [hx - 14, GY + 70], [hx - 5, GY - 30]];
        g.wire(feed, { c: C.l1, w: 3.5, trim: p, flow: p >= 1, t, speed: 120, gap: 48, round: 10, on: 1 });
        P.house(g, { x: hx, y: GY, s: sc, t, show: { ground: false, car: i === 1 }, lamp: clamp(p * 3 - 2), lit: { lampBed: i % 2 ? clamp(p * 3 - 2) : 0, lampKitchen: clamp(p * 3 - 2), tv: i === 2 ? 1 : 0 } });
      });
      g.tag('230 V  or  400 V', 1010, GY + 120, { s: 26, c: C.l1, f: 'mono', p: s.in('inside', 9.5) });
      // teaser
      const bp = s.in('but', 1.2, 0.9, E.o);
      if (bp > 0) { g.rect(0, 0, W, H, { fill: rgba('#05080f', 0.55 * bp), w: 0 }); g.text('What exactly comes out?', W / 2, 400, { s: 84, f: 'disp', wt: 800, al: 'c', p: bp }); ['IT', 'TT', 'TN'].forEach((n, i) => g.tag(n, W / 2 - 200 + i * 200, 540, { s: 56, c: [C.l1, C.l3, C.l2][i], p: s.in('but', 2.4 + i * 0.4, 0.7, E.o) })); }
    },
  });
};
