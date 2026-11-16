#!/usr/bin/env node
// Render CLI.
//   node src/render.js info                      print timeline
//   node src/render.js lines                     write build/lines.json (for TTS)
//   node src/render.js cues                      write build/cues.json + out/*.srt (needs durations)
//   node src/render.js frame <sceneId|abs> <t> <out.png>
//   node src/render.js sheet <sceneId> <t1,t2,..|N> <out.png> [cols]
//   node src/render.js video <f0> <f1> <out.mp4> [fps]
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { W, H, createCanvas } = require('./lib/core');
const TL = require('./timeline');
const { drawFrame } = require('./stage');
require('./scenes');

const tl = TL.build();
const [, , cmd, ...args] = process.argv;
const sceneById = id => { const s = tl.scenes.find(s => s.id === id); if (!s) throw new Error('no scene ' + id); return s; };
const fmt = s => { const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`; };

async function main() {
  if (cmd === 'info') {
    for (const s of tl.scenes) console.log(`${fmt(s.t0).padStart(7)}  ${s.dur.toFixed(1).padStart(5)}s  ${s.id}${s.parsed.some(l => l.estimated) ? '  (est)' : ''}`);
    console.log(`total ${fmt(tl.total)}  (${tl.scenes.length} scenes, ${tl.lines.length} lines, ${tl.lines.reduce((a, l) => a + l.display.split(/\s+/).length, 0)} words)`);
  } else if (cmd === 'lines') {
    fs.mkdirSync(path.join(TL.ROOT, 'build'), { recursive: true });
    fs.writeFileSync(path.join(TL.ROOT, 'build', 'lines.json'), JSON.stringify({ voice: TL.VOICE, speed: TL.SPEED, lines: tl.lines.map(l => ({ hash: l.hash, text: l.text, scene: l.scene })) }, null, 1));
    console.log(tl.lines.length + ' lines');
  } else if (cmd === 'cues') {
    fs.writeFileSync(path.join(TL.ROOT, 'build', 'cues.json'), JSON.stringify({ total: tl.total, lines: tl.lines.map(l => ({ hash: l.hash, abs: l.abs, dur: l.dur })) }));
    const ts = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = Math.floor(s % 60), ms = Math.round((s % 1) * 1000); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`; };
    let srt = ''; tl.lines.forEach((l, i) => { srt += `${i + 1}\n${ts(l.abs)} --> ${ts(l.abs + l.dur + 0.15)}\n${l.display}\n\n`; });
    fs.mkdirSync(path.join(TL.ROOT, 'out'), { recursive: true });
    fs.writeFileSync(path.join(TL.ROOT, 'out', 'subtitles.en.srt'), srt);
    const ch = tl.scenes.filter(s => s.card).map(s => `${fmt(s.t0).replace(/\.\d$/, '').padStart(5, '0')} ${s.chapter}`);
    fs.writeFileSync(path.join(TL.ROOT, 'out', 'chapters.txt'), ['00:00 Intro', ...ch].join('\n') + '\n');
    const chs = [{ t: 0, name: 'Intro' }, ...tl.scenes.filter(s => s.card).map(s => ({ t: s.t0, name: s.chapter }))];
    let meta = ';FFMETADATA1\ntitle=From Waterfall to Wall Socket\n';
    chs.forEach((c, i) => { meta += `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${Math.round(c.t * 1000)}\nEND=${Math.round((i + 1 < chs.length ? chs[i + 1].t : tl.total) * 1000)}\ntitle=${c.name}\n`; });
    fs.writeFileSync(path.join(TL.ROOT, 'build', 'chapters.ffmeta'), meta);
    console.log('cues written, total', fmt(tl.total));
  } else if (cmd === 'frame') {
    const cv = createCanvas(W, H), ctx = cv.getContext('2d');
    const t = args[0] === 'abs' ? parseFloat(args[1]) : sceneById(args[0]).t0 + parseFloat(args[1]);
    drawFrame(ctx, tl, t);
    fs.writeFileSync(args[2], cv.toBuffer('image/png'));
  } else if (cmd === 'sheet') {
    const sc = sceneById(args[0]);
    let times;
    if (args[1].includes(',')) times = args[1].split(',').map(Number);
    else { const n = parseInt(args[1]); times = Array.from({ length: n }, (_, i) => 0.4 + (sc.dur - 0.9) * i / (n - 1)); }
    const cols = parseInt(args[3] || (times.length <= 4 ? 2 : 3)), rows = Math.ceil(times.length / cols);
    const fw = Math.floor(1920 / cols), fh = Math.round(fw * 9 / 16);
    const sheet = createCanvas(fw * cols, fh * rows), sx = sheet.getContext('2d');
    const cv = createCanvas(W, H), ctx = cv.getContext('2d');
    times.forEach((t, i) => {
      drawFrame(ctx, tl, sc.t0 + t);
      const x = (i % cols) * fw, y = Math.floor(i / cols) * fh;
      sx.drawImage(cv, x, y, fw, fh);
      sx.fillStyle = 'rgba(0,0,0,0.6)'; sx.fillRect(x, y, 96, 26); sx.fillStyle = '#fff'; sx.font = '18px "JetBrains Mono"'; sx.fillText(t.toFixed(1) + 's', x + 6, y + 19);
    });
    fs.writeFileSync(args[2], sheet.toBuffer('image/jpeg', 88));
    console.log(`${sc.id}: dur ${sc.dur.toFixed(1)}s cues`, Object.entries(sc.c).map(([k, v]) => `${k}=${v.toFixed(1)}`).join(' '));
  } else if (cmd === 'video') {
    const fps = parseInt(args[3] || '30');
    const f0 = parseInt(args[0]), f1 = args[1] === 'end' ? Math.ceil(tl.total * fps) : parseInt(args[1]);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(fps), '-i', '-',
      '-c:v', 'libx264', '-preset', process.env.X264_PRESET || 'medium', '-crf', process.env.CRF || '18', '-pix_fmt', 'yuv420p', '-threads', process.env.FF_THREADS || '2', '-movflags', '+faststart', args[2]], { stdio: ['pipe', 'inherit', 'inherit'] });
    const cv = createCanvas(W, H), ctx = cv.getContext('2d');
    const t0 = Date.now();
    for (let f = f0; f < f1; f++) {
      drawFrame(ctx, tl, f / fps);
      const buf = cv.data();
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if ((f - f0) % 300 === 0 && f > f0) process.stderr.write(`[${args[2]}] ${f - f0}/${f1 - f0} frames, ${((Date.now() - t0) / (f - f0)).toFixed(1)} ms/frame\n`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    process.stderr.write(`[${args[2]}] done ${f1 - f0} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
  } else {
    console.log('commands: info | lines | cues | frame | sheet | video');
  }
}
main().catch(e => { console.error(e); process.exit(1); });
