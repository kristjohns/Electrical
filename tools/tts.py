#!/usr/bin/env python3
"""Narration pipeline (Kokoro TTS, runs locally).

  tts.py synth     build/lines.json -> build/audio/<hash>.wav + build/durations.json
  tts.py mix       build/cues.json  -> build/narration.wav
  tts.py phonemes  print the phonemes of every line (for proofreading)
"""
import json, os, re, sys
import numpy as np
import soundfile as sf

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
B = os.path.join(ROOT, 'build'); AUD = os.path.join(B, 'audio')
MODEL = os.path.join(ROOT, 'tools', 'models', 'kokoro-v1.0.onnx'); VOICES = os.path.join(ROOT, 'tools', 'models', 'voices-v1.0.bin')
SR = 24000
MARK = re.compile(r'\[([^\]]+)\]\(/([^)]*)/\)')

def phonemize(tok, text):
    """English via espeak; [word](/phonemes/) spans are spliced in verbatim."""
    out, pos = [], 0
    for m in MARK.finditer(text):
        seg = text[pos:m.start()]
        if seg.strip(): out.append(tok.phonemize(seg, 'en-us').strip())
        out.append(m.group(2)); pos = m.end()
    seg = text[pos:]
    if seg.strip():
        ph = tok.phonemize(seg, 'en-us').strip() if re.search(r'\w', seg) else seg.strip()
        out.append(ph)
    s = ' '.join(out)
    return re.sub(r'\s+([.,;:!?])', r'\1', s)

def trim(x, thr=0.004, pad=0.03):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0: return x
    a = max(0, idx[0] - int(pad * SR)); b = min(len(x), idx[-1] + int(pad * SR))
    y = x[a:b].copy(); n = int(0.008 * SR)
    y[:n] *= np.linspace(0, 1, n); y[-n:] *= np.linspace(1, 0, n)
    return y

def main():
    cmd = sys.argv[1]
    if cmd in ('synth', 'phonemes'):
        from kokoro_onnx import Kokoro
        from kokoro_onnx.tokenizer import Tokenizer
        data = json.load(open(os.path.join(B, 'lines.json')))
        tok = Tokenizer()
        if cmd == 'phonemes':
            for L in data['lines']: print(L['scene'], '|', phonemize(tok, L['text']))
            return
        os.makedirs(AUD, exist_ok=True)
        k = Kokoro(MODEL, VOICES)
        vocab = set(k.vocab.keys()) if hasattr(k, 'vocab') else None
        durs = {}; made = 0
        for i, L in enumerate(data['lines']):
            path = os.path.join(AUD, L['hash'] + '.wav')
            if not os.path.exists(path):
                ph = phonemize(tok, L['text'])
                if vocab:
                    bad = sorted(set(c for c in ph if c not in vocab))
                    if bad: print('  ! unknown phoneme chars', bad, 'in', L['text'][:50])
                x, sr = k.create(ph, voice=data['voice'], speed=data['speed'], is_phonemes=True)
                assert sr == SR
                sf.write(path, trim(np.asarray(x, dtype=np.float32)), SR); made += 1
                if made % 10 == 0: print(f'  {i + 1}/{len(data["lines"])}', flush=True)
            durs[L['hash']] = sf.info(path).duration
        json.dump(durs, open(os.path.join(B, 'durations.json'), 'w'))
        print(f'synthesised {made} new lines; total speech {sum(durs.values()) / 60:.1f} min')
    elif cmd == 'mix':
        cues = json.load(open(os.path.join(B, 'cues.json')))
        out = np.zeros(int((cues['total'] + 1) * SR), dtype=np.float32)
        for L in cues['lines']:
            x, _ = sf.read(os.path.join(AUD, L['hash'] + '.wav'), dtype='float32')
            a = int(L['abs'] * SR); out[a:a + len(x)] += x
        peak = float(np.max(np.abs(out))); out *= 0.89 / peak
        sf.write(os.path.join(B, 'narration.wav'), out, SR)
        print('narration.wav', len(out) / SR, 's')

if __name__ == '__main__':
    main()
