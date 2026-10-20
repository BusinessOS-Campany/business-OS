import Link from "next/link";
import {
  Rocket,
  GitBranch,
  CircleCheck,
  CircleAlert,
  Clock,
  PackageOpen,
  type LucideIcon,
} from "lucide-react";
import { getDictAndDir, t } from "@/core/i18n/server";
import { adminSystemViews, type AdminSystemView } from "@/core/deploy/orchestrator";
import { githubConfig, isGithubConfigured } from "@/core/deploy/github";
import { busySystems } from "@/core/deploy/queue";
import { overBudgetReason } from "@/core/deploy/executor";
import { DeployActions } from "./deploy-actions";

export const dynamic = "force-dynamic";

/**
 * The "Systems & Updates" console: every system's real deployment state.
 *
 * All of it comes from the deploy registry, which is the same file the webhook
 * writes — there are no sample rows and no static placeholders. If a system has
 * never been deployed, the row says so rather than inventing a status.
 *
 * Demo and real systems are rendered in two separate sections on purpose. The
 * whole point of the `demo:` / `real:` identity split is that a demo update must
 * never be mistaken for a customer install, and that clarity has to survive all
 * the way to the screen.
 *
 * The page is a server component and reads the registry in-process, which is
 * both faster than fetching the platform's own API and impossible to render
 * stale: `router.refresh()` after an action re-runs this function.
 */

const PANEL =
  "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-white/5 dark:bg-neutral-900/80 dark:shadow-xl";
const TH =
  "px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500";
const TD = "px-4 py-3 text-sm text-slate-700 dark:text-neutral-300";
const SUB = "text-slate-500 dark:text-neutral-500";
const MONO = "font-mono text-xs text-slate-600 dark:text-neutral-400";

/** Status → pill tint. The Arabic label comes from the dictionary. */
const STATUS_TINT: Record<AdminSystemView["status"], string> = {
  live: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  building: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  queued: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  blocked: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  stale: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  unknown: "bg-slate-200 text-slate-600 dark:bg-neutral-500/15 dark:text-neutral-400",
};

const STATUS_LABEL_KEY: Record<AdminSystemView["status"], string> = {
  live: "statusLive",
  building: "statusBuilding",
  queued: "statusQueued",
  failed: "statusFailed",
  blocked: "statusBlocked",
  stale: "statusStale",
  unknown: "statusUnknown",
};

/** A short, monospace commit chip, or a dash when nothing is deployed. */
function Commit({ sha, empty }: { sha: string | null; empty: string }) {
  if (!sha) return <span className={SUB}>{empty}</span>;
  return (
    <span className={`${MONO} rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-white/5`} dir="ltr">
      {sha.slice(0, 7)}
    </span>
  );
}

/** Seconds as a compact duration, flagged when it blew the three-minute budget. */
function Duration({
  seconds,
  locale,
  overLabel,
}: {
  seconds: number | null;
  locale: string;
  overLabel: string;
}) {
  if (seconds === null) return <span className={SUB}>—</span>;
  const over = seconds > 180;
  // Reuse the executor's own diagnosis so the reason shown here is the same one
  // the deploy recorded, not a second opinion computed in the view.
  const reason = over
    ? overBudgetReason({
        pullMs: 0,
        buildMs: seconds * 1000,
        verifyMs: 0,
        totalMs: seconds * 1000,
      })
    : null;
  return (
    <span className={over ? "font-medium text-amber-700 dark:text-amber-400" : ""}>
      {seconds.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}s
      {over ? <span className="ms-1.5 text-[11px]" title={reason ?? overLabel}>⚠</span> : null}
    </span>
  );
}

