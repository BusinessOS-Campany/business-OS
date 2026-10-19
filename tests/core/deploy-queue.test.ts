import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetQueue, busySystems, drain, enqueue, isBuilding, pendingCommit } from "@/core/deploy/queue";

/**
 * The deploy queue's scheduling rules.
 *
 * The failures worth pinning are the ones that cost real time or real
 * correctness: two builds of one system racing for the same `.next`, a queued
 * build that runs after a newer one already landed, and a throwing build that
 * wedges the chain so no further deploy of that system ever starts.
 */

afterEach(() => {
  __resetQueue();
});

/** A run whose completion is controlled by the test. */
function controllable(commit: string) {
  let finish!: () => void;
  let started = false;
  const run = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        started = true;
        finish = resolve;
      }),
  );
  return {
    entry: { target: { id: "demo:clinicos" }, commit, run, queuedAt: Date.now() },
    started: () => started,
    finish: () => finish(),
    run,
  };
}

describe("per-system serialisation", () => {
  it("runs a lone job immediately", async () => {
    const a = controllable("aaa");
    const promise = enqueue(a.entry);
    expect(isBuilding("demo:clinicos")).toBe(true);
    a.finish();
    await promise;
    expect(isBuilding("demo:clinicos")).toBe(false);
  });

  it("serialises two jobs for the SAME system", async () => {
    const a = controllable("aaa");
    const b = controllable("bbb");

    const first = enqueue(a.entry);
    const second = enqueue(b.entry);

    // Only the first may be running; the second must wait.
    expect(a.started()).toBe(true);
    expect(b.run).not.toHaveBeenCalled();

    a.finish();
    // Give the microtask queue a turn so the promoted run starts.
    await Promise.resolve();
    expect(b.started()).toBe(true);

    b.finish();
    await Promise.all([first, second]);
  });

  it("does NOT serialise across different systems", async () => {
    const a = controllable("aaa");
    const b = controllable("bbb");
    b.entry.target.id = "real:dental";

    const first = enqueue(a.entry);
    const second = enqueue(b.entry);

    // Both start: they do not share a chain.
    expect(a.started()).toBe(true);
    expect(b.started()).toBe(true);

    a.finish();
    b.finish();
    await Promise.all([first, second]);
  });
});

describe("supersession", () => {
  it("drops a pending job when a newer commit arrives", async () => {
    const a = controllable("aaa");
    const older = controllable("bbb");
    const newer = controllable("ccc");

    const first = enqueue(a.entry);
    const superseded = vi.fn();
    const olderPromise = enqueue({ ...older.entry, onSuperseded: superseded });
    const newerPromise = enqueue(newer.entry);

    // The older pending run is dropped and its caller released.
    expect(superseded).toHaveBeenCalledTimes(1);
    await olderPromise;
    expect(older.run).not.toHaveBeenCalled();
    expect(pendingCommit("demo:clinicos")).toBe("ccc");

    a.finish();
    await Promise.resolve();
    expect(newer.started()).toBe(true);
    expect(older.run).not.toHaveBeenCalled();

    newer.finish();
    await Promise.all([first, newerPromise]);
  });

  it("never drops a run that is already executing", async () => {
    const running = controllable("aaa");
    const queued = controllable("bbb");

    const first = enqueue(running.entry);
    const second = enqueue(queued.entry);

    // A third, newer push must not cancel the *running* one.
    const newest = controllable("ccc");
    const third = enqueue(newest.entry);

    expect(running.started()).toBe(true);
    // queued("bbb") was dropped in favour of ccc.
    expect(queued.run).not.toHaveBeenCalled();

    running.finish();
    await Promise.resolve();
    expect(newest.started()).toBe(true);

    newest.finish();
    await Promise.all([first, second, third]);
  });

  it("reports which systems are busy", async () => {
    const a = controllable("aaa");
    const p = enqueue(a.entry);
    expect(busySystems()).toEqual(["demo:clinicos"]);
    a.finish();
    await p;
    expect(busySystems()).toEqual([]);
  });
});

describe("a failing build cannot wedge the chain", () => {
  it("releases the slot when a run rejects", async () => {
    const failing = enqueue({
      target: { id: "demo:clinicos" },
      commit: "bad",
      run: () => Promise.reject(new Error("build failed")),
      queuedAt: Date.now(),
    });
    failureExpected(failing);

    // Slot is free again, so a subsequent deploy still runs.
    await Promise.resolve();
    await Promise.resolve();
    expect(isBuilding("demo:clinicos")).toBe(false);

    const next = controllable("good");
    const p = enqueue(next.entry);
    expect(next.started()).toBe(true);
    next.finish();
    await p;
  });
});

/** Marks a promise expected to reject, so vitest does not flag it unhandled. */
function failureExpected(promise: Promise<unknown>): void {
  promise.catch(() => undefined);
}

describe("drain", () => {
  it("waits for all chains to go idle, including after a quiet period", async () => {
    const a = controllable("aaa");
    const p = enqueue(a.entry);
    // Settle the previously-resolved idle promise from an earlier drain.
    const firstDrain = drain();

    let drained = false;
    void firstDrain.then(() => {
      drained = true;
    });

    await Promise.resolve();
    expect(drained).toBe(false);

    a.finish();
    await p;
    await firstDrain;
    expect(drained).toBe(true);
  });
});
