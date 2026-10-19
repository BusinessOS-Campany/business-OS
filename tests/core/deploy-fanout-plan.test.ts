import { describe, expect, it } from "vitest";
import { planFanout } from "@/core/deploy/fanout-plan";

/**
 * Who a real-system deploy updates.
 *
 * The fan-out rebuilds customer systems, so the cost of a mistake is high in
 * both directions: miss an org and a customer silently runs the old build,
 * include one twice and the machine does the same expensive build twice, invent
 * a slug and a system is copied into a folder that belongs to nobody.
 *
 * These are pure-function assertions on the decision, deliberately separate from
 * the effectful fan-out (which is tested in `deploy-fanout.test.ts`).
 */

describe("planFanout", () => {
  it("keeps every distinct org", () => {
    const plan = planFanout("dental", [
      { id: "o2", slug: "ajwad" },
      { id: "o1", slug: "gmsnow" },
    ]);
    expect(plan.total).toBe(2);
    expect(plan.orgs.map((o) => o.slug)).toEqual(["ajwad", "gmsnow"]);
  });

  it("deduplicates by org id — one org, one rebuild", () => {
    // A join that fans out, or two install rows, must not build twice.
    const plan = planFanout("dental", [
      { id: "o1", slug: "gmsnow" },
      { id: "o1", slug: "gmsnow" },
      { id: "o1", slug: "gmsnow" },
    ]);
    expect(plan.total).toBe(1);
  });

  it("sorts by slug, so a partial failure is reproducible from the log", () => {
    const plan = planFanout("dental", [
      { id: "c", slug: "zebra" },
      { id: "a", slug: "alpha" },
      { id: "b", slug: "mid" },
    ]);
    expect(plan.orgs.map((o) => o.slug)).toEqual(["alpha", "mid", "zebra"]);
  });

  it("returns an empty plan with a reason when no org has the system", () => {
    const plan = planFanout("dental", []);
    expect(plan.total).toBe(0);
    expect(plan.orgs).toEqual([]);
    expect(plan.reason).toBe("no-installed-orgs");
  });

  it("drops a row with no slug rather than inventing a folder name", () => {
    const plan = planFanout("dental", [
      { id: "o1", slug: "" },
      { id: "o2", slug: "gmsnow" },
    ]);
    expect(plan.orgs.map((o) => o.slug)).toEqual(["gmsnow"]);
  });

  it("drops a row with no id — it cannot be addressed to an org", () => {
    const plan = planFanout("dental", [
      { id: "", slug: "ghost" },
      { id: "o2", slug: "gmsnow" },
    ]);
    expect(plan.orgs.map((o) => o.slug)).toEqual(["gmsnow"]);
  });

  it("rejects slugs that are unsafe as path segments", () => {
    const plan = planFanout("dental", [
      { id: "a", slug: "../escape" },
      { id: "b", slug: "has space" },
      { id: "c", slug: "UPPER-ok" },
      { id: "d", slug: "ok-slug" },
    ]);
    // Traversal and a space are out; case and hyphen are legitimate.
    expect(plan.orgs.map((o) => o.slug)).toEqual(["UPPER-ok", "ok-slug"]);
  });

  it("carries the system slug through untouched", () => {
    const plan = planFanout("clinic-os", [{ id: "o1", slug: "gmsnow" }]);
    expect(plan.systemSlug).toBe("clinic-os");
  });

  it("is order-independent for the same set of orgs", () => {
    const a = planFanout("d", [
      { id: "1", slug: "b" },
      { id: "2", slug: "a" },
    ]);
    const b = planFanout("d", [
      { id: "2", slug: "a" },
      { id: "1", slug: "b" },
    ]);
    expect(a.orgs).toEqual(b.orgs);
  });
});
