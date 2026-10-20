"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { filterSections, getSidebarSections, type SidebarLink, type SidebarSection } from "@/lib/nav";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Logo } from "@/components/brand/logo";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onClose: () => void;
  permissions?: string[];
}

export function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onClose, permissions = [] }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [toggled, setToggled] = useState<Set<string>>(() => new Set());

  const sections = useMemo(
    () => filterSections(getSidebarSections(t), permissions),
    [t, permissions],
  );

  useEffect(() => {
    const routes = new Set<string>();
    const walk = (links: SidebarLink[]) => {
      for (const link of links) {
        if (link.href) routes.add(link.href);
        if (link.children?.length) walk(link.children);
      }
    };
    for (const section of sections) walk(section.links);
    for (const route of routes) router.prefetch(route);
  }, [router, sections]);

  function toggle(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
    setToggled((prev) => new Set(prev).add(label));
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 sm:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-40 flex w-72 flex-col border-e border-border bg-card shadow-lg transition-transform duration-200 sm:hidden",
          mobileOpen ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full",
        )}
      >
        <MobileHeader onClose={onClose} />
        <SidebarNav
          sections={sections}
          collapsed={false}
          expanded={expanded}
          toggled={toggled}
          onToggle={toggle}
          pathname={pathname}
        />
      </aside>

      <aside
        className={cn(
          "relative z-30 hidden flex-col border-e border-border bg-card transition-[width] duration-300 sm:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <DesktopHeader collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />
        <SidebarNav
          sections={sections}
          collapsed={collapsed}
          expanded={expanded}
          toggled={toggled}
          onToggle={toggle}
          pathname={pathname}
        />
      </aside>
    </>
  );
}

function MobileHeader({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  return (
    <div className="flex h-16 items-center justify-between border-b border-border px-5">
      <Logo />
      <button
        type="button"
        onClick={onClose}
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={t.header.closeMenu}
      >
        <X className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

function DesktopHeader({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void }) {
  const { t } = useLocale();
  return (
    <div
      className={cn(
        "flex h-16 shrink-0 items-center border-b border-border",
        collapsed ? "justify-center px-0" : "justify-between px-3",
      )}
    >
      {!collapsed && <Logo />}
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={collapsed ? t.header.openMenu : t.header.closeMenu}
        aria-expanded={!collapsed}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

interface SidebarNavProps {
  sections: SidebarSection[];
  collapsed: boolean;
  expanded: Set<string>;
  toggled: Set<string>;
  onToggle: (label: string) => void;
  pathname: string;
}

function SidebarNav({ sections, collapsed, expanded, toggled, onToggle, pathname }: SidebarNavProps) {
  return (
    <nav
      className={cn(
        "flex-1 space-y-3 py-3",
        collapsed ? "overflow-visible px-1" : "overflow-y-auto px-3 py-4",
      )}
    >
      {sections.map((section, sectionIndex) => (
        <div key={section.heading ?? `section-${sectionIndex}`}>
          {section.heading && !collapsed && (
            <div className="mb-1 px-3 pt-3 text-[11px] font-bold tracking-wide text-muted-foreground/70">
              {section.heading}
            </div>
          )}
          <ul className="space-y-1">
            {section.links.map((link) =>
              collapsed ? (
                <CollapsedItem key={link.label} link={link} pathname={pathname} />
              ) : (
                <TreeItem
                  key={link.label}
                  link={link}
                  depth={0}
                  expanded={expanded}
                  toggled={toggled}
                  onToggle={onToggle}
                  pathname={pathname}
                />
              ),
            )}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function CollapsedItem({ link, pathname }: { link: SidebarLink; pathname: string }) {
  const children = link.children ?? [];
  const singleLeaf = children.length === 1 && !(children[0].children && children[0].children.length > 0);
  const href = singleLeaf ? children[0].href : link.href;
  const flyoutChildren = singleLeaf ? [] : children;
  const active = containsActive(link, pathname);
  const Icon = link.icon;

  return (
    <li className="group relative">
      <Link
        href={href ?? "#"}
        className={cn(
          "mx-auto flex size-12 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          active && "bg-muted text-foreground",
        )}
        title={link.label}
      >
        {Icon && <Icon className="size-5 shrink-0" aria-hidden="true" />}
      </Link>

      <div className="pointer-events-none invisible absolute start-full top-0 z-50 ps-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100">
        <div className="w-56 rounded-xl border border-border bg-card p-1.5 shadow-lg">
          <div className="px-3 py-1.5 text-xs font-bold text-muted-foreground/80">{link.label}</div>
          {flyoutChildren.length === 0 ? (
            <Link
              href={href ?? "#"}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
              <span className="truncate">{link.label}</span>
            </Link>
          ) : (
            <ul className="space-y-0.5">
              {flyoutChildren.map((child) => (
                <FlyoutChild key={child.label} child={child} pathname={pathname} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

function FlyoutChild({ child, pathname }: { child: SidebarLink; pathname: string }) {
  const kids = child.children ?? [];
  if (kids.length > 0) {
    return (
      <li>
        <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground">
          {child.icon && <child.icon className="size-4 shrink-0" aria-hidden="true" />}
          <span className="truncate">{child.label}</span>
        </div>
        <ul className="ms-3 space-y-0.5 border-s border-border ps-1">
          {kids.map((kid) => (
            <FlyoutChild key={kid.label} child={kid} pathname={pathname} />
          ))}
        </ul>
      </li>
    );
  }

  const active = child.href === pathname;
  return (
    <li>
      <Link
        href={child.href ?? "#"}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
          active
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {child.icon && <child.icon className="size-4 shrink-0" aria-hidden="true" />}
        <span className="truncate">{child.label}</span>
      </Link>
    </li>
  );
}

interface TreeItemProps {
  link: SidebarLink;
  depth: number;
  expanded: Set<string>;
  toggled: Set<string>;
  onToggle: (label: string) => void;
  pathname: string;
}

function TreeItem({ link, depth, expanded, toggled, onToggle, pathname }: TreeItemProps) {
  const children = link.children ?? [];
  const singleLeafChild =
    children.length === 1 && !(children[0].children && children[0].children.length > 0);

  if (children.length > 0 && !singleLeafChild) {
    const userToggled = toggled.has(link.label);
    const isExpanded = userToggled ? expanded.has(link.label) : containsActive(link, pathname);
    const hasActiveChild = containsActive(link, pathname);

    return (
      <li>
        <button
          type="button"
          onClick={() => onToggle(link.label)}
          aria-expanded={isExpanded}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
            hasActiveChild
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <span className="flex min-w-0 items-center gap-3">
            {link.icon && <link.icon className="size-4 shrink-0" aria-hidden="true" />}
            <span className="truncate">{link.label}</span>
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 transition-transform duration-200",
              isExpanded && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
        {isExpanded && (
          <ul className={cn("mt-1 space-y-1", depth === 0 && "ps-3")}>
            {children.map((child) => (
              <TreeItem
                key={child.label}
                link={child}
                depth={depth + 1}
                expanded={expanded}
                toggled={toggled}
                onToggle={onToggle}
                pathname={pathname}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const href = singleLeafChild ? (children[0].href ?? "#") : (link.href ?? "#");
  const active = singleLeafChild ? containsActive(link, pathname) : link.href === pathname;

  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
          active
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {link.icon && <link.icon className="size-4 shrink-0" aria-hidden="true" />}
        <span className="truncate">{link.label}</span>
      </Link>
    </li>
  );
}

function containsActive(link: SidebarLink, pathname: string): boolean {
  if (link.href === pathname) return true;
  return !!link.children?.some((child) => containsActive(child, pathname));
}
