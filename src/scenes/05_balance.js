const { W, H, C, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample, rnd } = require('../lib/core');
const P = require('../lib/parts');

function rotorIcon(g, x, y, r, ang, col = C.l2, a = 1) {
  g.circ(x, y, r, { fill: '#101a33', c: col, w: 3, a, glow: 0.4 });
  for (let i = 0; i < 2; i++) g.line([[x - Math.cos(ang + i * Math.PI / 2) * r * 0.8, y - Math.sin(ang + i * Math.PI / 2) * r * 0.8], [x + Math.cos(ang + i * Math.PI / 2) * r * 0.8, y + Math.sin(ang + i * Math.PI / 2) * r * 0.8]], { c: rgba(col, 0.9), w: 4, a });
  g.circ(x + Math.cos(ang) * r * 0.8, y + Math.sin(ang) * r * 0.8, 6, { fill: '#fff', w: 0, a });
}

module.exports = api => {
  api.chapter('Keeping the Balance', 'One machine, one frequency: 50 hertz');

  api.scene('bal-frequency', {
    lines: [
      '@nostore|Here is the strangest property of the grid. It stores almost no energy. At every instant, generation must equal consumption. Exactly.',
      '@sync|Every generator in Norway, Sweden, Finland and eastern Denmark is electromagnetically locked to all the others. They spin in step, like one enormous machine with a single shared speed. That speed is the frequency: fifty hertz.',
      '@kettle|Suppose a large factory switches on. No power plant has reacted yet. So where does the extra energy come from? From the kinetic energy of all those spinning rotors. They slow down, very slightly, and the frequency drops.',
      "@swing|It is Newton's second law for rotation. Inertia, times angular acceleration, equals driving torque minus braking torque.",
      "@gov|Turbine governors sense the falling speed, and within seconds they open the guide vanes. More water, more torque, and the frequency recovers. Hydropower is superb at this, which makes Norway's reservoirs so valuable for balancing the whole Nordic system.",
      '@band|Normally the frequency stays between forty nine point nine and fifty point one hertz. It is the heartbeat of the system, and you can measure it in any wall socket.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'Generation = consumption, every instant', s.p(0.3, 0.8, E.o));
      // frequency model
      const tE = s.at('kettle', 2.4), tG = s.at('gov', 2.2), tB = s.at('band', 0.5);
      const fAt = tt => {
        if (tt < tE) return 50 + 0.006 * Math.sin(tt * 1.3) + 0.004 * Math.sin(tt * 3.1);
        const drop = 0.26 * (1 - Math.exp(-(tt - tE) / 4.2));
        if (tt < tG) return 50 - drop + 0.004 * Math.sin(tt * 3.1);
        const fG = 50 - 0.26 * (1 - Math.exp(-(tG - tE) / 4.2));
        const rec = fG + (49.99 - fG) * (1 - Math.exp(-(tt - tG) / 3.2));
        return rec + 0.006 * Math.sin(tt * 1.3) * clamp((tt - tG) / 8);
      };
      const f = fAt(t);
      const dG = t - tG, load = 50 + 1.2 * pr(t, tE, 0.5, E.o), gen = 50 + (dG > 0 ? 1.2 * (1 - Math.exp(-dG / 1.1)) + 0.5 * (dG / 2.4) * Math.exp(1 - dG / 2.4) : 0);
      // ---- left: the synchronised machines
      const na = s.in('nostore', 1.2, 0.9, E.o);
      const nodes = [[250, 420, 'Norway', 74], [520, 520, 'Sweden', 74], [770, 400, 'Finland', 58], [430, 760, 'E. Denmark', 46]];
      const ang = t * 2.4 + (f - 50) * 30;
      P.panel(g, 90, 220, 800, 650, na);
      g.alpha(na, () => {
        g.text('THE NORDIC SYNCHRONOUS AREA', 120, 258, { s: 20, c: C.l2, wt: 700, ls: 3 });
        const links = [[0, 1], [1, 2], [1, 3], [0, 3]];
        links.forEach(([a, b]) => { const pa = nodes[a], pb = nodes[b]; g.line([[pa[0], pa[1]], [pb[0], pb[1]]], { c: rgba(C.l2, 0.5), w: 4 }); g.flow([[pa[0], pa[1]], [pb[0], pb[1]]], { c: C.energy, w: 5, gap: 50, off: -Math.sin(t * 0.7 + a) * 60 }); });
        nodes.forEach(([x, y, name, r]) => { rotorIcon(g, x, y, r, ang); g.text(name, x, y + r + 28, { s: 24, wt: 600, al: 'c' }); });
      });
      // ---- right: balance bars + frequency
      const ba = s.in('nostore', 3.0, 0.9, E.o);
      P.panel(g, 930, 220, 900, 300, ba);
      g.alpha(ba, () => {
        const bar = (y, label, v, col) => { g.text(label, 960, y, { s: 24, wt: 600, c: col }); g.rect(1160, y - 20, 560, 40, { r: 8, c: C.line, w: 2 }); g.rect(1160, y - 20, 560 * clamp((v - 46) / 6), 40, { r: 8, fill: rgba(col, 0.85), w: 0, c: col, glow: 0.4 }); g.text(v.toFixed(1) + ' GW', 1810, y, { s: 24, f: 'mono', wt: 700, al: 'r', c: col }); };
        bar(290, 'Generation', gen, C.ok); bar(360, 'Consumption', load, C.l3);
        const diff = gen - load, bal = Math.abs(diff) < 0.08;
        g.text(bal ? 'in balance' : diff < 0 ? 'deficit  ' + Math.abs(diff).toFixed(1) + ' GW  →  taken from the rotating masses' : 'surplus  ' + diff.toFixed(1) + ' GW  →  the rotors speed up again', 960, 450, { s: 26, wt: 700, c: bal ? C.ok : diff < 0 ? C.bad : C.warn });
      });
      const fa = s.in('sync', 12.2, 0.9, E.o);
      P.panel(g, 930, 550, 900, 320, fa);
      g.alpha(fa, () => {
        g.text('GRID FREQUENCY', 960, 588, { s: 20, c: C.warn, wt: 700, ls: 3 });
        g.text(f.toFixed(2), 960, 700, { s: 100, f: 'mono', wt: 800, c: Math.abs(f - 50) < 0.1 ? C.ok : C.warn });
        g.text('Hz', 1280, 722, { s: 40, wt: 700, c: C.dim });
        // strip chart: last 24 s
        const cx = 1450, cy = 610, cw = 330, ch = 230, yOf = v => cy + ch / 2 - (v - 50) / 0.36 * ch / 2;
        const bp = s.in('band', 0.4, 0.8);
        g.rect(cx, yOf(50.1), cw, yOf(49.9) - yOf(50.1), { fill: rgba(C.ok, 0.13 * bp), w: 0 });
        g.line([[cx, yOf(50)], [cx + cw, yOf(50)]], { c: C.faint, w: 1.5, dash: [6, 6] });
        g.text('50.0', cx - 8, yOf(50), { s: 16, f: 'mono', c: C.dim, al: 'r' }); g.text('49.8', cx - 8, yOf(49.8), { s: 16, f: 'mono', c: C.dim, al: 'r' });
        g.text('50.1', cx + cw + 6, yOf(50.1), { s: 15, f: 'mono', c: C.ok, a: bp }); g.text('49.9', cx + cw + 6, yOf(49.9), { s: 15, f: 'mono', c: C.ok, a: bp });
        const pts = sample(u => { const tt = t - 26 * (1 - u); return [cx + u * cw, yOf(tt < 0 ? 50 : fAt(tt))]; }, 0, 1, 120);
        g.line(pts, { c: C.warn, w: 3.5, glow: 0.8 }); g.glowDot(cx + cw, yOf(f), 16, C.warn, 1);
      });
      // swing equation
      P.formula(g, 'J · dω/dt = T_{turbine} – T_{load}', 490, 940, s.in('swing', 1.2, 0.8, E.o), { c: C.violet, s: 44 });
      g.tag('governors open the guide vanes', 1380, 940, { s: 26, c: C.ok, p: s.in('gov', 2.6, 0.8, E.o) * s.out('band', -0.3) });
      g.tag('normal band  49.9 – 50.1 Hz', 1380, 940, { s: 26, c: C.ok, p: s.in('band', 0.4, 0.8, E.o) });
      // factory switch-on flash
      const fl = clamp(1 - Math.abs(t - tE - 0.3) / 0.9);
      g.tag('+ 1.2 GW load', 1570, 410, { s: 22, c: C.l3, a: fl });
    },
  });

  api.scene('bal-hvdc', {
    lines: [
      '@hvdc|And through high voltage direct current cables on the sea bed, Norway trades power with Denmark, the Netherlands, Germany and Great Britain.',
      '@why|Direct current, because a long subsea cable behaves like a giant capacitor. With AC, most of the current would be spent just charging and discharging the cable itself.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'Links to the neighbours: HVDC', s.p(0.3, 0.8, E.o));
      const NO = [520, 330];
      const dst = [['Denmark', 'Skagerrak 1–4', '≈ 1 700 MW', 800, 560], ['Germany', 'NordLink', '1 400 MW', 760, 820], ['Netherlands', 'NorNed', '700 MW', 430, 860], ['Great Britain', 'North Sea Link', '1 400 MW', 240, 640]];
      const pa = s.p(0.6, 0.9, E.o);
      // sea
      g.alpha(pa, () => {
        g.rect(90, 220, 900, 760, { r: 18, fill: g.lin(0, 220, 0, 980, [[0, '#0d2244'], [1, '#081428']]), c: rgba('#6f86c9', 0.28), w: 1.5 });
        for (let i = 0; i < 9; i++) g.line(sample(u => [120 + u * 840, 300 + i * 78 + Math.sin(u * 14 + t * 0.8 + i) * 5], 0, 1, 40), { c: rgba('#4c7fd0', 0.13), w: 2 });
      });
      dst.forEach(([name, cable, mw, x, y], i) => {
        const p = s.in('hvdc', 2.4 + i * 1.0, 0.9, E.o);
        const mid = [(NO[0] + x) / 2 + (y - NO[1]) * 0.12, (NO[1] + y) / 2 - (x - NO[0]) * 0.12];
        const pts = sample(u => [(1 - u) * (1 - u) * NO[0] + 2 * u * (1 - u) * mid[0] + u * u * x, (1 - u) * (1 - u) * NO[1] + 2 * u * (1 - u) * mid[1] + u * u * y], 0, 1, 40);
        g.line(pts, { c: C.violet, w: 5, glow: 0.7, trim: p });
        const dir = Math.sin(t * 0.35 + i * 1.7) > 0 ? 1 : -1;
        g.flow(pts, { c: '#fff', w: 6, len: 18, gap: 60, speed: 120 * dir, t, a: p * 0.9, trim: p });
        g.alpha(p, () => { g.circ(x, y, 44, { fill: '#131f3e', c: C.steel, w: 3 }); g.text(name, x, y + 70, { s: 24, wt: 700, al: 'c' }); g.text(cable + '  ·  ' + mw, x, y + 100, { s: 18, c: C.dim, al: 'c' }); g.text('~', x - 12, y - 2, { s: 30, al: 'c', c: C.l2 }); g.text('=', x + 14, y, { s: 26, al: 'c', c: C.violet }); });
      });
      g.alpha(pa, () => { g.circ(NO[0], NO[1], 60, { fill: '#1a2a1c', c: C.ok, w: 4, glow: 0.7 }); g.text('NORWAY', NO[0], NO[1], { s: 22, wt: 800, al: 'c', c: C.ok }); });
      // why DC: cable as capacitor
      const wp = s.in('why', 0.3, 0.9, E.o);
      P.panel(g, 1030, 220, 800, 760, wp);
      if (wp > 0) g.alpha(wp, () => {
        g.text('A SUBSEA CABLE IS A CAPACITOR', 1060, 258, { s: 20, c: C.violet, wt: 700, ls: 3 });
        // cross-section
        const cx = 1220, cy = 420;
        g.circ(cx, cy, 110, { fill: '#39424f', c: C.steel, w: 3 }); g.circ(cx, cy, 92, { fill: '#c9b48a', w: 0 }); g.circ(cx, cy, 86, { fill: '#e8dcc0', w: 0 }); g.circ(cx, cy, 42, { fill: C.copper, c: '#ffd2a8', w: 2 });
        P.callout(g, cx + 20, cy - 10, 1420, 330, 'conductor', null, 1, { c: C.copper }); P.callout(g, cx + 62, cy + 20, 1420, 420, 'insulation', '= dielectric', 1, { c: '#e8dcc0' }); P.callout(g, cx + 96, cy + 46, 1420, 510, 'metal sheath + sea water', '= the other plate', 1, { c: C.steel });
        // AC vs DC rows
        const rows = [[660, 'AC', 'charging current sloshes in and out', C.l1, true], [840, 'DC', 'charged once  ·  all current is useful', C.violet, false]];
        rows.forEach(([y, lab, txt, col, ac], i) => {
          const p = s.in('why', 3.0 + i * 3.4, 0.8, E.o);
          g.alpha(p, () => {
            g.text(lab, 1070, y, { s: 46, f: 'disp', wt: 800, c: col });
            const x0 = 1180, x1 = 1780; g.line([[x0, y - 22], [x1, y - 22]], { c: col, w: 5, glow: 0.5 }); g.line([[x0, y + 22], [x1, y + 22]], { c: C.steel, w: 5 });
            for (let k = 0; k < 9; k++) { const xx = x0 + 40 + k * 65; g.line([[xx - 8, y - 6], [xx + 8, y - 6]], { c: C.dim, w: 3 }); g.line([[xx - 8, y + 6], [xx + 8, y + 6]], { c: C.dim, w: 3 }); g.line([[xx, y - 22], [xx, y - 6]], { c: C.dim, w: 2 }); g.line([[xx, y + 6], [xx, y + 22]], { c: C.dim, w: 2 }); if (ac) g.glowDot(xx, y, 16, C.l1, Math.abs(Math.sin(t * 4))); }
            if (ac) g.flow([[x0, y - 22], [x1, y - 22]], { c: '#fff', w: 6, gap: 44, off: Math.sin(t * 4) * 34 });
            else g.flow([[x0, y - 22], [x1, y - 22]], { c: '#fff', w: 6, gap: 44, speed: 150, t });
            g.text(txt, 1180, y + 58, { s: 22, c: C.dim });
          });
        });
      });
    },
  });
};
