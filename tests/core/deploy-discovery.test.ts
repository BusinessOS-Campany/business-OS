import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, describe, expect, it } from "vitest";
import { discoverSystems } from "@/core/deploy/discovery";

/**
 * Discovery, tested against a sandbox tree rather than the live repo.
 *
 * The rules that matter are the negative ones — a folder with no `package.json`
 * is not a system, the two trees never merge into one entry, a re-run is
 * idempotent — and those cannot be asserted against the real repo without
 * either depending on its current contents or mutating it.
 */

const sandbox = mkdtempSync(join(tmpdir(), "deploy-discovery-"));
const demoSysRoot = join(sandbox, "demo-systems");
const masterSysRoot = join(sandbox, "system");

/** Creates `<root>/<slug>/package.json` (or a bare folder when `pkg` is false). */
function makeSystem(root: string, slug: string, pkg = true): void {
  const dir = join(root, slug);
  mkdirSync(dir, { recursive: true });
  if (pkg) writeFileSync(join(dir, "package.json"), JSON.stringify({ name: slug, version: "1.0.0" }));
  writeFileSync(join(dir, "README.md"), `# ${slug}`);
}

mkdirSync(join(demoSysRoot, "grocery"), { recursive: true });
mkdirSync(join(masterSysRoot, "grocery"), { recursive: true });
makeSystem(demoSysRoot, "grocery");
makeSystem(demoSysRoot, "clinicos");
makeSystem(masterSysRoot, "grocery");
makeSystem(masterSysRoot, "clinicos");
// A folder with no package.json: a notes dir, or a half-copied tree.
mkdirSync(join(masterSysRoot, "HR"), { recursive: true });
writeFileSync(join(masterSysRoot, "HR", "notes.md"), "# Human Resources");
// A directory that must never be seen as a system even with a package.json.
mkdirSync(join(demoSysRoot, "node_modules"), { recursive: true });
writeFileSync(join(demoSysRoot, "node_modules", "package.json"), "{}");

afterAll(() => rmSync(sandbox, { recursive: true, force: true }));

const systems = discoverSystems({ repoRoot: sandbox, demoSysRoot, masterSysRoot });
const byId = new Map(systems.map((s) => [s.id, s]));

describe("discoverSystems", () => {
  it("finds every system in both trees", () => {
    expect(systems.map((s) => s.id).sort()).toEqual([
      "demo:clinicos",
      "demo:grocery",
      "real:clinicos",
      "real:grocery",
    ]);
  });

  it("keeps demo and real as separate entries for the same slug", () => {
    const demo = byId.get("demo:clinicos");
    const real = byId.get("real:clinicos");
    expect(demo).toBeDefined();
    expect(real).toBeDefined();
    expect(demo!.localPath).not.toBe(real!.localPath);
    expect(demo!.id).not.toBe(real!.id);
  });

  it("points each entry at its own tree on disk", () => {
    expect(byId.get("demo:grocery")!.localPath).toBe(join(demoSysRoot, "grocery"));
    expect(byId.get("real:grocery")!.localPath).toBe(join(masterSysRoot, "grocery"));
  });

  it("derives a forward-slashed repo path and a watch glob", () => {
    expect(byId.get("demo:grocery")!.repoPath.endsWith("demo-systems/grocery")).toBe(true);
    expect(byId.get("demo:grocery")!.watchPaths).toEqual([
      `${byId.get("demo:grocery")!.repoPath}/**`,
    ]);
  });

  it("skips a folder with no package.json", () => {
    expect(systems.some((s) => s.slug === "HR")).toBe(false);
    expect(byId.has("real:HR")).toBe(false);
  });

  it("never treats node_modules as a system", () => {
    expect(systems.some((s) => s.slug === "node_modules")).toBe(false);
  });

  it("gives each system a production branch", () => {
    for (const system of systems) {
      expect(system.productionBranch).toBe("main");
    }
  });

  it("labels systems in both languages", () => {
    expect(byId.get("demo:clinicos")!.nameAr).toBe("نظام إدارة العيادات");
    expect(byId.get("real:clinicos")!.nameEn).toBe("Clinic Management System");
  });

  it("is idempotent — a second run yields identical ids", () => {
    const again = discoverSystems({ repoRoot: sandbox, demoSysRoot, masterSysRoot });
    expect(again.map((s) => s.id)).toEqual(systems.map((s) => s.id));
  });

  it("returns nothing when a tree is absent, rather than throwing", () => {
    const empty = discoverSystems({
      repoRoot: sandbox,
      demoSysRoot: join(sandbox, "does-not-exist"),
      masterSysRoot: join(sandbox, "also-missing"),
    });
    expect(empty).toEqual([]);
  });
});
