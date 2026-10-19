import { logger } from "@/core/logging/logger";
import { getSystemRecord, patchRecord } from "./store";
import { planFanout, type FanoutPlan, type InstalledOrg } from "./fanout-plan";

/**
 * Customer-clone propagation: `system/<slug>` changed, so every org's own copy.
 *
 * When the master copy of a real system is updated, the customers do not see it
 * until their own clone is re-synced and rebuilt. The requirement is that this
 * happens immediately — not on their next visit — so this module walks every org
 * that has the system installed and redeploys each one.
 *
 * The order and the safety rules are what matter:
 *
 *   1. **Re-sync the files** with `cloneSystemForOrg({force: true})`. The copy is
 *      merge-style: it overwrites only the files the master actually ships, so an
 *      org's own uploads, `.env`, and database are never deleted. It is genuinely
 *      a copy, never a wipe-and-replace.
 *   2. **Stop the runtime**, so the process that is serving is not serving
 *      half-updated sources while the new one boots.
 *   3. **Boot it again** through `ensureOrgRuntime`, which runs the org's own
 *      `prisma migrate deploy` and its bootstrap, then rebuilds. A code deploy
 *      therefore never runs a migration by itself — the same rule the executor
 *      follows — but the org's own runtime applies its own schema changes the way
 *      it always does.
 *
 * A failure on one org is recorded and isolated: the others still get their
 * update. A single customer's broken build must not deny every other customer
 * the fix that was just pushed.
 *
 * What this module deliberately does NOT do: write to any database, delete a
 * clone, or run a migration out of band. Those are not in its repertoire at all,
 * which is what makes "a demo update never touches a customer install" and "a
 * real update never destroys customer data" true by construction rather than by
 * review.
 */

/**
 * The set of orgs that have a system installed, as `id`/`slug` pairs.
 *
 * Injectable so the fan-out can be tested without a database. Production passes
 * the Prisma query; the default is defined lazily inside `propagateToOrgClones`
 * so this module does not import the DB client at load time (it is pulled in by
 * the start-up hook and by the webhook route, neither of which should require a
 * `DATABASE_URL` to be importable).
 */
export type OrgEnumerator = (systemSlug: string) => Promise<InstalledOrg[]>;

/** The deps the fan-out needs, injectable for tests. */
export interface FanoutDeps {
  /** Re-syncs the master into the org's folder. Returns the clone path. */
  resync: (orgSlug: string, systemSlug: string) => { cloned: boolean; reason?: string; path: string };
  /** Stops the org's running process, if any. */
  stop: (orgSlug: string, systemSlug: string) => boolean;
  /** Boots (and builds) the org's copy again. */
  start: (org: InstalledOrg, systemSlug: string) => Promise<{ port: number }>;
  /** Records a per-org outcome on the org's own system folder. */
  record: (org: InstalledOrg, systemSlug: string, outcome: FanoutOrgOutcome) => void;
}

export interface FanoutOrgOutcome {
  orgSlug: string;
  orgId: string;
  ok: boolean;
  /** Which step failed, when it did. */
  step?: "resync" | "start";
  detail?: string;
  ms: number;
}

export interface FanoutResult {
  systemSlug: string;
  plan: FanoutPlan;
  outcomes: FanoutOrgOutcome[];
  updated: number;
  failed: number;
}

/**
 * The production enumerator: every org with an `installed`/`active` row for this
 * system.
 *
 * Read-only. This is the same predicate the request proxy uses to decide whether
 * an org may reach a system at all, so the set of orgs this fans out to is
 * exactly the set of orgs that would otherwise serve the old build.
 */
async function installedOrgsFromDb(systemSlug: string): Promise<InstalledOrg[]> {
  const { sharedPrisma } = await import("@/core/db/client");
  const rows = await sharedPrisma.organizationApp.findMany({
    where: { app: { slug: systemSlug }, status: { in: ["installed", "active"] } },
    select: { organization: { select: { id: true, slug: true } } },
  });
  return rows
    .map((row) => row.organization)
    .filter((org): org is { id: string; slug: string } => Boolean(org?.id && org?.slug));
}

/** The production deps, built from the org-vault and supervisor modules. */
async function productionDeps(): Promise<FanoutDeps> {
  const [{ cloneSystemForOrg }, { ensureOrgRuntime, stopOrgRuntime }, { getEnv }, { orgSystemPath }, { appendJsonLine, orgVaultPaths }, { getVaultEntry }] =
    await Promise.all([
      import("@/core/org-vault/system-clone"),
      import("@/core/systems/runtime/supervisor"),
      import("@/core/config/env"),
      import("@/core/systems/runtime/urls"),
      import("@/core/org-vault/paths"),
      import("@/core/org-vault/registry"),
    ]);

  return {
    resync: (orgSlug, systemSlug) => {
      const result = cloneSystemForOrg({ slug: orgSlug }, systemSlug, { force: true });
      return { cloned: result.cloned, reason: result.reason, path: result.path };
    },
    stop: (orgSlug, systemSlug) => stopOrgRuntime(orgSlug, systemSlug),
    start: async (org, systemSlug) =>
      ensureOrgRuntime({
        orgId: org.id,
        orgSlug: org.slug,
        systemSlug,
        basePath: orgSystemPath(org.slug, systemSlug),
        gatewaySecret: getEnv().AUTH_SECRET,
      }),
    record: (org, systemSlug, outcome) => {
      // Written beside the org's clone, in its own provisioning log, so the
      // record of "your system was updated at 14:02" lives with the system.
      const folder = getVaultEntry(org.slug)?.folder ?? org.slug;
      appendJsonLine(orgVaultPaths(folder).provisioningLog, {
        ts: new Date().toISOString(),
        slug: org.slug,
        event: outcome.ok ? "system.deploy_propagated" : "system.deploy_propagation_failed",
        systemSlug,
        step: outcome.step ?? null,
        detail: outcome.detail ?? null,
        ms: outcome.ms,
      });
    },
  };
}

