"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronDownIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/app/brand-mark";
import { pathToNavKey } from "@/lib/nav";
import type { NavSection } from "@/lib/nav";

interface SidebarProps {
  sections: NavSection[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  footer: React.ReactNode;
}

export function Sidebar({
  sections,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  footer,
}: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const activeKey = pathToNavKey(pathname);
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({});

  const content = (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-2.5 border-b px-4 py-4", collapsed && "px-3 justify-center")}>
        <BrandMark size="sm" />
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">YemenCare</p>
            <p className="text-[10px] text-muted-foreground">Hospital System</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section) => {
          const isOpen = openSections[section.key] ?? activeKeyInSection(section, activeKey, pathname);
          const childrenVisible = !collapsed && isOpen;
          return (
            <div key={section.key} className="mb-1">
              {!collapsed && (
                <p className="mb-1 px-2 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(section.label)}
                </p>
              )}
              {collapsed && section.items.length > 1 && (
                <div className="mx-auto mb-1 h-px w-6 bg-border" />
              )}
              {section.items.map((item) => {
                const active =
                  item.href === pathname || activeKey === item.key;
                const Icon = item.icon;
                if (collapsed) {
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      title={t(item.label)}
                      className={cn(
                        "mb-1 flex h-10 items-center justify-center rounded-md transition-colors",
                        active
                          ? "bg-primary/10 text-primary dark:text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Icon className="size-5" />
                    </Link>
                  );
                }
                const hasChildren = item.children && item.children.length > 0;
                const childOpen = openSections[item.key] ?? false;
                if (hasChildren) {
                  return (
                    <React.Fragment key={item.key}>
                      <button
                        onClick={() =>
                          setOpenSections((s) => ({ ...s, [item.key]: !childOpen }))
                        }
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                          active
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <Icon className="size-4.5 shrink-0" />
                        <span className="flex-1 truncate text-start">{t(item.label)}</span>
                        <ChevronDownIcon
                          className={cn(
                            "size-3.5 text-muted-foreground transition-transform",
                            childOpen && "rotate-180"
                          )}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {childOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            {item.children!.map((child) => (
                              <Link
                                key={child.key}
                                href={child.href}
                                className="flex items-center gap-2 rounded-md py-1.5 pr-2 pl-7 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground rtl:pl-2 rtl:pr-7"
                              >
                                {t(child.label)}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                }
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute -start-0.5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary"
                      />
                    )}
                    <Icon className="size-4.5 shrink-0" />
                    <span className="truncate">{t(item.label)}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t p-2">
        {footer}
        <button
          onClick={onToggleCollapsed}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <PanelLeftOpenIcon className="size-4" />
          ) : (
            <>
              <PanelLeftCloseIcon className="size-4" />
              <span className="hidden lg:inline">Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 260 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        className="no-print hidden shrink-0 border-e bg-card lg:block overflow-hidden"
      >
        {content}
      </motion.aside>

      {/* Mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="no-print fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 26, stiffness: 260 }}
              className="no-print fixed inset-y-0 start-0 z-50 w-[280px] border-e bg-card lg:hidden"
            >
              {content}
              <button
                onClick={onCloseMobile}
                className="absolute end-3 top-4 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                aria-label="Close menu"
              >
                <XIcon className="size-4" />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function activeKeyInSection(
  section: NavSection,
  activeKey: string | null,
  pathname: string
): boolean {
  return section.items.some(
    (i) => i.key === activeKey || (i.children?.some((c) => c.href === pathname))
  );
}