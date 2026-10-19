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
