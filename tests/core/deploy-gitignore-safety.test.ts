import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The `.gitignore` rules that keep customer data out of GitHub.
 *
 * This is the highest-severity rule in the whole deployment design. GitHub
 * becomes the source of truth for code, and the same `git add -A` that publishes
 * a one-line fix will happily publish a `pg_dump` of a live customer database if
 * a pattern is missing. That is not recoverable: a pushed secret is compromised
 * the moment it lands, even in a private repo, because history is forever.
 *
 * The rules are asserted here rather than trusted to review because the failure
 * mode is silent and the cost is unrecoverable. `git check-ignore` is used — the
 * same code path `git add` consults — so the test proves the rule works, not
 * merely that a line of text exists.
 *
 * Found live during the initial import: `databases/*.sql` was ignored but
 * `databases/pgdumps/*.dump` was not, and `git add -A` was about to commit 12.5 MB
 * of every organisation's database.
 */

const GIT = process.env.GIT_BINARY?.trim() || "git";
const ROOT = process.cwd();

/** True when git considers `path` ignored. */
function isIgnored(path: string): boolean {
  try {
    execFileSync(GIT, ["check-ignore", "-q", path], { cwd: ROOT, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("customer data can never be committed", () => {
  it("ignores every pg_dump archive", () => {
    expect(isIgnored("databases/pgdumps/org_gmsnow.dump")).toBe(true);
    expect(isIgnored("databases/pgdumps/businessos.dump")).toBe(true);
    expect(isIgnored("databases/pgdumps/_globals.sql")).toBe(true);
  });

  it("ignores loose SQL dumps under databases/", () => {
    expect(isIgnored("databases/grocery.sql")).toBe(true);
  });

  it("ignores the backups folder", () => {
    expect(isIgnored("backups/public-data-2026.sql")).toBe(true);
  });

  it("ignores per-org system clones", () => {
    // A customer's own copy of a system lives here, with their config and data.
    expect(isIgnored("orginazition/gmsnow/systems/dental/package.json")).toBe(true);
  });

  it("ignores uploaded files in every tree", () => {
    expect(isIgnored("system/dental/serverdata/uploads/patient.png")).toBe(true);
    expect(isIgnored("demo-systems/dental/serverdata/uploads/imaging/x.png")).toBe(true);
  });
});

describe("secrets can never be committed", () => {
  it("ignores real env files at the root", () => {
    expect(isIgnored(".env")).toBe(true);
    expect(isIgnored(".env.local")).toBe(true);
    expect(isIgnored(".env.production")).toBe(true);
  });

  it("ignores env files inside the system trees", () => {
    expect(isIgnored("system/dental/.env")).toBe(true);
    expect(isIgnored("demo-systems/clinicos/.env.local")).toBe(true);
  });

  it("ignores private keys", () => {
    expect(isIgnored("deploy-key.pem")).toBe(true);
  });

  it("still tracks .env.example as a template", () => {
    // Templates document the variables without carrying values; they must be
    // committable or a fresh clone has no idea what to set.
    expect(isIgnored(".env.example")).toBe(false);
  });
});

describe("the deploy registry is local state, not source", () => {
  it("ignores .data, which holds registry.json", () => {
    expect(isIgnored(".data/deploy/registry.json")).toBe(true);
  });
});

describe("build output is never committed", () => {
  it("ignores .next and its backups", () => {
    expect(isIgnored(".next/BUILD_ID")).toBe(true);
    expect(isIgnored(".next-prev/BUILD_ID")).toBe(true);
    expect(isIgnored(".next-pwa-bak/BUILD_ID")).toBe(true);
    expect(isIgnored("demo-systems/clinicos/.next/BUILD_ID")).toBe(true);
    expect(isIgnored("demo-systems/clinicos/.next-prev/BUILD_ID")).toBe(true);
  });

  it("ignores node_modules in every tree", () => {
    expect(isIgnored("node_modules/react/package.json")).toBe(true);
    expect(isIgnored("system/dental/node_modules/react/package.json")).toBe(true);
  });
});

describe("source IS committed", () => {
  it("does not ignore the code the deployer builds", () => {
    expect(isIgnored("src/core/deploy/executor.ts")).toBe(false);
    expect(isIgnored("system/dental/package.json")).toBe(false);
    expect(isIgnored("demo-systems/grocery/package.json")).toBe(false);
    expect(isIgnored("system/dental/prisma/migrations/20260101000000_init/migration.sql")).toBe(false);
  });
});

describe("the ignore file explains the dangerous rules", () => {
  it("documents why dumps are excluded, so a future edit thinks twice", () => {
    const text = readFileSync(join(ROOT, ".gitignore"), "utf-8");
    // A rule with no reason is a rule someone deletes to make `git status` tidy.
    expect(text).toMatch(/pgdump/i);
    expect(text).toContain("databases/pgdumps/");
  });
});
