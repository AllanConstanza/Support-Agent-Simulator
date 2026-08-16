#!/usr/bin/env bash
# Stops the backend and frontend dev servers started by start.sh.
set -uo pipefail

for port in 8001 3000; do
  pids=$(lsof -ti:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Stopping process on :$port ($pids)"
    kill $pids
  else
    echo "Nothing running on :$port"
  fi
done
