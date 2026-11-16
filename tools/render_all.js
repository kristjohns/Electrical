#!/usr/bin/env node
// Render every scene to its own segment (cached), in parallel.  usage: node tools/render_all.js [fps] [jobs] [--only id,id]
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const TL = require('../src/timeline');
require('../src/scenes');
const tl = TL.build();
const fps = parseInt(process.argv[2] || '60'), jobs = parseInt(process.argv[3] || '4');
const onlyArg = process.argv.indexOf('--only'), only = onlyArg > 0 ? process.argv[onlyArg + 1].split(',') : null;
const dir = path.join(TL.ROOT, 'build', 'seg'); fs.mkdirSync(dir, { recursive: true });
const totalF = Math.round(tl.total * fps);
const segs = tl.scenes.map((s, i) => { const f0 = Math.round(s.t0 * fps), f1 = i === tl.scenes.length - 1 ? totalF : Math.round((s.t0 + s.dur) * fps); return { id: s.id, f0, f1, file: path.join(dir, `${String(i).padStart(2, '0')}_${s.id}_${f0}_${f1}_${totalF}_${fps}.mp4`) }; });
fs.writeFileSync(path.join(TL.ROOT, 'build', 'segs.txt'), segs.map(s => `file '${s.file}'`).join('\n') + '\n');
const todo = segs.filter(s => (only && only.includes(s.id)) || !fs.existsSync(s.file) || fs.statSync(s.file).size < 1000).sort((a, b) => (b.f1 - b.f0) - (a.f1 - a.f0));
console.log(`${segs.length} scenes, ${todo.length} to render, ${totalF} frames total at ${fps} fps`);
let running = 0, done = 0; const t0 = Date.now();
function next() {
  if (!todo.length) { if (!running) console.log(`all segments ready in ${((Date.now() - t0) / 60000).toFixed(1)} min`); return; }
  const s = todo.shift(); running++;
  const tmp = s.file + '.part.mp4';
  const p = spawn('node', [path.join(TL.ROOT, 'src', 'render.js'), 'video', s.f0, s.f1, tmp, fps], { stdio: ['ignore', 'ignore', 'ignore'], env: { ...process.env, FF_THREADS: '2' } });
  p.on('close', code => { running--; done++; if (code === 0 && fs.existsSync(tmp)) fs.renameSync(tmp, s.file); else console.log('FAILED', s.id, code); console.log(`[${done}] ${s.id} (${s.f1 - s.f0} frames)  ${((Date.now() - t0) / 60000).toFixed(1)} min`); next(); });
}
for (let i = 0; i < jobs; i++) next();
