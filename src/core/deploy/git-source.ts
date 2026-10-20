import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { logger } from "@/core/logging/logger";

/**
 * Keeping the working tree in step with GitHub.
 *
 * The deployment model is: **GitHub is the source of truth for code**, and the
 * two folders on this machine (`demo-systems/<slug>`, `system/<slug>`) are a
 * checkout of it. A push is therefore not "copy files from GitHub over the
 * local folder" — it is "fetch, and move the working tree to that commit".
 *
 * That distinction is the whole reason this module uses `git` and not a files
 * API:
 *
 *  - `git fetch` then a **fast-forward-only** checkout means a local edit that
 *    was never pushed is a hard failure rather than silent data loss. The
 *    operator is told "there are local changes; commit or stash them", which is
 *    the correct outcome when the local tree is also the editing surface.
 *  - A checkout is atomic per file and leaves `node_modules` alone, so pulling a
 *    one-line change does not cost a reinstall.
 *  - `git` already knows how to be safe on Windows (CRLF, long paths, file
 *    locks), which a hand-rolled copy loop does not.
 *
 * Nothing here force-resets. A deploy that cannot fast-forward fails loudly and
 * leaves the good tree untouched — losing an unpushed edit to a background
 * webhook would be far worse than a failed deploy.
 */

/** Where the git binary lives, overridable for a non-standard install. */
function gitBinary(): string {
  return process.env.GIT_BINARY?.trim() || "git";
}

export interface GitResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
}

/**
 * Runs one git command in `cwd`.
 *
 * Never throws: a git failure is a deploy outcome to be reported, not an
 * exception to unwind through the queue. The caller inspects `ok`.
 */
export function runGit(args: string[], cwd: string, timeoutMs = 120_000): Promise<GitResult> {
  return new Promise((resolve) => {
    const child = spawn(gitBinary(), args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      // git is an .exe; a shell is not needed and would only add a layer that
      // mangles quoting on Windows paths.
      shell: false,
      env: {
        ...process.env,
        // Never let git prompt for credentials during an automated deploy; it
        // would hang the queue until the timeout. The remote must already be
        // authenticated (an embedded token URL, or a credential helper).
        GIT_TERMINAL_PROMPT: "0",
        GIT_ASKPASS: "",
      },
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });

    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, stdout, stderr: `${stderr}\ntimed out after ${timeoutMs}ms`, code: null });
    }, timeoutMs);

    child.once("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, stdout, stderr: err.message, code: null });
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, stdout, stderr, code });
    });
  });
}

/** True when `dir` is inside a git working tree. */
export async function isGitRepo(dir: string): Promise<boolean> {
  if (!existsSync(dir)) return false;
  const result = await runGit(["rev-parse", "--is-inside-work-tree"], dir, 15_000);
  return result.ok && result.stdout.trim() === "true";
}

/** The repo root that owns `dir` (the top level of the working tree). */
export async function repoRootOf(dir: string): Promise<string | null> {
  const result = await runGit(["rev-parse", "--show-toplevel"], dir, 15_000);
  if (!result.ok) return null;
  const root = result.stdout.trim();
  return root ? root : null;
}

/** The commit HEAD points at, or null. */
export async function headCommit(dir: string): Promise<string | null> {
  const result = await runGit(["rev-parse", "HEAD"], dir, 15_000);
  return result.ok ? result.stdout.trim() : null;
}

/**
 * The remote URL of `origin`, or null.
 *
 * Read but deliberately never logged in full by callers: a remote configured
 * with an embedded token (`https://x-access-token:…@github.com/...`) puts a
 * credential in this string, and a log line is the easiest way to leak one.
 */
export async function originUrl(dir: string): Promise<string | null> {
  const result = await runGit(["remote", "get-url", "origin"], dir, 15_000);
  return result.ok ? result.stdout.trim() : null;
}

/** Redacts any `user:pass@` credential from a URL, for safe logging. */
export function redactRemote(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/\/\/[^/@\s]+@/, "//***@");
}

/**
 * True when the working tree has no uncommitted changes TO TRACKED FILES.
 *
 * Untracked files are ignored on purpose. A system's build writes artifacts into
 * its own folder (`.next/`, `dist/`, a generated client, a stray output file),
 * and those are untracked by design — `.gitignore` may not even list them for a
 * system that was never a git repo before. Treating them as "dirty" would mean a
 * system could be deployed exactly once and then refuse forever, because its own
 * successful build dirtied the tree. That is the failure this rule exists to
 * avoid, so the check is `--untracked-files=no`.
 *
 * A modification to a TRACKED file still blocks: that is an unpushed edit, and
 * moving the tree would discard it.
 *
 * A git failure means "cannot prove it is clean", which must read as dirty.
 */
export async function isClean(dir: string): Promise<boolean> {
  const result = await runGit(["status", "--porcelain", "--untracked-files=no"], dir, 30_000);
  if (!result.ok) return false;
  return result.stdout.trim().length === 0;
}

export interface PullResult {
  ok: boolean;
  /** The commit HEAD is at afterwards. */
  commit: string | null;
  /** A safe, actionable reason when `ok` is false. */
  reason?: string;
  /** True when nothing moved because HEAD was already at `target`. */
  alreadyAtTarget?: boolean;
}

