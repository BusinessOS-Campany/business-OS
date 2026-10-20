"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";

type Sender = { name: string | null; role: string };
type Message = { id: string; content: string; sender: Sender; createdAt: string };
type Conv = { messages: Message[]; status: string; subject: string | null; admin: { name: string | null } | null };

function BubbleTail({ side, colorClass }: { side: "self" | "other"; colorClass: string }) {
  return (
    <svg className={`absolute bottom-0 w-[8px] h-[13px] ${side === "self" ? "-right-[7px]" : "-left-[7px]"}`} viewBox="0 0 8 13" fill="none">
      <path d={side === "self" ? "M0 13V0C0 0 3.5 2 5.5 4C7.5 6 8 8 8 8L0 13Z" : "M8 13V0C8 0 4.5 2 2.5 4C0.5 6 0 8 0 8L8 13Z"} fill="currentColor" className={colorClass} />
    </svg>
  );
}

export default function CustomerChatDetail() {
  const { t, direction } = useI18n();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [conv, setConv] = useState<Conv | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const fetchConv = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/${id}`);
      if (!res.ok) { router.push("/chat"); return; }
      const data = await res.json();
      setConv(data);
    } catch { router.push("/chat"); }
  }, [id, router]);

  useEffect(() => { fetchConv(); }, [fetchConv]);
  useEffect(() => { const iv = setInterval(fetchConv, 5000); return () => clearInterval(iv); }, [fetchConv]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [conv?.messages]);

  useEffect(() => {
    if (conv?.messages?.length) {
      fetch(`/api/chat/${id}/read`, { method: "PATCH" }).catch(() => {});
    }
  }, [id, conv?.messages?.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || conv?.status === "CLOSED") return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch(`/api/chat/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const msg = await res.json();
        setConv(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : prev);
      }
    } catch {}
    setSending(false);
  };

  if (!conv) return null;

  return (
    <div className="mx-auto max-w-2xl flex flex-col h-[calc(100vh-8rem)] bg-background overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-orange-600 dark:from-primary dark:to-orange-600 text-white shrink-0 shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/chat" className="p-1 text-white/90 hover:text-white transition-colors">
            <ArrowLeft className={`h-5 w-5 ${direction === "rtl" ? "rotate-180" : ""}`} />
          </Link>
          <div className="h-10 w-10 rounded-full flex items-center justify-center bg-white/20 border-2 border-white/30 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{conv.subject || t("chat.admin")}</p>
            <p className="text-xs text-white/80">
              {conv.status === "CLOSED" ? t("chat.closed") : conv.admin ? t("chat.admin") : t("chat.waiting")}
            </p>
          </div>
          <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${conv.status === "CLOSED" ? "bg-white/20 text-white" : "bg-green-500/80 text-white"}`}>
            {conv.status === "CLOSED" ? t("chat.closed") : conv.admin ? "متصل" : t("chat.waiting")}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1 bg-gradient-to-b from-primary/5 to-transparent">
        {conv.messages.map((msg, idx) => {
          const isAdmin = msg.sender.role === "ADMIN";
          const prevMsg = conv.messages[idx - 1];
          const nextMsg = conv.messages[idx + 1];
          const isFirstInGroup = !prevMsg || prevMsg.sender.role !== msg.sender.role;
          const isLastInGroup = !nextMsg || nextMsg.sender.role !== msg.sender.role;
          return (
            <div key={msg.id} className={`flex ${isFirstInGroup ? "mt-3" : "mt-0.5"}`}>
              <div className={`relative max-w-[75%] px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                isAdmin
                  ? `mr-auto bg-card border border-border text-foreground ${isLastInGroup ? "rounded-2xl rounded-bl-none" : "rounded-2xl"}`
                  : `ml-auto bg-primary text-primary-foreground ${isLastInGroup ? "rounded-2xl rounded-br-none" : "rounded-2xl"}`
              }`}>
                {isLastInGroup && (
                  <BubbleTail side={isAdmin ? "other" : "self"} colorClass={isAdmin ? "text-card" : "text-primary"} />
                )}
                <p className="whitespace-pre-wrap" dir="auto">{msg.content}</p>
                <p className={`text-[11px] mt-1 text-right ${isAdmin ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {conv.status !== "CLOSED" && (
        <div className="px-3 py-3 border-t border-border bg-card shrink-0">
          <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t("chat.placeholder")}
              className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground"
              disabled={sending}
            />
            <button type="submit" disabled={sending || !input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-primary to-orange-600 text-primary-foreground shadow-md disabled:opacity-50 hover:shadow-lg hover:scale-105 transition-all shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
