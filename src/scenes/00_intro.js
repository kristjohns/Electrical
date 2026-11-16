const { W, H, C, E, pr, clamp, lerp, TAU, rgba, mix, plen, pat, psub, sample } = require('../lib/core');
const P = require('../lib/parts');

// panorama used by the intro and the recap: reservoir -> station -> pylons -> substation -> kiosk -> house
const GROUND = 846;
const PATH = { // energy route through the landscape
  pen: [[352, 452], [420, 520], [560, 760], [610, 800]],
};
function panorama(g, t, o = {}) {
  const lit = o.lit || 0;
  P.sky(g, t, { aurora: o.aurora });
  P.ridge(g, P.ridgeFn(3, 640, 330, 0.0023), { c0: '#1a2850', c1: '#0c1428', a: 0.9, snow: 470 });
  P.ridge(g, P.ridgeFn(11, 760, 300, 0.003), { c0: '#16223f', c1: '#0a1122', snow: 560 });
  // big massif on the left holding the reservoir
  const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  const mfl = x => {
    const wob = 12 * Math.sin(x * 0.05) + 7 * Math.sin(x * 0.13 + 1);
    if (x < 96) return lerp(250, 402, sm(-120, 96, x)) + wob * (1 - sm(40, 96, x));
    if (x <= 352) return 452;
    if (x < 480) return lerp(404, 286, sm(352, 480, x)) + wob * sm(352, 410, x);
    return lerp(286, GROUND, Math.pow(sm(480, 800, x), 0.85)) + wob * (1 - sm(690, 800, x));
  };
  P.ridge(g, mfl, { c0: '#22335f', c1: '#0b1326', x0: -130, x1: 810, snow: 400, top: 250 });
  // reservoir + dam
  g.rect(96, 416, 250, 36, { fill: g.lin(0, 416, 0, 452, [[0, '#3aa8ff'], [1, '#1b5fb5']]), w: 0 });
  g.line(sample(u => [96 + u * 250, 416 + Math.sin(u * 30 + t * 2) * 1.3], 0, 1, 40), { c: rgba('#bfe4ff', 0.8), w: 2 });
  g.path(c => { c.moveTo(344, 404); c.lineTo(356, 404); c.lineTo(366, 456); c.lineTo(344, 456); c.closePath(); }, { fill: '#8fa0c4', c: '#c9d6f5', w: 1.5 });
  // penstock inside the mountain
  g.line(PATH.pen, { c: '#0a1020', w: 13, round: 30 }); g.line(PATH.pen, { c: '#1d4f8f', w: 7, round: 30 });
  g.flow(PATH.pen, { c: '#8fd0ff', w: 4, gap: 26, speed: 120, t, round: 30, glow: 0.5 });
  // ground
  g.rect(-100, GROUND, W + 200, 300, { fill: g.lin(0, GROUND, 0, H, [[0, '#0e182f'], [1, '#060a14']]), w: 0 });
  g.line([[-100, GROUND], [W + 100, GROUND]], { c: '#2a3b66', w: 2.5 });
  // power station
  g.rect(596, GROUND - 62, 86, 62, { r: 3, fill: '#1b2a4e', c: '#8fa3d8', w: 2.5 });
  g.path(c => { c.moveTo(590, GROUND - 62); c.lineTo(639, GROUND - 84); c.lineTo(688, GROUND - 62); }, { c: '#8fa3d8', w: 2.5 });
  g.circ(639, GROUND - 30, 17, { c: C.l2, w: 2.5, glow: 0.7 });
  for (let i = 0; i < 6; i++) { const an = t * 4 + i * TAU / 6; g.line([[639, GROUND - 30], [639 + Math.cos(an) * 14, GROUND - 30 + Math.sin(an) * 14]], { c: C.l2, w: 2 }); }
  // pylons + conductors
  const px = [790, 985, 1180], ph = 250;
  const atts = px.map(x => P.pylon(g, x, GROUND, ph, { c: '#93a4cf' }));
  const wires = [];
  for (let k = 0; k < 3; k++) {
    let pts = [[684, GROUND - 58]];
    pts = P.span([684, GROUND - 54 + k * 3], atts[0][k], 16);
    for (let i = 0; i < 2; i++) pts = pts.concat(P.span(atts[i][k], atts[i + 1][k], 34));
    pts = pts.concat(P.span(atts[2][k], [1296 + (k - 1) * 20, GROUND - 92], 18));
    wires.push(pts);
    g.line(pts, { c: mix('#6f80ad', [C.l1, C.l2, C.l3][k], lit), w: 2, glow: lit * 0.5 });
  }
  P.substation(g, 1300, GROUND, 1, { c: '#93a4cf' });
  // distribution: poles to the kiosk, cable to the house
  const dist = [[1384, GROUND - 60], [1470, GROUND - 60], [1556, GROUND - 60]];
  for (const [x, y] of [[1470, 0], [1556, 0]]) { g.line([[x, GROUND], [x, GROUND - 76]], { c: '#8a7256', w: 4, cap: 'butt' }); g.line([[x - 14, GROUND - 66], [x + 14, GROUND - 66]], { c: '#8a7256', w: 3 }); }
  const dl = P.span([1384, GROUND - 84], [1470, GROUND - 66], 10).concat(P.span([1470, GROUND - 66], [1556, GROUND - 66], 10)).concat([[1586, GROUND - 40]]);
  g.line(dl, { c: mix('#6f80ad', C.l1, lit), w: 2, glow: lit * 0.5 });
  P.kiosk(g, 1602, GROUND, 0.56);
  const hs = { x: 1700, y: GROUND, s: 0.17 };
  const svc = [[1620, GROUND - 8], [1640, GROUND + 14], [hs.x - 6, GROUND + 14], [hs.x - 4, GROUND - 24]];
  g.line(svc, { c: mix('#55607f', C.l1, lit), w: 2, round: 6, glow: lit * 0.5 });
  P.house(g, { ...hs, t, lamp: o.lamp || 0, lit: o.houseLit || {}, show: { ground: false } });
  return { wires, dl, svc, hs, route: PATH.pen.concat([[639, GROUND - 30], [684, GROUND - 54]], wires[0], [[1300, GROUND - 60], [1384, GROUND - 84]], dl, svc, [[hs.x + 9, GROUND - 28]]) };
}

