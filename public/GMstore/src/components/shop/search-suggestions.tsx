"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, Mic, X, Clock, TrendingUp, ImageIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

const TRENDING = ["سماعات", "ساعة", "عطر", "قهوة", "جوال", "لابتوب"];
const HISTORY_KEY = "searchHistory";
const MAX_HISTORY = 8;

interface SearchProduct {
  id: string; name: string; nameEn: string; slug: string; price: number;
  images: string[]; discount: number;
  category: { name: string; nameEn: string; slug: string };
}

function getHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}

function addToHistory(q: string) {
  const h = getHistory().filter(x => x !== q);
  h.unshift(q);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HISTORY)));
}

export function SearchSuggestions({ query, onSelect, onClose, closeSearch }: {
  query: string; onSelect?: () => void; onClose?: () => void; closeSearch?: () => void;
}) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [listening, setListening] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { setHistory(getHistory()); }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < 1) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query.trim())}&limit=8`);
        if (res.ok) setResults(await res.json());
      } catch {}
    }, 200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose?.();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  function go(url: string) {
    if (query.trim()) addToHistory(query.trim());
    onSelect?.();
    closeSearch?.();
    router.push(url);
  }

  function startVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = locale === "ar" ? "ar-SA" : "en-US";
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      go(`/products?q=${encodeURIComponent(transcript)}`);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  function removeFromHistory(q: string) {
    const h = getHistory().filter(x => x !== q);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    setHistory(h);
  }

  const showHistory = !query.trim() && history.length > 0;
  const showTrending = !query.trim() && history.length === 0;
  const showResults = query.trim().length > 0;

  return (
    <div ref={ref} className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-border rounded-xl shadow-xl z-50 overflow-hidden">
      {showHistory && (
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> سجل البحث
            </span>
          </div>
          <div className="space-y-0.5">
            {history.map(h => (
              <div key={h} className="flex items-center justify-between group">
                <button onClick={() => go(`/products?q=${encodeURIComponent(h)}`)} className="flex-1 text-right text-sm text-foreground/80 hover:text-[var(--primary)] py-1.5 px-2 rounded-lg hover:bg-muted transition-colors truncate">
                  {h}
                </button>
                <button onClick={() => removeFromHistory(h)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-all">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTrending && (
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">عمليات البحث الشائعة</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TRENDING.map(term => (
              <button key={term} onClick={() => go(`/products?q=${encodeURIComponent(term)}`)} className="text-xs bg-muted hover:bg-[var(--primary)] hover:text-white text-foreground/80 px-2.5 py-1 rounded-full transition-colors">
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {showResults && (
        <div>
          <button onClick={() => go(`/products?q=${encodeURIComponent(query.trim())}`)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-muted transition-colors border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span>بحث عن &quot;{query.trim()}&quot;</span>
          </button>

          {results.length > 0 && (
            <div className="max-h-[360px] overflow-y-auto">
              {results.map(p => (
                <Link key={p.id} href={`/products/${p.slug}`} onClick={() => go(`/products/${p.slug}`)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors border-b border-border/50 last:border-0">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden relative">
                    {p.images?.[0] ? (
                      <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="40px" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{locale === "ar" ? p.name : (p.nameEn || p.name)}</p>
                    <p className="text-xs text-muted-foreground truncate">{locale === "ar" ? (p.category?.name || "") : (p.category?.nameEn || "")}</p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--primary)] shrink-0">{Number(p.price).toLocaleString()} ريال</span>
                </Link>
              ))}
            </div>
          )}

          {results.length === 0 && query.trim().length >= 1 && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              {t("products.no_results")}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
        <button onClick={startVoice} className={`flex items-center gap-1.5 text-xs ${listening ? "text-[var(--primary)]" : "text-muted-foreground"} hover:text-[var(--primary)] transition-colors`}>
          <Mic className={`h-3.5 w-3.5 ${listening ? "animate-pulse" : ""}`} />
          {listening ? t("products.voice_listening") : t("products.voice_search")}
        </button>
        <span className="text-[10px] text-muted-foreground">↵ {t("products.search_confirm")}</span>
      </div>
    </div>
  );
}