/**
 * Fetches `remote` and fast-forwards the working tree to `targetCommit`.
 *
 * Fast-forward only, on purpose:
 *
 *  - If HEAD is already at the target, this is a no-op — the webhook fired for a
 *    commit that is already checked out, which happens on a retry or on the
 *    first delivery after a manual pull.
 *  - If the target is an ancestor of HEAD, the tree is ahead of GitHub (a local
 *    commit not yet pushed). That is reported, not forced: the operator is
 *    mid-edit.
 *  - If the trees diverged, or the target is not reachable, the update is
 *    refused. Never `git reset --hard`.
 *
 * `targetCommit` may be a full SHA (from a webhook) or a branch name.
 */
export async function fetchAndFastForward(
  dir: string,
  targetCommit: string,
  remote = "origin",
): Promise<PullResult> {
  if (!(await isGitRepo(dir))) {
    return { ok: false, commit: null, reason: `${dir} is not a git working tree` };
  }

  // 1. Bring the remote's objects down. Shallow is not used: the ancestry
  //    checks below need history, and this repo is source, not a monorepo of
  //    binaries.
  const fetch = await runGit(["fetch", "--prune", remote], dir, 300_000);
  if (!fetch.ok) {
    return { ok: false, commit: null, reason: `git fetch failed: ${firstLine(fetch.stderr)}` };
  }

  // 2. Resolve the target to a concrete commit. The full SHA from the webhook is
  //    the normal input; a branch name is accepted for the manual/periodic path.
  const resolved = await runGit(["rev-parse", "--verify", `${targetCommit}^{commit}`], dir, 20_000);
  if (!resolved.ok) {
    return {
      ok: false,
      commit: null,
      reason: `commit ${targetCommit.slice(0, 12)} is not in ${redactRemote(await originUrl(dir))}`,
    };
  }
  const target = resolved.stdout.trim();

  const current = await headCommit(dir);
  if (current === target) {
    return { ok: true, commit: target, alreadyAtTarget: true };
  }

  // 3. The tree must be clean before it moves. An unpushed edit is never
  //    discarded by a webhook.
  if (!(await isClean(dir))) {
    return {
      ok: false,
      commit: current,
      reason: "working tree has uncommitted changes; commit or stash before deploying",
    };
  }

  // 4. Fast-forward only. `merge --ff-only` is the operation that refuses to
  //    create a merge commit or to overwrite divergent local history.
  const merge = await runGit(["merge", "--ff-only", target], dir, 60_000);
  if (!merge.ok) {
    return {
      ok: false,
      commit: current,
      reason: `cannot fast-forward to ${target.slice(0, 12)}: ${firstLine(merge.stderr)}`,
    };
  }

  const after = await headCommit(dir);
  logger.info(
    { dir, from: current?.slice(0, 7), to: after?.slice(0, 7) },
    "[deploy] working tree advanced",
  );
  return { ok: true, commit: after };
}

/** The first non-empty line of a command's stderr, for a short reason. */
function firstLine(text: string): string {
  const line = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return (line ?? "").slice(0, 300);
}

/**
 * The commit a folder is currently at, for the registry to reconcile against.
 *
 * A folder that is not a git working tree returns null rather than throwing:
 * before the initial migration the local folders are plain directories, and
 * discovery must still list them.
 */
export async function currentCommitFor(dir: string): Promise<string | null> {
  if (!(await isGitRepo(dir))) return null;
  return headCommit(dir);
}

/** Convenience: is `dir` inside the working tree rooted at `repoRoot`? */
export function isInside(repoRoot: string, dir: string): boolean {
  const normalize = (p: string) => p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  return normalize(dir).startsWith(normalize(repoRoot));
}

/**
 * The HTTPS URL to clone a repository from, with the credential embedded when
 * the App or token mode is available.
 *
 * A GitHub App cannot clone over HTTPS with the app JWT itself; it needs an
 * installation token used as `x-access-token`. `github.ts` mints one. When no
 * credential is configured the plain public URL is returned, which only works
 * for a public repository — a private one will fail at fetch, loudly, which is
 * the correct outcome rather than a silent half-deploy.
 *
 * The returned URL carries a secret in the App/token case and must never be
 * logged; `redactRemote` exists for that.
 */
export async function authenticatedRemoteUrl(repo: string): Promise<string> {
  const { authToken, githubConfig } = await import("./github");
  const config = githubConfig();
  if (config.mode !== "none") {
    const token = await authToken(config);
    if (token) {
      return `https://x-access-token:${token}@github.com/${repo}.git`;
    }
  }
  return `https://github.com/${repo}.git`;
}

/**
 * Clones `repo` into `clonePath` when it is not already a working tree.
 *
 * This is what makes a repository-per-system deploy work on a fresh machine or
 * after the checkout folder is cleared: the executor cannot fast-forward a
 * folder that does not exist, so the first pull has to create it. The remote is
 * set to `origin` with an authenticated URL so later fetches keep working.
 *
 * Returns true when the folder is a working tree afterwards, whether it was
 * just cloned or already there. Never force-resets an existing checkout.
 */
export async function ensureClone(
  clonePath: string,
  repo: string,
  timeoutMs = 600_000,
): Promise<{ ok: boolean; reason?: string }> {
  if (await isGitRepo(clonePath)) return { ok: true };

  const url = await authenticatedRemoteUrl(repo);
  const parent = dirname(clonePath);
  try {
    // The clone target's parent must exist; `git clone` creates the leaf.
    mkdirSync(parent, { recursive: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `could not create ${parent}: ${message}` };
  }

  const result = await runGit(["clone", url, clonePath], parent, timeoutMs);
  if (!result.ok) {
    return { ok: false, reason: `git clone failed: ${redactRemote(firstLine(result.stderr))}` };
  }
  return { ok: true };
}

export { join };
