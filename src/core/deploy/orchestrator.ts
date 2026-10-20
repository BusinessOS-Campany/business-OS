import { logger } from "@/core/logging/logger";
import { recordDelivery, type DeliveryRecord } from "./deliveries";
import { commitFiles, branchHead, isGithubConfigured } from "./github";
import { deploySystem, type ExecutorHooks } from "./executor";
import { narrowByPaths, planWebhook, type DeployPlan, type EligibleSystem } from "./plan";
import { enqueue } from "./queue";
import { propagateIfReal } from "./fanout";
import {
  getSystemRecord,
  loadRegistry,
  patchRecord,
  setRepoKey,
  listSystemRecords,
} from "./store";
import { repoKey, type DeployedSystemRecord } from "./manifest-schema";
/**
 * The orchestrator: one webhook delivery in, a set of queued builds out.
 *
 * It is the only module that ties the pieces together, and it is deliberately
 * the only one allowed to have side effects across all of them. Every decision
 * it makes is delegated to a module with a pure, tested rule:
 *
 *   - `plan.ts` decides whether the delivery deploys anything at all.
 *   - `queue.ts` decides when each system's build runs.
 *   - `executor.ts` does the pull/build/record.
 *
 * What is left here is the part that IS inherently effectful: fetching the
 * changed-file list from GitHub, writing the delivery record, and refusing to
 * act when GitHub is not configured or the payload is for a foreign repo.
 *
 * The delivery is recorded BEFORE any work is queued, so a GitHub retry of the
 * same `X-GitHub-Delivery` is dropped rather than starting a second build. The
 * record-then-work order is the whole idempotency guarantee.
 */

export interface HandleWebhookInput {
  rawBody: string;
  signature: string | null;
  event: string | null;
  deliveryId: string | null;
  /** Overrides for tests; production reads these from the environment. */
  secret?: string | null;
  hooks?: ExecutorHooks;
}

export interface HandleWebhookResult {
  /** True when GitHub should be answered 2xx. */
  accepted: boolean;
  plan: DeployPlan;
  /** Systems actually queued for a build (a subset of `plan.systems`). */
  queued: string[];
  /** True when a duplicate delivery id was dropped. */
  duplicate: boolean;
}

/** The webhook secret, read from the environment. Never logged. */
function webhookSecret(explicit?: string | null): string | null {
  if (explicit !== undefined) return explicit;
  return process.env.GITHUB_WEBHOOK_SECRET?.trim() || null;
}

/** The `owner/repo` this deployment trusts, from env. */
function trustedRepo(): string | null {
  const repo = process.env.GITHUB_REPO?.trim();
  return repo ? repoKey(repo) : null;
}

/** The records a plan may act on, as the pure planner needs them. */
function eligibleSystems(): EligibleSystem[] {
  return listSystemRecords().map((record) => ({
    id: record.id,
    watchPaths: record.watchPaths,
    repo: record.repo,
  }));
}

/**
 * Handles one delivery end to end.
 *
 * Returns quickly: the actual builds are queued, not awaited, because GitHub
 * wants a 2xx within seconds and a build takes minutes. A rejection of the
 * delivery (bad signature, foreign repo) is reported with `accepted: false` and
 * a 4xx by the route.
 */
