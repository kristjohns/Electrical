#!/usr/bin/env python3
"""QA: transcribe every narration line with a local Whisper model and flag lines that differ from the script."""
import json, os, re, sys, difflib
import soundfile as sf, numpy as np, sherpa_onnx
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
M = os.path.join(ROOT, 'tools', 'models', 'asr', 'sherpa-onnx-whisper-base.en')
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f'{M}/base.en-encoder.int8.onnx', decoder=f'{M}/base.en-decoder.int8.onnx', tokens=f'{M}/base.en-tokens.txt', num_threads=4)
NUM = {'zero':'0','one':'1','two':'2','three':'3','four':'4','five':'5','six':'6','seven':'7','eight':'8','nine':'9','ten':'10'}
def norm(s):
    s = re.sub(r'\[([^\]]+)\]\(/[^)]*/\)', r'\1', s).lower().replace('-', ' ')
    s = re.sub(r"[^a-z0-9' ]", ' ', s)
    return [NUM.get(w, w) for w in s.split()]
def resample(x, sr):
    if sr == 16000: return x
    n = int(len(x) * 16000 / sr); return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)
data = json.load(open(os.path.join(ROOT, 'build', 'lines.json')))
flag = 0
for L in data['lines']:
    p = os.path.join(ROOT, 'build', 'audio', L['hash'] + '.wav')
    if not os.path.exists(p): continue
    x, sr = sf.read(p, dtype='float32'); st = rec.create_stream(); st.accept_waveform(16000, resample(x, sr)); rec.decode_stream(st)
    hyp, ref = norm(st.result.text), norm(L['text'])
    ratio = difflib.SequenceMatcher(None, ref, hyp).ratio()
    if ratio < float(sys.argv[1] if len(sys.argv) > 1 else 0.9):
        flag += 1
        d = [f"{' '.join(ref[i1:i2])} -> {' '.join(hyp[j1:j2])}" for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, ref, hyp).get_opcodes() if tag != 'equal']
        print(f"{ratio:.2f} [{L['scene']}] {len(x)/sr:.1f}s  " + ' | '.join(d)[:400])
print('flagged', flag, 'of', len(data['lines']))