module.exports = api => {
  api.scene('intro', {
    hud: false, post: 2.6, fadeIn: 0.9,
    lines: [
      '@flip|You flip a switch, and the light comes on. Instantly.',
      '@behind|But behind that switch is the largest machine humans have ever built.',
      '@chain|A single, synchronised system that reaches from a mountain reservoir, through hundreds of kilometres of power lines, down your street, and into the walls of your home.',
      '@plan|In this video, we follow the energy the whole way. Then we open up a Norwegian home, to see what every component in the fuse box actually does.',
    ],
    draw(g, s) {
      const t = s.t, c = g.c;
      const zo = s.in('behind', -0.3, 3.2, E.io);           // zoom-out progress
      const lampOn = pr(t, s.at('flip', 1.05), 0.12, E.o);
      // ---- wide landscape ----
      if (zo > 0) {
        const fx = 1700 + 640 * 0.17, fy = GROUND - 452 * 0.17;
        const z = Math.exp(lerp(Math.log(9), 0, zo));
        const sx = lerp(W / 2 + 300, fx, zo), sy = lerp(H / 2 - 110, fy, zo); // where the lamp sits on screen
        const cx = fx - (sx - W / 2) / z, cy = fy - (sy - H / 2) / z;
        g.alpha(pr(zo, 0.02, 0.3, E.lin), () => g.cam(cx, cy, z, () => {
          const chain = s.over('chain');
          const pano = panorama(g, t, { lamp: 1, lit: s.in('chain', 0, 1.2) });
          // energy pulse travelling the whole route
          if (s.on('chain')) {
            const L = plen(pano.route), u = E.io2(clamp(s.since('chain') / (s.e.chain - s.c.chain - 0.3)));
            const head = L * u, seg = psub(pano.route, Math.max(0, head - 260), head);
            if (seg.length > 1 && u < 1) g.line(seg, { c: C.energy, w: 5, glow: 1.4 });
            const [hx, hy] = pat(pano.route, head); if (u < 1) g.glowDot(hx, hy, 46, C.energy, 1);
          }
          // stage labels
          const lab = (x, y, a, title, subt, k) => { const p = s.in('chain', k, 0.7, E.o); g.text(title, x, y, { s: 25, wt: 700, al: 'c', p, shadow: 12 }); g.text(subt, x, y + 30, { s: 19, c: C.dim, al: 'c', p: p * 0.95, shadow: 12 }); };
          const d = s.e.chain - s.c.chain;
          lab(222, 372, 0, 'Reservoir', 'stored energy', 0.2 * d);
          lab(640, GROUND + 44, 0, 'Power station', 'turbine + generator', 0.3 * d);
          lab(985, GROUND + 44, 0, 'Transmission grid', 'up to 420 000 V', 0.48 * d);
          lab(1300, GROUND + 44, 0, 'Substations', 'step down', 0.62 * d);
          lab(1560, GROUND + 44, 0, 'Your street', '230 / 400 V', 0.74 * d);
          lab(1790, GROUND + 44, 0, 'Your home', '', 0.86 * d);
        }));
      }
      // ---- close-up: switch + lamp ----
      const cu = 1 - pr(zo, 0, 0.32, E.lin);
      if (cu > 0) g.alpha(cu, () => g.tf({ x: W / 2, y: H / 2, s: 1 + zo * 0.0 }, () => {
        g.rect(-W, -H, 2 * W, 2 * H, { fill: '#0b1020', w: 0 });
        // lamp
        const lx = 300, ly = -250;
        if (lampOn > 0) { c.save(); c.globalCompositeOperation = 'lighter'; const gr = c.createRadialGradient(lx, ly + 130, 10, lx, ly + 240, 1100); gr.addColorStop(0, rgba('#ffe9a8', 0.75 * lampOn)); gr.addColorStop(0.2, rgba('#ffcf6a', 0.26 * lampOn)); gr.addColorStop(1, rgba('#ffcf6a', 0)); c.fillStyle = gr; c.fillRect(-W / 2, -H / 2, W, H); c.restore(); }
        g.line([[lx, -H / 2], [lx, ly]], { c: '#93a4cf', w: 4 });
        g.path(cc => { cc.moveTo(lx - 130, ly + 130); cc.lineTo(lx + 130, ly + 130); cc.quadraticCurveTo(lx + 100, ly + 10, lx + 34, ly); cc.lineTo(lx - 34, ly); cc.quadraticCurveTo(lx - 100, ly + 10, lx - 130, ly + 130); cc.closePath(); }, { fill: mix('#1c2a52', '#fff1c4', lampOn * 0.9), c: mix('#93a4cf', '#fff1c4', lampOn), w: 4 });
        g.circ(lx, ly + 138, 26, { fill: mix('#3a4870', '#ffffff', lampOn), w: 0 }); g.glowDot(lx, ly + 140, 240, '#ffe9a8', lampOn);
        // wall switch
        const sx = -430, sy = 60, on = pr(t, s.at('flip', 0.75), 0.16, E.back);
        g.rect(sx - 110, sy - 110, 220, 220, { r: 22, fill: '#1a2545', c: mix('#93a4cf', '#ffe9a8', lampOn * 0.5), w: 4 });
        g.rect(sx - 62, sy - 84, 124, 168, { r: 12, fill: '#141d38', c: '#6c7fb5', w: 3 });
        const tilt = lerp(-1, 1, on);
        g.path(cc => { cc.moveTo(sx - 54, sy - 76); cc.lineTo(sx + 54, sy - 76); cc.lineTo(sx + 54, sy + 76); cc.lineTo(sx - 54, sy + 76); cc.closePath(); }, { fill: g.lin(0, sy - 76, 0, sy + 76, [[0, mix('#2a3766', '#46558c', clamp(-tilt))], [0.5, '#2f3d70'], [1, mix('#2a3766', '#46558c', clamp(tilt))]]), c: '#8fa3d8', w: 2.5 });
        g.line([[sx - 54, sy + tilt * -6], [sx + 54, sy + tilt * -6]], { c: rgba('#0b1020', 0.8), w: 3 });
        g.circ(sx, sy + 52 * (tilt > 0 ? 1 : -1) * -1, 5, { fill: lampOn > 0.5 ? C.l1 : '#55607f', w: 0 });
        // wire from switch to lamp, pulse
        const wire = [[sx, sy - 110], [sx, -H / 2 + 40], [lx, -H / 2 + 40]];
        g.line(wire, { c: mix('#2b3a61', C.l1, lampOn), w: 4, round: 30, glow: lampOn * 0.7 });
        g.flow(wire, { c: C.energy, a: lampOn, round: 30, t, gap: 60 });
      }));
      // ---- title ----
      const tp = s.in('plan', 0.2, 1.0, E.o), tout = 1;
      if (tp > 0) {
        g.rect(0, 0, W, H, { fill: g.lin(0, 0, 0, H, [[0, rgba('#05080f', 0.82 * tp)], [0.55, rgba('#05080f', 0.5 * tp)], [1, rgba('#05080f', 0.15 * tp)]]), w: 0 });
        g.text('FROM WATERFALL', W / 2, 250, { s: 124, f: 'disp', wt: 800, al: 'c', p: s.in('plan', 0.3, 0.9, E.o), ls: 4 });
        g.text('TO WALL SOCKET', W / 2, 384, { s: 124, f: 'disp', wt: 800, al: 'c', c: C.l1, p: s.in('plan', 0.55, 0.9, E.o), ls: 4 });
        const lw = 620 * s.in('plan', 0.9, 0.9, E.o); g.line([[W / 2 - lw / 2, 470], [W / 2 + lw / 2, 470]], { c: C.l2, w: 3, glow: 1 });
        g.text('How electricity reaches — and works inside — a Norwegian home', W / 2, 526, { s: 38, c: '#cfdaf7', al: 'c', wt: 400, p: s.in('plan', 1.2, 0.9, E.o) });
      }
    },
  });
};
module.exports.panorama = panorama;
module.exports.GROUND = GROUND;
