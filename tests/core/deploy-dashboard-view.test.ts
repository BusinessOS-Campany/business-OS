import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { stateFilePath } from "./helpers/deploy-state";

/**
 * The data the deploy console renders.
 *
 * The page itself is a thin server component over `adminSystemViews`; what can
 * actually be wrong is the data it is handed. These assertions pin the three
 * things a reader of the screen depends on:
 *
 *   - demo and real systems are separated and never merged,
 *   - a system that has never been deployed says so rather than looking live,
 *   - the duration and over-budget flag reflect the recorded clock.
 *
 * The registry is the only input; no rendering is involved, so this stays a
 * fast unit test rather than a JSX snapshot that breaks on every style tweak.
 */

const STATE = stateFilePath();

const sandbox = mkdtempSync(join(tmpdir(), "deploy-view-"));
for (const [tree, slug] of [
  ["demo-systems", "clinicos"],
  ["demo-systems", "grocery"],
  ["system", "clinicos"],
  ["system", "dental"],
] as const) {
  mkdirSync(join(sandbox, tree, slug), { recursive: true });
  writeFileSync(join(sandbox, tree, slug, "package.json"), JSON.stringify({ name: slug }));
}

afterAll(() => rmSync(sandbox, { recursive: true, force: true }));

const { adminSystemViews } = await import("@/core/deploy/orchestrator");
const { reconcile, resetRegistryCache, patchRecord } = await import("@/core/deploy/store");
const { discoverSystems } = await import("@/core/deploy/discovery");
const { overBudgetReason } = await import("@/core/deploy/executor");

beforeEach(async () => {
  resetRegistryCache();
  await reconcile(
    discoverSystems({
      repoRoot: sandbox,
      demoSysRoot: join(sandbox, "demo-systems"),
      masterSysRoot: join(sandbox, "system"),
    }),
    STATE,
  );
});

describe("adminSystemViews", () => {
  it("discovers both trees and keeps demo distinct from real", () => {
    const views = adminSystemViews();
    const ids = views.map((v) => v.id).sort();

    expect(ids).toEqual(["demo:clinicos", "demo:grocery", "real:clinicos", "real:dental"]);
    // `clinicos` exists in both trees, and the two must remain two rows.
    expect(ids.filter((id) => id.endsWith(":clinicos")).length).toBe(2);
  });

  it("reports a never-deployed system honestly, not as live", () => {
    const view = adminSystemViews().find((v) => v.id === "demo:grocery")!;
    expect(view.deployedCommit).toBeNull();
    expect(view.deployedAt).toBeNull();
    expect(view.lastDurationSeconds).toBeNull();
    expect(view.updateAvailable).toBe(false);
    expect(view.status).not.toBe("live");
  });

  it("flags an available update when the remote commit differs from the deployed one", async () => {
    await patchRecord("real:dental", { deployedCommit: "aaa", remoteCommit: "bbb" }, STATE);
    const view = adminSystemViews().find((v) => v.id === "real:dental")!;
    expect(view.updateAvailable).toBe(true);
  });

  it("does not flag an update when remote equals deployed", async () => {
    await patchRecord("real:dental", { deployedCommit: "same", remoteCommit: "same" }, STATE);
    const view = adminSystemViews().find((v) => v.id === "real:dental")!;
    expect(view.updateAvailable).toBe(false);
  });

  it("carries the Arabic and English labels the table renders", () => {
    const view = adminSystemViews().find((v) => v.id === "real:dental")!;
    // dental has a curated label; both are present so the UI never falls back.
    expect(view.nameAr).toBe("نظام عيادة الأسنان");
    expect(view.nameEn).toBe("Dental Clinic");
  });
});

describe("the over-budget flag the duration column shows", () => {
  it("stays silent under three minutes", () => {
    expect(overBudgetReason({ pullMs: 2000, buildMs: 40000, verifyMs: 1000, totalMs: 43000 })).toBeNull();
  });

  it("names the slow step once past three minutes", () => {
    const reason = overBudgetReason({
      pullMs: 3000,
      buildMs: 200000,
      verifyMs: 2000,
      totalMs: 205000,
    });
    expect(reason).not.toBeNull();
    expect(reason).toContain("build");
  });
});
