"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  SearchIcon,
  BellIcon,
  MenuIcon,
  ZapIcon,
  LogOutIcon,
  SettingsIcon,
  UserRoundIcon,
  CheckCheckIcon,
  ChevronDownIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { LanguageToggle } from "@/components/app/language-toggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QUICK_ACTIONS } from "@/lib/nav";
import { initials } from "@/lib/utils";
import { markAllNotificationsReadAction } from "@/actions/notifications";
import { logoutAction } from "@/actions/auth";
import type { ClientUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  title: string;
  body?: string | null;
  type: "INFO" | "SUCCESS" | "WARNING" | "DANGER";
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
}

interface TopbarProps {
  user: ClientUser;
  notifications: NotificationItem[];
  unreadCount: number;
  onOpenMenu: () => void;
  onOpenCommand: () => void;
  brandName: string;
}

const typeDot: Record<string, string> = {
  INFO: "bg-info",
  SUCCESS: "bg-success",
  WARNING: "bg-warning",
  DANGER: "bg-destructive",
};

export function Topbar({
  user,
  notifications,
  unreadCount,
  onOpenMenu,
  onOpenCommand,
  brandName,
}: TopbarProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const [unread, setUnread] = React.useState(unreadCount);
  const [items, setItems] = React.useState(notifications);
  const [marking, setMarking] = React.useState(false);

  const quickActions = QUICK_ACTIONS.filter(
    (qa) =>
      user.isAdmin ||
      qa.permission.action === undefined ||
      ((user.permissionMap as Record<string, string[]>)[qa.permission.module] ?? []).includes(
        qa.permission.action ?? "create"
      )
  );

  const markAllRead = async () => {
    if (unread === 0 || marking) return;
    setMarking(true);
    const res = await markAllNotificationsReadAction();
    if (res.ok) {
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
      toast.success(t("notifications.title"));
    }
    setMarking(false);
  };

  const displayName = (locale: string) =>
    locale === "ar" ? user.nameAr || user.nameEn : user.nameEn || user.nameAr;

  return (
    <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMenu}
        aria-label="Open menu"
      >
        <MenuIcon className="size-5" />
      </Button>

      <button
        onClick={onOpenCommand}
        className="group hidden h-9 w-full max-w-sm items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:border-ring/60 hover:bg-muted/60 sm:flex"
      >
        <SearchIcon className="size-4" />
        <span className="flex-1 truncate text-start">{t("search.placeholder")}</span>
        <kbd className="pointer-events-none inline-flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          Ctrl K
        </kbd>
      </button>

      <button
        onClick={onOpenCommand}
        className="flex h-9 items-center gap-2 rounded-md border bg-muted/40 px-2.5 text-sm text-muted-foreground sm:hidden"
        aria-label={t("search.placeholder")}
      >
        <SearchIcon className="size-4" />
      </button>

      <div className="ms-auto flex items-center gap-1">
        <span className="hidden truncate rounded-full border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground md:inline-block">
          {brandName}
        </span>

        {/* Quick actions */}
        {quickActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("dashboard.quickActions")}>
                <ZapIcon className="size-4.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t("dashboard.quickActions")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {quickActions.map((qa) => {
                const Icon = qa.icon;
                return (
                  <Link key={qa.key} href={qa.href}>
                    <DropdownMenuItem className="cursor-pointer">
                      <Icon className="size-4" />
                      {qa.key === "registerPatient"
                          ? t("patients.new")
                          : qa.key === "newAppointment"
                          ? t("appointments.new")
                          : qa.key === "newConsultation"
                          ? t("encounters.new")
                          : qa.key === "emergencyPatient"
                          ? t("emergency.title")
                          : qa.key === "createInvoice"
                          ? t("billing.newInvoice")
                          : qa.key === "labOrder"
                          ? t("laboratory.newOrder")
                          : qa.key === "admitPatient"
                          ? t("admissions.new")
                          : t("pharmacy.newMedicine")}
                    </DropdownMenuItem>
                  </Link>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("notifications.title")}
              className="relative"
            >
              <BellIcon className="size-4.5" />
              {unread > 0 && (
                <span className="absolute -end-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[22rem] p-0" sideOffset={8}>
            <div className="flex items-center justify-between border-b px-3 py-2.5">
              <p className="text-sm font-semibold">{t("notifications.title")}</p>
              <button
                onClick={markAllRead}
                disabled={unread === 0}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <CheckCheckIcon className="size-3.5" />
                {t("notifications.markAllRead")}
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <BellIcon className="mx-auto size-6 text-muted-foreground/50" />
                  <p className="mt-2 text-sm">{t("notifications.empty")}</p>
                  <p className="text-xs text-muted-foreground">{t("notifications.emptyHint")}</p>
                </div>
              ) : (
                items.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link ?? "#"}
                    className={cn(
                      "flex gap-2.5 px-3 py-2.5 transition-colors hover:bg-accent/60 border-b last:border-0",
                      !n.readAt && "bg-accent/30"
                    )}
                  >
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", typeDot[n.type])} />
                    <span className="min-w-0">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground/70">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </span>
                  </Link>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <ThemeToggle />
        <LanguageToggle />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ms-1 flex items-center gap-2 rounded-full py-1 pe-1 ps-1 transition-colors hover:bg-accent sm:ps-2">
              <Avatar className="size-8">
                {user.isAdmin ? (
                  <AvatarFallback className="bg-gradient-to-br from-teal-600 to-sky-800 text-white">
                    {initials(user.nameEn || user.nameAr || user.email)}
                  </AvatarFallback>
                ) : (
                  <AvatarFallback>
                    {initials(user.nameEn || user.nameAr || user.email)}
                  </AvatarFallback>
                )}
              </Avatar>
              <ChevronDownIcon className="hidden size-3.5 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">
                {pathname?.startsWith("/ar")
                  ? user.nameAr || user.nameEn
                  : user.nameEn || user.nameAr}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <Badge variant="outline" className="mt-1">
                {pathname?.startsWith("/ar") ? user.roleNameAr : user.roleNameEn}
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/dashboard">
              <DropdownMenuItem className="cursor-pointer">
                <UserRoundIcon className="size-4" />
                Dashboard
              </DropdownMenuItem>
            </Link>
            <Link href="/settings">
              <DropdownMenuItem className="cursor-pointer">
                <SettingsIcon className="size-4" />
                {t("settings.title")}
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <form action={logoutAction}>
              <button type="submit" className="w-full">
                <DropdownMenuItem variant="destructive" className="cursor-pointer">
                  <LogOutIcon className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}