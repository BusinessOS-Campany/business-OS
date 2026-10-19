import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addressableSystemSources,
  isSystemSlug,
  listSystemSources,
} from "@/core/org-vault/system-sources";

/**
 * A folder name must never be able to stop the platform from starting.
 *
 * `next.config.ts` turns every `system/<name>` folder into `/app/<name>` rewrites,
 * and Next compiles each `source` with path-to-regexp while loading the config —
 * before the app, and any try/catch of ours, exists. Measured against Next's own
 * vendored copy: `/app/foo+bar` throws `Unexpected MODIFIER` and aborts the whole
 * config load, while `/app/foo(bar)` and `/app/foo{bar}` do not throw but compile
 * a group that also matches `/app/foobar`.
 *
 * So a system is allowed to be wrong; the platform is not allowed to go down with
 * it. A folder whose name cannot be a route segment still counts as a system —
 * it is listed, cloned and shown in the catalog — it simply gets no rewrite, which
 * is why the filter lives at the config boundary and not in discovery.
 */

const SAFE = ["grocery", "dental", "hr", "sama-center", "my.app", "my_sys", "a1"];
const UNSAFE = [
  "foo+bar", // throws: Unexpected MODIFIER
  "foo(bar)", // compiles a group: also matches /app/foobar
  "foo{bar}", // compiles a group: also matches /app/foobar
  "foo[bar]",
  "foo*bar",
  "foo?bar",
  "foo:bar",
  "foo bar",
  "foo#bar",
  "foo/bar",
  "",
];

describe("isSystemSlug", () => {
  it("addresses ordinary folder names", () => {
    for (const slug of SAFE) expect(isSystemSlug(slug), slug).toBe(true);
  });

  it("refuses names that carry route-pattern syntax", () => {
    for (const slug of UNSAFE) expect(isSystemSlug(slug), slug).toBe(false);
  });
});

describe("addressableSystemSources", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "system-slug-"));
  const sourceRoot = join(sandbox, "system");
  const previous = process.env.SYSTEM_SOURCE_PATH;

  function writeSystem(name: string) {
    const dir = join(sourceRoot, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name }));
  }

  beforeAll(() => {
    writeSystem("grocery");
    writeSystem("foo+bar");
    process.env.SYSTEM_SOURCE_PATH = sourceRoot;
  });

  afterAll(() => {
    if (previous === undefined) delete process.env.SYSTEM_SOURCE_PATH;
    else process.env.SYSTEM_SOURCE_PATH = previous;
    rmSync(sandbox, { recursive: true, force: true });
  });

  it("still lists the unsafe folder, so the catalog can report it", () => {
    expect(listSystemSources()).toContain("grocery");
    expect(listSystemSources()).toContain("foo+bar");
  });

  it("drops the unsafe folder from the tables the config builds", () => {
    expect(addressableSystemSources()).toContain("grocery");
    expect(addressableSystemSources()).not.toContain("foo+bar");
  });
});
