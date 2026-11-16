const { W, H, C, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample, rnd } = require('../lib/core');
const P = require('../lib/parts');

const sm = (h, a, b, e = 0.35) => clamp((h - a) / e) * clamp((b - h) / e);
const win = (h, a, b) => (a < b ? sm(h, a, b) : Math.max(sm(h, a, 24.5), sm(h, -0.5, b)));
const comp = [
  ['base load', '#5b6b94', h => 0.4],
  ['space heating', '#ff7a59', h => 1.6 + 0.4 * win(h, 21, 6) + 1.0 * win(h, 6, 9) + 0.8 * win(h, 16, 22)],
  ['cooking + laundry', '#ffd23f', h => 1.5 * win(h, 7, 8) + 3.0 * win(h, 16, 18) + 1.5 * win(h, 18, 20)],
  ['water heater', '#ff9a3c', (h, m) => (1 - m) * (2 * win(h, 7.5, 10.5) + 2 * win(h, 20, 22)) + m * 2 * win(h, 10, 15)],
  ['car charger', '#b9e53c', (h, m) => (1 - m) * 7.4 * win(h, 17, 21) + m * 3.95 * win(h, 22.5, 6)],
];
const total = (h, m) => comp.reduce((a, c) => a + c[2](h, m), 0);

