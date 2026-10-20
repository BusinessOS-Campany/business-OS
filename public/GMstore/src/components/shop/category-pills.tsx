"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { ChevronDown, ChevronUp } from "lucide-react";

const INITIAL_COUNT = 10;

export function CategoryPills({ categories }: { categories: { id: string; slug: string; name: string; nameEn?: string | null }[] }) {
  const searchParams = useSearchParams();
  const { locale } = useI18n();
  const [showAll, setShowAll] = useState(false);

  const currentCategory = searchParams.get("category") || "";

  function filterUrl(slug: string | null) {
    const p = new URLSearchParams(searchParams.toString());
    if (slug) p.set("category", slug);
    else p.delete("category");
    p.delete("page");
    const qs = p.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  }

  const displayed = showAll ? categories : categories.slice(0, INITIAL_COUNT);
  const hasMore = categories.length > INITIAL_COUNT;

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <Link
        href={filterUrl(null)}
        className={`rounded-full px-4 py-1.5 text-sm border border-border transition-colors ${!currentCategory ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
      >
        {locale === "en" ? "All" : "الكل"}
      </Link>
      {displayed.map((c) => (
        <Link
          key={c.id}
          href={filterUrl(c.slug)}
          className={`rounded-full px-4 py-1.5 text-sm border border-border transition-colors ${currentCategory === c.slug ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
        >
          {locale === "en" && c.nameEn ? c.nameEn : c.name}
        </Link>
      ))}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="rounded-full px-4 py-1.5 text-sm border border-border hover:bg-muted transition-colors flex items-center gap-1"
        >
          {showAll ? (
            <>{locale === "en" ? "Show less" : "عرض أقل"} <ChevronUp className="h-4 w-4" /></>
          ) : (
            <>{locale === "en" ? `Show more (${categories.length - INITIAL_COUNT})` : `عرض المزيد (${categories.length - INITIAL_COUNT})`} <ChevronDown className="h-4 w-4" /></>
          )}
        </button>
      )}
    </div>
  );
}
