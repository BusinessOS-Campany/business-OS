"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { CommandPalette } from "@/components/app/command-palette";
import type { ClientUser } from "@/lib/auth";
import { NAV_SECTIONS, type NavSection, type NavItem } from "@/lib/nav";

function filterItems(items: NavItem[], can: (m: string, a?: string) => boolean): NavItem[] {
  return items
    .map((item) => ({
      ...item,
      children: item.children ? filterItems(item.children, can) : undefined,
    }))
    .filter(
      (item) =>
        !item.permission || can(item.permission.module, item.permission.action ?? "read")
    );
}

interface AppShellClientProps {
  user: ClientUser;
  brandName: string;
  notifications: {
    id: string;
    title: string;
    body?: string | null;
    type: "INFO" | "SUCCESS" | "WARNING" | "DANGER";
    link?: string | null;
    readAt?: string | null;
    createdAt: string;
  }[];
  unreadCount: number;
  children: React.ReactNode;
}

export function AppShellClient({
  user,
  brandName,
  notifications,
  unreadCount,
  children,
}: AppShellClientProps) {
  const locale = useLocale();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("ycm_sidebar_collapsed");
      if (saved === "1") setCollapsed(true);
    } catch {}
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
      if (e.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const can = (module: string, action?: string) => {
    if (user.isAdmin) return true;
    if (!action) {
      return (
        user.permissions.includes(`${module}:manage`) ||
        user.permissions.includes(`${module}:read`)
      );
    }
    return (
      user.permissions.includes(`${module}:${action}`) ||
      user.permissions.includes(`${module}:manage`)
    );
  };

  const sections: NavSection[] = NAV_SECTIONS.map((section) => ({
    ...section,
    items: filterItems(section.items, can),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        sections={sections}
        collapsed={collapsed}
        onToggleCollapsed={() => {
          setCollapsed((c) => {
            try {
              localStorage.setItem("ycm_sidebar_collapsed", (!c ? "1" : "0"));
            } catch {}
            return !c;
          });
        }}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        footer={null}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          notifications={notifications}
          unreadCount={unreadCount}
          onOpenMenu={() => setMobileOpen(true)}
          onOpenCommand={() => setCommandOpen(true)}
          brandName={brandName}
        />
        <main className="app-glow flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-5 lg:p-6">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        can={can}
        locale={locale}
      />
    </div>
  );
}