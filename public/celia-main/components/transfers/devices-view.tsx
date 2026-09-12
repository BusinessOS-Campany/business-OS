"use client";

import { useCallback, useEffect, useState } from "react";
import { HardDrive, LoaderCircle, Server } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";
import { formatBytes, formatDateTime } from "@/lib/transfers/format";
import type { TransferDeviceView } from "@/lib/transfers/types";

interface AgentView {
  agentId: string;
  name: string;
  status: "ONLINE" | "OFFLINE";
  ipAddress: string | null;
  lastHeartbeat: Date | null;
  firstSeenAt: Date;
  nasShareId: string | null;
  shareLabel: string | null;
  serverHost: string | null;
  folders: string[];
}

export function DevicesView() {
  const { t, locale } = useLocale();
  const [devices, setDevices] = useState<TransferDeviceView[]>([]);
  const [agents, setAgents] = useState<AgentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [deviceResponse, agentResponse] = await Promise.all([
        fetch("/api/transfer-devices", { cache: "no-store" }),
        fetch("/api/agents", { cache: "no-store" }),
      ]);
      if (!deviceResponse.ok || !agentResponse.ok) throw new Error("FETCH_FAILED");
      const devicesJson = await deviceResponse.json();
      const agentsJson = await agentResponse.json();
      setDevices(devicesJson.devices ?? []);
      setAgents(agentsJson.agents ?? []);
      setError(null);
    } catch {
      setError(t.transfers.loadError);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    function schedule(ms: number) {
      timer = setTimeout(() => void tick(), ms);
    }

    async function tick() {
      if (document.visibilityState !== "visible") {
        if (!stopped) schedule(60_000);
        return;
      }
      await load();
      if (!stopped) schedule(5_000);
    }

    schedule(0);

    function onVisibility() {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void tick();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        {t.transfers.loading}
      </div>
    );
  }

  if (error && devices.length === 0) {
    return <p className="text-sm font-semibold text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-foreground">
          <HardDrive className="size-4 text-primary" aria-hidden="true" />
          {t.transfers.devices}
        </h2>
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.transfers.empty}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {devices.map((device) => (
              <li
                key={device.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-foreground">
                    {device.deviceName ?? device.deviceId}
                  </p>
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      device.connected ? "bg-success" : "bg-muted-foreground"
                    }`}
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.transfers.deviceTypes[device.deviceType as keyof typeof t.transfers.deviceTypes]}
                  {device.driveLetter ? ` · ${device.driveLetter}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.transfers.table.size}: {formatBytes(device.freeSpace, t.transfers.bytes)}
                  {device.totalCapacity ? ` / ${formatBytes(device.totalCapacity, t.transfers.bytes)}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.transfers.table.time}: {formatDateTime(device.lastSeenAt, locale)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-foreground">
          <Server className="size-4 text-primary" aria-hidden="true" />
          {t.transfers.agents}
        </h2>
        {agents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.transfers.empty}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <li key={agent.agentId} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-foreground">{agent.name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      agent.status === "ONLINE" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {agent.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                  {agent.agentId}
                </p>
                <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                  {agent.ipAddress ?? "—"} · {formatDateTime(agent.lastHeartbeat, locale)}
                </p>
                {agent.serverHost && (
                  <p className="mt-1 truncate text-xs text-muted-foreground" dir="ltr">
                    <span className="font-semibold text-foreground">{t.transfers.agentsServer}:</span>{" "}
                    {agent.serverHost}
                  </p>
                )}
                {agent.folders.length > 0 && (
                  <div className="mt-2 border-t border-border/60 pt-2">
                    <p className="text-[11px] font-bold text-muted-foreground">
                      {t.transfers.agentsFolders}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {agent.folders.map((folder) => (
                        <li key={folder} className="truncate text-[11px] text-muted-foreground" dir="ltr">
                          {folder}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
