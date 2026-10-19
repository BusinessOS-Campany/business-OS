# Git: the deploy model

GitHub is the **source of truth for code**. This machine holds a checkout of that
repository, and the two trees the platform serves from are part of it:

| Tree                | What it is                                              | Served at            |
| ------------------- | ------------------------------------------------------- | -------------------- |
| `demo-systems/<slug>` | the demo copy, for prospects to try                    | `/demo/<slug>`       |
| `system/<slug>`       | the master copy, cloned per organisation on install     | `/system/<slug>`     |

A push to the production branch is what triggers a deploy. The webhook
(`POST /api/deploy/github`) pulls that exact commit into the matching folder,
builds it, and restarts the process — see `src/core/deploy/`.

## Editing flow

1. Edit a file under `demo-systems/<slug>/` or `system/<slug>/` on this machine.
2. `git add -A && git commit -m "…" && git push`
3. GitHub sends the push webhook; the platform deploys the affected system within
   minutes. The dashboard at `/platform-admin/deploy` shows the commit, timing and
   status for every system.

## What is never in the repository

The `.gitignore` keeps three categories out, and `tests/core/deploy-gitignore-safety.test.ts`
asserts each one still holds:

- **Customer data** — `databases/pgdumps/*.dump`, `backups/`, and per-org clones
  under `orginazition/`. A pushed dump is compromised permanently.
- **Secrets** — `.env*` (except `.env.example`), `*.pem`.
- **Build output** — `node_modules/`, `.next/`, `.next-prev/`, `.next-pwa-bak/`.

## Local edits vs. the deployed commit

The deploy refuses to move a working tree that has **uncommitted changes to
tracked files** — it fast-forwards only. If you edit a file and push without
committing that edit, the deploy will stop and say so rather than discard your
work. Untracked build artifacts (a generated client, `.next/`) do not block it.

## Updating a real system updates every customer too

`system/<slug>` is the master. Each org runs its own copy. When the master is
rebuilt, the fan-out (`src/core/deploy/fanout.ts`) walks every org with the
system installed and, for each one:

1. re-syncs the master's files into the org's folder — a **merge** copy, so the
   org's uploads, `.env` and database are never deleted;
2. stops that org's runtime;
3. boots it again, which re-runs the org's own migrate + bootstrap and rebuilds.

The orgs are updated one at a time, and one org failing does not stop the rest —
the master row then carries a note like `1/2 customer clones failed to update` so
a partial rollout is visible instead of looking like success. A demo system never
reaches this path; `propagateIfReal` enforces that in one place.

## Activating on the live platform

The code is complete and tested, but the running platform has not been rebuilt
with it yet, and no GitHub credentials exist. Activation is:

1. Add `GITHUB_REPO`, `GITHUB_WEBHOOK_SECRET`, the `GITHUB_APP_*` values (or
   `GITHUB_TOKEN`) and `GIT_BINARY` to `.env.local`.
2. Create the repository on GitHub and `git remote add origin … && git push`.
3. Rebuild and restart the platform (`npm run build`, then restart the pm2
   process) — this is what puts `/api/deploy/github` and the deploy console live.
4. Point a webhook at `https://bosc.dpdns.org/api/deploy/github` with the same
   secret, and check the ping in the console.

