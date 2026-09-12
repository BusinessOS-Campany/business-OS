"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderPlus, LoaderCircle, Plus, Server, Trash2 } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

interface NasShare {
  id: string;
  name: string;
  host: string;
  share: string;
  username: string | null;
  basePath: string | null;
  isActive: boolean;
}

interface AgentAssign {
  agentId: string;
  name: string;
  status: "ONLINE" | "OFFLINE";
  serverHost: string | null;
}

export function SettingsView() {
  const { t } = useLocale();
  const [shares, setShares] = useState<NasShare[]>([]);
  const [agents, setAgents] = useState<AgentAssign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [host, setHost] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualHost, setManualHost] = useState("");
  const [manualShare, setManualShare] = useState("");
  const [manualUsername, setManualUsername] = useState("");
  const [manualPassword, setManualPassword] = useState("");
  const [manualBasePath, setManualBasePath] = useState("");

  const load = useCallback(async () => {
    try {
      const [nasResponse, agentsResponse] = await Promise.all([
        fetch("/api/nas", { cache: "no-store" }),
        fetch("/api/agents", { cache: "no-store" }),
      ]);
      if (!nasResponse.ok || !agentsResponse.ok) throw new Error("FETCH_FAILED");
      const nasJson = await nasResponse.json();
      const agentsJson = await agentsResponse.json();
      setShares(nasJson.shares ?? []);
      setAgents((agentsJson.agents ?? []).map((agent: AgentAssign) => ({
        agentId: agent.agentId,
        name: agent.name,
        status: agent.status,
        serverHost: agent.serverHost ?? null,
      })));
      setError(null);
    } catch {
      setError(t.transfers.loadError);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let stopped = false;
    const run = async () => {
      if (stopped) return;
      await load();
    };
    void run();
    return () => {
      stopped = true;
    };
  }, [load]);

  async function addServer(event: React.FormEvent) {
    event.preventDefault();
    const value = host.trim();
    if (!value) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/nas/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: value }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json.message || json.error || t.transfers.loadError);
        return;
      }
      const count = json.discovered?.length ?? 0;
      setMessage(t.transfers.serverDiscovered.replace("{count}", String(count)));
      setHost("");
      await load();
    } catch {
      setError(t.transfers.loadError);
    } finally {
      setSaving(false);
    }
  }

  async function addManualShare(event: React.FormEvent) {
    event.preventDefault();
    if (!manualName.trim() || !manualHost.trim() || !manualShare.trim()) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/nas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: manualName.trim(),
          host: manualHost.trim(),
          share: manualShare.trim(),
          username: manualUsername.trim() || null,
          password: manualPassword || null,
          basePath: manualBasePath.trim() || null,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json.error || t.transfers.loadError);
        return;
      }
      setMessage(t.transfers.shareCreated);
      setManualName("");
      setManualHost("");
      setManualShare("");
      setManualUsername("");
      setManualPassword("");
      setManualBasePath("");
      setShowManual(false);
      await load();
    } catch {
      setError(t.transfers.loadError);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(share: NasShare) {
    try {
      const response = await fetch(`/api/nas/${share.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !share.isActive }),
      });
      if (!response.ok) throw new Error("UPDATE_FAILED");
      await load();
    } catch {
      setError(t.transfers.loadError);
    }
  }

  async function deleteShare(id: string) {
    try {
      const response = await fetch(`/api/nas/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("DELETE_FAILED");
      await load();
    } catch {
      setError(t.transfers.loadError);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        {t.transfers.loading}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      {message && <p className="text-sm font-semibold text-success">{message}</p>}

      <form onSubmit={addServer} className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-extrabold text-foreground">{t.transfers.addServer}</h2>
        <FormField label={t.transfers.serverHost}>
          <Input
            value={host}
            onChange={(event) => setHost(event.target.value)}
            dir="ltr"
            placeholder="\\192.168.1.104\"
          />
        </FormField>
        <Button type="submit" loading={saving} disabled={!host.trim()}>
          <Plus className="size-4" aria-hidden="true" />
          {t.transfers.addServer}
        </Button>
      </form>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-foreground">{t.transfers.addManualShare}</h2>
          <button
            type="button"
            onClick={() => setShowManual(!showManual)}
            className="text-xs font-bold text-primary hover:underline"
          >
            {showManual ? t.transfers.empty : <>{t.transfers.addManualShare}</>}
          </button>
        </div>
        {showManual && (
          <form onSubmit={addManualShare} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label={t.transfers.shareName}>
                <Input
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder={t.transfers.shareNamePlaceholder}
                  required
                />
              </FormField>
              <FormField label={t.transfers.shareHost}>
                <Input
                  value={manualHost}
                  onChange={(e) => setManualHost(e.target.value)}
                  dir="ltr"
                  placeholder={t.transfers.shareHostPlaceholder}
                  required
                />
              </FormField>
              <FormField label={t.transfers.shareShare}>
                <Input
                  value={manualShare}
                  onChange={(e) => setManualShare(e.target.value)}
                  dir="ltr"
                  placeholder={t.transfers.shareSharePlaceholder}
                  required
                />
              </FormField>
              <FormField label={t.transfers.shareBasePath}>
                <Input
                  value={manualBasePath}
                  onChange={(e) => setManualBasePath(e.target.value)}
                  dir="ltr"
                  placeholder={t.transfers.shareBasePathPlaceholder}
                />
              </FormField>
              <FormField label={t.transfers.shareUsername}>
                <Input
                  value={manualUsername}
                  onChange={(e) => setManualUsername(e.target.value)}
                  dir="ltr"
                  placeholder={t.transfers.shareUsernamePlaceholder}
                />
              </FormField>
              <FormField label={t.transfers.sharePassword}>
                <Input
                  type="password"
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  dir="ltr"
                  placeholder={t.transfers.sharePasswordPlaceholder}
                />
              </FormField>
            </div>
            <Button type="submit" loading={saving} disabled={!manualName.trim() || !manualHost.trim() || !manualShare.trim()}>
              <FolderPlus className="size-4" aria-hidden="true" />
              {t.transfers.addManualShare}
            </Button>
          </form>
        )}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-foreground">
          <Server className="size-4 text-primary" aria-hidden="true" />
          {t.transfers.agents}
        </h2>
        {agents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.transfers.agentsEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {agents.map((agent) => (
              <li
                key={agent.agentId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                    {agent.name}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        agent.status === "ONLINE"
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {agent.status}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">
                    {agent.agentId}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {t.transfers.agentsServer}: {agent.serverHost ?? "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-extrabold text-foreground">{t.transfers.nasShares ?? t.transfers.devices}</h2>
        {shares.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.transfers.nasSharesEmpty ?? t.transfers.empty}</p>
        ) : (
          <ul className="space-y-2">
            {shares.map((share) => (
              <li
                key={share.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                    {share.name}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        share.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {share.isActive ? "ON" : "OFF"}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">
                    \\{share.host}\{share.share}
                    {share.basePath ? `\\${share.basePath}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleActive(share)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                  >
                    {share.isActive ? "OFF" : "ON"}
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => deleteShare(share.id)}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
