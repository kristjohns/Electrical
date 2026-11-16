#!/usr/bin/env bash
# Full build: narration -> timeline -> parallel render -> mux.   usage: tools/build.sh [fps] [jobs]
set -euo pipefail
cd "$(dirname "$0")/.."
FPS=${1:-60}; JOBS=${2:-4}
PY=tools/.venv/bin/python
mkdir -p build out
node src/render.js lines
$PY tools/tts.py synth
node src/render.js cues
$PY tools/tts.py mix
node tools/render_all.js $FPS $JOBS
OUT=out/from-waterfall-to-wall-socket.mp4
ffmpeg -y -loglevel error -f concat -safe 0 -i build/segs.txt -i build/narration.wav -i out/subtitles.en.srt -i build/chapters.ffmeta \
  -map 0:v -map 1:a -map 2:s -map_metadata 3 -map_chapters 3 -c:v copy -c:a aac -b:a 128k -ar 48000 -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:s mov_text -metadata:s:s:0 language=eng -metadata:s:a:0 language=eng -movflags +faststart "$OUT"
ls -la "$OUT"
