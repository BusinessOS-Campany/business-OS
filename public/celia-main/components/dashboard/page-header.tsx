"use client";

import { useMemo } from "react";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  todayLabel?: string;
  title?: string;
  titleKey?: string;
  breadcrumb?: BreadcrumbItem[];
}

function lookupTitle(dict: Dictionary, path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], dict);
  return typeof value === "string" ? value : "";
}

export function PageHeader({ todayLabel, title, titleKey, breadcrumb }: PageHeaderProps) {
  const { locale, t } = useLocale();

  const resolvedTodayLabel = useMemo(
    () =>
      todayLabel ??
      new Date().toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [todayLabel, locale],
  );

  const resolvedTitle =
    title ?? (titleKey ? lookupTitle(t, titleKey) : t.dashboard.title);
  const resolvedBreadcrumb = breadcrumb ?? [
    { label: t.header.home, href: "/" },
    { label: resolvedTitle },
  ];

  return (
    <>
      <div className="mb-4">
        <h1 className="text-lg font-extrabold text-foreground">{resolvedTitle}</h1>
        <p className="text-xs text-muted-foreground">{resolvedTodayLabel}</p>
      </div>

      <nav className="mb-4 text-sm text-muted-foreground" aria-label={t.dashboard.breadcrumbLabel}>
        <ol className="flex items-center gap-1.5">
          {resolvedBreadcrumb.map((item, index) => (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && <span aria-hidden="true">/</span>}
              {item.href ? (
                <a href={item.href} className="transition-colors hover:text-foreground">
                  {item.label}
                </a>
              ) : (
                <span className="font-semibold text-foreground" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
