"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { LanguagesIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALE_COOKIE } from "@/i18n";

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();

  const switchTo = (next: string) => {
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000`;
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Language"
          className="font-medium"
        >
          <LanguagesIcon className="size-4" />
          <span className="text-xs uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {(
          [
            ["ar", "العربية"],
            ["en", "English"],
          ] as const
        ).map(([code, label]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => switchTo(code)}
            className={locale === code ? "bg-accent" : ""}
            dir={code === "ar" ? "rtl" : "ltr"}
          >
            {label}
            {locale === code && <CheckIcon className="ms-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}