export async function handleWebhook(input: HandleWebhookInput): Promise<HandleWebhookResult> {
  const secret = webhookSecret(input.secret);
  const trusted = trustedRepo();

  // 1. Decide, purely, whether this delivery deploys anything.
  const basePlan = planWebhook({
    rawBody: input.rawBody,
    signature: input.signature,
    event: input.event,
    deliveryId: input.deliveryId,
    secret,
    trustedRepo: trusted,
    systems: listSystemRecords().map((r) => ({
      id: r.id,
      watchPaths: r.watchPaths,
      productionBranch: r.productionBranch,
      repo: r.repo,
    })),
  });

  // A signature failure is the one outcome that must not be remembered as
  // "handled": the same delivery id may legitimately arrive again once the
  // secret is fixed, and recording it would suppress a real deploy.
  if (basePlan.outcome === "rejected-signature") {
    return { accepted: false, plan: basePlan, queued: [], duplicate: false };
  }

  // 2. Idempotency: record the delivery before doing anything with it.
  if (input.deliveryId) {
    const first = recordDelivery({
      id: input.deliveryId,
      receivedAt: Date.now(),
      event: input.event ?? "",
      commit: basePlan.commit,
      systems: basePlan.systems,
    } satisfies DeliveryRecord);
    if (!first) {
      logger.info({ deliveryId: input.deliveryId }, "[deploy] duplicate delivery ignored");
      return { accepted: true, plan: basePlan, queued: [], duplicate: true };
    }
  }

  // A ping is answered 200 and nothing else.
  if (basePlan.outcome !== "deploy") {
    return { accepted: true, plan: basePlan, queued: [], duplicate: false };
  }

  // 3. Remember the repo this deployment trusts, on the first accepted delivery.
  //    With a repo per system this is only a label (the registry records which
  //    repo it first saw); routing itself uses each system's own mapping, so it
  //    is written once and never gates a later push from a different repo.
  if (basePlan.repo && !loadRegistry().repoKey) {
    await setRepoKey(basePlan.repo);
  }

  // 4. Narrow by the files the commit actually touched — but ONLY for systems
  //    that are not routed by their own repository.
  //
  //    In a repo-per-system layout the repository already named the systems, and
  //    those systems' files sit at their repo's root, so a file list from that
  //    repo would never match a `system/<slug>` watch prefix. Asking GitHub for
  //    it would be a wasted call that narrows every system away and deploys
  //    nothing — the exact silent failure this guard prevents.
  //
  //    Only when the plan contains at least one repo-less system (the monorepo
  //    layout) is the changed-file list fetched, and the repo used is the pushed
  //    one, which is where those paths live.
  let plan = basePlan;
  const hasPathRouted = eligibleSystems().some(
    (s) => plan.systems.includes(s.id) && !s.repo,
  );
  const fileRepo = basePlan.repo ?? trusted;
  if (hasPathRouted && basePlan.commit && fileRepo && isGithubConfigured()) {
    const { files } = await commitFiles(fileRepo, basePlan.commit);
    if (files.length > 0) {
      plan = narrowByPaths(basePlan, eligibleSystems(), files.map((f) => f.filename));
    }
  }

  if (plan.outcome !== "deploy" || plan.systems.length === 0) {
    return { accepted: true, plan, queued: [], duplicate: false };
  }

  // 5. Queue one build per system, newest commit wins.
  const queued: string[] = [];
  for (const id of plan.systems) {
    const record = getSystemRecord(id);
    if (!record) continue;

    // Record the target commit and the queued state up front, so the admin UI
    // shows "queued" for a system whose build has not started yet.
    await patchRecord(id, { remoteCommit: plan.commit, status: "queued" });

    void enqueue({
      target: { id },
      commit: plan.commit!,
      queuedAt: Date.now(),
      onSuperseded: () => {
        void patchRecord(id, { status: "stale", lastError: "superseded by a newer commit" });
      },
      run: async () => {
        await runDeploy(id, input.hooks, "webhook");
      },
    });
    queued.push(id);
  }

  return { accepted: true, plan, queued, duplicate: false };
}

/**
 * One queued run: build the system, then propagate it to customers when it is a
 * real system.
 *
 * Both entry points — the webhook and the sweep — run exactly this, so the
 * "real deploys fan out to every customer clone, demo deploys never do" rule is
 * written once. The fan-out happens only after the master build succeeded; there
 * is no point pushing a master that did not compile to customers.
 *
 * Never throws: the caller is a queue slot, and an exception here would leave the
 * queue's bookkeeping stuck. Every failure is already recorded on the system's
 * own row by `deploySystem`, and the fan-out records its own per-org outcomes.
 */
async function runDeploy(
  systemId: string,
  hooks: ExecutorHooks | undefined,
  source: "webhook" | "sweep",
): Promise<void> {
  const fresh = getSystemRecord(systemId);
  if (!fresh) return;
  try {
    await deploySystem(fresh, hooks);
  } catch (err) {
    // deploySystem already recorded the failure; nothing to do but log, so the
    // queue is not poisoned by an unhandled rejection.
    logger.error({ err, systemId, source }, "[deploy] build failed");
    return;
  }

  // The master is live. If it is a real system, every customer that has it
  // installed is now running the previous build; update them now rather than on
  // their next visit. A demo system has no customers, so this is a no-op for it.
  try {
    await propagateIfReal(systemId);
  } catch (err) {
    // Propagation is best-effort by design: the master deploy already succeeded
    // and must not be reported as failed because one customer clone would not boot.
    logger.error({ err, systemId, source }, "[deploy] propagation failed");
  }
}

