import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The runtime split inside `src/instrumentation.ts`, asserted on source.
 *
 * Next calls `register` in **both** compilers — the Node server and the edge
 * server — so the hook, and everything it can reach, has to be legal in both.
 * The supervisor is not: it spawns processes, reads the filesystem and pulls in
 * `pg` for the org vault. The edge compiler is handed no externals for the Node
 * runtime (`handleWebpackExternalForEdgeRuntime` only covers the `middleware`
 * and `apiEdge` layers), so resolving `pg` there fails the whole dev server —
 * every dynamic route answers 500 with `Module not found: Can't resolve 'fs'`,
 * raised by `pg-connection-string`.
 *
 * Two shapes look equivalent and are not:
 *
 *     if (process.env.NEXT_RUNTIME !== "nodejs") return;   // broken
 *     const { adoptPersistedRuntimes } = await import("…");
 *
 *     if (process.env.NEXT_RUNTIME === "nodejs") {         // correct
 *       const { adoptPersistedRuntimes } = await import("…");
 *     }
 *
 * Webpack substitutes the runtime name (`build/define-env.js`) and drops the
 * branch it can prove is dead — but only the branch. Statements *after* an early
 * return stay in the module graph, so the guard-clause form still resolves the
 * supervisor into the edge bundle. Nothing else in this suite can see that,
 * which is why it is asserted on the source.
 */
const FILE = join(process.cwd(), "src", "instrumentation.ts");

const SUPERVISOR = "@/core/systems/runtime/supervisor";

/**
 * True when `source` loads `request` from inside an
 * `if (process.env.NEXT_RUNTIME === "nodejs") { … }` branch. The branch body is
 * read to the first line indented exactly two spaces, which is the block's own
 * closing brace — anything nested is indented further.
 */
function importsInsideNodeBranch(source: string, request: string): boolean {
  const branch = /if \(process\.env\.NEXT_RUNTIME === "nodejs"\) \{([\s\S]*?)\n {2}\}/.exec(source)?.[1];
  return branch !== undefined && branch.includes(`import("${request}")`);
}

describe("instrumentation runtime split", () => {
  it("loads the Node-only supervisor from inside the nodejs branch", () => {
    const source = readFileSync(FILE, "utf-8");
    expect(importsInsideNodeBranch(source, SUPERVISOR)).toBe(true);
  });

  it("would reject the early-return guard, which leaves the import in the edge graph", () => {
    // The exact shape this module used to have. A `return` guard drops only the
    // statements inside its own branch; the import after it is still walked, so
    // this shape must never count as "inside the nodejs branch".
    const guardClause = [
      'if (process.env.NEXT_RUNTIME !== "nodejs") return;',
      "",
      `const { adoptPersistedRuntimes } = await import("${SUPERVISOR}");`,
    ].join("\n");
    expect(importsInsideNodeBranch(guardClause, SUPERVISOR)).toBe(false);
  });
});
