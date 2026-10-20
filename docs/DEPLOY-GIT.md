# Git: the deploy model

GitHub is the **source of truth for code**. This deployment uses **one repository
per system slug**, and each such repository holds the system's two trees as
sibling folders:

| Folder in the repo | What it is                                          | Deployed into          | Served at        |
| ------------------ | --------------------------------------------------- | ---------------------- | ---------------- |
| `real/`            | the customer-facing system                          | `system/<slug>`        | `/system/<slug>` |
| `demo/`            | the public demo                                     | `demo-systems/<slug>`  | `/demo/<slug>`   |

The platform itself lives in its own repository (`BusinessOS-Campany/business-OS`).

| Slug       | GitHub repository                     |
| ---------- | ------------------------------------- |
| `dental`   | `BusinessOS-Campany/dental`           |
| `grocery`  | `BusinessOS-Campany/grocery`          |
| `clinicos` | `BusinessOS-Campany/Clinic`           |

The mapping lives in `config/deploy.json` under `repos`. **A slug with no entry is
never deployed by a webhook** — that is the safe default for an unmapped folder.

## How a push routes

The pushed repository **is** the routing key. A push to `BusinessOS-Campany/dental`
deploys the systems mapped to it (`real:dental` and `demo:dental`), whatever files
it touched. Path matching is only used in a *monorepo* layout, where several
systems share one repository.

> **Deliberate choice:** because `real/` and `demo/` share one repository, a push
> updates **both the demo and the customer-facing system together**. They cannot be
> deployed separately. This was chosen explicitly; to separate them later, point
> `demo:<slug>` and `real:<slug>` at different repositories in `config/deploy.json`.

A push from a repository that no system maps to is **ignored outright** when any
system is mapped, so a stray webhook cannot start a build.

## Editing flow

1. Edit under `system/<slug>/` (real) or `demo-systems/<slug>/` (demo) on this
   machine, inside that system's checkout.
2. `git add -A && git commit -m "…" && git push`
3. GitHub sends the push webhook. The platform pulls that exact commit into the
   system's checkout, builds `real/` and `demo/`, and restarts the processes.
4. The dashboard at `/platform-admin/deploy` shows the commit, timing, status and
   the repository for every system.

## Layout on this machine

Repositories are checked out under `.data/deploy/repos/<slug>/` (gitignored), each
containing `real/` and `demo/`. The platform builds `real:<slug>` from
`<clone>/real` and `demo:<slug>` from `<clone>/demo` — one checkout, two folders.

Discovery keeps using the plain folder (`system/<slug>` or `demo-systems/<slug>`)
until the clone exists, so switching to the clone layout never disturbs a system
that is currently being served. The clone is created on the first deploy by
`ensureClone` in `src/core/deploy/git-source.ts`.

## What is never in the repository

`tests/core/deploy-gitignore-safety.test.ts` asserts each exclusion still holds:

- **Customer data** — `databases/pgdumps/*.dump`, `backups/`, `orginazition/`.
  A pushed dump is compromised permanently.
- **Secrets** — `.env*` (except `.env.example`), `*.pem`.
- **Build output** — `node_modules/`, `.next/`, `.next-prev/`, `.next-pwa-bak/`.

## Local edits vs. the deployed commit

The deploy refuses to move a working tree that has **uncommitted changes to
tracked files** — it fast-forwards only. If you edit a file without committing it,
the deploy stops and says so rather than discarding your work. Untracked build
artifacts do not block it. `git reset --hard` is never used.

## Updating a real system updates every customer too

`system/<slug>` is the master. Each org runs its own copy. When the master is
rebuilt, the fan-out (`src/core/deploy/fanout.ts`) walks every org with the system
installed and, for each one:

1. re-syncs the master's files into the org's folder — a **merge** copy, so the
   org's uploads, `.env` and database are never deleted;
2. stops that org's runtime;
3. boots it again, which re-runs the org's own migrate + bootstrap and rebuilds.

One org failing does not stop the rest; the master row then carries a note such as
`1/2 customer clones failed to update`, so a partial rollout is visible. A demo
system never reaches this path; `propagateIfReal` enforces that in one place.

## Activating on the live platform

The code is complete and tested (203 tests), the local repositories are scaffolded
under `.data/deploy/repos/<slug>`, and `.env.local` holds `GIT_BINARY`. What
remains needs GitHub credentials and repo-side setup, none of which can be done
without them:

1. **Credentials.** Add to `.env.local` either a GitHub App (`GITHUB_APP_ID`,
   `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY_PATH` — the `.pem` lives
   outside this repo) or a fine-grained `GITHUB_TOKEN`, plus `GITHUB_WEBHOOK_SECRET`.
2. **Push.** For each system: `git -C .data/deploy/repos/<slug> push -u origin main`
   (this replaces the current flat repository content with `real/` + `demo/`).
   Then push the platform itself: `git push -u origin main`.
3. **Rebuild and restart** the platform (`npm run build`, then restart the pm2
   process). This puts `/api/deploy/github` and the deploy console live.
4. **Webhook.** In each repository: Settings → Webhooks → add
   `https://bosc.dpdns.org/api/deploy/github`, content type `application/json`,
   the same `GITHUB_WEBHOOK_SECRET`, and the **push** event only. Confirm the ping.
5. **Test.** Push a trivial commit to one repository and watch the console: it must
   pull that commit, build, restart, and record the duration. The target is ~180s;
   a slower run names the step that overran instead of failing silently.
