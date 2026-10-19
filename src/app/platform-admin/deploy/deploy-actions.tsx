"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, GitPullRequestArrow, Loader2 } from "lucide-react";

/**
 * The two maintenance buttons on the deploy console.
 *
 * Both call the admin API and then `router.refresh()`, so the server component
 * re-renders with the registry's new state. The button is disabled while in
 * flight: a double-click would fire two sweeps, and while the sweep itself is
 * idempotent, the duplicate work is pointless.
 *
 * The result is shown as a short inline note rather than a toast, so it sits
 * next to the button that produced it and survives the refresh.
 */

export interface DeployActionsProps {
  sweepLabel: string;
  reconcileLabel: string;
  sweepingLabel: string;
  reconcilingLabel: string;
  sweepResultTemplate: string;
  reconcileResultTemplate: string;
  /** True when GitHub is configured; the sweep is refused without it. */
  canSweep: boolean;
}

type Busy = null | "sweep" | "reconcile";

export function DeployActions(props: DeployActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>(null);
  const [note, setNote] = useState<string | null>(null);

  async function run(action: "sweep" | "reconcile"): Promise<void> {
    setBusy(action);
    setNote(null);
    try {
      const response = await fetch("/api/platform/deploy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await response.json()) as {
        data?: { queued?: string[]; reconciled?: number };
        error?: { messageAr?: string; messageEn?: string };
      };
      if (!response.ok) {
        setNote(body.error?.messageAr ?? body.error?.messageEn ?? "فشل الإجراء");
        return;
      }
      if (action === "sweep") {
        const n = body.data?.queued?.length ?? 0;
        setNote(props.sweepResultTemplate.replace("{n}", String(n)));
      } else {
        const n = body.data?.reconciled ?? 0;
        setNote(props.reconcileResultTemplate.replace("{n}", String(n)));
      }
      // Pull the fresh registry state into the server component.
      router.refresh();
    } catch {
      setNote("تعذّر الوصول إلى الخادم");
    } finally {
      setBusy(null);
    }
  }

  const base =
    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => run("sweep")}
        disabled={busy !== null || !props.canSweep}
        title={props.canSweep ? undefined : "GitHub غير متصل"}
        className={`${base} bg-primary text-white shadow-lg shadow-primary/25 hover:brightness-110`}
      >
        {busy === "sweep" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <GitPullRequestArrow className="h-3.5 w-3.5" />
        )}
        {busy === "sweep" ? props.sweepingLabel : props.sweepLabel}
      </button>

      <button
        type="button"
        onClick={() => run("reconcile")}
        disabled={busy !== null}
        className={`${base} border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:border-white/20`}
      >
        {busy === "reconcile" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        {busy === "reconcile" ? props.reconcilingLabel : props.reconcileLabel}
      </button>

      {note ? (
        <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">{note}</span>
      ) : null}
    </div>
  );
}
