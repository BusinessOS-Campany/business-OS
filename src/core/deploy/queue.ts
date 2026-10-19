import { logger } from "@/core/logging/logger";

/**
 * The deploy queue: one build at a time per system, newest commit wins.
 *
 * A build is minutes of CPU, so two rules keep it affordable and correct:
 *
 *   - **Per-system serialisation.** Two pushes to the same system must not
 *     build concurrently — they would race for the same `.next` directory and
 *     the loser's output would be the one served. Each system gets its own
 *     chain, so a push to dental never waits behind one to grocery.
 *   - **Supersession.** When a newer commit arrives while an older one is
 *     *queued* (not yet started), the older one is dropped: building it would
 *     produce output immediately replaced by the newer build. A run already
 *     *executing* is left to finish, because killing a build mid-flight can
 *     leave a half-written `.next` where a working one was.
 *
 * Deliberately in-process and dependency-free. It is a scheduling policy, not a
 * queue server: the work it protects is a child process on the same machine, so
 * a broker between them would add a failure mode without adding durability.
 *
 * Each system's chain is a small state machine:
 *
 *   idle ──enqueue──▶ running ──enqueue──▶ running + one pending
 *                        │                        │
 *                        └────── finish ──────────┘  (start pending)
 *
 * At most ONE pending run exists per system; a second enqueue replaces it and
 * resolves the replaced caller's promise.
 */

/** The part of a system this queue needs. */
export interface QueueTarget {
  id: string;
}

export interface QueuedRun<T extends QueueTarget> {
  target: T;
  /** The commit this run builds. A newer commit supersedes a pending one. */
  commit: string;
  /** Performs the work. A rejection is recorded by the caller, not thrown here. */
  run: () => Promise<void>;
  /** Called when a pending run is dropped because a newer commit superseded it. */
  onSuperseded?: () => void;
  /** Enqueued-at (ms), for queue-latency accounting. */
  queuedAt: number;
}

interface Pending {
  run: QueuedRun<QueueTarget>;
  /** Resolves the promise `enqueue` returned for this run. */
  resolve: () => void;
}

interface Chain {
  /** The run executing right now, or null when idle. */
  active: QueuedRun<QueueTarget> | null;
  /** The single run waiting for the slot, or null. */
  pending: Pending | null;
  /** Resolves when this chain goes idle. Awaited by `drain` (tests). */
  idle: Promise<void>;
  idleResolve: (() => void) | null;
}

const chains = new Map<string, Chain>();

/** A fresh chain: idle promise already settled, since there is no work. */
function newChain(): Chain {
  return { active: null, pending: null, idle: Promise.resolve(), idleResolve: null };
}

function chainFor(id: string): Chain {
  let chain = chains.get(id);
  if (!chain) {
    chain = newChain();
    chains.set(id, chain);
  }
  return chain;
}

/**
 * Arms the chain's idle promise for the work about to start.
 *
 * Called whenever a chain transitions from fully idle to busy, so `drain`
 * awaits the *current* work rather than a promise that settled on a previous
 * drain. Without this, a `drain()` after a quiet period would return instantly
 * while a build was still running.
 */
function armIdle(chain: Chain): void {
  if (chain.active === null && chain.pending === null && chain.idleResolve === null) {
    chain.idle = new Promise<void>((resolve) => {
      chain.idleResolve = resolve;
    });
  }
}

/** True while a run for this system is executing. */
export function isBuilding(id: string): boolean {
  return chainFor(id).active !== null;
}

/** The commit a pending run would build, or null. */
export function pendingCommit(id: string): string | null {
  return chainFor(id).pending?.run.commit ?? null;
}

/** Every system with work active or pending. For the admin panel. */
export function busySystems(): string[] {
  return [...chains.entries()]
    .filter(([, chain]) => chain.active !== null || chain.pending !== null)
    .map(([id]) => id);
}

/**
 * Adds a run to a system's chain and starts it when the slot is free.
 *
 * Resolves when *this* run has finished, or when it was superseded before
 * starting. A superseded run resolves rather than rejects: being replaced by a
 * newer commit is a normal outcome, already reported through `onSuperseded`.
 */
export function enqueue<T extends QueueTarget>(run: QueuedRun<T>): Promise<void> {
  const chain = chainFor(run.target.id);
  const generic = run as unknown as QueuedRun<QueueTarget>;
  generic.queuedAt = run.queuedAt;

  // Free slot: run immediately.
  if (chain.active === null && chain.pending === null) {
    armIdle(chain);
    return runNow(chain, generic);
  }

  // Busy: keep only the newest pending run; the older one is dropped.
  if (chain.pending) {
    logger.info(
      { system: run.target.id, dropped: chain.pending.run.commit, kept: run.commit },
      "[deploy] pending run superseded before it started",
    );
    chain.pending.run.onSuperseded?.();
    // Release the superseded caller; it is not going to run.
    chain.pending.resolve();
  }

  return new Promise<void>((resolve) => {
    chain.pending = { run: generic, resolve };
  });
}

/**
 * Executes `run`, then promotes the pending run (if any) or signals idle.
 *
 * The `finally` is the whole safety property: the slot is always released, so a
 * throwing build cannot wedge the queue and block every future deploy of that
 * system.
 */
async function runNow(chain: Chain, run: QueuedRun<QueueTarget>): Promise<void> {
  chain.active = run;
  try {
    await run.run();
  } finally {
    chain.active = null;

    const next = chain.pending;
    chain.pending = null;
    if (next) {
      // Chain the pending run; resolving its promise signals its caller.
      void runNow(chain, next.run).then(next.resolve, next.resolve);
    } else {
      const idleResolve = chain.idleResolve;
      chain.idleResolve = null;
      idleResolve?.();
    }
  }
}

/** Test seam: awaits every chain draining to idle. */
export async function drain(): Promise<void> {
  await Promise.all([...chains.values()].map((chain) => chain.idle));
}

/** Test seam: forgets all scheduling state. Never call with work in flight. */
export function __resetQueue(): void {
  chains.clear();
}
