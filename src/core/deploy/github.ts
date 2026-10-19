import { createSign } from "node:crypto";
import { logger } from "@/core/logging/logger";

/**
 * The GitHub client: the minimum the deployer needs to know what to build.
 *
 * Deliberately a small, typed wrapper over `fetch` rather than `@octokit/*`:
 * the platform already ships `fetch` in Node 22, the surface used here is five
 * endpoints, and a dependency in the request path of production deploys is a
 * supply-chain question not worth opening for it.
 *
 * Authentication supports the two shapes a real deployment uses, in this order:
 *
 *   - **GitHub App** (preferred): `GITHUB_APP_ID` + `GITHUB_APP_PRIVATE_KEY`
 *     (or `GITHUB_APP_PRIVATE_KEY_PATH`) + `GITHUB_APP_INSTALLATION_ID`. The
 *     client mints a short-lived installation token, caches it, and renews it
 *     before expiry. The private key never leaves the process and is never
 *     logged.
 *   - **Token** (fallback): `GITHUB_TOKEN`, a fine-grained PAT. Simpler, less
 *     scoped, and only used when the App credentials are absent.
 *
 * When neither is configured the client reports `configured: false` instead of
 * throwing, so the admin UI can say "GitHub is not connected" rather than
 * failing to render. Nothing in this module ever puts a credential into a log
 * line or an error message.
 */

/** Which credential shape is active. */
export type AuthMode = "app" | "token" | "none";

export interface GithubConfig {
  mode: AuthMode;
  /** `owner/repo`, lower-cased. Null when unset. */
  repo: string | null;
  /** API base, overridable for tests. */
  apiBase: string;
}

/** Where GitHub's REST API lives, unless overridden (tests, GitHub Enterprise). */
const DEFAULT_API_BASE = "https://api.github.com";

/** How long a minted installation token is trusted before a renewal. */
const TOKEN_SAFETY_MARGIN_MS = 5 * 60_000;

function readAppPrivateKey(): string | null {
  const inline = process.env.GITHUB_APP_PRIVATE_KEY?.trim();
  if (inline) {
    // A key stored in an env var usually has its newlines escaped to survive a
    // one-line .env; restore them or the signer rejects it as malformed.
    return inline.includes("\\n") ? inline.replace(/\\n/g, "\n") : inline.replace(/\r/g, "");
  }
  const path = process.env.GITHUB_APP_PRIVATE_KEY_PATH?.trim();
  if (!path) return null;
  try {
    // Required lazily so a missing file is a config error, not a crash on import.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    return fs.readFileSync(path, "utf-8");
  } catch (err) {
    logger.error({ err, path }, "[deploy] GITHUB_APP_PRIVATE_KEY_PATH could not be read");
    return null;
  }
}

/** Reads the active credential configuration without exposing any secret. */
export function githubConfig(): GithubConfig {
  const apiBase = process.env.GITHUB_API_BASE?.trim() || DEFAULT_API_BASE;
  const rawRepo = process.env.GITHUB_REPO?.trim();
  const repo = rawRepo ? rawRepo.toLowerCase() : null;

  const appId = process.env.GITHUB_APP_ID?.trim();
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID?.trim();
  const hasAppKey = Boolean(readAppPrivateKey());

  if (appId && installationId && hasAppKey) {
    return { mode: "app", repo, apiBase };
  }
  if (process.env.GITHUB_TOKEN?.trim()) {
    return { mode: "token", repo, apiBase };
  }
  return { mode: "none", repo, apiBase };
}

/** True when the deployment has enough credentials to call GitHub at all. */
export function isGithubConfigured(): boolean {
  return githubConfig().mode !== "none";
}

/** Base64url with no padding, as JWT requires. */
function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * A GitHub App JWT, valid for ten minutes.
 *
 * GitHub rejects an `exp` more than ten minutes out and an `iat` in the future,
 * so the window is anchored one minute in the past to absorb clock skew between
 * this machine and GitHub — the single most common cause of "Bad credentials"
 * on an otherwise correct key.
 */
