import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { discoverSystems } from "@/core/deploy/discovery";

/**
 * One repository serving both trees through subdirectories.
 *
 * A system's real and demo codebases are different and must never share a
 * folder, but they may share ONE repository as sibling directories (`real/`
 * and `demo/`). Discovery is where that layout is expressed: it decides whether
 * a system is built from the folder on disk or from a subdirectory of a shared
 * clone, and it must not break the plain layout that is already serving.
 */

function sandbox() {
  const root = mkdtempSync(join(tmpdir(), "deploy-subdir-"));
  const demoSysRoot = join(root, "demo-systems");
  const masterSysRoot = join(root, "system");
  for (const tree of [demoSysRoot, masterSysRoot]) {
    for (const slug of ["dental", "grocery"]) {
      mkdirSync(join(tree, slug), { recursive: true });
      writeFileSync(join(tree, slug, "package.json"), JSON.stringify({ name: slug }));
    }
  }
  mkdirSync(join(root, "config"), { recursive: true });
  return { root, demoSysRoot, masterSysRoot };
}

function writeConfig(root: string, config: unknown) {
  writeFileSync(join(root, "config", "deploy.json"), JSON.stringify(config));
}

describe("subdirectory layout (one repo, real/ and demo/)", () => {
  it("keeps the on-disk folder until the clone exists", () => {
    const { root, demoSysRoot, masterSysRoot } = sandbox();
    writeConfig(root, {
      cloneRoot: ".data/deploy/repos",
      repos: { dental: "owner/dental" },
      subdirs: { real: "real", demo: "demo" },
    });

    const systems = discoverSystems({ repoRoot: root, demoSysRoot, masterSysRoot });
    const real = systems.find((s) => s.id === "real:dental")!;

    // The clone has not been created yet: the existing folder stays the target,
    // so switching to the clone layout cannot break a running system.
    expect(real.localPath).toBe(join(masterSysRoot, "dental"));
    expect(real.subdir).toBeNull();
    expect(real.clonePath).toBe(join(root, ".data", "deploy", "repos", "dental"));
    rmSync(root, { recursive: true, force: true });
  });

  it("builds from <clone>/<subdir> once the clone exists", () => {
    const { root, demoSysRoot, masterSysRoot } = sandbox();
    writeConfig(root, {
      cloneRoot: ".data/deploy/repos",
      repos: { dental: "owner/dental" },
      subdirs: { real: "real", demo: "demo" },
    });

    // Simulate the clone having been made: a working tree at the clone path.
    const clonePath = join(root, ".data", "deploy", "repos", "dental");
    mkdirSync(join(clonePath, ".git"), { recursive: true });
    mkdirSync(join(clonePath, "real"), { recursive: true });
    mkdirSync(join(clonePath, "demo"), { recursive: true });

    const systems = discoverSystems({ repoRoot: root, demoSysRoot, masterSysRoot });
    const real = systems.find((s) => s.id === "real:dental")!;
    const demo = systems.find((s) => s.id === "demo:dental")!;

    expect(real.localPath).toBe(join(clonePath, "real"));
    expect(demo.localPath).toBe(join(clonePath, "demo"));
    // Both share one checkout, but never one folder.
    expect(real.clonePath).toBe(demo.clonePath);
    expect(real.localPath).not.toBe(demo.localPath);
    rmSync(root, { recursive: true, force: true });
  });

  it("uses the kind name as the subdir by default (no subdirs map)", () => {
    const { root, demoSysRoot, masterSysRoot } = sandbox();
    writeConfig(root, { cloneRoot: "repos", repos: { grocery: "owner/grocery" } });
    // The default subdir only applies once the clone exists.
    mkdirSync(join(root, "repos", "grocery", ".git"), { recursive: true });

    const systems = discoverSystems({ repoRoot: root, demoSysRoot, masterSysRoot });
    expect(systems.find((s) => s.id === "real:grocery")?.subdir).toBe("real");
    expect(systems.find((s) => s.id === "demo:grocery")?.subdir).toBe("demo");
    rmSync(root, { recursive: true, force: true });
  });

  it("leaves an unmapped system with no subdir and its own folder", () => {
    const { root, demoSysRoot, masterSysRoot } = sandbox();
    writeConfig(root, { cloneRoot: "repos", repos: { dental: "owner/dental" } });

    const systems = discoverSystems({ repoRoot: root, demoSysRoot, masterSysRoot });
    const unmapped = systems.find((s) => s.id === "real:grocery")!;

    expect(unmapped.repo).toBeNull();
    expect(unmapped.subdir).toBeNull();
    expect(unmapped.localPath).toBe(join(masterSysRoot, "grocery"));
    rmSync(root, { recursive: true, force: true });
  });
});

describe("plain layout is unchanged when no cloneRoot is configured", () => {
  it("points localPath at the tree folder and leaves subdir null", () => {
    const { root, demoSysRoot, masterSysRoot } = sandbox();
    writeConfig(root, { repos: { dental: "owner/dental", grocery: "owner/grocery" } });

    const systems = discoverSystems({ repoRoot: root, demoSysRoot, masterSysRoot });
    const real = systems.find((s) => s.id === "real:dental")!;

    expect(real.localPath).toBe(join(masterSysRoot, "dental"));
    expect(real.subdir).toBeNull();
    expect(real.repoPath).toBe("system/dental");
    expect(existsSync(real.localPath)).toBe(true);
    rmSync(root, { recursive: true, force: true });
  });
});