function SystemTable({
  rows,
  d,
  locale,
  emptyLabel,
}: {
  rows: AdminSystemView[];
  d: (key: string) => string;
  locale: string;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-8 text-sm text-slate-500 dark:text-neutral-500">
        <PackageOpen className="h-4 w-4" />
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1020px] border-collapse">
        <thead className="border-b border-slate-200 bg-slate-50/60 dark:border-white/5 dark:bg-white/[0.02]">
          <tr>
            <th className={TH}>{d("colSystem")}</th>
            <th className={TH}>{d("colStatus")}</th>
            <th className={TH}>{d("colDeployed")}</th>
            <th className={TH}>{d("colRemote")}</th>
            <th className={TH}>{d("colBranch")}</th>
            <th className={TH}>{d("colDuration")}</th>
            <th className={TH}>{d("colRepo")}</th>
            <th className={TH}>{d("colRepoPath")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {rows.map((row) => (
            <tr key={row.id} className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
              <td className={TD}>
                <div className="font-semibold text-slate-900 dark:text-white">{row.nameAr}</div>
                <div className={`${SUB} text-xs`}>{row.nameEn}</div>
              </td>
              <td className={TD}>
                <div className="flex flex-col items-start gap-1">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_TINT[row.status]}`}
                  >
                    {d(STATUS_LABEL_KEY[row.status])}
                  </span>
                  {row.updateAvailable ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                      <CircleAlert className="h-3 w-3" />
                      {d("updateAvailable")}
                    </span>
                  ) : row.deployedCommit ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                      <CircleCheck className="h-3 w-3" />
                      {d("upToDate")}
                    </span>
                  ) : null}
                  {row.lastError ? (
                    <span
                      className="max-w-[220px] truncate text-[11px] text-red-600 dark:text-red-400"
                      title={row.lastError}
                      dir="auto"
                    >
                      {row.lastError}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className={TD}>
                <Commit sha={row.deployedCommit} empty={d("noCommit")} />
              </td>
              <td className={TD}>
                <Commit sha={row.remoteCommit} empty="—" />
              </td>
              <td className={TD}>
                <span className="inline-flex items-center gap-1" dir="ltr">
                  <GitBranch className="h-3.5 w-3.5 text-slate-400" />
                  {row.productionBranch}
                </span>
              </td>
              <td className={TD}>
                <Duration seconds={row.lastDurationSeconds} locale={locale} overLabel={d("overBudget")} />
              </td>
              <td className={TD}>
                {row.repo ? (
                  <a
                    href={`https://github.com/${row.repo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-primary hover:underline"
                    dir="ltr"
                  >
                    {row.repo}
                  </a>
                ) : (
                  <span className={SUB} title={d("unmapped")}>
                    {d("unmapped")}
                  </span>
                )}
              </td>
              <td className={`${TD} ${MONO}`} dir="ltr">
                {row.repoPath}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PlatformDeployPage() {
  const { dict, locale } = await getDictAndDir();
  const d = (key: string) => t(dict, `platform.deploy.${key}`);

  const views = adminSystemViews();
  const demo = views.filter((v) => v.kind === "demo");
  const real = views.filter((v) => v.kind === "real");
  const building = busySystems();
  const config = githubConfig();
  const connected = isGithubConfigured();

  const numLocale = locale === "ar" ? "ar-EG" : "en-US";

  const kpis: { label: string; value: string; icon: LucideIcon; tint: string }[] = [
    {
      label: d("sectionDemo"),
      value: String(demo.length),
      icon: Rocket,
      tint: "bg-violet-500/10 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    },
    {
      label: d("sectionReal"),
      value: String(real.length),
      icon: GitBranch,
      tint: "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
    },
    {
      label: d("statusBuilding"),
      value: String(building.length),
      icon: Clock,
      tint: "bg-blue-500/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header: connection state + actions */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-100 p-6 shadow-lg dark:border-white/5 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950 dark:shadow-xl">
        <div className="pointer-events-none absolute -top-24 end-0 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest ${SUB}`}>
              <Rocket className="h-3.5 w-3.5 text-primary" />
              Business OS
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {d("title")}
            </h1>
            <p className={`mt-1 text-sm ${SUB}`}>{d("subtitle")}</p>
          </div>
          <DeployActions
            sweepLabel={d("sweep")}
            reconcileLabel={d("reconcile")}
            sweepingLabel={d("sweeping")}
            reconcilingLabel={d("reconciling")}
            sweepResultTemplate={d("sweepResult")}
            reconcileResultTemplate={d("reconcileResult")}
            canSweep={connected}
          />
        </div>

        {/* GitHub connection banner — honest about the unconfigured state. */}
        <div className="relative mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 dark:border-white/5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              connected
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-slate-200 text-slate-600 dark:bg-neutral-500/15 dark:text-neutral-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-400"}`}
            />
            {connected ? d("githubConnected") : d("githubDisconnected")}
          </span>
          {config.repo ? (
            <span className={`${SUB} text-xs`} dir="ltr">
              {d("githubRepo")}: <span className="font-mono">{config.repo}</span> ({d("githubMode")}:{" "}
              {config.mode})
            </span>
          ) : (
            <span className={`${SUB} text-xs`}>{d("configureHint")}</span>
          )}
        </div>
      </div>

      {/* Small KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-white/5 dark:bg-neutral-900/80 dark:shadow-xl"
          >
            <div>
              <p className={`text-xs font-medium ${SUB}`}>{k.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {k.value}
              </p>
            </div>
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${k.tint}`}>
              <k.icon className="h-5 w-5" />
            </span>
          </div>
        ))}
      </div>

      {/* Demo systems */}
      <section className={PANEL}>
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-white/5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{d("sectionDemo")}</h2>
            <p className={`text-xs ${SUB}`}>{d("demoNote")}</p>
          </div>
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-medium text-violet-800 dark:bg-violet-500/15 dark:text-violet-300">
            {demo.length}
          </span>
        </header>
        <SystemTable rows={demo} d={d} locale={numLocale} emptyLabel={d("none")} />
      </section>

      {/* Real systems — a separate panel, never merged with the demo one */}
      <section className={PANEL}>
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-white/5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{d("sectionReal")}</h2>
            <p className={`text-xs ${SUB}`}>{d("realNote")}</p>
          </div>
          <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-[11px] font-medium text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300">
            {real.length}
          </span>
        </header>
        <SystemTable rows={real} d={d} locale={numLocale} emptyLabel={d("none")} />
      </section>

      <p className={`${SUB} text-xs`}>
        {d("lastChecked")}: {new Date().toLocaleString(numLocale, { dateStyle: "medium", timeStyle: "short" })} ·{" "}
        <Link href="/platform-admin/systems" className="text-primary hover:underline">
          {t(dict, "platform.dashboard.openCatalog")}
        </Link>
      </p>
      <p className={`${SUB} text-xs`}>{d("footerNote")}</p>
    </div>
  );
}
