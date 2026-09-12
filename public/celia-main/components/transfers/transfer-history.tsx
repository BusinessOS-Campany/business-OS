"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, LoaderCircle, Search, X } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBytes, formatDateTime, formatSpeed } from "@/lib/transfers/format";
import type { TransferJobView } from "@/lib/transfers/types";
import { MANUAL_COPY_MARKER, type TransferStatus } from "@/lib/transfers/constants";

const STATUSES: TransferStatus[] = ["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED", "PAUSED"];

export function TransferHistory() {
  const { t, locale } = useLocale();
  const [jobs, setJobs] = useState<TransferJobView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TransferStatus | "">("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TransferJobView | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const response = await fetch(`/api/transfers?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("FETCH_FAILED");
      const json = await response.json();
      setJobs(json.jobs ?? []);
      setError(null);
    } catch {
      setError(t.transfers.loadError);
    } finally {
      setLoading(false);
    }
  }, [status, search, t]);

  useEffect(() => {
    let stopped = false;
    const timer = setTimeout(async () => {
      if (stopped) return;
      await load();
    }, search ? 350 : 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [load, search]);

  function openDetail(job: TransferJobView) {
    setSelected(job);
  }

  function exportCsv() {
    const headers = [
      "jobNo",
      "status",
      "source",
      "destination",
      "device",
      "customerName",
      "customerPhone",
      "size",
      "speed",
      "startTime",
      "endTime",
      "employee",
    ];
    const rows = jobs.map((job) => [
      job.jobNo,
      job.status,
      job.sourcePath,
      job.destinationPath,
      job.deviceName ?? "",
      job.customerName ?? "",
      job.customerPhone ?? "",
      job.transferredSize ?? "",
      job.averageSpeed ?? "",
      job.startTime ? job.startTime.toISOString() : "",
      job.endTime ? job.endTime.toISOString() : "",
      job.employeeName ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transfers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.transfers.loading.replace("...", "")}
            startIcon={<Search className="size-4" aria-hidden="true" />}
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as TransferStatus | "")}
          className="h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-sm"
        >
          <option value="">—</option>
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {t.transfers.statuses[item]}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" onClick={exportCsv} disabled={jobs.length === 0}>
          <Download className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {error && !loading && <p className="text-sm font-semibold text-destructive">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {t.transfers.loading}
        </div>
      ) : jobs.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t.transfers.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground">
                <th className="px-4 py-3 text-start">{t.transfers.table.jobNo}</th>
                <th className="px-4 py-3 text-start">{t.transfers.table.status}</th>
                <th className="px-4 py-3 text-start">{t.transfers.table.source}</th>
                <th className="px-4 py-3 text-start">{t.transfers.table.device}</th>
                <th className="px-4 py-3 text-start">{t.transfers.table.customer}</th>
                <th className="px-4 py-3 text-start">{t.transfers.table.size}</th>
                <th className="px-4 py-3 text-start">{t.transfers.table.time}</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => openDetail(job)}
                  className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-3 font-bold text-foreground">#{job.jobNo}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        job.status === "COMPLETED"
                          ? "bg-success/15 text-success"
                          : job.status === "FAILED" || job.status === "CANCELLED"
                            ? "bg-destructive/15 text-destructive"
                            : job.status === "RUNNING"
                              ? "bg-warning/15 text-warning"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.transfers.statuses[job.status]}
                    </span>
                  </td>
                  <td className="max-w-52 truncate px-4 py-3" dir="ltr">
                    {job.sourcePath}
                    {job.customerNotes === MANUAL_COPY_MARKER && (
                      <span className="ms-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {t.transfers.manualCopy}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{job.deviceName ?? "—"}</td>
                  <td className="px-4 py-3">{job.customerName ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{formatBytes(job.transferredSize, t.transfers.bytes)}</td>
                  <td className="px-4 py-3">{formatDateTime(job.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-sm font-extrabold text-foreground">
                #{selected.jobNo}
              </h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <DetailRow label={t.transfers.table.status}>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    selected.status === "COMPLETED"
                      ? "bg-success/15 text-success"
                      : selected.status === "FAILED" || selected.status === "CANCELLED"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.transfers.statuses[selected.status]}
                </span>
              </DetailRow>
              <DetailRow label={t.transfers.source}>
                <span dir="ltr">
                  {selected.sourcePath}
                  {selected.customerNotes === MANUAL_COPY_MARKER && (
                    <span className="ms-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {t.transfers.manualCopy}
                    </span>
                  )}
                </span>
              </DetailRow>
              <DetailRow label={t.transfers.destination}>
                <span dir="ltr">{selected.destinationPath}</span>
              </DetailRow>
              <DetailRow label={t.transfers.table.device}>{selected.deviceName ?? "—"}</DetailRow>
              <DetailRow label={t.transfers.customerName}>{selected.customerName ?? "—"}</DetailRow>
              <DetailRow label={t.transfers.customerPhone}>
                <span dir="ltr">{selected.customerPhone ?? "—"}</span>
              </DetailRow>
              <DetailRow label={t.transfers.table.employee}>{selected.employeeName ?? "—"}</DetailRow>
              <DetailRow label={t.transfers.table.size}>
                {formatBytes(selected.transferredSize, t.transfers.bytes)}
              </DetailRow>
              <DetailRow label={t.transfers.table.speed}>
                {formatSpeed(selected.averageSpeed, t.transfers.bytes)}
              </DetailRow>
              <DetailRow label={t.transfers.table.time}>
                {formatDateTime(selected.createdAt, locale)}
              </DetailRow>
              {selected.errorMessage && (
                <DetailRow label={t.transfers.statuses.FAILED}>
                  <span className="text-destructive" dir="ltr">
                    {selected.errorMessage}
                  </span>
                </DetailRow>
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-end font-semibold text-foreground">{children}</dd>
    </div>
  );
}