/**
 * The fallback sweep: checks every system's branch and deploys anything behind.
 *
 * This is what covers a webhook that never arrived — the machine was off, the
 * tunnel was down, GitHub gave up its retries. It is NOT a polling loop on a
 * timer; it is called on platform start-up and can be called by an admin, which
 * is enough to catch a missed delivery without hammering GitHub.
 *
 * A system that is in flight is skipped: it is already being handled. A system
 * whose GitHub head cannot be read is left as-is, so a transient API failure
 * does not mark a healthy system as failed.
 */
export async function reconcileAgainstGithub(hooks: ExecutorHooks = {}): Promise<string[]> {
  if (!isGithubConfigured()) {
    logger.warn({}, "[deploy] sweep skipped: GitHub is not configured");
    return [];
  }

  // A system with its own repo is checked against that repo; a repo-less system
  // falls back to the single trusted repo (the monorepo layout). Grouping by
  // repo means one branch-head call per repository, not one per system.
  const fallbackRepo = trustedRepo();
  const records = listSystemRecords();
  const repoOf = (record: DeployedSystemRecord): string | null =>
    record.repo ?? fallbackRepo;

  const repos = new Set(records.map(repoOf).filter((r): r is string => Boolean(r)));
  if (repos.size === 0) {
    logger.warn({}, "[deploy] sweep skipped: no system has a repository mapped");
    return [];
  }

  // Fetch each repo's branch head once, then reuse it for every system in that
  // repo. `null` means the head could not be read; those systems are left as-is.
  const heads = new Map<string, { sha: string } | null>();
  for (const record of records) {
    if (record.status === "queued" || record.status === "building") continue;
    const repo = repoOf(record);
    if (!repo) continue;
    const key = `${repo}@${record.productionBranch}`;
    if (!heads.has(key)) {
      heads.set(key, await branchHead(repo, record.productionBranch));
    }
  }

  const queued: string[] = [];
  for (const record of records) {
    if (record.status === "queued" || record.status === "building") continue;
    const repo = repoOf(record);
    if (!repo) continue;

    const head = heads.get(`${repo}@${record.productionBranch}`);
    if (!head) continue;

    await patchRecord(record.id, { remoteCommit: head.sha, checkedAt: new Date().toISOString() });

    // Nothing to do when the deployed commit is already the branch head.
    if (record.deployedCommit === head.sha) {
      await patchRecord(record.id, { status: "live" });
      continue;
    }

    await patchRecord(record.id, { status: "queued" });
    void enqueue({
      target: { id: record.id },
      commit: head.sha,
      queuedAt: Date.now(),
      run: async () => {
        await runDeploy(record.id, hooks, "sweep");
      },
    });
    queued.push(record.id);
  }
  return queued;
}

/** A system as the admin panel renders it, with the split made explicit. */
export interface AdminSystemView {
  id: string;
  kind: "demo" | "real";
  slug: string;
  nameAr: string;
  nameEn: string;
  repoPath: string;
  /** The GitHub `owner/repo` this system deploys from, or null when unmapped. */
  repo: string | null;
  productionBranch: string;
  deployedCommit: string | null;
  remoteCommit: string | null;
  status: DeployedSystemRecord["status"];
  lastError: string | null;
  deployedAt: string | null;
  lastDurationSeconds: number | null;
  /** True when a newer commit is available than the one deployed. */
  updateAvailable: boolean;
}

/** Shapes the registry for the admin panel, demo and real kept apart. */
export function adminSystemViews(): AdminSystemView[] {
  return listSystemRecords().map((record) => ({
    id: record.id,
    kind: record.kind,
    slug: record.slug,
    nameAr: record.nameAr,
    nameEn: record.nameEn,
    repoPath: record.repoPath,
    repo: record.repo,
    productionBranch: record.productionBranch,
    deployedCommit: record.deployedCommit,
    remoteCommit: record.remoteCommit,
    status: record.status,
    lastError: record.lastError,
    deployedAt: record.deployedAt,
    lastDurationSeconds: record.lastDurationSeconds,
    updateAvailable:
      Boolean(record.deployedCommit && record.remoteCommit) &&
      record.deployedCommit !== record.remoteCommit,
  }));
}
