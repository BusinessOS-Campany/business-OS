import {
  branchFromRef,
  classifyEvent,
  isFresh,
  isProductionBranch,
  verifySignature,
} from "./signature";
import {
  pushedCommit,
  repoKey,
  systemsForPaths,
  systemsForRepo,
  type DeployedSystemRecord,
} from "./manifest-schema";

/**
 * Turning a raw GitHub delivery into a deploy plan — with no side effects.
 *
 * The route that receives a webhook does three things: read the raw body,
 * verify it, and act. This module owns the decision between those last two, as
 * a pure function, so every rejection path can be tested without a server, a
 * secret file, or a network. That matters because the rejections are the
 * security boundary: an unverified push that reaches the planner is a
 * production build started by a stranger.
 *
 * The plan is deliberately "what to deploy", not "start the work". Letting the
 * route act on a value it can log, store and test is what keeps the handler
 * small.
 */

export interface WebhookInput {
  /** The exact bytes GitHub signed. Never a re-serialised object. */
  rawBody: string;
  /** `X-Hub-Signature-256`. */
  signature: string | null;
  /** `X-GitHub-Event`. */
  event: string | null;
  /** `X-GitHub-Delivery` — the idempotency key. */
  deliveryId: string | null;
  /** The configured webhook secret. */
  secret: string | null;
  /** The `owner/repo` this deployment trusts, or null to accept any. */
  trustedRepo: string | null;
  /** Every system the registry knows, for repo and watch-path matching. */
  systems: readonly Pick<
    DeployedSystemRecord,
    "id" | "watchPaths" | "productionBranch" | "repo"
  >[];
  /** Clock override for tests. */
  now?: number;
}

export type PlanOutcome =
  | "deploy"
  | "ping"
  | "ignored-event"
  | "ignored-branch"
  | "ignored-repo"
  | "ignored-nothing-watched"
  | "ignored-delete"
  | "rejected-signature"
  | "rejected-stale";

export interface DeployPlan {
  outcome: PlanOutcome;
  /** Systems to rebuild. Empty unless `outcome === "deploy"`. */
  systems: string[];
  /** The commit pushed, when the event carried one. */
  commit: string | null;
  /** The branch pushed to, when known. */
  branch: string | null;
  /** `owner/repo` from the payload, lower-cased. */
  repo: string | null;
  /** A short reason for the admin log; never a secret. */
  reason: string;
}

/**
 * A system together with the paths that decide whether a specific commit
 * concerns it. Carried on the plan so `narrowByPaths` needs nothing but the
 * plan and a file list.
 */
export interface EligibleSystem {
  id: string;
  watchPaths: string[];
  /**
   * The repository this system deploys from, or null in a monorepo layout.
   *
   * A system with a repo was selected by *repo identity*, so it must survive
   * path narrowing: its files live at that repo's root and would never match a
   * `system/<slug>` prefix. Only repo-less systems are filtered by path.
   */
  repo?: string | null;
}

interface PushPayload {
  ref?: string;
  after?: string;
  deleted?: boolean;
  repository?: { full_name?: string; default_branch?: string };
  head_commit?: { timestamp?: string } | null;
}

/**
 * The single entry point: verify, classify, and decide what (if anything) to
 * deploy.
 *
 * Order matters and is encoded here: verify the signature FIRST, before parsing
 * the body or trusting any header. Doing anything with an unverified payload —
 * even reading its `ref` to log it — is reading attacker-controlled data.
 */
