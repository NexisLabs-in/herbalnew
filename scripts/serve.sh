#!/usr/bin/env bash
# Clean rebuild + a single production server on PORT (default 3111).
#
# Why this exists: Next serves prerendered HTML that references hashed asset
# filenames. If an old `next start` survives a rebuild it keeps serving HTML
# pointing at CSS that no longer exists, so every page renders unstyled and it
# looks like a CSS bug. This script refuses to start on an occupied port and
# verifies the stylesheet actually resolves before reporting success.
set -euo pipefail
PORT="${1:-3111}"
cd "$(dirname "$0")/.."

if ss -lnt "sport = :$PORT" 2>/dev/null | grep -q LISTEN; then
  echo "Port $PORT is already in use. Stop it first:"
  echo "  kill \$(ss -lntp 2>/dev/null | grep ':$PORT' | grep -oP 'pid=\K[0-9]+' | head -1)"
  exit 1
fi

rm -rf .next
npx next build > /tmp/herbedia-build.log 2>&1 || { tail -30 /tmp/herbedia-build.log; exit 1; }

setsid npx next start -p "$PORT" > /tmp/herbedia-server.log 2>&1 < /dev/null &
for _ in $(seq 30); do
  sleep 1
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/en" || true)
  [ "$code" = "200" ] && break
done

css=$(curl -s "http://localhost:$PORT/en/shop" | grep -oE '/_next/static/css/[^"]+\.css' | sort -u | head -1)
css_code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT$css" || true)
echo "server http://localhost:$PORT | page=$code | css=$css_code $css"
[ "$css_code" = "200" ] || { echo "ASSET MISMATCH — a stale server is serving old HTML"; exit 1; }