module.exports = api => {
  api.chapter('A Day of Power', 'Peaks, grid tariffs and smart control');

  api.scene('day-profile', {
    lines: [
      '@day|Put it all together over twenty four hours, and a household looks like this. A morning peak: showers, breakfast, heating. And an afternoon peak: cooking, laundry, and the car plugged in the moment you come home.',
      '@grid|Every cable and transformer back up the chain has to be sized for that peak, not for the average. So since two thousand and twenty two, the Norwegian grid tariff includes a capacity charge, based on your highest hourly peaks each month.',
      '@shift|Move the car charging into the night, and the water heating to the middle of the day, and the peak drops dramatically. Same energy, same comfort, and a much smaller footprint on the grid. This is what smart energy controllers do automatically, using live data from the meter.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'Twenty-four hours in a Norwegian home', s.p(0.3, 0.8, E.o));
      const x0 = 190, x1 = 1760, y0 = 850, hh = 560, kwMax = 15, pa = s.p(0.5, 0.9, E.o);
      const X = h => x0 + (x1 - x0) * h / 24, Y = kw => y0 - hh * kw / kwMax;
      const m = s.in('shift', 1.0, 3.0), sweep = clamp((t - s.at('day', 3.2)) / 10);
      P.panel(g, 90, 200, 1740, 790, pa);
      g.alpha(pa, () => {
        for (let k = 0; k <= 15; k += 5) { g.line([[x0, Y(k)], [x1, Y(k)]], { c: rgba(C.faint, 0.45), w: 1 }); g.text(k + ' kW', x0 - 14, Y(k), { s: 20, f: 'mono', c: C.dim, al: 'r' }); }
        for (let h = 0; h <= 24; h += 3) { g.line([[X(h), y0], [X(h), y0 + 8]], { c: C.dim, w: 2 }); g.text(String(h).padStart(2, '0') + ':00', X(h), y0 + 30, { s: 19, f: 'mono', c: C.dim, al: 'c' }); }
        // stacked areas
        const c = g.c, n = 240, hMax = 24 * sweep;
        let lower = new Array(n + 1).fill(0);
        comp.forEach(([name, col, fn], ci) => {
          const upper = lower.map((v, i) => v + fn(24 * i / n, m));
          c.save(); c.beginPath(); c.rect(x0, 0, (x1 - x0) * sweep, H); c.clip();
          c.beginPath(); for (let i = 0; i <= n; i++) c.lineTo(X(24 * i / n), Y(upper[i])); for (let i = n; i >= 0; i--) c.lineTo(X(24 * i / n), Y(lower[i])); c.closePath(); c.fillStyle = rgba(col, 0.8); c.fill(); c.restore();
          lower = upper;
        });
        const top = sample(u => [X(24 * u), Y(total(24 * u, m))], 0, 1, n);
        g.line(top, { c: '#fff', w: 3, trim: sweep, glow: 0.7 });
        if (sweep > 0 && sweep < 1) { g.line([[X(hMax), y0], [X(hMax), Y(kwMax)]], { c: rgba('#fff', 0.5), w: 2 }); g.glowDot(X(hMax), Y(total(hMax, m)), 22, '#fff', 1); }
        g.line([[x0, y0], [x1, y0]], { c: C.dim, w: 2 }); g.line([[x0, y0], [x0, Y(kwMax)]], { c: C.dim, w: 2 });
        g.text('a cold winter day  ·  detached house with an electric car', (x0 + x1) / 2, 968, { s: 19, c: C.dim, al: 'c' });
        // legend
        comp.forEach(([name, col], i) => { const lx = 230 + i * 300; g.rect(lx, 914, 26, 26, { r: 5, fill: col, w: 0 }); g.text(name, lx + 38, 928, { s: 21, c: C.ink }); });
      });
      // peak marker
      let pk = 0, ph = 0; for (let h = 0; h <= 24; h += 0.1) { const v = total(h, m); if (v > pk) { pk = v; ph = h; } }
      const pp = s.in('day', 14.5, 0.7) * (sweep >= 1 ? 1 : 0);
      g.line([[x0, Y(pk)], [x1, Y(pk)]], { c: C.bad, w: 2.5, dash: [10, 8], a: pp }); g.tag('peak  ' + pk.toFixed(1) + ' kW', X(ph) + (ph > 12 ? -170 : 170), Y(pk) - 26, { s: 26, c: C.bad, f: 'mono', p: pp, bg: rgba('#0a1124', 0.92) });
      g.tag('morning', X(7.6), Y(6.6), { s: 20, c: C.ink, p: s.in('day', 7.6) * (1 - m), bg: rgba('#0a1124', 0.9) }); g.tag('afternoon', X(18.6), Y(14.2), { s: 20, c: C.ink, p: s.in('day', 12.0) * (1 - m), bg: rgba('#0a1124', 0.9) });
      // capacity steps
      const cs = s.in('grid', 8.0, 0.8);
      [[2, '0 – 2 kW'], [5, '2 – 5 kW'], [10, '5 – 10 kW'], [15, '10 – 15 kW']].forEach(([kw, lab], i) => { const act = pk <= kw && pk > [0, 2, 5, 10][i]; g.rect(x1 + 8, Y(kw), 18, Y([0, 2, 5, 10][i]) - Y(kw) - 3, { r: 4, fill: rgba(act ? C.warn : C.faint, act ? 0.9 : 0.4), w: 0, a: cs }); g.text(lab, x1 - 6, (Y(kw) + Y([0, 2, 5, 10][i])) / 2, { s: 17, f: 'mono', c: act ? C.warn : C.dim, al: 'r', a: cs * (act ? 1 : 0.6), shadow: 6 }); });
      g.text('capacity step', x1 + 30, Y(15) - 24, { s: 17, c: C.warn, al: 'r', a: cs }); g.text('kapasitetsledd', x1 + 30, Y(15) - 46, { s: 16, c: C.dim, al: 'r', it: true, a: cs });
      const av = s.in('grid', 1.6, 0.7) * s.out('shift', 0);
      let avg = 0; for (let h = 0.05; h < 24; h += 0.1) avg += total(h, 0) / 240; g.line([[x0, Y(avg)], [x1, Y(avg)]], { c: C.l2, w: 2.5, dash: [4, 8], a: av }); g.tag('average  ' + avg.toFixed(1) + ' kW', X(3), Y(avg) - 26, { s: 22, c: C.l2, f: 'mono', p: av, bg: rgba('#0a1124', 0.92) });
      g.text('same energy  ·  half the peak', (x0 + x1) / 2, 270, { s: 38, wt: 700, al: 'c', c: C.ok, p: s.in('shift', 8.2, 0.8, E.o), shadow: 16 });
    },
  });
};
