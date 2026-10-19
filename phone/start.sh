#!/usr/bin/env bash
# Start Postgres + cloudflared + the platform and the two demo systems.
# Run inside proot Ubuntu:  bash /root/BusinessOS-ERP-portable/phone/start.sh
set -uo pipefail
APP="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$APP/.data/phone/logs"
mkdir -p "$LOG"

start_pg() {
  local ver
  ver="$(ls /usr/lib/postgresql 2>/dev/null | head -n1)"
  [ -n "$ver" ] && { pg_ctlcluster "$ver" main start 2>/dev/null || service postgresql start 2>/dev/null || true; }
}

app_up() {
  # $1 = grep pattern, $2 = cwd, $3 = next port, $4 = log name, $5 = heap MB
  if pgrep -f "$1" >/dev/null 2>&1; then
    echo "already running: $4"
    return
  fi
  echo "starting: $4"
  ( cd "$2" && NODE_ENV=production NODE_OPTIONS="--max-old-space-size=$5" \
      nohup ./node_modules/.bin/next start -p "$3" >>"$LOG/$4.log" 2>&1 & )
}

start_pg

if ! pgrep -f "cloudflared.*tunnel" >/dev/null 2>&1; then
  echo "starting: cloudflared"
  nohup cloudflared tunnel --config "$APP/cloudflared/config.yml" run >"$LOG/cloudflared.log" 2>&1 &
fi

app_up "next start -p 3100" "$APP"                        3100 platform 1536
app_up "next start -p 3101" "$APP/demo-systems/grocery"   3101 grocery  768
app_up "next start -p 3106" "$APP/demo-systems/dental"    3106 dental   768

sleep 4
echo "--- local health ---"
curl -s -o /dev/null -w "platform :3100 -> %{http_code}\n" http://127.0.0.1:3100/signin || true
curl -s -o /dev/null -w "grocery  :3101 -> %{http_code}\n" http://127.0.0.1:3101/demo/grocery || true
curl -s -o /dev/null -w "dental   :3106 -> %{http_code}\n" http://127.0.0.1:3106/demo/dental || true
echo "logs: $LOG"