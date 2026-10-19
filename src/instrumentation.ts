/**
 * Platform process startup.
 *
 * Exists for one reason: the per-org runtime table in the supervisor is
 * in-memory, so a platform restart used to forget every org system it had
 * started — while the Node processes themselves kept running. The first click on
 * "open my system" after a restart then paid for a full cold boot of something
 * that had been serving all along, which is what made the button feel slow for
 * no visible reason.
 *
 * `adoptPersistedRuntimes` puts those back by probing each recorded port, so
 * the first request finds a warm runtime instead of starting a second one.
 */

/**
 * Next calls `register` in every environment, and the supervisor is Node-only —
 * it spawns processes and reads the filesystem. Importing it unconditionally
 * would break the edge build, so the Node runtime is the only one that loads it.
 *
 * The import has to sit *inside* this branch, not behind an early
 * `if (process.env.NEXT_RUNTIME !== "nodejs") return;`. Webpack substitutes the
 * runtime name and drops the branch it can prove dead — but only the branch:
 * statements after an early return stay in the module graph. The edge compiler
 * is given no externals for the Node runtime, so it cannot resolve the `pg` the
 * supervisor pulls in, and the whole dev server answers 500 with
 * `Module not found: Can't resolve 'fs'` (raised by `pg-connection-string`).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { adoptPersistedRuntimes } = await import("@/core/systems/runtime/supervisor");

    // Deliberately not awaited: `register` must complete before the server
    // accepts requests, and a probe per org is real latency on startup. Adoption is
    // an optimisation — any runtime not picked up here is booted normally by the
    // first request that needs it — so it runs alongside startup and is never on
    // the critical path to serving a request.
    void adoptPersistedRuntimes().catch(() => {
      // A failure to rehydrate must not stop the platform booting; the cold path
      // is always there as the fallback.
    });

    const { bootstrapDeploy } = await import("@/core/deploy/bootstrap");

    // Also not awaited, for the same reason and one more: bootstrapping may run a
    // start-up sweep that reaches GitHub and queues a build. That is seconds of
    // work, and the platform must serve the first request before it finishes. A
    // sweep that fails (GitHub down, no credentials) is reported and ignored —
    // the webhook and the manual sweep remain available.
    void bootstrapDeploy().catch(() => {
      // Bootstrap never throws by contract; this is belt-and-braces so a future
      // edit to it cannot take the platform down at boot.
    });
  }
}
