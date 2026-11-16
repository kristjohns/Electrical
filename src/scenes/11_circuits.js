const { W, H, C, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample, rnd } = require('../lib/core');
const P = require('../lib/parts');
const S7 = require('./07_systems');
const { HS } = require('./08_home');
const PH = [C.l1, C.l2, C.l3];

// Schuko socket, front view
function schuko(g, x, y, s, o = {}) {
  g.tf({ x, y, s, a: o.a }, () => {
    g.rect(-150, -150, 300, 300, { r: 26, fill: '#eef1f7', c: '#aab4cc', w: 4 });
    g.circ(0, 0, 112, { fill: '#d9deea', c: '#aab4cc', w: 3 }); g.circ(0, 0, 96, { fill: '#c5cbdb', w: 0 });
    for (const sx of [-38, 38]) g.circ(sx, 0, 15, { fill: '#10172b', c: mix('#6b778f', o.pinC || C.l1, o.pin || 0), w: 4, glow: (o.pin || 0) * 1.2 });
    for (const sy of [-96, 96]) g.rect(-11, sy - (sy < 0 ? 0 : 18), 22, 18, { r: 3, fill: mix('#b9a35a', C.pe, o.earth || 0), c: mix('#8a7a40', C.pe, o.earth || 0), w: 2, glow: (o.earth || 0) * 1.6 });
    g.rect(-112, -9, 16, 18, { fill: '#c5cbdb', w: 0 }); g.rect(96, -9, 16, 18, { fill: '#c5cbdb', w: 0 });
    g.circ(0, 0, 9, { fill: '#aab4cc', c: '#7b879f', w: 2 });
  });
}
// plug, side view, pins pointing left. x = pin tip
function plug(g, x, y, s, o = {}) {
  g.tf({ x, y, s, a: o.a }, () => {
    for (const py of [-38, 38]) g.rect(0, py - 9, 96, 18, { r: 8, fill: '#d9c27a', c: '#a8914a', w: 2 });
    g.path(c => { c.moveTo(96, -92); c.lineTo(190, -92); c.quadraticCurveTo(290, -60, 300, -22); c.lineTo(300, 22); c.quadraticCurveTo(290, 60, 190, 92); c.lineTo(96, 92); c.closePath(); }, { fill: '#27324f', c: '#8f9bb8', w: 4 });
    for (const sy of [-92, 92]) g.rect(104, sy - (sy < 0 ? 0 : 12), 60, 12, { fill: mix('#b9a35a', C.pe, o.earth || 0), w: 0, glow: (o.earth || 0) * 1.5, c: C.pe });
    g.path(c => { c.moveTo(300, 0); c.bezierCurveTo(420, 0, 420, 120, 560, 120); }, { c: '#8f9bb8', w: 22 });
  });
}

