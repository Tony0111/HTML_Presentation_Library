#!/usr/bin/env bash
# Headless screenshot of a local HTML file (query string allowed).
# usage: shot.sh <html-path>[?query] <out.png> [virtual_time_ms] [WxH]
set -e
SRC="$1"; OUT="$2"; DELAY="${3:-3200}"; SIZE="${4:-1600,900}"
PATHPART="${SRC%%\?*}"; QUERY=""; [[ "$SRC" == *\?* ]] && QUERY="?${SRC#*\?}"
URL="file:///$(cygpath -m "$PATHPART")$QUERY"
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
"$CHROME" --headless=new --disable-gpu-sandbox --enable-unsafe-swiftshader --use-angle=swiftshader \
  --hide-scrollbars --force-device-scale-factor=1 \
  --virtual-time-budget="$DELAY" \
  --window-size="$SIZE" --screenshot="$(cygpath -w "$OUT")" "$URL" 2>&1 | grep -iE "error|fail" | grep -v "DevTools" || true
[ -f "$OUT" ] && echo "wrote $OUT" || echo "MISSING $OUT  ($URL)"
