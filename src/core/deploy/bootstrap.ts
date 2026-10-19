import { logger } from "@/core/logging/logger";
import { discoverRepoSystems } from "./discovery";
import { isGithubConfigured } from "./github";
import { reconcileAgainstGithub } from "./orchestrator";
import { reconcile, loadRegistry } from "./store";

/**
 * Deploy start-up: reconcile the registry, then catch any missed delivery.
 *
 * Two jobs, both idempotent, both off the request path:
 *
 *   1. **Reconcile** the registry against what is actually on disk. A system
 *      added, renamed or removed while the platform was down is corrected here,
 *      so the admin panel never shows a system that no longer exists.
 *   2. **Sweep** GitHub for a commit that was pushed while this machine was off,
 *      the tunnel was down, or a webhook was lost. This is the fallback the
 *      webhook cannot provide by itself, and it is deliberately NOT a timer: it
 *      runs once at start-up, and on demand from the admin panel. A missed
 *      push is caught the next time the platform boots, without polling GitHub
 *      every few seconds.
 *
 * It never throws and never blocks startup. A deploy that cannot be reconciled
 * is not a reason to refuse to serve customers; the webhook and the manual
 * sweep both remain available.
 */

/** Guards against a double-run when Next calls `register` more than once. */
let started = false;

export interface BootstrapResult {
  reconciled: number;
  swept: string[];
  skipped: "already-started" | "github-not-configured" | null;
}

export async function bootstrapDeploy(repoRoot: string = process.cwd()): Promise<BootstrapResult> {
  if (started) return { reconciled: 0, swept: [], skipped: "already-started" };
  started = true;

  try {
    const systems = discoverRepoSystems(repoRoot);
    const registry = await reconcile(systems);
    const count = Object.keys(registry.systems).length;
    logger.info({ systems: count, repoKey: registry.repoKey }, "[deploy] registry reconciled");

    if (!isGithubConfigured()) {
      logger.info({}, "[deploy] GitHub not configured; webhook and sweep are inert until it is");
      return { reconciled: count, swept: [], skipped: "github-not-configured" };
    }

    const swept = await reconcileAgainstGithub();
    if (swept.length > 0) {
      logger.info({ swept }, "[deploy] start-up sweep queued builds for commits missed while down");
    } else {
      logger.info({}, "[deploy] start-up sweep: everything at its branch head");
    }
    return { reconciled: count, swept, skipped: null };
  } catch (err) {
    logger.error({ err }, "[deploy] bootstrap failed; platform continues without it");
    return { reconciled: 0, swept: [], skipped: null };
  }
}

/** Test seam: allows `bootstrapDeploy` to run again in the same process. */
export function __resetBootstrap(): void {
  started = false;
}

/** The registry's own record of what is deployed, for the admin panel. */
export function deployedRegistry() {
  return loadRegistry();
}
