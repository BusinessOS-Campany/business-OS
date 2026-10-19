#!/usr/bin/env bash
#
# One-time provisioning of the Business OS portable tree on an Android phone.
#
# Run INSIDE the proot Ubuntu (as root), NOT in Termux itself:
#   proot-distro login ubuntu
#   bash /root/BusinessOS-ERP-portable/phone/setup.sh
#
# It installs Node 22 + PostgreSQL + cloudflared, restores every database dump,
# points the platform's Next manifest at the phone path, and installs the
# arm64 dependencies + generated Prisma clients for the platform and the two
# demo systems. Safe to re-run: every step is idempotent.
set -euo pipefail

APP="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMPS="$APP/databases/pgdumps"
LOG_DIR="$APP/.data/phone/logs"
mkdir -p "$LOG_DIR"
echo "== Business OS phone setup =="
echo "APP=$APP"

export DEBIAN_FRONTEND=noninteractive
export PGPASSWORD=123

echo "== 1/6 base packages =="
apt-get update
apt-get install -y curl ca-certificates gnupg procps postgresql postgresql-contrib

echo "== 2/6 Node 22 (arm64) =="
if ! command -v node >/dev/null || [[ "$(node -v 2>/dev/null | cut -c2-3)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "== 3/6 PostgreSQL =="
PGVER="$(ls /usr/lib/postgresql | sort -V | tail -n1)"
pg_ctlcluster "$PGVER" main start 2>/dev/null || service postgresql start || true
sleep 2
psql -h 127.0.0.1 -U postgres -d postgres -c "ALTER USER postgres PASSWORD '123';"

echo "== 4/6 restore databases =="
if [[ -d "$DUMPS" ]]; then
  if [[ -f "$DUMPS/_globals.sql" ]]; then
    psql -h 127.0.0.1 -U postgres -d postgres -f "$DUMPS/_globals.sql" || echo "WARN: globals restore skipped"
  fi
  for dump in "$DUMPS"/*.dump; do
    [[ -e "$dump" ]] || continue
    name="$(basename "$dump" .dump)"
    echo "-- $name"
    if [[ "$(psql -h 127.0.0.1 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$name'")" != "1" ]]; then
      psql -h 127.0.0.1 -U postgres -d postgres -c "CREATE DATABASE \"$name\";"
    fi
    pg_restore -h 127.0.0.1 -U postgres --no-owner --no-privileges -d "$name" "$dump" \
      || echo "WARN: pg_restore $name reported errors (usually harmless duplicates)"
  done
  psql -h 127.0.0.1 -U postgres -d postgres -c "ALTER USER postgres PASSWORD '123';"
else
  echo "WARN: no dumps at $DUMPS"
fi

echo "== 5/6 patch Next build paths =="
node "$APP/phone/patch-paths.js" "$APP"

echo "== 6/6 dependencies + Prisma clients =="
( cd "$APP" && (npm ci || npm install) && (npx prisma generate || true) )
( cd "$APP/demo-systems/grocery" && (npm ci || npm install) && (npx prisma generate || true) )
( cd "$APP/demo-systems/dental" && (npm ci || npm install) && (npx prisma generate || true) )

echo "== cloudflared =="
if ! command -v cloudflared >/dev/null; then
  curl -fsSL -o /usr/local/bin/cloudflared \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64
  chmod +x /usr/local/bin/cloudflared
fi
cloudflared --version

chmod +x "$APP/phone/"*.sh || true
echo "== done. start with: bash $APP/phone/start.sh =="