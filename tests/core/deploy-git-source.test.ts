import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  currentCommitFor,
  fetchAndFastForward,
  headCommit,
  isClean,
  isGitRepo,
  redactRemote,
  repoRootOf,
} from "@/core/deploy/git-source";

/**
 * The git-source module against a real repository.
 *
 * Mocking git here would prove nothing: the safety properties under test are
 * git's own (a fast-forward refuses to overwrite divergent history, a clean-tree
 * check notices an edit), and the only way to know they hold is to make git do
 * it. The test builds two clones of a tiny repo — one standing in for "GitHub",
 * one for "this machine" — and pushes between them.
 */

const sandbox = mkdtempSync(join(tmpdir(), "deploy-git-"));
const upstream = join(sandbox, "upstream.git");
const origin = join(sandbox, "origin");
const local = join(sandbox, "local");

/** The git executable the tests drive. */
const GIT = process.env.GIT_BINARY?.trim() || "git";

/** Runs git and returns stdout, failing the test on a non-zero exit. */
function git(args: string[], cwd: string): string {
  return execFileSync(GIT, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

beforeAll(() => {
  git(["init", "--bare", upstream], sandbox);
  mkdirSync(origin, { recursive: true });
  git(["init", "-b", "main"], origin);
  git(["config", "user.email", "test@example.com"], origin);
  git(["config", "user.name", "Test"], origin);
  writeFileSync(join(origin, "app.txt"), "one\n");
  git(["add", "."], origin);
  git(["commit", "-m", "first"], origin);
  git(["remote", "add", "origin", upstream], origin);
  git(["push", "-u", "origin", "main"], origin);

  // The "machine": a clone of the same remote.
  git(["clone", upstream, local], sandbox);
  git(["config", "user.email", "test@example.com"], local);
  git(["config", "user.name", "Test"], local);
});

afterAll(() => rmSync(sandbox, { recursive: true, force: true }));

/** Pushes a new commit to upstream and returns its SHA. */
function pushCommit(file: string, content: string, message: string): string {
  writeFileSync(join(origin, file), content);
  git(["add", "."], origin);
  git(["commit", "-m", message], origin);
  git(["push", "origin", "main"], origin);
  return git(["rev-parse", "HEAD"], origin).trim();
}

describe("repo detection", () => {
  it("recognises a working tree", async () => {
    expect(await isGitRepo(local)).toBe(true);
    expect(await isGitRepo(sandbox)).toBe(false);
  });

  it("finds the repo root from a subdirectory", async () => {
    const sub = join(local, "src");
    mkdirSync(sub, { recursive: true });
    expect(await repoRootOf(sub)).toBe(await repoRootOf(local));
  });

  it("returns null for a folder that is not a repo", async () => {
    expect(await currentCommitFor(sandbox)).toBeNull();
    expect(await repoRootOf(sandbox)).toBeNull();
  });
});

describe("fast-forward deploy", () => {
  it("advances the tree to a pushed commit", async () => {
    const before = await headCommit(local);
    const target = pushCommit("app.txt", "two\n", "second");
    expect(target).not.toBe(before);

    const result = await fetchAndFastForward(local, target);
    expect(result.ok).toBe(true);
    expect(result.commit).toBe(target);
    expect(await headCommit(local)).toBe(target);
  });

  it("is a no-op when already at the target", async () => {
    const current = (await headCommit(local))!;
    const result = await fetchAndFastForward(local, current);
    expect(result.ok).toBe(true);
    expect(result.alreadyAtTarget).toBe(true);
  });

  it("refuses a commit that does not exist upstream", async () => {
    const result = await fetchAndFastForward(local, "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("is not in");
  });

  it("refuses to move a tree with uncommitted changes", async () => {
    const target = pushCommit("app.txt", "three\n", "third");
    // Make the local tree dirty, standing in for an edit not yet pushed.
    writeFileSync(join(local, "app.txt"), "local edit that must survive\n");

    const result = await fetchAndFastForward(local, target);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("uncommitted changes");
    // Crucially: the local edit is still there.
    const { readFileSync } = await import("node:fs");
    expect(readFileSync(join(local, "app.txt"), "utf8")).toContain("local edit that must survive");
  });

  it("recovers once the tree is clean again", async () => {
    git(["checkout", "--", "app.txt"], local);
    expect(await isClean(local)).toBe(true);

    const target = pushCommit("app.txt", "four\n", "fourth");
    const result = await fetchAndFastForward(local, target);
    expect(result.ok).toBe(true);
    expect(result.commit).toBe(target);
  });

  it("does NOT treat an untracked build artifact as a dirty tree", async () => {
    // The regression this pins: a system's own build writes artifacts into the
    // folder. If those read as "dirty", the system deploys once and then refuses
    // every later commit — the exact bug that made this rule necessary.
    writeFileSync(join(local, "built-output.txt"), "produced by a build\n");
    expect(await isClean(local)).toBe(true);

    const target = pushCommit("app.txt", "six\n", "sixth");
    const result = await fetchAndFastForward(local, target);
    expect(result.ok).toBe(true);
    expect(result.commit).toBe(target);
  });

  it("refuses to rewind history that local commits depend on", async () => {
    // A local commit ahead of upstream: a legitimately unpushed change.
    writeFileSync(join(local, "local-only.txt"), "mine\n");
    git(["add", "."], local);
    git(["commit", "-m", "local work"], local);
    const localHead = (await headCommit(local))!;

    // A different commit lands upstream; the two have diverged.
    const target = pushCommit("app.txt", "five\n", "fifth");
    const result = await fetchAndFastForward(local, target);

    expect(result.ok).toBe(false);
    // The local commit is intact — a webhook never reset it away.
    expect(await headCommit(local)).toBe(localHead);
    // Clean up for no later test.
    git(["reset", "--hard", target], local);
  });
});

describe("credential safety", () => {
  it("redacts an embedded token from a remote URL", () => {
    expect(redactRemote("https://x-access-token:ghs_SECRET@github.com/o/r.git")).toBe(
      "https://***@github.com/o/r.git",
    );
    expect(redactRemote("https://github.com/o/r.git")).toBe("https://github.com/o/r.git");
    expect(redactRemote(null)).toBeNull();
  });
});
