#!/usr/bin/env bash
# Starts the backend (FastAPI) and frontend (Next.js) dev servers in the
# background, waits for both to be reachable, and opens the app in your
# default browser. Run `./stop.sh` to shut everything down.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/.run"
mkdir -p "$LOG_DIR"

BACKEND_PORT=8001
FRONTEND_PORT=3000

wait_for() {
  local url=$1
  local name=$2
  for _ in $(seq 1 60); do
    if curl -sf "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for $name at $url" >&2
  return 1
}

if lsof -ti:"$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Backend already running on :$BACKEND_PORT"
else
  echo "Starting backend..."
  (
    cd "$BACKEND_DIR"
    source .venv/bin/activate
    nohup uvicorn app.main:app --port "$BACKEND_PORT" > "$LOG_DIR/backend.log" 2>&1 &
    echo $! > "$LOG_DIR/backend.pid"
  )
  wait_for "http://localhost:$BACKEND_PORT/health" "backend"
fi

if lsof -ti:"$FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Frontend already running on :$FRONTEND_PORT"
else
  echo "Starting frontend..."
  (
    cd "$FRONTEND_DIR"
    nohup npm run dev -- --port "$FRONTEND_PORT" > "$LOG_DIR/frontend.log" 2>&1 &
    echo $! > "$LOG_DIR/frontend.pid"
  )
  wait_for "http://localhost:$FRONTEND_PORT" "frontend"
fi

echo "Opening http://localhost:$FRONTEND_PORT ..."
open "http://localhost:$FRONTEND_PORT" 2>/dev/null || xdg-open "http://localhost:$FRONTEND_PORT" 2>/dev/null || true

echo "Done. Logs: $LOG_DIR/backend.log , $LOG_DIR/frontend.log"
echo "Run ./stop.sh to shut both servers down."
