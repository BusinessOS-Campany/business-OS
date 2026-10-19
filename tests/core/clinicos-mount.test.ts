import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * The app is only ever served from a mount (next.config's `basePath`):
 * `/demo/clinicos` for the platform demo, `/{org}/clinicos` for an
 * organization's own copy. Two things break when that is forgotten, and both
 * did:
 *
 * 1. Next prefixes the basePath to every middleware matcher, so a lone
 *    catch-all `/((?!api|…).*)` becomes `<basePath>/((?!api|…).*)` and insists
 *    on a slash after the mount. The mount root therefore never reached the
 *    next-intl middleware, was never rewritten to its locale, matched no route
 *    and answered 404 — which is also the PWA's `start_url`. Next expands a
 *    matcher of exactly `/` to the index forms while keeping the basePath, so
 *    the root has to be listed next to the catch-all.
 * 2. Next rewrites `next/link`, `redirect()` and `next/image`, but nothing
 *    normalizes a URL the app builds by hand. A `fetch("/api/…")` or a raw
 *    `<a href="/…">` resolves against the *origin root*, so it leaves the mount
 *    and hits the platform (404, or the platform's own page).
 */
const TREES: ReadonlyArray<readonly [string, string]> = [
  ["demo", join(__dirname, "..", "..", "demo-systems", "clinicos")],
  ["template", join(__dirname, "..", "..", "system", "clinicos")],
];

const read = (root: string, ...parts: string[]) => readFileSync(join(root, ...parts), "utf8");

function sourceFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) files.push(full);
    }
  };
  walk(join(root, "src"));
  return files;
}

/** Every `path:line: text` whose line matches `pattern`. */
function offenders(root: string, pattern: RegExp): string[] {
  const hits: string[] = [];
  for (const file of sourceFiles(root)) {
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .forEach((line, index) => {
        if (pattern.test(line)) {
          hits.push(`${relative(root, file).split("\\").join("/")}:${index + 1}: ${line.trim()}`);
        }
      });
  }
  return hits;
}

describe("the mount root reaches the locale middleware", () => {
  for (const [label, root] of TREES) {
    it(`${label}: lists "/" alongside the catch-all`, () => {
      const source = read(root, "src", "proxy.ts");
      // Still next-intl's middleware, not a hand-rolled auth gate.
      expect(source).toContain("createMiddleware(routing)");
      // `/` first, so the root is matched before the catch-all is considered.
      expect(source).toMatch(/matcher:\s*\[\s*"\/"\s*,/);
      expect(source).toContain("(?!api|_next|_vercel");
    });
  }

  it("keeps both trees on the same matcher", () => {
    expect(read(TREES[0][1], "src", "proxy.ts")).toBe(read(TREES[1][1], "src", "proxy.ts"));
  });
});

describe("hand-built URLs stay inside the mount", () => {
  for (const [label, root] of TREES) {
    it(`${label}: builds API calls through mountedHref`, () => {
      expect(offenders(root, /fetch\(\s*[`"]\//).sort()).toEqual([]);
    });

    it(`${label}: writes no raw root-relative anchor`, () => {
      expect(offenders(root, /<a\s[^>]*href="\//).sort()).toEqual([]);
    });

    it(`${label}: routes the report export through the mount`, () => {
      const button = read(root, "src", "components", "reports", "report-download-button.tsx");
      expect(button).toContain("mountedHref(");
    });

    it(`${label}: declares its manifest through the mount`, () => {
      // Next does not prefix metadata, so a bare /manifest.webmanifest is
      // fetched from the platform root and the app is never installable.
      const layout = read(root, "src", "app", "[locale]", "layout.tsx");
      expect(layout).toContain('manifest: mountedHref("/manifest.webmanifest")');
    });
  }
});
