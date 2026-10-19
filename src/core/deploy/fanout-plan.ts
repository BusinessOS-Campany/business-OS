/**
 * The fan-out plan: which customer clones a real-system deploy must update.
 *
 * Kept as a pure function next to the effectful fan-out (`fanout.ts`) for the
 * same reason `plan.ts` sits beside `orchestrator.ts`: the branchy part — who is
 * included, who is skipped, in what order — is where a mistake costs a customer
 * a broken system, and it is worth being able to test it exhaustively without
 * spawning a single process or touching a database.
 *
 * The rules encoded here:
 *
 *   - **One update per org.** A database that returns the same org twice (a
 *     duplicate install row, a join that fans out) must not produce two rebuilds.
 *     The first occurrence wins; the org id is the identity.
 *   - **A malformed row is dropped, never guessed at.** An org with no slug
 *     cannot have a folder, and inventing one would mean copying a system into a
 *     folder that belongs to nobody. Dropping it is the only safe answer.
 *   - **Stable, sorted order.** The fan-out runs sequentially, so the order
 *     determines which customer is updated first and makes a partial failure
 *     reproducible from the log.
 */

/** An org that has a system installed, as the fan-out needs it. */
export interface InstalledOrg {
  id: string;
  slug: string;
}

export interface FanoutPlan {
  systemSlug: string;
  /** The orgs to update, deduplicated and sorted. */
  orgs: InstalledOrg[];
  total: number;
  /** Why nothing will happen, when `total` is 0. */
  reason?: "no-installed-orgs" | "enumerate-failed";
}

/** A slug we are willing to build a folder path from. */
function validSlug(slug: unknown): slug is string {
  return typeof slug === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(slug);
}

/**
 * Builds the plan for one system slug from the orgs that have it installed.
 *
 * The input is whatever the enumerator returned; this function does not trust it
 * to be clean, because it comes from a query over rows that other code paths can
 * write. Everything it does not understand is dropped rather than repaired.
 */
export function planFanout(systemSlug: string, orgs: readonly InstalledOrg[]): FanoutPlan {
  const seen = new Set<string>();
  const kept: InstalledOrg[] = [];

  for (const org of orgs) {
    if (!org || typeof org.id !== "string" || !org.id) continue;
    if (!validSlug(org.slug)) continue;
    if (seen.has(org.id)) continue;
    seen.add(org.id);
    kept.push({ id: org.id, slug: org.slug });
  }

  kept.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

  return {
    systemSlug,
    orgs: kept,
    total: kept.length,
    reason: kept.length === 0 ? "no-installed-orgs" : undefined,
  };
}
