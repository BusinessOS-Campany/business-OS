"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SearchIcon, CornerDownLeftIcon, Loader2Icon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NAV_SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: "patients" | "doctors" | "invoices" | "appointments" | "labs" | "rads" | "prescriptions";
  label: string;
  sublabel: string;
  href: string;
}

interface SearchResponse {
  results: SearchResult[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  can: (module: string, action?: string) => boolean;
  locale: string;
}

export function CommandPalette({ open, onOpenChange, can, locale }: CommandPaletteProps) {
  const router = useRouter();
  const t = useTranslations();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(null);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setActive(0);
    }
  }, [open]);

  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const runSearch = React.useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&l=${locale}`);
        if (!res.ok) return;
        const json = (await res.json()) as SearchResponse;
        setResults(json.results);
        setActive(0);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [locale]
  );

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(value), 250);
  };

  const navItems =
    NAV_SECTIONS.flatMap((s) => s.items).filter(
      (i) => !i.permission || can(i.permission.module, i.permission.action ?? "read")
    ) ?? [];

  const filteredNav = navItems.filter((i) =>
    t(`nav.${i.label}`).toLowerCase().includes(query.toLowerCase())
  );

  const typeLabels: Record<SearchResult["type"], string> = {
    patients: t("search.patients"),
    doctors: t("search.doctors"),
    invoices: t("search.invoices"),
    appointments: t("search.appointments"),
    labs: t("search.labs"),
    rads: t("search.rads"),
    prescriptions: t("search.prescriptions"),
  };

  const total = filteredNav.length + results.length;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(total - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active < filteredNav.length && filteredNav[active]) {
        go(filteredNav[active].href);
      } else {
        const r = results[active - filteredNav.length];
        if (r) go(r.href);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <div className="flex items-center gap-2 border-b px-4">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("search.placeholder")}
            className="h-12 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {searching && <Loader2Icon className="size-4 shrink-0 animate-spin text-muted-foreground" />}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Esc
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {total === 0 && !searching && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {query ? t("search.noResults", { query }) : t("search.global")}
            </p>
          )}
          {query.trim() === "" && (
            <div>
              <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("common.today_no") && t("nav.dashboard")} · Navigation
              </p>
              {filteredNav.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => go(item.href)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors rtl:text-right",
                      active === i ? "bg-accent" : "hover:bg-accent/60"
                    )}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="flex-1">{t(`nav.${item.label}`)}</span>
                  </button>
                );
              })}
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={r.type + r.label}
              onClick={() => go(r.href)}
              onMouseEnter={() => setActive(filteredNav.length + i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors rtl:text-right",
                active === filteredNav.length + i ? "bg-accent" : "hover:bg-accent/60"
              )}
            >
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary shrink-0">
                {typeLabels[r.type]}
              </span>
              <span className="flex-1 truncate">
                <span className="block truncate">{r.label}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {r.sublabel}
                </span>
              </span>
              <CornerDownLeftIcon className="size-3.5 text-muted-foreground/60" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}