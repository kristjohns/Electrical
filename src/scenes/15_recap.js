const { W, H, C, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample, rnd } = require('../lib/core');
const P = require('../lib/parts');
const { panorama, GROUND } = require('./00_intro');
const PH = [C.l1, C.l2, C.l3];

module.exports = api => {
  api.chapter('The Whole Journey', 'From waterfall to wall socket');

  api.scene('recap', {
    post: 7.5, fadeOut: 1.4,
    lines: [
      '@r1|So, the next time you flip that switch, picture the whole chain.',
      '@water|Water, falling through a mountain.',
      '@turbine|A turbine, turning a magnet past three coils.',
      '@trafo|A transformer, lifting the voltage to four hundred and twenty thousand volts.',
      '@pylons|Pylons across the high plateau, and substation after substation, stepping it back down.',
      '@street|A kiosk on your street. A meter. A breaker, with a bimetal strip and a coil. An iron ring, watching for thirty milliamperes.',
      '@sync|And all of it spinning in step, fifty times a second, balanced so precisely that your light comes on. Instantly.',
      '@own|The largest machine ever built. And you own the last few metres of it.',
    ],
    draw(g, s) {
      const t = s.t;
      const lampOff = s.t < s.at('sync', 6.4);
      const pano = panorama(g, t, { lamp: lampOff ? 0.15 : 1, lit: 1, aurora: 1 });
      // energy pulses continuously flowing
      const L = plen(pano.route);
      for (let k = 0; k < 4; k++) { const u = ((t * 0.09 + k / 4) % 1), head = L * u, seg = psub(pano.route, Math.max(0, head - 160), head); if (seg.length > 1) g.line(seg, { c: C.energy, w: 4, glow: 1.2, a: 0.9 * s.in('r1', 1.0) }); }
      // stage spotlights
      const spot = (x, y, r, key, title, sub, endKey) => { const p = s.in(key, 0.1, 0.6, E.o) * (endKey ? s.out(endKey, 0) : 1); if (p <= 0) return; g.circ(x, y, r, { c: C.energy, w: 3, a: p, glow: 1 }); g.circ(x, y, r + 14 + 8 * Math.sin(t * 3), { c: rgba(C.energy, 0.4), w: 1.5, a: p }); g.text(title, x, y - r - 50, { s: 30, wt: 700, al: 'c', p, shadow: 14 }); if (sub) g.text(sub, x, y - r - 18, { s: 21, c: C.energy, al: 'c', p, shadow: 14, f: 'mono' }); };
      spot(222, 434, 70, 'water', 'Reservoir', 'potential energy', 'turbine');
      spot(455, 600, 60, 'water', 'Penstock', null, 'turbine');
      spot(639, GROUND - 30, 54, 'turbine', 'Turbine + generator', '≈ 15 kV  ·  50 Hz', 'trafo');
      spot(700, GROUND - 60, 40, 'trafo', 'Step-up transformer', '420 000 V', 'pylons');
      spot(985, GROUND - 130, 150, 'pylons', 'Transmission grid', '420 kV → 132 kV → 22 kV', 'street');
      spot(1300, GROUND - 46, 70, 'pylons', '', null, 'street');
      spot(1602, GROUND - 30, 44, 'street', 'Nettstasjon', '230 / 400 V', 'sync');
      // in-home icons
      const icons = [['Meter', 2.6], ['Breaker', 4.0], ['RCD', 8.2]];
      icons.forEach(([name, d], i) => {
        const p = s.in('street', d, 0.6, E.o) * s.out('sync', 0), x = 1500 + i * 150, y = 560;
        if (p <= 0) return;
        P.panel(g, x - 62, y - 70 + (1 - p) * 14, 124, 150, p, { fill: rgba('#0a1124', 0.92), c: rgba(C.energy, 0.6) });
        g.alpha(p, () => {
          if (i === 0) { g.rect(x - 30, y - 50, 60, 76, { r: 8, fill: '#eef1f7', w: 0 }); g.rect(x - 22, y - 42, 44, 22, { r: 3, fill: '#1c2b1f', w: 0 }); g.text('kWh', x, y - 31, { s: 12, f: 'mono', c: '#8dffb0', al: 'c' }); g.circ(x - 14, y, 5, { fill: (t * 2) % 1 < 0.2 ? '#ff4d4d' : '#6b1f1f', w: 0 }); }
          if (i === 1) { g.rect(x - 22, y - 52, 44, 80, { r: 5, fill: '#eef1f7', w: 0 }); g.rect(x - 12, y - 30, 24, 34, { r: 3, fill: '#aeb8cf', w: 0 }); g.rect(x - 9, y - 27, 18, 14, { r: 2, fill: '#2b3a61', w: 0 }); }
          if (i === 2) { g.ell(x, y - 12, 16, 40, { c: '#c7b6ff', w: 12, glow: 0.8 }); g.line([[x - 44, y - 22], [x + 44, y - 22]], { c: C.l1, w: 3 }); g.line([[x - 44, y - 2], [x + 44, y - 2]], { c: C.l2, w: 3 }); }
          g.text(name, x, y + 56, { s: 19, wt: 700, al: 'c' });
        });
      });
      if (s.on('street', 2.0)) g.line([[1725, 600 + 100], [1790, GROUND - 60]], { c: rgba(C.energy, 0.5), w: 1.5, a: s.in('street', 2.6) * s.out('sync', 0) });
      // heartbeat: three-phase ribbon + frequency
      const sp = s.in('sync', 0.2, 1.0, E.o) * s.out('own', -0.3, 0.8);
      if (sp > 0) {
        g.rect(0, 0, W, H, { fill: rgba('#05080f', 0.45 * sp), w: 0 });
        for (let k = 0; k < 3; k++) g.line(sample(u => [u * W, 330 + Math.sin(u * 22 - t * 5 - k * TAU / 3) * 120], 0, 1, 240), { c: PH[k], w: 4, a: 0.85 * sp, glow: 1 });
        g.text('50.00 Hz', W / 2, 600, { s: 150, f: 'mono', wt: 800, al: 'c', c: C.ink, p: s.in('sync', 2.0, 0.8, E.o) * sp, shadow: 30 });
      }
      // final title
      const fp = s.in('own', 0.2, 1.2, E.o);
      if (fp > 0) {
        g.rect(0, 0, W, H, { fill: g.lin(0, 0, 0, H, [[0, rgba('#05080f', 0.88 * fp)], [0.6, rgba('#05080f', 0.6 * fp)], [1, rgba('#05080f', 0.2 * fp)]]), w: 0 });
        g.text('The largest machine ever built.', W / 2, 280, { s: 84, f: 'disp', wt: 800, al: 'c', p: s.in('own', 0.3, 0.9, E.o) });
        g.text('You own the last few metres of it.', W / 2, 390, { s: 64, f: 'disp', wt: 700, al: 'c', c: C.l1, p: s.in('own', 2.6, 0.9, E.o) });
        const ep = pr(t, s.e.own + 1.2, 1.0, E.o);
        const lw = 620 * ep; g.line([[W / 2 - lw / 2, 480], [W / 2 + lw / 2, 480]], { c: C.l2, w: 3, glow: 1 });
        g.text('FROM WATERFALL TO WALL SOCKET', W / 2, 540, { s: 34, wt: 700, al: 'c', ls: 8, c: '#cfdaf7', p: ep });
        g.text('An educational overview. For any work on a real installation, use a registered electrician.', W / 2, 600, { s: 22, c: C.dim, al: 'c', p: pr(t, s.e.own + 2.2, 1.0, E.o) });
      }
    },
  });
};
