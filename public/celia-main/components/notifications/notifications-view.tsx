"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/i18n/locale-provider";
import {
  formatRelativeTime,
  NOTIFICATION_ICONS,
  notificationText,
  type NotificationItem,
} from "@/lib/notifications-ui";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 50;

type Filter = "all" | "unread";

export function NotificationsView() {
  const { t, locale } = useLocale();
  const np = t.notificationsPage;

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const load = useCallback(
    async (offset: number) => {
      if (offset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
        if (filter === "unread") params.set("filter", "unread");
        const response = await fetch(`/api/notifications?${params.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        const list = Array.isArray(data.items) ? (data.items as NotificationItem[]) : [];
        setItems((prev) => (offset === 0 ? list : [...prev, ...list]));
        if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
        if (typeof data.total === "number") setTotal(data.total);
      } catch {
        // ignore fetch errors
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    let stopped = false;
    const run = async () => {
      if (stopped) return;
      await load(0);
    };
    void run();
    return () => {
      stopped = true;
    };
  }, [load]);

  async function markAllRead() {
    setMessage(null);
    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error();
      setUnreadCount(0);
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setMessage({ type: "success", text: np.markedAllRead });
      window.dispatchEvent(new Event("celia-notifications-changed"));
    } catch {
      setMessage({ type: "error", text: t.header.notificationsEmpty });
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium",
            message.type === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-success/30 bg-success/10 text-success",
          )}
        >
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
              filter === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {np.all}
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
              filter === "unread"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {np.unread}
            {unreadCount > 0 && (
              <span
                className={cn(
                  "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                  filter === "unread" ? "bg-white/25" : "bg-amber-500 text-white",
                )}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load(0)} loading={loading}>
            <RefreshCw className="size-4" aria-hidden="true" />
            {np.refresh}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            loading={loading}
          >
            <Check className="size-4" aria-hidden="true" />
            {np.markAllRead}
          </Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            {np.title}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
              {total}
            </span>
          </h3>
        </header>

        {items.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-muted-foreground">
            {loading ? t.common.loading : np.emptyTitle}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const Icon = NOTIFICATION_ICONS[item.type] ?? NOTIFICATION_ICONS.default;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40",
                    !item.isRead && "bg-muted/30",
                  )}
                >
                  <span className="flex min-w-0 items-start gap-3">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full",
                        item.isRead
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-sm",
                          item.isRead
                            ? "text-muted-foreground"
                            : "font-semibold text-foreground",
                        )}
                      >
                        {notificationText(t, item)}
                      </span>
                      {item.actorName && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {item.actorName}
                        </span>
                      )}
                      <span className="mt-1 block text-xs tabular-nums text-muted-foreground/80">
                        {formatRelativeTime(item.createdAt, locale)}
                      </span>
                    </span>
                  </span>
                  {!item.isRead && (
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-amber-500"
                      aria-label={np.unread}
                      role="img"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {items.length < total && (
          <footer className="flex justify-center border-t border-border px-5 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load(items.length)}
              loading={loadingMore}
            >
              {np.loadMore}
            </Button>
          </footer>
        )}
      </section>
    </div>
  );
}
