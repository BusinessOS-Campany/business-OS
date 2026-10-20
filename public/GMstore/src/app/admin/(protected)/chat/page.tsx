"use client";
import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useRouter } from "next/navigation";
import { MessageCircle, ChevronLeft, Plus, Clock, CheckCheck, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type Conv = {
  id: string; customerId: string; adminId: string | null; subject: string | null;
  status: string; createdAt: string; updatedAt: string;
  customerName: string; customerEmail: string;
  lastMessage: string | null; lastMessageDate: string | null; unread: number;
};

export default function AdminChatInbox() {
  const { t, direction } = useI18n();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");
  const [search, setSearch] = useState("");

  const fetchAll = useCallback(async () => {
    try {
      const params = filter !== "ALL" ? `?status=${filter}` : "";
      const res = await fetch(`/api/admin/chat${params}`);
      if (res.ok) setConversations(await res.json());
    } catch {}
  }, [filter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { const iv = setInterval(fetchAll, 10000); return () => clearInterval(iv); }, [fetchAll]);

  const filtered = conversations.filter(c =>
    !search || c.customerName?.toLowerCase().includes(search.toLowerCase()) || c.customerEmail?.toLowerCase().includes(search.toLowerCase()) || c.subject?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" />
          {t("admin.chat")}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "OPEN", "CLOSED"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {f === "ALL" ? t("products.all") : f === "OPEN" ? t("admin.chat_open") : t("admin.chat_closed")}
          </button>
        ))}
        <div className="flex-1 min-w-[200px]">
          <Input placeholder={t("nav.search")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border divide-y">
        {filtered.length === 0 && (
          <p className="p-8 text-sm text-muted-foreground text-center">{t("admin.chat_no_conversations")}</p>
        )}
        {filtered.map(c => (
          <Link key={c.id} href={`/admin/chat/${c.id}`}
            className={`flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors ${c.unread > 0 ? "bg-primary/5" : ""}`}
          >
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${c.status === "CLOSED" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
              {c.customerName?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{c.customerName || c.customerEmail || "—"}</span>
                {c.unread > 0 && <Badge variant="default" className="h-5 px-1.5 text-[10px]">{c.unread}</Badge>}
                {c.status === "CLOSED" && <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              </div>
              {c.subject && <p className="text-xs text-muted-foreground truncate">{c.subject}</p>}
              {c.lastMessage && (
                <p className={`text-xs truncate mt-0.5 ${c.unread > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {c.lastMessage}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {c.lastMessageDate && (
                <span className="text-[10px] text-muted-foreground">
                  {new Date(c.lastMessageDate).toLocaleDateString()}
                </span>
              )}
              <ChevronLeft className={`h-4 w-4 text-muted-foreground ${direction === "rtl" ? "rotate-180" : ""}`} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