export function planWebhook(input: WebhookInput): DeployPlan {
  const now = input.now ?? Date.now();

  // 1. Signature. Everything below this line trusts the body.
  if (!verifySignature(input.rawBody, input.signature, input.secret)) {
    return {
      outcome: "rejected-signature",
      systems: [],
      commit: null,
      branch: null,
      repo: null,
      reason: "signature did not verify",
    };
  }

  // 2. Freshness, from the signature-verified body's own payload where present.
  let payload: PushPayload = {};
  try {
    payload = JSON.parse(input.rawBody) as PushPayload;
  } catch {
    return {
      outcome: "ignored-event",
      systems: [],
      commit: null,
      branch: null,
      repo: null,
      reason: "body was not JSON",
    };
  }

  const timestamp = payload.head_commit?.timestamp;
  if (timestamp && !isFresh(String(Math.floor(Date.parse(timestamp) / 1000)), now)) {
    // A push older than the window, arriving now, is a replay.
    return {
      outcome: "rejected-stale",
      systems: [],
      commit: null,
      branch: null,
      repo: null,
      reason: "push is older than the replay window",
    };
  }

  const event = classifyEvent(input.event);
  const repo = payload.repository?.full_name ? repoKey(payload.repository.full_name) : null;
  const branch = branchFromRef(payload.ref);

  // 3. A ping confirms the hook is wired; it is never a deploy.
  if (event === "ping") {
    return { outcome: "ping", systems: [], commit: null, branch, repo, reason: "webhook confirmed" };
  }

  // 4. Only a push deploys.
  if (event !== "push") {
    return {
      outcome: "ignored-event",
      systems: [],
      commit: null,
      branch,
      repo,
      reason: `event "${input.event ?? "unknown"}" is not a push`,
    };
  }

  // 5. Which systems this repository owns.
  //
  //    With a repository per system, the pushed repo IS the routing key: a push
  //    to `owner/dental` deploys the systems mapped to `owner/dental`, whatever
  //    files it touched. `systemsForRepo` is that rule.
  //
  //    A deployment may still be configured as a monorepo (systems carry no
  //    per-system repo). Then there is nothing to route by repo, the changed
  //    paths decide, and the optional `trustedRepo` is a plain allow-list.
  const mapped = systemsForRepo(input.systems, repo);
  const anyRepoMapped = input.systems.some((s) => s.repo);

  if (anyRepoMapped && mapped.length === 0) {
    // This deployment routes by repository, but no system publishes from the
    // pushed one. A webhook pointed at the wrong repo, or a stranger. Deploying
    // the branch-eligible monorepo set here would be the worst outcome: a push
    // to an unrelated repo building and shipping customer systems.
    return {
      outcome: "ignored-repo",
      systems: [],
      commit: null,
      branch,
      repo,
      reason: `push was for ${repo}, which no system deploys from`,
    };
  }

  if (input.trustedRepo && repo && repo !== repoKey(input.trustedRepo) && !anyRepoMapped) {
    // Monorepo layout with a single trusted repo: any other repo is foreign.
    return {
      outcome: "ignored-repo",
      systems: [],
      commit: null,
      branch,
      repo,
      reason: `push was for ${repo}, not ${repoKey(input.trustedRepo)}`,
    };
  }

  // 6. A branch deletion has no commit to build.
  const commit = pushedCommit({ after: payload.after, deleted: payload.deleted });
  if (!commit) {
    return { outcome: "ignored-delete", systems: [], commit: null, branch, repo, reason: "branch deleted" };
  }

  // 7. Only a push to the branch a system builds from. Different systems may
  //    build from different branches, so this is decided per system. When the
  //    repo routed the push, the candidates are that repo's systems; otherwise
  //    every system is a candidate and the path filter narrows them later.
  const candidates =
    mapped.length > 0
      ? input.systems.filter((s) => mapped.includes(s.id))
      : input.systems;

  const onProduction: string[] = [];
  for (const system of candidates) {
    if (isProductionBranch(payload.ref ?? null, system.productionBranch)) {
      onProduction.push(system.id);
    }
  }
  if (onProduction.length === 0) {
    return {
      outcome: "ignored-branch",
      systems: [],
      commit,
      branch,
      repo,
      reason: `no system builds from ${branch ?? "this ref"}`,
    };
  }

  // 8. Which of those the commit actually touched. For a repo-per-system layout
  //    the repo already named the systems, so the whole set deploys — a push to
  //    the `dental` repo is a dental change even if it only edits its README.
  //
  //    For the monorepo fallback the file list is not in a push payload (only
  //    the head commit's added/modified/removed), so the caller fills it in and
  //    `narrowByPaths` matches. When the repo already routed, `narrowByPaths` is
  //    skipped by the caller, because those paths are repo-internal and would
  //    never match a `system/<slug>` prefix.
  return {
    outcome: "deploy",
    systems: onProduction,
    commit,
    branch,
    repo,
    reason:
      mapped.length > 0
        ? `push to ${repo} deploys ${onProduction.length} system(s)`
        : `push to ${branch} touches ${onProduction.length} system(s)`,
  };
}

/**
 * Narrows a branch-eligible plan to the systems a commit's file list touches.
 *
 * Split from `planWebhook` because the file list requires an API call, and the
 * pure planner must stay offline. A commit that touches no watched path narrows
 * to nothing and the outcome becomes `ignored-nothing-watched` — which is the
 * common case and must not cost a build.
 */
export function narrowByPaths(
  plan: DeployPlan,
  eligible: readonly EligibleSystem[],
  changedFiles: readonly string[],
): DeployPlan {
  if (plan.outcome !== "deploy") return plan;

  const candidates = eligible.filter((s) => plan.systems.includes(s.id));

  // A system routed by repository identity is kept as-is: the repo already
  // decided it, and its internal file paths cannot match a monorepo prefix.
  const byRepo = candidates.filter((s) => Boolean(s.repo)).map((s) => s.id);
  const byPath = systemsForPaths(
    candidates.filter((s) => !s.repo),
    changedFiles,
  );

  // Preserve plan order (the registry's stable order) rather than concatenating
  // two filtered lists, so the queued order does not depend on how a system was
  // matched.
  const keep = new Set([...byRepo, ...byPath]);
  const systems = plan.systems.filter((id) => keep.has(id));

  if (systems.length === 0) {
    return {
      ...plan,
      outcome: "ignored-nothing-watched",
      systems: [],
      reason: `commit ${plan.commit?.slice(0, 7) ?? "?"} touches no watched path`,
    };
  }
  return { ...plan, systems, reason: `commit ${plan.commit?.slice(0, 7) ?? "?"} touches ${systems.length} system(s)` };
}