/**
 * Propagates a deployed real system to every customer clone.
 *
 * Called after the master build succeeded — there is no point updating customers
 * from a master that did not compile. Never throws: the caller is a deploy run
 * that has already succeeded and must not be turned into a failure by a customer
 * clone that would not boot.
 */
export async function propagateToOrgClones(
  systemSlug: string,
  options: { enumerate?: OrgEnumerator; deps?: FanoutDeps; now?: () => number } = {},
): Promise<FanoutResult> {
  const now = options.now ?? (() => Date.now());
  const enumerate = options.enumerate ?? installedOrgsFromDb;

  let orgs: InstalledOrg[] = [];
  try {
    orgs = await enumerate(systemSlug);
  } catch (err) {
    logger.error({ err, systemSlug }, "[deploy] could not enumerate orgs for propagation");
    return {
      systemSlug,
      plan: { systemSlug, orgs: [], total: 0, reason: "enumerate-failed" },
      outcomes: [],
      updated: 0,
      failed: 0,
    };
  }

  const plan = planFanout(systemSlug, orgs);
  if (plan.total === 0) {
    logger.info({ systemSlug, reason: plan.reason }, "[deploy] no customer clones to update");
    return { systemSlug, plan, outcomes: [], updated: 0, failed: 0 };
  }

  const deps = options.deps ?? (await productionDeps());
  const outcomes: FanoutOrgOutcome[] = [];

  // Sequential on purpose. Each org's boot can build, and the supervisor holds a
  // single global build slot; fanning out in parallel would just queue them
  // while spawning every `next build` attempt at once on one machine. Order is
  // stable (the planner sorts) so a failure is reproducible from the log.
  for (const org of plan.orgs) {
    const startedAt = now();
    let outcome: FanoutOrgOutcome;
    try {
      const resynced = deps.resync(org.slug, systemSlug);
      if (!resynced.cloned) {
        outcome = {
          orgSlug: org.slug,
          orgId: org.id,
          ok: false,
          step: "resync",
          detail: resynced.reason ?? "clone failed",
          ms: now() - startedAt,
        };
      } else {
        // Stop before boot: the running process is serving the old build, and
        // `ensureOrgRuntime` would otherwise hand back the healthy old runtime.
        deps.stop(org.slug, systemSlug);
        const runtime = await deps.start(org, systemSlug);
        outcome = { orgSlug: org.slug, orgId: org.id, ok: true, ms: now() - startedAt };
        logger.info(
          { orgSlug: org.slug, systemSlug, port: runtime.port, ms: outcome.ms },
          "[deploy] customer clone updated",
        );
      }
    } catch (err) {
      outcome = {
        orgSlug: org.slug,
        orgId: org.id,
        ok: false,
        step: "start",
        detail: (err instanceof Error ? err.message : String(err)).slice(0, 1000),
        ms: now() - startedAt,
      };
      logger.error({ err, orgSlug: org.slug, systemSlug }, "[deploy] customer clone update failed");
    }
    deps.record(org, systemSlug, outcome);
    outcomes.push(outcome);
  }

  const updated = outcomes.filter((o) => o.ok).length;
  const failed = outcomes.length - updated;
  logger.info({ systemSlug, updated, failed, total: plan.total }, "[deploy] propagation complete");
  return { systemSlug, plan, outcomes, updated, failed };
}

/**
 * The hook a real deploy calls once its own build is live.
 *
 * Split from `propagateToOrgClones` so the executor and the orchestrator can call
 * one function and always get the same answer: a real system propagates, a demo
 * system does not. The demo path must never reach a customer clone — that is the
 * separation this whole feature is built on — and expressing "only real" once,
 * here, is safer than trusting three call sites to remember it.
 */
export async function propagateIfReal(
  systemId: string,
  options: { enumerate?: OrgEnumerator; deps?: FanoutDeps; now?: () => number } = {},
): Promise<FanoutResult | null> {
  const record = getSystemRecord(systemId);
  if (!record) return null;
  if (record.kind !== "real") {
    logger.debug({ systemId }, "[deploy] demo system; no customer clones to update");
    return null;
  }
  const result = await propagateToOrgClones(record.slug, options);
  // Record the outcome on the *master* row too, so the console shows that this
  // update reached (or failed to reach) customers, not just that it built.
  await patchRecord(systemId, {
    lastError:
      result.failed > 0
        ? `${result.failed}/${result.plan.total} customer clones failed to update`
        : null,
  });
  return result;
}
