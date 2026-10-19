#!/usr/bin/env bash
# Stop the platform, demos and the tunnel (leaves Postgres running).
# Run inside proot Ubuntu:  bash /root/BusinessOS-ERP-portable/phone/stop.sh
set -uo pipefail
for pat in "next start -p 3100" "next start -p 3101" "next start -p 3106" "cloudflared.*tunnel"; do
  if pgrep -f "$pat" >/dev/null 2>&1; then
    echo "stopping: $pat"
    pkill -f "$pat" || true
  fi
done
sleep 1
echo "remaining next/cloudflared processes:"
pgrep -fa "next start|cloudflared" || echo "  none"