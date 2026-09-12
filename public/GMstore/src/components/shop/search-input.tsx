"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { SearchSuggestions } from "./search-suggestions";

export function SearchInput() {
  const router = useRouter();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/products?q=${encodeURIComponent(query.trim())}`);
      setFocused(false);
    }
  }

  function closeSearch() {
    setFocused(false);
    inputRef.current?.blur();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="relative w-48">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        placeholder={t("nav.search")}
        className="w-full rounded-full border border-border bg-muted/50 px-4 py-1.5 ps-9 text-sm text-foreground outline-none focus:border-primary transition-colors"
      />
      <button type="submit" className="absolute start-2 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-primary transition-colors">
        <Search className="h-4 w-4" />
      </button>
      {focused && (query.trim() || !query.trim()) && (
        <SearchSuggestions query={query} onSelect={closeSearch} closeSearch={closeSearch} onClose={closeSearch} />
      )}
    </form>
  );
}
