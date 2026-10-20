"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, X, Send, Sparkles } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

function extractProductQuery(text: string): string | null {
  const patterns = [
    /ابحث\s+عن\s+(.+)/i, /دور\s+لي\s+(.+)/i, /(?:عندك|عندكم)\s+(.+)/i,
    /(?:ابي|أبي|بدي|ودي)\s+(.+)/i, /(?:ادور|دور)\s+على\s+(.+)/i,
    /search\s+(?:for\s+)?(.+)/i, /find\s+(.+)/i,
    /(?:looking\s+for|want)\s+(.+)/i,
    /(?:شنو|شو|وش|ماهو)\s+(.+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1] && m[1].length < 50) return m[1].trim();
  }
  return null;
}

function rankProducts(query: string, products: any[]): any[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return products
    .map((p) => {
      let score = 0;
      const searchText = `${p.name} ${p.nameEn || ""} ${p.description || ""} ${p.descriptionEn || ""} ${p.category?.name || ""} ${p.category?.nameEn || ""}`.toLowerCase();
      for (const word of words) {
        if (searchText.includes(word)) score += word.length;
      }
      if (searchText.includes(query.toLowerCase())) score += 100;
      return { product: p, score };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((p) => p.product);
}

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "مرحباً! أنا مساعد WANOSTORE الذكي. كيف يمكنني مساعدتك؟ 🛍️" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const allProducts = useRef<any[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && allProducts.current.length === 0) {
      fetch("/api/products")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) allProducts.current = data; })
        .catch(() => {});
    }
  }, [open]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })) }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.content) {
          setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
          setLoading(false);
          return;
        }
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error) {
          setMessages((prev) => [...prev, { role: "assistant", content: data.error }]);
          setLoading(false);
          return;
        }
      }
    } catch {}

    const products = allProducts.current;
    const productQuery = extractProductQuery(text) || text;
    const ranked = products.length ? rankProducts(productQuery, products) : [];

    if (ranked.length > 0) {
      const top = ranked.slice(0, 5);
      const lines = top.map((p: any) =>
        `🔸 **${p.name}** — ${Number(p.price).toFixed(2)} ريال${p.colors?.length ? `\n   الألوان: ${p.colors.join(" · ")}` : ""}\n   /products/${p.slug}`
      );
      const total = ranked.length > 5 ? `\n\nو ${ranked.length - 5} نتائج إضافية، تصفح الكل: /products?q=${encodeURIComponent(productQuery)}` : "";
      setMessages((prev) => [...prev, { role: "assistant", content: `وجدت هذه المنتجات:\n${lines.join("\n\n")}${total}` }]);
      setLoading(false);
      return;
    }

    setMessages((prev) => [...prev, { role: "assistant", content: "عذراً، واجهت مشكلة في الإجابة. حاول كتابة السؤال بشكل مختلف أو تصفح المنتجات: /products" }]);
    setLoading(false);
  }, [input, loading, messages]);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
        title="المساعد الذكي"
      >
        <Bot className="h-6 w-6" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-32 right-4 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            dir="rtl"
          >
            <div className="flex items-center justify-between bg-primary p-4 text-primary-foreground">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <span className="font-semibold text-sm">WANOSTORE AI</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-primary-foreground/20 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-80 overflow-y-auto p-4 space-y-3" style={{ scrollBehavior: "smooth" }}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === "user"
                        ? "bg-muted text-foreground rounded-br-sm"
                        : "bg-primary/10 text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.content.split(/(\/\w+(?:\?\w+=[^&\s]+)?)/g).map((part, j) =>
                      part.startsWith("/")
                        ? <a key={j} href={part} className="text-primary underline font-medium">{part}</a>
                        : part
                    )}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
                  <div className="bg-primary/10 rounded-2xl rounded-bl-sm px-4 py-3 text-sm">
                    <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      جاري التفكير...
                    </motion.span>
                  </div>
                </motion.div>
              )}
              <div ref={endRef} />
            </div>
            <div className="border-t border-border p-3">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="اسألني عن أي شيء..."
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary transition-colors"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
