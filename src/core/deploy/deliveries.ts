import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Webhook delivery idempotency.
 *
 * GitHub retries a delivery that did not answer 2xx quickly enough, and it can
 * also send the same push twice while a load balancer replays a request. Without
 * a record of what has already been handled, a retry starts a second build of
 * the same commit — the exact "rebuilt a system that did not change" cost the
 * three-minute budget cannot afford.
 *
 * The key is `X-GitHub-Delivery`, GitHub's per-delivery UUID, not the commit
 * SHA. Two different deliveries can legitimately carry the same commit (a
 * force-push back to a previous state, a branch reset), and each must be
 * processed; a retry reuses the delivery id, and that is what is dropped.
 *
 * Stored as a line-delimited JSON file under `.data/deploy/`, pruned by age, so
 * the store stays small and needs no new database table or dependency.
 */

/** How long a delivery id is remembered. Long enough to cover every retry. */
export const DELIVERY_TTL_MS = 24 * 60 * 60_000;

/** Cap on remembered deliveries, so a burst cannot grow the file unbounded. */
export const MAX_DELIVERIES = 5_000;

export interface DeliveryRecord {
  id: string;
  receivedAt: number;
  event: string;
  commit: string | null;
  systems: string[];
}

export function deliveriesPath(repoRoot: string = process.cwd()): string {
  const configured = process.env.DEPLOY_DELIVERIES_PATH?.trim();
  return configured ? configured : join(repoRoot, ".data", "deploy", "deliveries.jsonl");
}

function readAll(file: string): DeliveryRecord[] {
  try {
    if (!existsSync(file)) return [];
    return readFileSync(file, "utf-8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        try {
          return JSON.parse(line) as DeliveryRecord;
        } catch {
          return null;
        }
      })
      .filter((record): record is DeliveryRecord => record !== null && typeof record.id === "string");
  } catch {
    return [];
  }
}

function writeAll(file: string, records: DeliveryRecord[]): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : ""), "utf-8");
  renameSync(tmp, file);
}

/** Drops records past the TTL and any beyond the cap, oldest first. */
export function prune(records: DeliveryRecord[], now: number = Date.now()): DeliveryRecord[] {
  const fresh = records.filter((r) => now - r.receivedAt <= DELIVERY_TTL_MS);
  if (fresh.length <= MAX_DELIVERIES) return fresh;
  return fresh.sort((a, b) => b.receivedAt - a.receivedAt).slice(0, MAX_DELIVERIES);
}

/** True when this delivery id has already been recorded. */
export function hasSeenDelivery(id: string, file: string = deliveriesPath(), now: number = Date.now()): boolean {
  if (!id) return false;
  return prune(readAll(file), now).some((record) => record.id === id);
}

/**
 * Records a delivery, returning false when it was already present.
 *
 * The check-and-insert is one call on purpose: a separate `has` then `record`
 * has a window in which two concurrent retries both pass the check and both
 * start a build.
 */
export function recordDelivery(
  record: DeliveryRecord,
  file: string = deliveriesPath(),
  now: number = Date.now(),
): boolean {
  if (!record.id) return false;
  const records = prune(readAll(file), now);
  if (records.some((r) => r.id === record.id)) return false;
  records.push(record);
  writeAll(file, prune(records, now));
  return true;
}

/** Every remembered delivery, newest first. For the admin panel's log. */
export function listDeliveries(file: string = deliveriesPath(), now: number = Date.now()): DeliveryRecord[] {
  return prune(readAll(file), now).sort((a, b) => b.receivedAt - a.receivedAt);
}

/** Test seam: forgets every delivery. */
export function clearDeliveries(file: string = deliveriesPath()): void {
  writeAll(file, []);
}
