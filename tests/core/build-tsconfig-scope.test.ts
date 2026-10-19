import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * `next build` type-checks the whole project, which means it type-checks
 * `tests/**` as if the tests were application code. That is a category error:
 * the build produces a server and a bundle, and no test file ships in either.
 *
 * It matters here because `system/grocery` in this tree is a pre-mount-awareness
 * snapshot, so four template guard tests (`grocery-pwa`, `grocery-mounted-urls`,
 * `grocery-nav-perf`, `grocery-sw`) cannot pass — and their six TypeScript errors
 * made an otherwise clean application build fail outright, which is what kept
 * the platform pinned to `next dev` and ~15 MB of unminified JavaScript.
 *
 * The fix is to check a different set of files, never to check them less
 * strictly. These assertions hold both halves of that:
 *
 *  - the build config is scoped by `typescript.tsconfigPath`, which is Next's
 *    documented mechanism (and distinct from `ignoreBuildErrors`, which skips
 *    type-checking entirely);
 *  - it may not relax a single compiler option, so a build can never be looser
 *    than the configuration the editor and `npm run typecheck` use.
 *
 * `npm run typecheck` still runs against the root `tsconfig.json` and still
 * reports those six errors. Nothing here is meant to silence them; it stops the
 * application build from being held hostage by them.
 */

const ROOT = process.cwd();
const read = (name: string): string => readFileSync(join(ROOT, name), "utf8");

/**
 * tsconfig is JSONC. A regex cannot strip it safely: `"@/*": ["./src/*"]` puts
 * a block-comment opener inside a string, so a naive `/\/\*[\s\S]*?\*\//` eats
 * real config. This walks the file tracking string state instead.
 */
const parseTsconfig = (name: string): Record<string, unknown> => {
  const source = read(name);
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      out += "\n";
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i++;
      continue;
    }
    out += ch;
  }

  return JSON.parse(out) as Record<string, unknown>;
};

const excludeOf = (config: Record<string, unknown>): string[] =>
  (config.exclude as string[] | undefined) ?? [];

describe("the production build's TypeScript scope", () => {
  it("has its own config file, so the split is explicit rather than a flag", () => {
    expect(existsSync(join(ROOT, "tsconfig.build.json"))).toBe(true);
    expect(() => parseTsconfig("tsconfig.build.json")).not.toThrow();
  });

  it("reads the root config's strings intact, not just its comments", () => {
    // `@/*` and `./src/*` put a comment opener inside a string. A stripper that
    // does not track string state returns a config missing its path alias, and
    // every later assertion in this file would then be comparing garbage.
    const compilerOptions = parseTsconfig("tsconfig.json").compilerOptions as Record<string, unknown>;
    const paths = compilerOptions.paths as Record<string, string[]>;
    expect(paths["@/*"]).toEqual(["./src/*"]);
  });

  it("extends the root config rather than restating it, so the two cannot drift", () => {
    expect(parseTsconfig("tsconfig.build.json").extends).toBe("./tsconfig.json");
  });

  it("keeps out of the build every tree the root config already keeps out", () => {
    // `exclude` replaces the base list outright instead of merging into it, so a
    // tree added to the root's `exclude` is silently type-checked by the build
    // unless it is repeated here. Compared by coverage rather than by exact
    // string: Next normalises these entries on every build (`system/grocery`
    // and `system/dental` collapse into `system`), and asserting the literal
    // text would make this test fail for a reason nobody chose.
    const root = excludeOf(parseTsconfig("tsconfig.json"));
    const build = excludeOf(parseTsconfig("tsconfig.build.json"));
    expect(root.length).toBeGreaterThan(0);
    for (const entry of root) {
      const covered = build.some((candidate) => candidate === entry || entry.startsWith(`${candidate}/`));
      expect(covered, `build type-checks ${entry}, which the root keeps out`).toBe(true);
    }
  });

  it("keeps the whole of system/ out, which is wider than the root and deliberately so", () => {
    // Next collapses the root's two entries into their parent directory, and the
    // build config matches it. That leaves `system/HR` out of the build where
    // the root named only grocery and dental - a widening, not a narrowing, so
    // it cannot hide an error in code that ships. It is also the direction this
    // repo already documents as intended: `system/**` is customer-owned template
    // source, and PROJECT_MAP records the goal of taking it out of the platform's
    // gates. Stated here so the next reader meets it as a decision.
    expect(excludeOf(parseTsconfig("tsconfig.build.json"))).toContain("system");
  });

  it("excludes the test suite, which is the entire point of the file", () => {
    expect(excludeOf(parseTsconfig("tsconfig.build.json"))).toContain("tests");
  });

  it("may not override a single compiler option, so the build is never laxer", () => {
    // Inheriting via `extends` and changing nothing is what makes this a change
    // of *scope* rather than a change of *strictness*.
    expect(parseTsconfig("tsconfig.build.json").compilerOptions).toBeUndefined();
  });

  it("keeps the whole `system/` tree out of scope, so a dropped-in system cannot fail the platform", () => {
    // A folder under `system/` is customer-owned code with its own toolchain: a
    // Next app the runtime clones and builds as a separate process. Excluding it
    // by slug (`system/grocery`, `system/dental`) only covers the systems that
    // existed when the entry was written. A new one is then type-checked as
    // platform code, and one type error in it fails `tsc --noEmit` and the
    // production build alike — which is the platform going down over a system.
    // `eslint.config.mjs` and `outputFileTracingExcludes` already exclude
    // `system/**` wholesale; the TypeScript scope has to match both of them.
    for (const name of ["tsconfig.json", "tsconfig.build.json"]) {
      expect(excludeOf(parseTsconfig(name)), name).toContain("system");
    }
  });
});

describe("next.config.ts wiring", () => {
  const config = read("next.config.ts");

  it("points Next at the scoped config through typescript.tsconfigPath", () => {
    expect(config).toMatch(/tsconfigPath:\s*isDev\s*\?\s*"tsconfig\.json"\s*:\s*"tsconfig\.build\.json"/);
  });

  it("leaves the dev server on the root config, where the tests stay visible", () => {
    // Next only watches `tsconfig.json` in development, and an editor reads it
    // too, so `next dev` must keep the unscoped file or the four guard tests
    // would vanish from both without anybody noticing.
    expect(config).toContain("const isDev = process.env.NODE_ENV");
  });

  it("does not take the shortcut of disabling the type-check", () => {
    expect(config).not.toMatch(/ignoreBuildErrors:\s*true/);
  });
});
