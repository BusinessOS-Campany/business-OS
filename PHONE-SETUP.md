# Running Business OS on the phone (Phase 1)

This folder (`BusinessOS-ERP-portable`) is a self-contained, Linux-ready copy of
the platform. This guide turns an Android phone into a temporary server for
**https://bosc.dpdns.org** — the platform plus the **grocery** and **dental**
demos. Tenant systems that customers installed (`/app/...`) are **Phase 2** and
will show the platform's "not running here" page until then.

Everything here was built on Windows and made Linux-portable:
- `.next/` — production build of the platform (build-only files stripped).
- `demo-systems/grocery/.next`, `demo-systems/dental/.next` — the two demos.
- `databases/pgdumps/*.dump` — all 16 databases (platform schemas + every org).
- `.data/storage/` — uploaded avatars/covers/branding.
- `cloudflared/` — tunnel credentials for `20e9adb0-…` + `config.yml`.
- `.env.local` — already points at `localhost` and `https://bosc.dpdns.org`.

Node modules are **not** included: they must be installed on the phone (ARM64).

---

## 0. Prerequisites

- Phone with ~3 GB free (the folder + node_modules).
- **Termux from F-Droid** (not Play Store — that build is outdated/broken).
- The PC must be reachable to run the cutover (stop its platform + tunnel).

## 1. Install the Linux layer (once, in Termux)

```bash
pkg update -y && pkg upgrade -y
pkg install -y proot-distro
proot-distro install ubuntu
termux-wake-lock
```

## 2. Copy the folder to the phone (USB / MTP)

1. Connect the phone by USB and allow **File transfer (MTP)**.
2. Copy `D:\BusinessOS-ERP-portable` to `Internal storage/Download/BusinessOS-ERP-portable`.
   (~1.1 GB; the copy preserves timestamps, which matters for tenant clones later.)
3. On the phone, grant Termux storage access:
   ```bash
   termux-setup-storage
   ```

## 3. Move it into the proot Ubuntu and set it up

```bash
proot-distro login ubuntu
# now inside Ubuntu (as root)
cp -r /sdcard/Download/BusinessOS-ERP-portable /root/
bash /root/BusinessOS-ERP-portable/phone/setup.sh
```

`setup.sh` installs Node 22 + PostgreSQL + cloudflared, restores every dump,
patches the Next build paths, installs node_modules for the platform and both
demos, and generates the Prisma clients. First run downloads a lot; give it time.

> If a script errors with `\r` complaints, fix line endings once:
> `sed -i 's/\r$//' /root/BusinessOS-ERP-portable/phone/*.sh`

## 4. Start and verify locally (still inside Ubuntu)

```bash
bash /root/BusinessOS-ERP-portable/phone/start.sh
```

Expected: `platform`, `grocery`, `dental`, `cloudflared` start, then health
lines. Check by hand:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3100/signin   # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3101/demo/grocery
```

Logs: `/root/BusinessOS-ERP-portable/.data/phone/logs/`.

Keep it alive: leave Termux running with `termux-wake-lock` active and set the
phone's battery optimization to **Unrestricted** for Termux. For resilience, run
the start script inside `tmux`:
```bash
pkg install -y tmux            # in Termux, before proot
tmux new -s bos
# then proot-distro login ubuntu; bash .../start.sh; Ctrl-b d to detach
```

## 5. Cut over from the PC

On the **PC** (PowerShell), stop everything that would answer the tunnel:

```powershell
pm2 stop grocery-demo                       # if running
pm2 stop businessos-erp 2>$null             # if present
Get-Process node | Where-Object { $_.Path -and (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine -match 'next.*3100' } | Stop-Process -Force
Stop-Service cloudflared -ErrorAction SilentlyContinue
```

On the **phone**, confirm cloudflared is running (`pgrep -fa cloudflared`). Within
a minute Cloudflare routes the tunnel to the phone. Verify:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://bosc.dpdns.org/signin   # 200
```

Sign in at https://bosc.dpdns.org and open `/demo/grocery`.

## Rollback

On the phone: `bash /root/BusinessOS-ERP-portable/phone/stop.sh`.
On the PC: restart the platform (`npm run serve` or `pm2 start businessos-erp`)
and `Start-Service cloudflared`. The PC resumes serving immediately.

## Troubleshooting

- **Postgres won't start / "cannot be run as root":** in proot you are root;
  `pg_ctlcluster … start` handles dropping to the `postgres` user. If it fails,
  run `service postgresql start` and check `/var/log/postgresql/`.
- **Login fails with a DB error:** confirm `ALTER USER postgres PASSWORD '123';`
  ran and `pg_hba.conf` has a `host … 127.0.0.1/32 scram-sha-256` line.
- **`/demo/grocery` 500s:** the grocery process isn't up; check
  `.data/phone/logs/grocery.log` (usually a missing `prisma generate`).
- **Tunnel routes to the PC:** the PC connector is still running — do step 5.
- **Everything dies when the screen sleeps:** `termux-wake-lock` + unrestricted
  battery for Termux; keep a `tmux` session.

## Phase 2 (tenant clones) — later

Orgs with installed systems (`p967770416171` grocery+dental, `gm`,
`p967775008926`, `hitham-homaid`, `p967777123123`, `ajwad`, `gmsnow`) need each
clone **pre-built on the PC for Linux** (their `SYSTEM_BASE_PATH` is per-org),
shipped with preserved timestamps, plus one shared `node_modules` per system
installed on the phone. Until then those routes show "unavailable".