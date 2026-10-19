import { z } from "zod";
import { ApiError, ok, withRoute } from "@/core/http/api";
import { requirePlatformAdmin } from "@/core/platform/gate";
import { adminSystemViews, reconcileAgainstGithub } from "@/core/deploy/orchestrator";
import { isGithubConfigured, repoReachable, githubConfig } from "@/core/deploy/github";
import { busySystems } from "@/core/deploy/queue";
import { registryPath, loadRegistry } from "@/core/deploy/store";

/**
 * The deploy console API, under the platform-admin realm.
 *
 * Every handler calls `requirePlatformAdmin`, the same gate the console's pages
 * use. That is the whole security model for this endpoint: the webhook can start
 * a build, but only an admin may read deployment state, trigger a manual sweep,
 * or force a re-check. There is deliberately no anonymous route here.
 *
 * The response is shaped for the Arabic dashboard: the registry's records are
 * already bilingual (`nameAr`/`nameEn`), and the demo/real split is part of the
 * payload rather than something the client infers, so the two can never be
 * displayed as one merged system.
 */

/** Where GitHub now stands, for the "connected?" banner in the console. */
async function githubStatus(): Promise<{
  mode: "app" | "token" | "none";
  repo: string | null;
  reachable: boolean | null;
  detail: string | null;
}> {
  const config = githubConfig();
  if (config.mode === "none" || !config.repo) {
    return { mode: config.mode, repo: config.repo, reachable: null, detail: null };
  }
  // Only probe reachability when we can actually try; a failure here is reported
  // as a detail, never as an error, so the console renders regardless.
  const result = await repoReachable(config.repo, config);
  return {
    mode: config.mode,
    repo: config.repo,
    reachable: result.ok,
    detail: result.ok ? null : (result.error ?? "unreachable"),
  };
}

/** GET /api/platform/deploy — the full state of every system's deployment. */
export const GET = withRoute("platform.deploy.list", async (request) => {
  await requirePlatformAdmin(request);

  const systems = adminSystemViews();
  const registry = loadRegistry();

  return ok({
    github: await githubStatus(),
    repoKey: registry.repoKey,
    lastCheckedAt: registry.lastCheckedAt,
    building: busySystems(),
    // Split for the UI, so a template never has to filter by kind itself.
    demo: systems.filter((s) => s.kind === "demo"),
    real: systems.filter((s) => s.kind === "real"),
    systems,
  });
});

const actionSchema = z.object({
  action: z.enum(["sweep", "reconcile"]),
});

/**
 * POST /api/platform/deploy — an admin-triggered maintenance action.
 *
 * `sweep` re-checks every system against its GitHub branch head and queues any
 * that are behind; this is the same path the start-up fallback uses, exposed so
 * an admin can recover a missed webhook on demand. `reconcile` re-reads the two
 * trees and repairs the registry, for when a system folder was added or renamed
 * by hand.
 *
 * Both are safe to call repeatedly: they are the idempotent paths, not new ones.
 */
export const POST = withRoute("platform.deploy.action", async (request) => {
  await requirePlatformAdmin(request);

  const body = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    throw ApiError.badRequest("Unknown deploy action", parsed.error.flatten());
  }

  if (parsed.data.action === "sweep") {
    if (!isGithubConfigured()) {
      throw new ApiError(
        409,
        "GITHUB_NOT_CONFIGURED",
        "لم يتم ربط GitHub بعد، لا يمكن الفحص",
        "GitHub is not connected; cannot sweep",
      );
    }
    const queued = await reconcileAgainstGithub();
    return ok({ action: "sweep", queued });
  }

  // reconcile: re-read disk, repair the registry. `bootstrapDeploy` guards
  // against a double-run because it is the start-up hook, so the manual path
  // resets that guard first — via the module's own test seam, not by reaching
  // into its internals.
  const bootstrap = await import("@/core/deploy/bootstrap");
  bootstrap.__resetBootstrap();
  const result = await bootstrap.bootstrapDeploy();
  return ok({ action: "reconcile", reconciled: result.reconciled, statePath: registryPath() });
});
