import "@/core/config/load-env";
import { discoverRepoSystems } from "@/core/deploy/discovery";

/**
 * Prints what the deployer can see, directly from the two trees.
 *
 * The read-only companion to the deploy registry: run it to answer "which
 * systems exist, which tree owns each, and what would a push to one of them be
 * watched for?" without touching the database or GitHub.
 *
 *   npx tsx scripts/deploy-discover.ts
 */

const systems = discoverRepoSystems(process.cwd());

if (systems.length === 0) {
  console.log("no systems found — expected folders under demo-systems/ and system/");
  process.exit(0);
}

const demo = systems.filter((s) => s.kind === "demo");
const real = systems.filter((s) => s.kind === "real");

function print(label: string, rows: typeof systems): void {
  console.log(`\n${label} (${rows.length})`);
  for (const s of rows) {
    console.log(`  ${s.id.padEnd(18)} ${s.slug.padEnd(12)} branch=${s.productionBranch.padEnd(6)} ${s.repoPath}`);
    console.log(`${" ".repeat(20)}watch: ${s.watchPaths.join(", ")}`);
    console.log(`${" ".repeat(20)}dir:   ${s.localPath}`);
  }
}

console.log(`deployable systems: ${systems.length}`);
print("DEMO (served under /demo/<slug>)", demo);
print("REAL (cloned per organization under /app/<slug>)", real);

const slugsInBoth = demo
  .map((s) => s.slug)
  .filter((slug) => real.some((r) => r.slug === slug));
if (slugsInBoth.length > 0) {
  console.log(`\nnote: ${slugsInBoth.join(", ")} exist in BOTH trees as separate systems.`);
}
