// Timeline: scenes are driven by narration. Each narration line is a cue the animation can sync to.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pr, E, clamp } = require('./lib/core');

const VOICE = 'af_heart', SPEED = 1.0;
const ROOT = path.join(__dirname, '..');
const DUR_FILE = path.join(ROOT, 'build', 'durations.json');

const scenes = [];
let chapterNo = 0, chapterName = '';

const api = {
  // start a new chapter with an animated title card
  chapter(name, sub, no) {
    chapterNo += 1; chapterName = name;
    scenes.push({ id: 'title-' + chapterNo, card: true, chapter: name, chapterNo, sub, fixed: 3.4, lines: [], hud: false });
  },
  scene(id, def) {
    scenes.push({ id, chapter: chapterName, chapterNo, lines: [], ...def });
  },
};

function parseLine(raw) {
  let key = null, text = raw, pause;
  const m = raw.match(/^@([\w]+)(?:\+([\d.]+))?\|/);
  if (m) { key = m[1]; if (m[2]) pause = parseFloat(m[2]); text = raw.slice(m[0].length); }
  text = text.trim();
  const display = text.replace(/\[([^\]]+)\]\(\/[^)]*\/\)/g, '$1');
  const hash = crypto.createHash('sha1').update(`${VOICE}|${SPEED}|${text}`).digest('hex').slice(0, 16);
  return { key, text, display, hash, pause };
}

function build() {
  let durs = {};
  try { durs = JSON.parse(fs.readFileSync(DUR_FILE, 'utf8')); } catch (e) { /* estimates */ }
  let cursor = 0; const all = [];
  for (const sc of scenes) {
    sc.t0 = cursor; sc.c = {}; sc.e = {}; sc.est = {}; sc.parsed = [];
    let local = sc.pre === undefined ? 0.7 : sc.pre;
    const gap = sc.gap === undefined ? 0.42 : sc.gap;
    sc.lines.forEach((raw, i) => {
      const L = parseLine(raw);
      const d = durs[L.hash] !== undefined ? durs[L.hash] : (L.display.split(/\s+/).length / 2.7 + 0.3);
      L.start = local; L.dur = d; L.abs = cursor + local; L.estimated = durs[L.hash] === undefined;
      L.est = L.display.split(/\s+/).length / 2.7 + 0.3;   // the pace the animation offsets were authored against
      const k = L.key || ('l' + i);
      if (sc.c[k] !== undefined) throw new Error(`duplicate cue ${k} in ${sc.id}`);
      sc.c[k] = local; sc.e[k] = local + d; sc.est[k] = L.est;
      local += d + (L.pause !== undefined ? L.pause : gap);
      sc.parsed.push(L); all.push({ scene: sc.id, ...L });
    });
    sc.dur = sc.fixed !== undefined ? sc.fixed : (local - gap + (sc.post === undefined ? 0.9 : sc.post));
    if (sc.min && sc.dur < sc.min) sc.dur = sc.min;
    cursor += sc.dur;
  }
  return { scenes, total: cursor, lines: all };
}

// per-frame scene state handed to draw functions
function state(sc, t) {
  const need = k => { if (sc.c[k] === undefined) throw new Error(`unknown cue "${k}" in scene ${sc.id}`); return sc.c[k]; };
  // Offsets inside a line were authored against an estimated speaking pace; stretch them to the real audio.
  const off = (k, delay) => {
    const c = need(k); if (delay <= 0) return c + delay;
    const est = sc.est[k], dur = sc.e[k] - c;
    return c + Math.min(delay, est) * (dur / est) + Math.max(0, delay - est);
  };
  return {
    t, dur: sc.dur, c: sc.c, e: sc.e, id: sc.id,
    in: (k, delay = 0, d = 0.7, e = E.io) => pr(t, off(k, delay), d, e),
    out: (k, delay = 0, d = 0.5) => 1 - pr(t, off(k, delay), d),
    since: k => t - need(k),
    // time since a cue, expressed on the authored (estimated) time base
    sinceE: k => { const raw = t - need(k), est = sc.est[k], dur = sc.e[k] - sc.c[k]; return raw <= 0 ? raw : raw <= dur ? raw * est / dur : est + raw - dur; },
    at: (k, delay = 0) => off(k, delay),
    on: (k, delay = 0) => t >= off(k, delay),
    end: k => { need(k); return sc.e[k]; },
    // progress across the spoken duration of a line
    over: (k, e = E.lin) => e(clamp((t - need(k)) / (sc.e[k] - sc.c[k]))),
    // generic eased progress at absolute local time
    p: (a, d = 0.7, e = E.io) => pr(t, a, d, e),
    left: () => sc.dur - t,
  };
}

module.exports = { api, build, state, scenes, VOICE, SPEED, ROOT };