export function createAppJwt(appId: string, privateKey: string, now: number = Date.now()): string {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const issuedAt = Math.floor(now / 1000) - 60;
  const payload = base64url(
    JSON.stringify({ iat: issuedAt, exp: issuedAt + 600, iss: appId }),
  );
  const signingInput = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(privateKey);
  return `${signingInput}.${base64url(signature)}`;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedInstallationToken: CachedToken | null = null;

/** Test seam: drops the cached installation token. */
export function __resetTokenCache(): void {
  cachedInstallationToken = null;
}

/**
 * The bearer token to use, minting a fresh installation token when needed.
 *
 * Cached in-process and renewed with a five-minute margin, because every GitHub
 * API call would otherwise mint a new token and the installation-token endpoint
 * is itself rate-limited.
 */
export async function authToken(config: GithubConfig = githubConfig()): Promise<string | null> {
  if (config.mode === "token") return process.env.GITHUB_TOKEN?.trim() ?? null;
  if (config.mode !== "app") return null;

  if (cachedInstallationToken && cachedInstallationToken.expiresAt > Date.now() + TOKEN_SAFETY_MARGIN_MS) {
    return cachedInstallationToken.token;
  }

  const appId = process.env.GITHUB_APP_ID!.trim();
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID!.trim();
  const privateKey = readAppPrivateKey();
  if (!privateKey) return null;

  const jwt = createAppJwt(appId, privateKey);
  const response = await fetch(`${config.apiBase}/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    // The body may echo the request but never the key; still, only the status is
    // logged so a future API change cannot leak anything.
    logger.error({ status: response.status }, "[deploy] GitHub installation token request failed");
    return null;
  }

  const body = (await response.json()) as { token?: string; expires_at?: string };
  if (!body.token) return null;

  const expiresAt = body.expires_at ? Date.parse(body.expires_at) : Date.now() + 55 * 60_000;
  cachedInstallationToken = { token: body.token, expiresAt };
  return body.token;
}

export interface GithubResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  /** A short, safe reason for a failure — never a credential. */
  error?: string;
}

/**
 * One authenticated GET against the GitHub API.
 *
 * Never throws: a deploy decision must survive GitHub being slow or down, and
 * the caller decides what a failure means. The error string carries the status
 * and GitHub's own `message` field, which is safe to surface and is the whole
 * difference between "403" and "403 — Resource not accessible by integration".
 */
export async function githubGet<T>(path: string, config: GithubConfig = githubConfig()): Promise<GithubResult<T>> {
  if (config.mode === "none") {
    return { ok: false, status: 0, data: null, error: "GitHub is not configured" };
  }
  const token = await authToken(config);
  if (!token) {
    return { ok: false, status: 0, data: null, error: "no usable GitHub credential" };
  }

  try {
    const response = await fetch(`${config.apiBase}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "businessos-deployer",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status === 404) {
      return { ok: false, status: 404, data: null, error: "not found" };
    }
    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as { message?: string };
        if (body.message) message = `HTTP ${response.status} — ${body.message}`;
      } catch {
        // Body was not JSON; the status is enough.
      }
      return { ok: false, status: response.status, data: null, error: message };
    }

    return { ok: true, status: response.status, data: (await response.json()) as T };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, data: null, error: `request failed: ${message}` };
  }
}

/** The tip commit of a branch, or null when the branch or repo is unknown. */
export async function branchHead(
  repo: string,
  branch: string,
  config: GithubConfig = githubConfig(),
): Promise<{ sha: string; message: string; committedAt: string } | null> {
  const result = await githubGet<{
    sha?: string;
    commit?: { message?: string; committer?: { date?: string } };
  }>(`/repos/${repo}/commits/${encodeURIComponent(branch)}`, config);

  if (!result.ok || !result.data?.sha) return null;
  return {
    sha: result.data.sha,
    message: result.data.commit?.message?.split("\n")[0] ?? "",
    committedAt: result.data.commit?.committer?.date ?? "",
  };
}

/** One file entry from a commit's file list. */
export interface ChangedFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
}

/**
 * The files a commit touched, up to GitHub's 300-file page.
 *
 * `files` is capped at 300 per response; a commit larger than that is not a
 * normal application change and is reported as truncated rather than paginated,
 * because a deploy decision does not need the tail of a thousand-file commit.
 */
export async function commitFiles(
  repo: string,
  sha: string,
  config: GithubConfig = githubConfig(),
): Promise<{ files: ChangedFile[]; truncated: boolean }> {
  const result = await githubGet<{
    files?: ChangedFile[];
    stats?: { total?: number };
  }>(`/repos/${repo}/commits/${sha}`, config);

  if (!result.ok || !result.data) return { files: [], truncated: false };
  const files = result.data.files ?? [];
  return { files, truncated: files.length >= 300 };
}

/** True when the repository exists and is reachable with the current credential. */
export async function repoReachable(repo: string, config: GithubConfig = githubConfig()): Promise<GithubResult<{ full_name: string; default_branch: string; private: boolean }>> {
  return githubGet<{ full_name: string; default_branch: string; private: boolean }>(`/repos/${repo}`, config);
}
