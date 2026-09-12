"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

interface DashboardShellProps {
  user: { name: string; role?: string | null; permissions?: string[] };
  children?: ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = "celia-sidebar-collapsed";

const sidebarCollapsedListeners = new Set<() => void>();

function subscribeSidebarCollapsed(callback: () => void) {
  sidebarCollapsedListeners.add(callback);
  return () => {
    sidebarCollapsedListeners.delete(callback);
  };
}

function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
}

function toggleSidebarCollapsed() {
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, readSidebarCollapsed() ? "0" : "1");
  sidebarCollapsedListeners.forEach((callback) => callback());
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    readSidebarCollapsed,
    () => false,
  );

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        permissions={user.permissions}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={user}
          onToggleSidebar={() => setMobileOpen(true)}
          onToggleCollapsed={toggleSidebarCollapsed}
        />

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