module.exports = api => {
  api.chapter('Circuits and Wiring', 'From the board to every socket');

  // ---------------------------------------------------------------- circuits in the house
  api.scene('circ-house', {
    lines: [
      '@split|From the board, the house is divided into circuits. Each has its own breaker, its own cable, and a limited job.',
      '@light|Lighting circuits: typically ten amperes, on one and a half square millimetre cable.',
      '@sock|General socket circuits: sixteen amperes, on two and a half square. That is about three thousand seven hundred watts per circuit. A kettle and a panel heater together, and you are at the limit.',
      '@big|Then the dedicated circuits. The cooker. The water heater. The bathroom floor. The heat pump. And increasingly, the largest of them all: a thirty two ampere circuit for the car charger.',
      '@kitchen|Kitchens get several circuits of their own, because that is where the kilowatts are.',
    ],
    draw(g, s) {
      const t = s.t;
      const order = [['lighting', 'light', 0.2], ['sockets', 'sock', 0.2], ['kitchen', 'sock', 1.6], ['cooker', 'big', 1.6], ['heater', 'big', 3.0], ['bath', 'big', 4.6], ['heatpump', 'big', 6.4], ['ev', 'big', 11.0]];
      const cir = {}, prog = {};
      order.forEach(([k, cue, d]) => { const p = s.in(cue, d, 1.6, E.io2); prog[k] = p; if (p > 0) cir[k] = { trim: p, on: 1, flow: p >= 1 }; else cir[k] = { trim: s.in('split', 2.0, 2.4) * 1, on: 0, a: 0.5 }; });
      const kf = s.in('kitchen', 0.2, 0.6);
      if (kf > 0) for (const k in cir) if (k !== 'kitchen' && k !== 'cooker') cir[k] = { ...cir[k], on: lerp(1, 0.1, kf), flow: false };
      P.sky(g, t, { aurora: 0.3 });
      const lit = { board: 0.6, lampBed: prog.lighting, lampKitchen: prog.lighting, lampBath: prog.lighting, kettle: clamp(prog.kitchen * 2 - 1), panelHeater: clamp(prog.sockets * 2 - 1), tv: clamp(prog.sockets * 2 - 1), hob: clamp(prog.cooker * 2 - 1), heater: clamp(prog.heater * 2 - 1), floorHeat: clamp(prog.bath * 2 - 1), washer: clamp(prog.bath * 2 - 1), heatpump: clamp(prog.heatpump * 2 - 1), car: clamp(prog.ev * 2 - 1) * (0.3 + 0.7 * ((t * 0.08) % 1)) };
      P.house(g, { ...HS, t, lamp: prog.lighting, lit, show: { service: 1 }, flowService: true, circuits: cir });
      P.heading(g, 'One board, many circuits', s.p(0.3, 0.8, E.o));
      // legend
      const lx = 50, lp = s.in('split', 1.0, 0.8, E.o);
      P.panel(g, lx, 200, 330, 560, lp, { fill: rgba('#0a1124', 0.9) });
      g.text('KURSER  ·  CIRCUITS', lx + 22, 232, { s: 17, c: C.dim, wt: 700, ls: 3, a: lp });
      order.forEach(([k], i) => {
        const def = P.CIRCUITS[k], p = prog[k], y = 276 + i * 60, a = lp * lerp(0.35, 1, p);
        g.circ(lx + 34, y, 9, { fill: def.c, w: 0, a, glow: p });
        g.text(def.label, lx + 56, y - 10, { s: 22, wt: 650, a }); g.text(def.amp + '  ·  ' + def.mm, lx + 56, y + 16, { s: 17, f: 'mono', c: def.c, a });
      });
      // socket circuit power
      const sp = s.in('sock', 6.0, 0.8, E.o) * s.out('big', -0.3);
      if (sp > 0) {
        P.panel(g, 430, 884, 1400, 110, sp, { fill: rgba('#0a1124', 0.95) });
        g.rich('16 A × 230 V = ', 460, 940, { s: 30, wt: 600, c: C.dim, p: sp }); g.rich('3 680 W', 712, 940, { s: 36, wt: 800, c: C.l2, p: sp });
        const kw = [['kettle', 2200, C.warm, s.in('sock', 10.6, 0.6)], ['panel heater', 1500, C.hot, s.in('sock', 11.6, 0.6)]];
        let x = 920; g.rect(920, 916, 720, 48, { r: 8, c: C.line, w: 2, a: sp }); g.line([[920 + 720, 904], [920 + 720, 976]], { c: C.bad, w: 3, a: sp }); g.text('limit', 1654, 940, { s: 20, c: C.bad, a: sp });
        kw.forEach(([n, w, col, p]) => { const ww = 720 * w / 3680 * p; g.rect(x, 916, ww, 48, { r: 8, fill: rgba(col, 0.85), w: 0, a: sp }); g.text(n + '  ' + w + ' W', x + 14, 940, { s: 20, wt: 700, c: '#1a1408', a: sp * p }); x += ww; });
      }
      // car charger emphasis
      g.tag('32 A  ·  the biggest circuit in the house', 1480, 950, { s: 24, c: P.CIRCUITS.ev.c, p: s.in('big', 12.0) * s.out('kitchen') });
      g.tag('kitchen: several circuits', 1180, 950, { s: 24, c: P.CIRCUITS.kitchen.c, p: kf });
    },
  });

  // ---------------------------------------------------------------- cable physics
  api.scene('circ-cable', {
    lines: [
      '@why|Why these combinations? Because copper has resistance. A two and a half square millimetre conductor has about seven milliohms per metre. At sixteen amperes, each conductor turns almost two watts per metre into heat, inside your wall.',
      '@temp|PVC insulation is rated for seventy degrees. Bury that cable in thick insulation, as in a modern Norwegian wall, and it cannot get rid of the heat as easily. So the allowed current goes down. That is why the same cable may be fused at thirteen amperes in one wall, and sixteen in another.',
      '@drop|Resistance also costs voltage. Twenty metres of that cable, at full load, loses nearly five volts along the way. For a long run to a garage, or to a car charger, you go up a size.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'Why cable size matters', s.p(0.3, 0.8, E.o));
      // cable side view
      const cp = s.p(0.6, 0.9, E.o), x0 = 130, x1 = 1130, cy = 400;
      P.panel(g, 90, 210, 1090, 380, cp);
      g.alpha(cp, () => {
        g.text('2.5 mm² COPPER  ·  16 A', 120, 250, { s: 20, c: C.copper, wt: 700, ls: 3 });
        g.rect(x0, cy - 62, x1 - x0, 124, { r: 62, fill: '#dfe3ec', c: '#aab4cc', w: 3 });
        const cols = ['#8a5a3a', '#3f6fd8', '#b9e53c'];
        [-36, 0, 36].forEach((dy, i) => {
          g.rect(x0 + 30, cy + dy - 14, x1 - x0 - 60, 28, { r: 14, fill: cols[i], w: 0 });
          if (i === 2) for (let k = 0; k < 24; k++) g.rect(x0 + 50 + k * 40, cy + dy - 14, 16, 28, { fill: '#e8d34a', w: 0 });
          const live = i < 2, heat = live ? 0.5 + 0.5 * Math.sin(t * 2) * 0.2 + 0.3 : 0;
          g.line([[x0 + 30, cy + dy], [x1 - 30, cy + dy]], { c: live ? mix(C.copper, C.hot, heat * 0.6) : C.copper, w: 9, glow: live ? heat : 0 });
          if (live) g.flow([[x0 + 30, cy + dy], [x1 - 30, cy + dy]], { c: '#fff', w: 6, gap: 50, off: -Math.cos(t * 2.4 - i * Math.PI) * 44, a: 0.8 });
        });
        for (let i = 0; i < 26; i++) { const u = (t * 0.5 + rnd(i * 3)) % 1, hx = x0 + 60 + rnd(i) * (x1 - x0 - 120), up = i % 2 ? 1 : -1; g.line(sample(v => [hx + Math.sin(v * 8 + i) * 5, cy + up * (70 + (u + v * 0.3) * 50)], 0, 1, 6), { c: rgba(C.hot, 0.5 * (1 - u) * s.in('why', 9.0, 1)), w: 2.5 }); }
        g.text('L1', x0 - 6, cy - 36, { s: 18, wt: 800, c: C.dim, al: 'r' }); g.text('L2', x0 - 6, cy, { s: 18, wt: 800, c: C.dim, al: 'r' }); g.text('PE', x0 - 6, cy + 36, { s: 18, wt: 800, c: C.pe, al: 'r' });
      });
      const rx = 1220;
      P.panel(g, rx, 210, 610, 380, s.in('why', 2.6, 0.8, E.o));
      g.text('R  ≈  7.4 mΩ per metre', rx + 34, 280, { s: 30, f: 'mono', wt: 600, p: s.in('why', 3.0) });
      P.formula(g, 'P = I^2 · R', rx + 170, 380, s.in('why', 8.0, 0.8, E.o), { c: C.hot, s: 46 });
      g.text('16² × 0.0074', rx + 350, 362, { s: 24, f: 'mono', c: C.dim, p: s.in('why', 9.4) }); g.text('≈ 1.9 W / m', rx + 350, 400, { s: 30, f: 'mono', wt: 800, c: C.hot, p: s.in('why', 10.4) });
      g.text('per conductor, for as long as the load is on', rx + 34, 500, { s: 21, c: C.dim, p: s.in('why', 11.4) });
      // installation method
      const tp = s.in('temp', 0.3, 0.8, E.o) * s.out('drop', -0.4);
      const wall = (x, title, sub, insulated, amp, tempC, p) => {
        P.panel(g, x, 620, 525, 360, p * tp);
        g.alpha(p * tp, () => {
          g.text(title, x + 30, 660, { s: 24, wt: 700 }); g.text(sub, x + 30, 694, { s: 19, c: C.dim });
          const wx = x + 40, wy = 730, ww = 260, wh = 210;
          g.rect(wx, wy, ww, wh, { fill: insulated ? '#3a3320' : '#1c2747', c: '#8f9bb8', w: 2.5 });
          if (insulated) for (let r = 0; r < 7; r++) g.line(sample(u => [wx + u * ww, wy + 20 + r * 28 + Math.sin(u * 30 + r) * 7], 0, 1, 60), { c: rgba('#e8c24a', 0.55), w: 3 });
          g.rect(wx, wy, 18, wh, { fill: '#8f9bb8', w: 0 }); g.rect(wx + ww - 18, wy, 18, wh, { fill: '#8f9bb8', w: 0 });
          const k = clamp((tempC - 30) / 45);
          g.glowDot(wx + ww / 2, wy + wh / 2, 40 + 60 * k, C.hot, 0.5 + 0.5 * k); g.circ(wx + ww / 2, wy + wh / 2, 20, { fill: '#dfe3ec', c: '#aab4cc', w: 2 }); g.circ(wx + ww / 2 - 6, wy + wh / 2, 5, { fill: C.copper, w: 0 }); g.circ(wx + ww / 2 + 6, wy + wh / 2, 5, { fill: C.copper, w: 0 });
          g.text(tempC.toFixed(0) + ' °C', x + 420, 800, { s: 44, f: 'mono', wt: 800, al: 'c', c: tempC > 70 ? C.bad : C.ok });
          g.text('fuse:  ' + amp, x + 420, 880, { s: 30, f: 'mono', wt: 700, al: 'c', c: C.l1 });
        });
      };
      const der = s.in('temp', 14.0, 1.2);
      wall(90, 'Open, or in a conduit', 'heat escapes easily', false, '16 A', 58, s.in('temp', 0.6, 0.7, E.o));
      wall(655, 'Buried in insulation', 'heat is trapped', true, der > 0.5 ? '13 A' : '16 A', lerp(lerp(40, 84, s.in('temp', 5.4, 4.0)), 64, der), s.in('temp', 4.4, 0.7, E.o));
      g.text('PVC limit', 1320, 700, { s: 22, c: C.dim, p: tp * s.in('temp', 0.6) }); g.text('70 °C', 1320, 760, { s: 70, f: 'disp', wt: 800, c: C.bad, p: tp * s.in('temp', 1.0, 0.8, E.o) });
      // voltage drop
      const dp = s.in('drop', 0.3, 0.8, E.o);
      if (dp > 0) {
        P.panel(g, 90, 620, 1740, 360, dp);
        g.alpha(dp, () => {
          const a = 200, b = 1500, y = 760;
          g.text('VOLTAGE DROP', 120, 660, { s: 20, c: C.l2, wt: 700, ls: 3 });
          g.line([[a, y], [b, y]], { c: g.lin(a, 0, b, 0, [[0, C.l1], [1, mix(C.l1, '#5a4416', 0.6)]]), w: 12 }); g.flow([[a, y], [b, y]], { c: '#fff', w: 7, gap: 60, speed: 160, t });
          g.arrow(a, y + 46, b, y + 46, { c: C.dim, w: 2, both: true }); g.text('20 m  ·  2.5 mm²  ·  16 A', (a + b) / 2, y + 76, { s: 22, c: C.dim, al: 'c' });
          const vEnd = 230 - 4.7 * s.in('drop', 3.6, 2.0);
          g.text('230.0 V', a, y - 60, { s: 44, f: 'mono', wt: 800, al: 'c', c: C.l1 }); g.text(vEnd.toFixed(1) + ' V', b, y - 60, { s: 44, f: 'mono', wt: 800, al: 'c', c: mix(C.l1, C.bad, 0.5) });
          g.text('board', a, y - 104, { s: 20, c: C.dim, al: 'c' }); g.text('socket', b, y - 104, { s: 20, c: C.dim, al: 'c' });
          g.rich('ΔU = 2 · I · R · L', 1660, 730, { s: 30, wt: 600, al: 'c', c: C.l2, p: s.in('drop', 4.0) }); g.text('≈ 4.7 V  ( 2 % )', 1660, 790, { s: 30, f: 'mono', wt: 800, al: 'c', c: C.ink, p: s.in('drop', 6.0) });
          g.text('long run or big load  →  go up a size', (a + b) / 2, y + 150, { s: 26, wt: 600, al: 'c', c: C.ok, p: s.in('drop', 9.0) });
        });
      }
    },
  });

  // ---------------------------------------------------------------- socket, earth, colours
  api.scene('circ-socket', {
    lines: [
      '@schuko|At the end of the circuit: the socket. Norway uses the Schuko type. Two round pins carry the power, and two spring clips at the edge carry the protective earth. The earth clips make contact first, and break last.',
      '@earthed|If a fault makes a metal casing live, the earth wire gives the current a path that is not you, and the protection trips. Since the late nineties, sockets in new installations must be earthed. In older homes you will still find unearthed sockets in living rooms and bedrooms.',
      '@colour|Inside the cable, protective earth is always yellow and green. In a TN system, the neutral is blue. In an I T system there is no neutral, so the blue wire is simply a second live conductor.',
      '@unpol|And because a Schuko plug fits either way round, appliances are built to be safe whichever pin is live. Which, in I T, is both of them.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'The socket  ·  stikkontakt', s.p(0.3, 0.8, E.o));
      const pa = s.p(0.5, 0.9, E.o), sx = 330, sy = 520;
      const ins = s.in('schuko', 13.6, 2.4, E.io2), flip = s.in('unpol', 2.0, 1.4);
      const earthOn = clamp(ins * 3), pinOn = clamp(ins * 3 - 1.6);
      P.panel(g, 90, 210, 880, 620, pa);
      schuko(g, sx, sy, 1.15, { a: pa, earth: Math.max(s.in('schuko', 8.4, 0.5) * (1 - pr(t, s.at('schuko', 12.8), 0.6)), earthOn * (1 - flip * 0)), pin: Math.max(s.in('schuko', 5.2, 0.5) * (1 - pr(t, s.at('schuko', 8.0), 0.6)), pinOn) });
      g.alpha(pa, () => { g.c.save(); g.c.beginPath(); g.c.rect(560, 215, 405, 610); g.c.clip(); g.tf({ x: 574 + (1 - ins) * 250, y: sy }, () => plug(g, 0, 0, 1, { earth: earthOn })); g.c.restore(); });
      g.rect(560, 300, 34, 440, { r: 6, fill: '#eef1f7', c: '#aab4cc', w: 3, a: pa }); g.text('side view', 770, 250, { s: 20, c: C.dim, al: 'c', a: pa }); g.text('front view', sx, 250, { s: 20, c: C.dim, al: 'c', a: pa });
      P.callout(g, sx - 44, sy, 150, 790, 'Power pins', '4.8 mm  ·  16 A', s.in('schuko', 5.2) * s.out('earthed'), { c: C.l1, al: 'l', s: 22, ss: 17 });
      P.callout(g, sx, sy - 104, 520, 300, 'Earth clips', 'first to connect, last to break', s.in('schuko', 8.4) * s.out('earthed'), { c: C.pe, al: 'r', s: 22, ss: 17 });
      if (flip > 0) g.text('either way round', 770, 790, { s: 26, wt: 700, c: C.l2, al: 'c', a: flip });
      // earthed vs unearthed
      const ep = s.in('earthed', 0.3, 0.8, E.o) * s.out('colour', -0.4), rx = 1010;
      if (ep > 0) {
        const scen = (x, title, earthed, p) => {
          P.panel(g, x, 210, 400, 620, p * ep, { c: rgba(earthed ? C.ok : C.bad, 0.5) });
          g.alpha(p * ep, () => {
            g.text(title, x + 200, 250, { s: 22, wt: 700, c: earthed ? C.ok : C.bad, al: 'c', ls: 2 });
            const ax = x + 60, ay = 330, GND = 760;
            g.rect(ax, ay, 150, 170, { r: 14, fill: '#1a2747', c: mix('#c9d6ff', C.bad, earthed ? 0.2 : 1), w: 4, glow: earthed ? 0 : 1 }); g.circ(ax + 75, ay + 100, 42, { c: rgba('#c9d6ff', 0.7), w: 3 });
            g.line([[ax + 30, 290], [ax + 30, ay]], { c: C.l1, w: 5 }); g.line([[ax + 22, ay + 10], [ax + 34, ay + 26], [ax + 24, ay + 30], [ax + 36, ay + 48]], { c: '#fff', w: 4, glow: 2, a: 0.6 + 0.4 * Math.sin(t * 30) });
            S7.ground(g, GND, 1, x + 20, x + 380);
            P.person(g, x + 310, GND, 0.82, { hand: [ax + 152, ay + 60], c: earthed ? '#c9d6ff' : C.bad, shake: earthed ? 0 : 1, glow: earthed ? 0 : 0.8 });
            if (earthed) { const pe = [[ax + 75, ay + 170], [ax + 75, GND]]; g.line(pe, { c: C.pe, w: 5 }); g.flow(pe, { c: '#fff', w: 7, gap: 30, speed: 260, t }); g.text('PE', ax + 90, ay + 210, { s: 20, wt: 800, c: C.pe }); g.text('fault current takes the', x + 200, 790, { s: 19, c: C.dim, al: 'c' }); g.text('earth wire: protection trips', x + 200, 814, { s: 19, c: C.ok, al: 'c', wt: 600 }); }
            else { g.flow([[ax + 152, ay + 60], [x + 310, GND - 190], [x + 310, GND]], { c: C.bad, w: 7, gap: 30, speed: 220, t, glow: 1.2 }); g.text('the casing stays live', x + 200, 790, { s: 19, c: C.dim, al: 'c' }); g.text('until someone touches it', x + 200, 814, { s: 19, c: C.bad, al: 'c', wt: 600 }); }
          });
        };
        scen(rx, 'EARTHED  ·  jordet', true, s.in('earthed', 0.4, 0.7, E.o)); scen(rx + 420, 'UNEARTHED  ·  ujordet', false, s.in('earthed', 11.0, 0.7, E.o));
      }
      // colours
      const cp = s.in('colour', 0.3, 0.8, E.o);
      if (cp > 0) {
        P.panel(g, rx, 210, 820, 620, cp);
        g.alpha(cp, () => {
          g.text('WIRE COLOURS', rx + 30, 250, { s: 20, c: C.dim, wt: 700, ls: 3 });
          const wire = (y, col, label, note, p, stripe) => { g.alpha(p, () => { g.rect(rx + 40, y - 16, 300, 32, { r: 16, fill: col, w: 0 }); if (stripe) for (let k = 0; k < 8; k++) g.rect(rx + 60 + k * 36, y - 16, 16, 32, { fill: '#e8d34a', w: 0 }); g.rect(rx + 340, y - 7, 46, 14, { fill: C.copper, w: 0 }); g.text(label, rx + 420, y - 12, { s: 26, wt: 700 }); g.text(note, rx + 420, y + 18, { s: 19, c: C.dim }); }); };
          wire(330, '#6fbf2f', 'PE  ·  protective earth', 'always yellow-green', s.in('colour', 1.6), true);
          g.text('TN', rx + 40, 420, { s: 30, f: 'disp', wt: 800, c: C.l2, a: s.in('colour', 5.0) });
          wire(480, '#8a5a3a', 'L  ·  line', 'brown (or black, grey)', s.in('colour', 5.0)); wire(560, '#3f6fd8', 'N  ·  neutral', 'blue', s.in('colour', 5.6));
          g.text('IT', rx + 40, 650, { s: 30, f: 'disp', wt: 800, c: C.l1, a: s.in('colour', 8.4) });
          wire(710, '#8a5a3a', 'L1  ·  line', 'brown', s.in('colour', 8.4)); wire(790, '#3f6fd8', 'L2  ·  also a line!', 'blue is live here, not a neutral', s.in('colour', 10.4));
        });
      }
      g.text('230 V between the pins, whichever way the plug is turned', W / 2, 920, { s: 30, wt: 600, al: 'c', c: C.ink, p: s.in('unpol', 3.0, 0.8, E.o) });
    },
  });
};
module.exports.schuko = schuko;
