import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * A private registry path for one deploy test file.
 *
 * The deploy modules read `DEPLOY_STATE_PATH` and `DEPLOY_DELIVERIES_PATH` from
 * the environment, so a suite that points those at a temp directory gets an
 * isolated registry without touching the operator's `.data/deploy`. Set at import
 * time — before any deploy module reads the env — and returned so the test can
 * assert against the same file the module writes.
 */
export function stateFilePath(): string {
  const dir = mkdtempSync(join(tmpdir(), "deploy-state-"));
  const registry = join(dir, "registry.json");
  const deliveries = join(dir, "deliveries.jsonl");
  process.env.DEPLOY_STATE_PATH = registry;
  process.env.DEPLOY_DELIVERIES_PATH = deliveries;
  return registry;
}

/** The path `stateFilePath` set as the deliveries file, for delivery tests. */
export function deliveriesFilePath(): string {
  return process.env.DEPLOY_DELIVERIES_PATH!;
}
