"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Store,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  Search,
  Sun,
  Moon,
  Languages,
  Bell,
  LogOut,
  UserCircle2,
  Settings,
  Check,
  ChevronsUpDown,
  Building2,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Avatar from "@radix-ui/react-avatar";
import { NAV_GROUPS, type NavItem } from "@/lib/nav";
import { useLang } from "@/i18n/LanguageProvider";
import { useAuthStore, type AuthBranch } from "@/store/auth";
import { BRANCH_COOKIE } from "@/lib/constants";

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  companyName: string;
  permissions: string[];
  isSuperAdmin: boolean;
  branches: AuthBranch[];
  activeBranchId: string;
  activeBranchName: string;
  unreadCount: number;
}

export function AppShell({
  children,
  user,
  companyName,
  permissions,
  isSuperAdmin,
  branches,
  activeBranchId,
  activeBranchName,
  unreadCount,
}: AppShellProps) {
  const { t, lang, setLang } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const clear = useAuthStore((s) => s.clear);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const hasAccess = (item: NavItem) =>
    isSuperAdmin || !item.permission || permissions.includes(item.permission);

  async function handleLogout() {
    try {
      await fetch("/pos/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    clear();
    router.push("/login");
    router.refresh();
  }

  function switchBranch(b: AuthBranch) {
    document.cookie = `${BRANCH_COOKIE}=${b.id};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  }

  const currentLabel = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.href === pathname)?.labelKey;

  const SidebarContent = (
    <aside
      className={`flex h-full flex-col border-inline-end border-border bg-card/60 backdrop-blur-sm ${
        collapsed ? "w-[68px]" : "w-60"
      } transition-all duration-200`}
    >
      {/* Brand */}
      <div className={`flex h-14 items-center gap-2.5 border-b border-border px-3 ${collapsed ? "justify-center" : ""}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <Store className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">{t("app.name")}</p>
            <p className="truncate text-[11px] text-muted-foreground">{companyName}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {NAV_GROUPS.map((group, gi) => {
          const items = group.items.filter(hasAccess);
          if (items.length === 0) return null;
          return (
            <div key={gi} className="mb-4">
              {!collapsed && (
                <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  {t(group.titleKey)}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        title={collapsed ? t(item.labelKey) : undefined}
                        className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                          active
                            ? "bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        } ${collapsed ? "justify-center" : ""}`}
                      >
                        <item.icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-emerald-600 dark:text-emerald-400" : ""}`} />
                        {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Collapse */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="hidden h-10 items-center justify-center gap-2 border-t border-border text-xs font-medium text-muted-foreground transition hover:text-foreground lg:flex"
      >
        {collapsed ? <ChevronsRight className="h-4 w-4 rtl:rotate-180" /> : <ChevronsLeft className="h-4 w-4 rtl:rotate-180" />}
        {!collapsed && t("common.more")}
      </button>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">{SidebarContent}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-64">{SidebarContent}</div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/60 px-3 backdrop-blur-sm lg:px-5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted/60 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="min-w-0 flex-1 truncate text-base font-bold">
            {currentLabel ? t(currentLabel) : t("app.name")}
          </h1>

          {/* Search (desktop) */}
          <div className="relative hidden md:block">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder={t("nav.search")}
              className="h-9 w-44 rounded-lg border border-input bg-background ps-9 pe-3 text-sm outline-none transition focus:w-56 focus:border-emerald-500 lg:w-56"
            />
          </div>

          {/* Branch switcher */}
          {branches.length > 0 && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="hidden h-9 max-w-44 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium transition hover:border-emerald-500 sm:flex"
                >
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{activeBranchName || t("common.select")}</span>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align={lang === "ar" ? "end" : "start"}
                  sideOffset={6}
                  className="z-50 w-56 rounded-xl border border-border bg-popover p-1.5 shadow-xl"
                >
                  <p className="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">{t("auth.switchBranch")}</p>
                  {branches.map((b) => (
                    <DropdownMenu.Item
                      key={b.id}
                      onSelect={() => switchBranch(b)}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition hover:bg-muted/60 data-[highlighted]:bg-muted/60"
                    >
                      <span className="flex-1 truncate">{lang === "ar" && b.nameAr ? b.nameAr : b.name}</span>
                      {b.id === activeBranchId && <Check className="h-4 w-4 text-emerald-600" />}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}

          {/* Language */}
          <button
            type="button"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
            title={t("auth.language")}
          >
            <Languages className="h-[18px] w-[18px]" />
          </button>

          {/* Theme */}
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
            title={t("settings.theme")}
          >
            {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>

          {/* Notifications */}
          <Link
            href="/notifications"
            className="relative rounded-lg p-2 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>

          {/* User menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button type="button" className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-muted/60">
                <Avatar.Root className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  <Avatar.Image src={user.avatar || undefined} alt={user.name} />
                  <Avatar.Fallback>
                    {user.name.trim().charAt(0).toUpperCase()}
                  </Avatar.Fallback>
                </Avatar.Root>
                <span className="hidden max-w-32 truncate text-sm font-medium lg:block">{user.name}</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-50 w-56 rounded-xl border border-border bg-popover p-1.5 shadow-xl"
              >
                <div className="mb-1 border-b border-border px-2.5 py-2">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenu.Item asChild className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition hover:bg-muted/60">
                  <Link href="/settings/users">
                    <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                    {t("settings.users")}
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition hover:bg-muted/60">
                  <Link href="/settings">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    {t("settings.settings")}
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <DropdownMenu.Item
                  onSelect={() => void handleLogout()}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-destructive outline-none transition hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  {t("auth.signOut")}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </header>

        {/* Content */}
        <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}