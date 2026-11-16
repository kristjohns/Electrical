const { W, H, C, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample, rnd } = require('../lib/core');
const P = require('../lib/parts');
const PH = [C.l1, C.l2, C.l3];

function serpV(x, y0, y1, n, w) { const pts = []; const st = (y1 - y0) / n; for (let i = 0; i <= n; i++) { const y = y0 + i * st; pts.push([x + (i % 2 ? w : -w), y]); if (i < n) pts.push([x + (i % 2 ? w : -w), y + st]); } return pts; }

module.exports = api => {
  api.chapter('What Uses the Power', 'Heat, mostly: and how the big loads work');

  // ---------------------------------------------------------------- heating
  api.scene('load-heat', {
    lines: [
      '@heatland|So what is all this power used for? In Norway, above all: heat. A typical Norwegian household uses around sixteen thousand kilowatt hours a year, several times the European average, because most heating is electric.',
      '@res|The simplest load of all is a resistor. A panel heater. A floor heating cable. The element in a water heater. Power is voltage squared, divided by resistance, and all of it becomes heat. One hundred percent efficient, and controlled by a thermostat that simply switches it on and off.',
      '@tank|The water heater is the unsung hero. Two hundred litres, a two kilowatt element, and a thermostat set to about seventy degrees. Heating a full tank from cold takes roughly fifteen kilowatt hours. That makes it a thermal battery, about the size of a home battery pack.',
      '@fixed|Because it draws full power for hours on end, a water heater above fifteen hundred watts must now be permanently wired, not plugged into a socket. Plugs and sockets are a classic hot spot.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'Norway heats with electricity', s.p(0.3, 0.8, E.o));
      // consumption
      const a1 = s.in('heatland', 2.6, 0.8, E.o);
      P.panel(g, 90, 210, 850, 360, a1);
      g.alpha(a1, () => {
        g.text('HOUSEHOLD ELECTRICITY PER YEAR', 120, 250, { s: 20, c: C.l1, wt: 700, ls: 3 });
        const bars = [['Norway', 16000, C.l1, s.in('heatland', 6.0, 1.2, E.o)], ['typical in Europe', 3700, C.dim, s.in('heatland', 10.4, 1.0, E.o)]];
        bars.forEach(([n, v, col, p], i) => { const y = 320 + i * 76; g.text(n, 120, y, { s: 24, wt: 600, c: col }); g.rect(360, y - 22, 400 * v / 16000 * p, 44, { r: 8, fill: rgba(col, 0.85), w: 0, c: col, glow: 0.3 }); g.text(Math.round(v * p / 100) * 100 + ' kWh', 360 + 400 * v / 16000 * p + 14, y, { s: 24, f: 'mono', wt: 700, c: col, a: p }); });
        const sp = s.in('heatland', 13.0, 1.0, E.o), sx = 120, sw = 790, parts = [['space heating', 0.6, C.hot], ['hot water', 0.15, C.warm], ['everything else', 0.25, C.l2]];
        let x = sx; parts.forEach(([n, f, col]) => { const w = sw * f * sp; g.rect(x, 470, w - 4, 40, { r: 6, fill: rgba(col, 0.8), w: 0 }); g.text(n, x + 6, 538, { s: 19, c: col, a: sp, wt: 600 }); g.text('≈ ' + Math.round(f * 100) + ' %', x + 12, 490, { s: 19, wt: 800, c: '#1a1408', a: sp }); x += w; });
      });
      // resistor heater + thermostat
      const a2 = s.in('res', 0.3, 0.8, E.o);
      P.panel(g, 980, 210, 850, 360, a2);
      g.alpha(a2, () => {
        g.text('RESISTIVE HEATING', 1010, 250, { s: 20, c: C.hot, wt: 700, ls: 3 });
        const cyc = (t * 0.22) % 1, on = cyc < 0.55, temp = on ? lerp(20.4, 21.6, cyc / 0.55) : lerp(21.6, 20.4, (cyc - 0.55) / 0.45);
        g.rect(1020, 290, 300, 150, { r: 12, fill: mix('#1a2747', '#5a2a1c', on ? 0.8 : 0.1), c: mix('#9fb2e6', C.warm, on ? 1 : 0), w: 3, glow: on ? 0.8 : 0 });
        for (let i = 0; i < 9; i++) g.line([[1050 + i * 30, 306], [1050 + i * 30, 424]], { c: rgba(mix('#9fb2e6', C.warm, on ? 1 : 0), 0.6), w: 3 });
        if (on) for (let i = 0; i < 6; i++) { const u = (t * 0.6 + i / 6) % 1; g.line(sample(v => [1050 + i * 48 + Math.sin(v * 8 + i) * 5, 284 - (u + v * 0.3) * 44], 0, 1, 6), { c: rgba(C.warm, 0.6 * (1 - u)), w: 3 }); }
        g.text(on ? 'ON' : 'OFF', 1170, 480, { s: 26, wt: 800, al: 'c', c: on ? C.warm : C.dim }); g.text(temp.toFixed(1) + ' °C', 1170, 524, { s: 26, f: 'mono', wt: 700, al: 'c' });
        P.formula(g, 'P = U^2 / R', 1580, 330, s.in('res', 9.0, 0.8, E.o), { c: C.hot, s: 46 });
        g.text('230² / 52.9 Ω  =  1000 W', 1580, 410, { s: 24, f: 'mono', c: C.ink, al: 'c', p: s.in('res', 11.0) });
        g.text('100 % becomes heat', 1580, 470, { s: 24, wt: 600, c: C.ok, al: 'c', p: s.in('res', 13.6) });
        g.text('thermostat: just an on/off switch', 1580, 520, { s: 21, c: C.dim, al: 'c', p: s.in('res', 17.6) });
      });
      // water heater
      const a3 = s.in('tank', 0.3, 0.8, E.o);
      P.panel(g, 90, 600, 1740, 380, a3);
      g.alpha(a3, () => {
        g.text('WATER HEATER  ·  varmtvannsbereder', 120, 640, { s: 20, c: C.warm, wt: 700, ls: 3 });
        const tx = 190, ty = 672, tw = 190, th = 280, fill = s.in('tank', 4.0, 14.0, E.lin), c = g.c;
        c.save(); c.beginPath(); c.roundRect(tx, ty, tw, th, 40); c.clip();
        const split = 1 - fill;        // cold layer height fraction from the bottom
        const gr = c.createLinearGradient(0, ty, 0, ty + th); gr.addColorStop(0, '#ff5a3c'); gr.addColorStop(clamp(1 - split - 0.05, 0.01, 0.98), '#ff9a3c'); gr.addColorStop(clamp(1 - split + 0.05, 0.02, 0.99), '#2f7fe0'); gr.addColorStop(1, '#1b5fb5');
        c.fillStyle = gr; c.fillRect(tx, ty, tw, th);
        for (let i = 0; i < 14; i++) { const u = (t * 0.3 + rnd(i * 3)) % 1; g.circ(tx + 30 + rnd(i) * (tw - 60), ty + th - 30 - u * (th - 60), 3, { fill: rgba('#fff', 0.35 * Math.sin(u * Math.PI)), w: 0 }); }
        c.restore();
        g.rect(tx, ty, tw, th, { r: 40, c: '#dfe7fa', w: 4 });
        g.line(serpV(tx + tw / 2, ty + th - 58, ty + th - 24, 3, 46), { c: C.hot, w: 6, glow: 1.2, round: 6 });
        g.line([[tx + 50, ty + th], [tx + 50, ty + th + 22]], { c: C.cold, w: 6 }); g.line([[tx + tw - 50, ty], [tx + tw - 50, ty - 18]], { c: C.hot, w: 6 });
        g.text('cold in', tx - 10, ty + th + 10, { s: 17, c: C.cold, al: 'r' }); g.text('hot out', tx + tw + 10, ty - 6, { s: 17, c: C.hot });
        const col2 = 470;
        g.text('200 L', col2, 700, { s: 44, f: 'disp', wt: 800, p: s.in('tank', 2.2) }); g.text('2 kW element', col2 + 180, 704, { s: 26, c: C.dim, p: s.in('tank', 3.6) }); g.text('thermostat ≈ 70 °C', col2 + 400, 704, { s: 26, c: C.dim, p: s.in('tank', 5.6) });
        g.rich('E = m · c · ΔT', col2, 780, { s: 34, wt: 600, c: C.warm, p: s.in('tank', 8.4) });
        g.text('200 kg × 4.18 kJ/kg·K × 65 K', col2 + 290, 782, { s: 24, f: 'mono', c: C.dim, p: s.in('tank', 9.0) });
        g.text((15.1 * fill).toFixed(1) + ' kWh', col2, 870, { s: 64, f: 'mono', wt: 800, c: C.energy, p: s.in('tank', 8.4) });
        g.text('≈ 7½ hours at 2 kW', col2 + 330, 856, { s: 24, c: C.dim, p: s.in('tank', 11.4) }); g.text('≈ one home battery pack', col2 + 330, 894, { s: 24, wt: 600, c: C.ok, p: s.in('tank', 14.6) });
      });
      // fixed connection
      const a4 = s.in('fixed', 0.3, 0.8, E.o), fx = 1280;
      if (a4 > 0) {
        P.panel(g, fx, 620, 530, 340, a4, { fill: rgba('#0a1124', 0.96), c: rgba(C.bad, 0.5) });
        g.alpha(a4, () => {
          const hot = 0.5 + 0.5 * Math.sin(t * 2.2);
          g.rect(fx + 40, 670, 110, 110, { r: 12, fill: '#eef1f7', c: '#aab4cc', w: 3 }); g.circ(fx + 95, 725, 40, { fill: mix('#c5cbdb', '#8a5a3a', 0.4 + 0.4 * hot), w: 0 }); g.circ(fx + 80, 725, 7, { fill: '#10172b', w: 0 }); g.circ(fx + 110, 725, 7, { fill: '#10172b', w: 0 }); g.glowDot(fx + 95, 725, 90, C.hot, 0.5 + 0.4 * hot);
          g.line([[fx + 34, 664], [fx + 156, 786]], { c: C.bad, w: 7 }); g.line([[fx + 156, 664], [fx + 34, 786]], { c: C.bad, w: 7 });
          g.text('> 1 500 W', fx + 190, 700, { s: 36, f: 'mono', wt: 800, c: C.ink }); g.text('no plug: fixed connection', fx + 190, 748, { s: 22, c: C.dim });
          g.rect(fx + 40, 830, 110, 90, { r: 10, fill: '#27324f', c: C.ok, w: 3 }); g.line([[fx + 60, 875], [fx + 130, 875]], { c: C.copper, w: 8 }); g.circ(fx + 80, 875, 9, { fill: '#aab6d3', w: 0 }); g.circ(fx + 112, 875, 9, { fill: '#aab6d3', w: 0 });
          g.text('screw terminals', fx + 190, 858, { s: 26, wt: 700, c: C.ok }); g.text('fast tilkobling', fx + 190, 894, { s: 22, c: C.dim, it: true });
        });
      }
    },
  });

  // ---------------------------------------------------------------- heat pump
  api.scene('load-heatpump', {
    lines: [
      '@hp|A heat pump does better than one hundred percent, without breaking any laws. It does not make heat. It moves it.',
      '@cycle|A compressor raises the pressure and temperature of a refrigerant. Indoors, it condenses, and gives off heat. Through an expansion valve, pressure and temperature drop. Outdoors, it evaporates, absorbing heat from air that may be well below freezing.',
      '@cop|For every kilowatt of electricity into the compressor, three or four kilowatts of heat arrive in the living room. That ratio is the coefficient of performance.',
      '@inv|Electrically, a modern heat pump is an inverter. It rectifies the mains to direct current, then synthesises a new three-phase alternating current, at whatever frequency it likes, to run the compressor at exactly the speed the house needs.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'The heat pump  ·  varmepumpe', s.p(0.3, 0.8, E.o));
      const pa = s.p(0.5, 0.9, E.o), L = 560, R = 1360, T = 290, B = 700, mx = (L + R) / 2;
      const inv = s.in('inv', 0.2, 0.9);
      g.alpha(pa, () => {
        // indoor / outdoor regions
        g.rect(90, 210, 720, 580, { r: 18, fill: rgba('#3a2a1c', 0.5), c: rgba(C.warm, 0.3), w: 1.5 }); g.rect(1110, 210, 720, 580, { r: 18, fill: rgba('#12284a', 0.6), c: rgba(C.cold, 0.3), w: 1.5 });
        g.text('INDOORS  ·  + 21 °C', 120, 250, { s: 20, c: C.warm, wt: 700, ls: 3 }); g.text('OUTDOORS  ·  – 5 °C', 1800, 250, { s: 20, c: C.cold, wt: 700, ls: 3, al: 'r' });
        for (let i = 0; i < 16; i++) { const u = (t * 0.06 + rnd(i * 3.1)) % 1; g.text('✻', 1480 + rnd(i) * 320, 280 + u * 480, { s: 16 + rnd(i * 2) * 14, c: rgba('#cfe6ff', 0.5 * Math.sin(u * Math.PI)), al: 'c' }); }
        // loop segments with state colours
        const hotGas = '#ff5a3c', liquid = '#ffb347', coldMix = '#3aa0ff', coolGas = '#7fd8ff';
        const segs = [
          [[[mx - 60, B], [L, B], [L, B - 60]], hotGas], [[[L, B - 60], ...serpV(L, B - 60, T + 60, 6, 60).slice(1), [L, T + 60]], g.lin(0, B, 0, T, [[0, hotGas], [1, liquid]])], [[[L, T + 60], [L, T], [mx - 40, T]], liquid],
          [[[mx + 40, T], [R, T], [R, T + 60]], coldMix], [[[R, T + 60], ...serpV(R, T + 60, B - 60, 6, 60).slice(1), [R, B - 60]], g.lin(0, T, 0, B, [[0, coldMix], [1, coolGas]])], [[[R, B - 60], [R, B], [mx + 60, B]], coolGas],
        ];
        segs.forEach(([pts, col], i) => { g.line(pts, { c: '#0a1020', w: 20, round: 16 }); g.line(pts, { c: col, w: 12, round: 16, glow: 0.5 }); g.flow(pts, { c: '#fff', w: 6, gap: 44, speed: 150, t, round: 16, a: 0.8, glow: 0.3 }); });
        // compressor
        g.circ(mx, B, 64, { fill: '#1c2747', c: '#dfe7fa', w: 4 });
        for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; g.path(c => { c.moveTo(mx, B); c.quadraticCurveTo(mx + Math.cos(a + 0.8) * 34, B + Math.sin(a + 0.8) * 34, mx + Math.cos(a) * 52, B + Math.sin(a) * 52); }, { c: C.violet, w: 5 }); }
        g.text('compressor', mx, B + 92, { s: 22, wt: 700, al: 'c' });
        // expansion valve
        g.path(c => { c.moveTo(mx - 40, T - 26); c.lineTo(mx + 40, T + 26); c.lineTo(mx + 40, T - 26); c.lineTo(mx - 40, T + 26); c.closePath(); }, { fill: '#1c2747', c: '#dfe7fa', w: 4 });
        g.text('expansion valve', mx, T - 50, { s: 22, wt: 700, al: 'c' });
        // heat arrows
        for (let i = 0; i < 5; i++) { const u = (t * 0.5 + i / 5) % 1, y = T + 90 + i * 62; g.arrow(L - 90 - u * 150, y, L - 130 - u * 150, y, { c: C.hot, w: 5, head: 16, a: Math.sin(u * Math.PI) }); g.arrow(R + 240 - u * 150, y, R + 200 - u * 150, y, { c: C.cold, w: 5, head: 16, a: Math.sin(u * Math.PI) }); }
        g.text('condenser', L + 100, (T + B) / 2 - 14, { s: 22, wt: 700, c: liquid }); g.text('gives off heat', L + 100, (T + B) / 2 + 16, { s: 19, c: C.dim });
        g.text('evaporator', R - 100, (T + B) / 2 - 14, { s: 22, wt: 700, c: coolGas, al: 'r' }); g.text('absorbs heat', R - 100, (T + B) / 2 + 16, { s: 19, c: C.dim, al: 'r' });
      });
      // state tags
      const tg = (x, y, txt, col, d) => g.tag(txt, x, y, { s: 19, c: col, bg: rgba('#0a1124', 0.92), p: s.in('cycle', d) * (1 - inv) });
      tg(mx - 230, 700 + 44, 'hot gas  ·  high pressure', '#ff8a70', 1.6); tg(mx - 220, 290 + 44, 'warm liquid', '#ffb347', 7.4); tg(mx + 230, 290 + 44, 'cold mix  ·  low pressure', '#6fbcff', 10.8); tg(mx + 230, 700 + 44, 'cool gas', '#7fd8ff', 15.0);
      // COP tally
      const cp = s.in('cop', 0.3, 0.8, E.o) * (1 - inv);
      if (cp > 0) {
        P.panel(g, 250, 820, 1420, 160, cp, { fill: rgba('#0a1124', 0.95) });
        const it = [['1 kW', 'electricity', C.violet, 0.4], ['+', '', C.dim, 2.4], ['3 kW', 'from outdoor air', C.cold, 2.4], ['=', '', C.dim, 4.4], ['4 kW', 'of heat indoors', C.hot, 4.4]];
        let x = 320; it.forEach(([a, b, col, d]) => { const p = s.in('cop', d, 0.6, E.o); g.text(a, x, 880, { s: b ? 58 : 44, f: 'disp', wt: 800, c: col, p }); if (b) g.text(b, x, 940, { s: 21, c: C.dim, p }); x += b ? 300 : 90; });
        g.text('COP = 4', 1520, 900, { s: 60, f: 'disp', wt: 800, c: C.ok, al: 'c', p: s.in('cop', 8.0, 0.8, E.o) });
      }
      // inverter chain
      if (inv > 0) {
        P.panel(g, 90, 810, 1740, 180, inv, { fill: rgba('#0a1124', 0.96) });
        g.alpha(inv, () => {
          const f = 1.2 + 0.9 * Math.sin(t * 0.5), st = [['mains  50 Hz', x => Math.sin(x - t * 4), C.l1], ['rectifier', x => Math.abs(Math.sin(x - t * 4)), C.warn], ['DC link', x => 0.8 + 0.03 * Math.sin(x * 4), C.ok], ['inverter: any frequency', null, C.violet]];
          st.forEach(([lab, fn, col], i) => {
            const x = 130 + i * 430, w = 330;
            g.text(lab, x, 846, { s: 20, wt: 700, c: col, a: s.in('inv', 1.0 + i * 2.2) });
            g.alpha(s.in('inv', 1.0 + i * 2.2), () => {
              if (fn) g.plot(fn, x, 866, w, 100, { xr: [0, TAU * 3], yr: [-1.2, 1.2], c: col, w: 3.5, glow: 0.6 });
              else for (let k = 0; k < 3; k++) g.plot(xv => Math.sin(xv * f - t * 4 * f - k * TAU / 3), x, 866, w, 100, { xr: [0, TAU * 3], yr: [-1.2, 1.2], c: PH[k], w: 3, glow: 0.5 });
              if (i < 3) g.arrow(x + w + 20, 916, x + w + 80, 916, { c: C.dim, w: 3 });
            });
          });
          g.text(Math.round(20 + f * 38) + ' Hz', 1790, 846, { s: 22, f: 'mono', wt: 700, c: C.violet, al: 'r', a: s.in('inv', 7.6) });
        });
      }
    },
  });

  // ---------------------------------------------------------------- induction, electronics, stove guard
  api.scene('load-kitchen', {
    lines: [
      '@ind|The induction hob is a transformer in which your pan is the secondary winding. A coil under the glass carries current at twenty to a hundred kilohertz. The rapidly changing field induces eddy currents in the steel base of the pan, and the resistance of the pan itself turns them into heat. The glass is only warmed by the pan.',
      '@smps|Almost everything else in the house, the lights, the television, the phone charger, runs on low voltage direct current. Each has a small switching power supply. It rectifies the mains, then chops it at high frequency, so that the transformer inside can be tiny. Remember: a transformer needs a changing flux. The faster the change, the less iron it needs.',
      '@komfyr|One Norwegian speciality: the stove guard. A sensor above the hob watches the temperature, and cuts the power before a forgotten pan becomes a fire. It has been mandatory in new kitchens since two thousand and ten.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'Induction, electronics and the stove guard', s.p(0.3, 0.8, E.o));
      const pa = s.p(0.5, 0.9, E.o), cx = 540, gy = 700;
      const guard = s.in('komfyr', 0.2, 0.8), over = s.in('komfyr', 5.0, 5.0, E.lin), cut = s.sinceE('komfyr') > 11.0;
      const power = cut ? 0 : 1, panHeat = cut ? clamp(1 - (s.sinceE('komfyr') - 11) / 8) : Math.max(0.55, over);
      P.panel(g, 90, 210, 900, 770, pa);
      g.alpha(pa, () => {
        g.text('INDUCTION HOB  ·  cross-section', 120, 250, { s: 20, c: C.l3, wt: 700, ls: 3 });
        // field loops
        if (power) for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) g.ell(cx + sx * 120, gy + 26, 70 + k * 34, 46 + k * 30, { c: rgba('#c7b6ff', (0.7 - k * 0.18) * s.in('ind', 9.0, 0.8)), w: 3, dash: [12, 10], off: Math.sin(t * 9) * 26 * sx });
        // pan
        g.path(c => { c.moveTo(cx - 240, gy - 190); c.lineTo(cx - 220, gy - 44); c.lineTo(cx + 220, gy - 44); c.lineTo(cx + 240, gy - 190); }, { c: '#c9d6ff', w: 7, fill: rgba('#2f7fe0', 0.22) });
        g.rect(cx - 226, gy - 46, 452, 40, { r: 6, fill: mix('#5c6884', C.hot, panHeat * s.in('ind', 13.0, 1.5)), c: '#c9d6ff', w: 3, glow: panHeat * s.in('ind', 13.0, 1.5) * 1.3 });
        // eddy currents in the base
        const ed = s.in('ind', 13.0, 0.8) * power;
        for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) g.ell(cx + sx * 120, gy - 26, 70 - k * 30, 10 - k * 4, { c: rgba('#fff', 0.8 * ed), w: 2.5, dash: [10, 8], off: -t * 120 * sx });
        for (let i = 0; i < 10; i++) { const u = (t * 0.4 + rnd(i * 2.2)) % 1; g.circ(cx - 190 + rnd(i) * 380, gy - 56 - u * 110, 4 + rnd(i * 5) * 3, { c: rgba('#cfe6ff', 0.6 * Math.sin(u * Math.PI) * panHeat), w: 2 }); }
        // glass
        g.rect(cx - 400, gy - 6, 800, 20, { r: 4, fill: '#0c1326', c: '#8fa3d8', w: 2.5 });
        // coil (cross-section) + ferrite
        for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) g.circ(cx + sx * (60 + i * 20), gy + 34, 8.5, { fill: mix('#5a4a3a', C.copper, 0.4 + 0.6 * power), c: '#ffd2a8', w: 1.5, glow: power * 0.5 });
        g.rect(cx - 200, gy + 52, 400, 14, { r: 3, fill: '#39424f', w: 0 });
        g.rect(cx - 90, gy + 110, 180, 70, { r: 10, fill: '#1c2747', c: C.l3, w: 3 }); g.text(power ? '20–100 kHz' : 'OFF', cx, gy + 145, { s: 24, f: 'mono', wt: 700, al: 'c', c: power ? C.l3 : C.bad });
        g.line([[cx - 60, gy + 110], [cx - 60, gy + 80], [cx - 120, gy + 80], [cx - 120, gy + 44]], { c: C.copper, w: 3, round: 6 }); g.line([[cx + 60, gy + 110], [cx + 60, gy + 80], [cx + 120, gy + 80], [cx + 120, gy + 44]], { c: C.copper, w: 3, round: 6 });
      });
      const lo = s.out('komfyr', -0.3);
      P.callout(g, cx + 150, gy + 34, 800, 900, 'Coil', 'the primary winding', s.in('ind', 5.0) * lo, { c: C.copper, al: 'r', s: 22, ss: 17 });
      P.callout(g, cx - 150, gy - 26, 150, 400, 'Pan base', 'the secondary: eddy currents', s.in('ind', 13.0) * lo, { c: C.hot, al: 'l', s: 22, ss: 17 });
      P.callout(g, cx - 330, gy + 4, 150, 900, 'Glass', 'stays (almost) cool', s.in('ind', 20.5) * lo, { c: '#8fa3d8', al: 'l', s: 22, ss: 17 });
      // stove guard
      if (guard > 0) g.alpha(guard, () => {
        g.rect(cx - 70, 300, 140, 44, { r: 10, fill: '#eef1f7', c: cut ? C.bad : '#aab4cc', w: 3, glow: cut ? 1.2 : 0 }); g.circ(cx, 322, 9, { fill: cut ? C.bad : over > 0.5 ? C.warn : C.ok, w: 0 });
        g.path(c => { c.moveTo(cx - 40, 346); c.lineTo(cx - 190, gy - 200); c.lineTo(cx + 190, gy - 200); c.lineTo(cx + 40, 346); c.closePath(); }, { fill: rgba(cut ? C.bad : C.warn, 0.07 + 0.05 * Math.sin(t * 5)), w: 0 });
        g.text('stove guard  ·  komfyrvakt', cx + 90, 322, { s: 22, wt: 700, c: C.ink });
        g.text(Math.round(lerp(180, 330, over)) + ' °C', cx - 96, 322, { s: 24, f: 'mono', wt: 700, al: 'r', c: over > 0.7 ? C.bad : C.warn, a: cut ? 0.4 : 1 });
        if (cut) g.tag('power cut', cx, 420, { s: 26, c: C.bad, p: pr(t, s.at('komfyr', 11.0), 0.4) });
      });
      // SMPS chain
      const sp = s.in('smps', 0.3, 0.8, E.o), rx = 1030;
      P.panel(g, rx, 210, 800, 770, sp);
      g.alpha(sp, () => {
        g.text('SWITCHING POWER SUPPLY', rx + 30, 250, { s: 20, c: C.l2, wt: 700, ls: 3 });
        const rows = [['mains', '230 V  ·  50 Hz', x => Math.sin(x - t * 3), C.l1, 6.0], ['rectified', '≈ 325 V DC', x => 0.82 + 0.1 * Math.abs(Math.sin(x - t * 3)), C.warn, 9.8], ['chopped', '≈ 100 kHz', x => (Math.sin(x * 9 - t * 20) > 0 ? 0.85 : 0), C.l3, 11.4], ['transformed', 'tiny transformer', x => (Math.sin(x * 9 - t * 20) > 0 ? 0.3 : -0.3), C.violet, 14.4], ['output', '5 V DC', x => 0.22, C.ok, 16.4]];
        rows.forEach(([a, b, fn, col, d], i) => { const p = s.in('smps', d, 0.6, E.o), y = 290 + i * 112; g.alpha(p, () => { g.text(a, rx + 30, y + 30, { s: 24, wt: 700, c: col }); g.text(b, rx + 30, y + 62, { s: 18, f: 'mono', c: C.dim }); g.line([[rx + 250, y + 50], [rx + 600, y + 50]], { c: rgba(C.faint, 0.6), w: 1.5 }); g.plot(fn, rx + 250, y, 350, 100, { xr: [0, TAU * 2.5], yr: [-1.2, 1.2], c: col, w: 3, glow: 0.5, n: 300 }); }); });
        // transformer size comparison
        const tp = s.in('smps', 19.6, 0.8, E.o);
        g.alpha(tp, () => { g.rect(rx + 640, 300, 120, 120, { r: 8, fill: '#27324f', c: '#8b9bc4', w: 3 }); g.rect(rx + 664, 324, 72, 72, { fill: C.copper, w: 0 }); g.text('50 Hz', rx + 700, 444, { s: 18, c: C.dim, al: 'c' }); g.rect(rx + 682, 640, 36, 36, { r: 4, fill: '#27324f', c: '#8b9bc4', w: 2.5 }); g.rect(rx + 690, 648, 20, 20, { fill: C.copper, w: 0 }); g.text('100 kHz', rx + 700, 700, { s: 18, c: C.dim, al: 'c' }); g.arrow(rx + 700, 470, rx + 700, 620, { c: C.ok, w: 3 }); g.text('same', rx + 716, 530, { s: 17, c: C.ok }); g.text('power', rx + 716, 554, { s: 17, c: C.ok }); });
        g.text('faster flux change  →  less iron', rx + 400, 900, { s: 26, wt: 600, al: 'c', c: C.ink, p: s.in('smps', 24.0) });
      });
    },
  });

  // ---------------------------------------------------------------- EV charging
  api.scene('load-ev', {
    lines: [
      '@ev|And then the newest big load. More than nine out of ten new cars sold in Norway are electric, and most of them are charged at home.',
      '@evse|The box on the wall is not really a charger. The charger sits inside the car, converting alternating current to direct current for the battery. The wall box is a smart safety switch. Before closing its contactor, it checks the earth connection, and it tells the car how much current it may draw, using a simple pulse width signal on a pilot wire.',
      '@kw|On a two hundred and thirty volt I T supply, most cars charge single-phase. Thirty two amperes gives seven point four kilowatts. On a four hundred volt TN supply, the same car can use three phases, and reach eleven, or twenty two.',
      '@bal|A car charging at seven kilowatts is like running three ovens, all night. So modern chargers measure the total load of the house, and throttle themselves to stay below the main fuse.',
    ],
    draw(g, s) {
      const t = s.t;
      P.heading(g, 'Charging the car  ·  elbillading', s.p(0.3, 0.8, E.o));
      const pa = s.p(0.5, 0.9, E.o), wy = 400;
      const tClose = s.at('evse', 16.6), closed = pr(t, tClose, 0.4), charging = t > tClose + 0.4;
      P.panel(g, 90, 210, 1740, 400, pa);
      g.alpha(pa, () => {
        // wall box
        const bx = 300;
        g.rect(bx - 120, 250, 240, 320, { r: 26, fill: '#eef1f7', c: '#aab4cc', w: 4 }); g.rect(bx - 96, 276, 192, 268, { r: 14, fill: '#19233f', w: 0 });
        g.text('WALL BOX', bx, 300, { s: 17, wt: 800, al: 'c', c: '#8f9bb8', ls: 3 });
        for (const [dy, k] of [[-22, 0], [22, 1]]) { const y = wy + dy; g.line([[bx - 190, y], [bx - 50, y]], { c: PH[k], w: 5 }); g.circ(bx - 50, y, 7, { fill: PH[k], w: 0 }); g.circ(bx + 30, y, 7, { fill: mix(C.line, PH[k], closed), w: 0 }); g.line([[bx - 50, y], [bx - 50 + Math.cos(-(1 - closed) * 0.5) * 80, y + Math.sin(-(1 - closed) * 0.5) * 80]], { c: '#fff', w: 6 }); }
        g.text('contactor', bx, wy - 62, { s: 17, c: C.dim, al: 'c' });
        g.rect(bx - 80, 470, 160, 56, { r: 8, fill: '#101a33', c: C.ok, w: 2 }); g.text('controller', bx, 488, { s: 17, wt: 700, al: 'c', c: C.ok }); g.text('+ DC leak detect', bx, 510, { s: 14, al: 'c', c: C.dim });
        // cable
        const cab = [[bx + 30, wy], [bx + 120, wy], [760, wy + 40], [1010, wy + 40]];
        g.line(cab, { c: '#27324f', w: 26, round: 60 });
        g.line(cab.map(([x, y]) => [x, y - 6]), { c: mix(C.line, C.l1, closed), w: 5, round: 60, glow: closed * 0.6 }); g.line(cab.map(([x, y]) => [x, y + 6]), { c: C.pe, w: 3, round: 60, dash: [10, 6], cap: 'butt' });
        if (charging) g.flow(cab.map(([x, y]) => [x, y - 6]), { c: C.energy, w: 7, gap: 46, speed: 200, t, round: 60 });
        const pil = [[bx + 80, 498], [bx + 150, 498], [760, wy + 86], [1040, wy + 86], [1040, wy + 60]];
        g.line(pil, { c: C.l2, w: 2.5, round: 30, dash: [3, 7], off: -t * 40 * s.in('evse', 12.0, 0.6) }); g.text('pilot wire', 560, wy + 132, { s: 18, c: C.l2, a: s.in('evse', 12.0) });
        // car
        P.car(g, 1010, 560, 2.5, { charge: charging ? ((t - tClose) * 0.03) % 1 * 0.6 + 0.3 : 0.25 });
        g.rect(1150, 398, 150, 56, { r: 8, fill: '#101a33', c: C.violet, w: 2.5, glow: charging ? 0.8 : 0 }); g.text('on-board charger', 1225, 416, { s: 15, wt: 700, al: 'c', c: C.violet }); g.text('AC  →  DC', 1225, 438, { s: 16, f: 'mono', al: 'c', c: C.ink });
        g.line([[1040, wy + 40], [1100, wy + 26], [1150, wy + 26]], { c: mix(C.line, C.l1, closed), w: 4, round: 10 }); g.line([[1225, 454], [1225, 478]], { c: C.violet, w: 4 }); if (charging) g.flow([[1225, 454], [1225, 480]], { c: '#fff', w: 5, gap: 14, speed: 60, t });
        g.text('battery', 1370, 512, { s: 17, wt: 700, c: C.ok, al: 'c' });
      });
      P.callout(g, 300, 250, 520, 232, 'Not a charger: a safety switch', 'EVSE  ·  ladestasjon', s.in('evse', 0.6) * s.out('kw', 0), { c: C.ink, al: 'l', s: 22, ss: 17 });
      P.callout(g, 1225, 398, 1400, 262, 'The real charger', 'inside the car', s.in('evse', 4.0) * s.out('kw', 0), { c: C.violet, al: 'l', s: 22, ss: 17 });
      // pilot signal
      const pp = s.in('evse', 12.4, 0.8, E.o) * s.out('kw', -0.3);
      if (pp > 0) {
        P.panel(g, 90, 640, 1740, 340, pp);
        g.alpha(pp, () => {
          g.text('CONTROL PILOT  ·  1 kHz pulse-width signal', 120, 680, { s: 20, c: C.l2, wt: 700, ls: 3 });
          const duty = 0.533, x0 = 130, w = 900;
          g.plot(x => (((x - t * 0.8) % 1 + 1) % 1 < duty ? 1 : -1), x0, 720, w, 180, { xr: [0, 5], yr: [-1.4, 1.4], c: C.l2, w: 4, glow: 0.7, n: 500 });
          g.text('+12 V', x0 - 10, 746, { s: 16, f: 'mono', c: C.dim, al: 'r' }); g.text('–12 V', x0 - 10, 876, { s: 16, f: 'mono', c: C.dim, al: 'r' });
          g.text('pulse width', 1120, 740, { s: 22, c: C.dim }); g.text('53 %', 1120, 800, { s: 64, f: 'mono', wt: 800, c: C.l2 });
          g.text('→', 1330, 800, { s: 50, c: C.faint }); g.text('"you may draw"', 1420, 740, { s: 22, c: C.dim }); g.text('32 A', 1420, 800, { s: 64, f: 'mono', wt: 800, c: C.ok });
          const stp = [['earth checked', 14.0], ['car says ready', 15.4], ['contactor closes', 16.6]];
          stp.forEach(([txt, d], i) => { const p = s.in('evse', d, 0.5); g.circ(1130 + i * 235, 900, 12, { fill: p > 0.5 ? C.ok : '#27324f', c: C.ok, w: 2.5 }); g.text(txt, 1152 + i * 235, 900, { s: 19, c: p > 0.5 ? C.ink : C.dim }); });
        });
      }
      // power table
      const kp = s.in('kw', 0.3, 0.8, E.o);
      if (kp > 0) {
        P.panel(g, 90, 640, 850, 340, kp);
        g.alpha(kp, () => {
          g.text('CHARGING POWER', 120, 680, { s: 20, c: C.ok, wt: 700, ls: 3 });
          const rows = [['IT 230 V  ·  1-phase  ·  16 A', 3.7, C.l1, 3.0], ['IT 230 V  ·  1-phase  ·  32 A', 7.4, C.l1, 5.0], ['TN 400 V  ·  3-phase  ·  16 A', 11, C.l2, 12.6], ['TN 400 V  ·  3-phase  ·  32 A', 22, C.l2, 13.8]];
          rows.forEach(([lab, kw, col, d], i) => { const p = s.in('kw', d, 0.8, E.o), y = 734 + i * 62; g.text(lab, 120, y, { s: 20, c: col, wt: 600, a: p }); g.rect(470, y - 18, 330 * kw / 22 * p, 36, { r: 7, fill: rgba(col, 0.85), w: 0 }); g.text((kw * p).toFixed(1) + ' kW', 470 + 330 * kw / 22 * p + 12, y, { s: 22, f: 'mono', wt: 700, c: col, a: p }); });
        });
      }
      // load balancing
      const bp = s.in('bal', 0.3, 0.8, E.o);
      if (bp > 0) {
        P.panel(g, 980, 640, 850, 340, bp);
        g.alpha(bp, () => {
          g.text('LOAD BALANCING  ·  lastbalansering', 1010, 680, { s: 20, c: C.warn, wt: 700, ls: 3 });
          const x0 = 1030, w = 760, y0 = 940, h = 200, lim = 13;
          const house = tt => 2.2 + 4.2 * clamp(Math.sin(tt * 0.9) * 3) * (Math.sin(tt * 0.9) > 0 ? 1 : 0) + 1.2 * (Math.sin(tt * 2.3) > 0.6 ? 1 : 0);
          const c = g.c, n = 120, T = tt => t - 12 * (1 - tt);
          c.save(); c.beginPath(); c.moveTo(x0, y0); for (let i = 0; i <= n; i++) c.lineTo(x0 + w * i / n, y0 - house(T(i / n)) / 16 * h); c.lineTo(x0 + w, y0); c.closePath(); c.fillStyle = rgba(C.hot, 0.6); c.fill();
          c.beginPath(); for (let i = 0; i <= n; i++) c.lineTo(x0 + w * i / n, y0 - house(T(i / n)) / 16 * h); for (let i = n; i >= 0; i--) { const hv = house(T(i / n)); c.lineTo(x0 + w * i / n, y0 - (hv + Math.min(7.4, lim - 0.6 - hv)) / 16 * h); } c.closePath(); c.fillStyle = rgba(C.pe, 0.65); c.fill(); c.restore();
          g.line([[x0, y0 - lim / 16 * h], [x0 + w, y0 - lim / 16 * h]], { c: C.bad, w: 3, dash: [10, 8] }); g.text('main fuse limit', x0 + w, y0 - lim / 16 * h - 18, { s: 18, c: C.bad, al: 'r' });
          g.line([[x0, y0], [x0 + w, y0]], { c: C.faint, w: 2 });
          g.tag('house', x0 + 60, 716, { s: 18, c: C.hot }); g.tag('car charger', x0 + 190, 716, { s: 18, c: C.pe });
        });
      }
    },
  });
};
