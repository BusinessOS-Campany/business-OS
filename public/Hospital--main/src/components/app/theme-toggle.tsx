"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon, MonitorIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("locale");

  const Icon = theme === "dark" ? MoonIcon : theme === "light" ? SunIcon : MonitorIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("theme")}>
          <Icon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>{t("theme")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(
          [
            ["light", SunIcon, t("light")],
            ["dark", MoonIcon, t("dark")],
            ["system", MonitorIcon, t("system")],
          ] as const
        ).map(([value, Icon, label]) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={theme === value ? "bg-accent" : ""}
          >
            <Icon className="size-4" />
            {label}
            {theme === value && <span className="ms-auto text-success">•</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}