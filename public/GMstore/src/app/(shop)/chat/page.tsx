"use client";
import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useRouter } from "next/navigation";
import { MessageCircle, ChevronLeft, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

type Conv = {
  id: string; subject: string | null; status: string;
  createdAt: string; updatedAt: string;
  admin: { name: string | null } | null;
  messages: { content: string; createdAt: string }[];
};

export default function CustomerChatPage() {
  const { t, direction } = useI18n();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.status === 401) return;
      if (res.ok) setConversations(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);
  useEffect(() => { const iv = setInterval(fetchConversations, 10000); return () => clearInterval(iv); }, [fetchConversations]);

  const handleCreate = async () => {
    if (!message.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim() || undefined, message: message.trim() }),
      });
      if (res.ok) {
        const conv = await res.json();
        router.push(`/chat/${conv.id}`);
      }
    } catch {}
    setCreating(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" />
          {t("chat.title")}
        </h1>
        <Button onClick={() => setShowNew(!showNew)} variant={showNew ? "ghost" : "primary"} size="sm">
          {showNew ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showNew ? t("general.cancel") : t("chat.new")}
        </Button>
      </div>

      {showNew && (
        <div className="space-y-3 p-4 rounded-xl border bg-card">
          <Input placeholder={t("chat.subject_placeholder")} value={subject} onChange={e => setSubject(e.target.value)} />
          <Textarea placeholder={t("chat.placeholder")} value={message} onChange={e => setMessage(e.target.value)} rows={3} />
          <Button onClick={handleCreate} loading={creating} disabled={!message.trim()}>{t("chat.start")}</Button>
        </div>
      )}

      <div className="rounded-xl border divide-y">
        {conversations.length === 0 && (
          <p className="p-8 text-sm text-muted-foreground text-center">{t("chat.no_conversations")}</p>
        )}
        {conversations.map(c => {
          const last = c.messages[0];
          return (
            <Link key={c.id} href={`/chat/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${c.status === "CLOSED" ? "bg-muted text-muted-foreground" : c.admin ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"}`}>
                {c.admin ? <MessageCircle className="h-5 w-5" /> : "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{c.subject || t("chat.admin")}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.status === "CLOSED" ? "bg-muted text-muted-foreground" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                    {c.status === "CLOSED" ? t("chat.closed") : c.admin ? t("chat.replied") : t("chat.waiting")}
                  </span>
                </div>
                {last && <p className="text-xs text-muted-foreground truncate mt-0.5">{last.content}</p>}
              </div>
              <ChevronLeft className={`h-4 w-4 text-muted-foreground shrink-0 ${direction === "rtl" ? "rotate-180" : ""}`} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
