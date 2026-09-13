"use client";

import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/i18n/locale-provider";

interface LogoProps {
  className?: string;
  showText?: boolean;
  dark?: boolean;
}

export function Logo({ className, showText = true, dark = false }: LogoProps) {
  const { t } = useLocale();
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src="/celia/cafe-os-logo.svg"
        alt={t.brand.logoAlt}
        className="h-10 w-auto shrink-0 rounded-lg object-contain"
      />
      {showText && (
        <span className={cn("text-xl font-extrabold tracking-tight", dark ? "text-white" : "text-foreground")}>
          {t.brand.name}
        </span>
      )}
    </div>
  );
}