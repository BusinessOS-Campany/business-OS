"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, BellRing, CheckCheck, MailOpen, PackageSearch, AlertTriangle } from "lucide-react";

export interface NotificationRow { id: string; title: string; body: string; type: string; read: boolean; createdAt: string }

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

function iconFor(type: string) {
  switch (type) {
    case "LOW_STOCK": return <PackageSearch className="h-5 w-5 text-amber-500" />;
    case "ALERT": return <AlertTriangle className="h-5 w-5 text-rose-500" />;
    default: return <Bell className="h-5 w-5 text-emerald-500" />;
  }
}

export function NotificationsClient({ lang, rows }: { lang: "ar" | "en"; rows: NotificationRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const unread = rows.filter((r) => !r.read).length;

  async function markRead(id: string) {
    try {
      await fetch(`/pos/api/notifications/${id}/read`, { method: "POST" });
      router.refresh();
    } catch {}
  }

  async function markAll() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/pos/api/notifications/read-all", { method: "POST" });
      router.refresh();
    } catch {}
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <BellRing className="h-5 w-5 text-emerald-600" />
            {L(lang, "الإشعارات", "Notifications")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {unread > 0
              ? L(lang, `${unread} إشعار غير مقروء`, `${unread} unread`)
              : L(lang, "لا إشعارات غير مقروءة", "No unread notifications")}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAll} disabled={busy} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
            <CheckCheck className="h-4 w-4" />
            {L(lang, "قراءة الكل", "Mark all read")}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <BellOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{L(lang, "لا توجد إشعارات", "No notifications")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${n.read ? "border-border bg-card" : "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"}`}
            >
              <div className="shrink-0">{iconFor(n.type)}</div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${n.read ? "font-medium text-foreground" : "font-bold text-foreground"}`}>{n.title}</p>
                {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.read ? (
                <MailOpen className="h-4 w-4 shrink-0 text-muted-foreground opacity-60" />
              ) : (
                <CheckCheck className="h-4 w-4 shrink-0 text-muted-foreground opacity-30" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}