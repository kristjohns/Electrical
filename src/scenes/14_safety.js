const { W, H, C, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample, rnd } = require('../lib/core');
const P = require('../lib/parts');

module.exports = api => {
  api.chapter('Staying Safe', 'Rules, warning signs and good habits');

  api.scene('safety', {
    lines: [
      '@law|A final word on safety. In Norway, work on the fixed installation must be done by a registered electrician, who has to hand you a declaration of conformity afterwards. The technical standard is called N E K four hundred, and the authority is DSB.',
      '@diy|You may do small things yourself. Replace a plug. Connect a lamp. Change a cover plate. Not much more.',
      '@signs|What you can do, is watch for warning signs. A fuse or a socket that feels warm. Discoloured plastic. A burning smell. Breakers that trip again and again. These almost always mean loose connections, or overloaded circuits. And that is how electrical fires begin.',
      '@habits|So: do not run heaters on extension leads. Test the earth fault breaker. And if your board still has screw fuses and no earth fault protection, an upgrade is some of the best money you can spend on your home.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'Respect the last few metres', s.p(0.3, 0.8, E.o));
      const card = (x, y, w, h, title, col, p) => { P.panel(g, x, y + (1 - p) * 20, w, h, p, { c: rgba(col, 0.5) }); g.text(title, x + 30, y + 42, { s: 20, c: col, wt: 700, ls: 3, a: p }); };
      const row = (x, y, txt, sub, col, p, ok = true) => { g.alpha(p, () => { g.circ(x + 16, y, 15, { fill: rgba(col, 0.2), c: col, w: 2.5 }); if (ok) g.line([[x + 9, y], [x + 14, y + 6], [x + 24, y - 6]], { c: col, w: 3 }); else { g.line([[x + 9, y - 7], [x + 23, y + 7]], { c: col, w: 3 }); g.line([[x + 23, y - 7], [x + 9, y + 7]], { c: col, w: 3 }); } g.text(txt, x + 46, y - (sub ? 11 : 0), { s: 25, wt: 600 }); if (sub) g.text(sub, x + 46, y + 18, { s: 19, c: C.dim, it: true }); }); };
      // law
      const p1 = s.in('law', 2.6, 0.8, E.o);
      card(90, 210, 850, 370, 'THE RULES', C.l2, p1);
      row(120, 300, 'Fixed installation: registered electrician only', 'registrert elektrovirksomhet', C.l2, s.in('law', 3.6));
      row(120, 372, 'You get a declaration of conformity', 'samsvarserklæring: keep it with the house papers', C.l2, s.in('law', 8.6));
      row(120, 444, 'The standard: NEK 400', 'the Norwegian wiring regulations', C.l2, s.in('law', 12.0));
      row(120, 516, 'The authority: DSB', 'Direktoratet for samfunnssikkerhet og beredskap', C.l2, s.in('law', 15.2));
      // diy
      const p2 = s.in('diy', 0.2, 0.8, E.o);
      card(980, 210, 850, 370, 'WHAT YOU MAY DO YOURSELF', C.ok, p2);
      row(1010, 300, 'Replace a plug on a cord', null, C.ok, s.in('diy', 2.2));
      row(1010, 372, 'Connect a lamp to an existing lamp point', null, C.ok, s.in('diy', 3.6));
      row(1010, 444, 'Change a cover plate', null, C.ok, s.in('diy', 5.0));
      row(1010, 516, 'New sockets, new cables, anything in the board', null, C.bad, s.in('diy', 6.6), false);
      // warning signs
      const p3 = s.in('signs', 0.2, 0.8, E.o);
      card(90, 610, 850, 370, 'WARNING SIGNS', C.warn, p3);
      g.alpha(p3, () => {
        const sx = 230, sy = 810, heat = 0.5 + 0.5 * Math.sin(t * 1.6), br = s.in('signs', 5.6, 3.0);
        g.rect(sx - 96, sy - 96, 192, 192, { r: 18, fill: mix('#eef1f7', '#b08a5a', br * 0.55), c: '#aab4cc', w: 3 }); g.circ(sx, sy, 70, { fill: mix('#c5cbdb', '#6b4a2a', br * 0.8), w: 0 });
        for (const dx of [-24, 24]) g.circ(sx + dx, sy, 10, { fill: '#10172b', w: 0 });
        g.glowDot(sx + 24, sy, 110, C.hot, (0.35 + 0.3 * heat) * s.in('signs', 3.6, 1));
        for (let i = 0; i < 4; i++) { const u = (t * 0.4 + i / 4) % 1; g.line(sample(v => [sx + 10 + i * 12 + Math.sin(v * 7 + i) * 6, sy - 100 - (u + v * 0.3) * 60], 0, 1, 8), { c: rgba('#cfd6e6', 0.45 * (1 - u) * s.in('signs', 8.4, 1)), w: 3 }); }
      });
      row(400, 690, 'Warm fuse or socket', null, C.warn, s.in('signs', 3.6));
      row(400, 754, 'Discoloured plastic', null, C.warn, s.in('signs', 5.6));
      row(400, 818, 'Burning smell', null, C.warn, s.in('signs', 7.2));
      row(400, 882, 'Breakers tripping repeatedly', null, C.warn, s.in('signs', 8.6));
      g.text('loose connections  ·  overloaded circuits', 515, 946, { s: 22, c: C.bad, wt: 700, al: 'c', p: s.in('signs', 12.6) });
      // habits
      const p4 = s.in('habits', 0.2, 0.8, E.o);
      card(980, 610, 850, 370, 'GOOD HABITS', C.pe, p4);
      row(1010, 700, 'No heaters on extension leads', null, C.bad, s.in('habits', 0.8), false);
      row(1010, 780, 'Test the earth-fault breaker', 'press the T button a couple of times a year', C.pe, s.in('habits', 4.0));
      row(1010, 868, 'Old screw fuses, no RCD?  Upgrade the board', 'the best safety investment in an old house', C.pe, s.in('habits', 6.4));
    },
  });
};
