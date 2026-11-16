// Renders a frame every N seconds across the whole timeline to catch runtime errors. usage: node tools/smoke.js [step]
const { W, H, createCanvas } = require('../src/lib/core');
const TL = require('../src/timeline');
const { drawFrame } = require('../src/stage');
require('../src/scenes');
const tl = TL.build(), step = parseFloat(process.argv[2] || '1.5');
const cv = createCanvas(W, H), ctx = cv.getContext('2d');
let n = 0, bad = 0, t0 = Date.now();
for (let t = 0; t < tl.total; t += step) {
  try { drawFrame(ctx, tl, t); n++; } catch (e) { bad++; const sc = tl.scenes.find(s => t < s.t0 + s.dur); console.log(`ERROR at ${t.toFixed(1)}s in ${sc && sc.id} (local ${(t - sc.t0).toFixed(1)}): ${e.message}\n${String(e.stack).split('\n')[1]}`); if (bad > 12) break; }
}
console.log(`${n} frames ok, ${bad} errors, ${((Date.now() - t0) / n).toFixed(1)} ms/frame avg, total ${(tl.total / 60).toFixed(1)} min`);
