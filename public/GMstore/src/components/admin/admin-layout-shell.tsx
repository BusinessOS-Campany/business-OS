"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { LangToggle } from "@/components/lang-toggle";
import { LayoutDashboard, Package, Tags, ShoppingBag, CheckCheck, Image as ImageIcon, LogOut, Store, Menu, X, Ticket, BarChart3, Users, Star, Percent, XCircle, Store as StoreIcon, Globe, MessageCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, direction } = useI18n();
  const links = [
    { href: "/admin", labelKey: "admin.home", icon: LayoutDashboard },
    { href: "/admin/analytics", labelKey: "admin.analytics", icon: BarChart3 },
    { href: "/admin/products", labelKey: "admin.products", icon: Package },
    { href: "/admin/categories", labelKey: "admin.categories", icon: Tags },
    { href: "/admin/orders", labelKey: "admin.orders", icon: ShoppingBag },
    { href: "/admin/orders/delivered", labelKey: "admin.delivered_orders", icon: CheckCheck },
    { href: "/admin/orders/cancelled", labelKey: "admin.cancelled_orders", icon: XCircle },
    { href: "/admin/coupons", labelKey: "admin.coupons", icon: Ticket },
    { href: "/admin/merchants", labelKey: "admin.merchants", icon: StoreIcon },
    { href: "/admin/customers", labelKey: "admin.customers", icon: Users },
    { href: "/admin/reviews", labelKey: "admin.reviews", icon: Star },
    { href: "/admin/chat", labelKey: "admin.chat", icon: MessageCircle },
    { href: "/admin/banners", labelKey: "admin.banners", icon: ImageIcon },
  ];

  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen w-full" dir={direction}>
      <style>{`
        .mobile-only { display: none; }
        .desktop-only { display: none; }
        @media (max-width: 1023px) {
          .mobile-only { display: flex; }
          .mobile-only-block { display: block; }
        }
        @media (min-width: 1024px) {
          .desktop-only { display: flex; }
        }
      `}</style>

      {/* Hamburger button — mobile only */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="mobile-only fixed top-4 z-50 h-9 w-9 items-center justify-center rounded-lg border border-border bg-card shadow-sm text-muted-foreground hover:text-foreground transition-colors"
        style={{ left: "1rem" }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Drawer overlay — mobile only */}
      {drawerOpen && (
        <div className="mobile-only-block fixed inset-0 z-50 hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className={`absolute top-0 bottom-0 ${direction === "rtl" ? "right-0" : "left-0"} w-72 bg-card border-l border-border shadow-2xl flex flex-col p-6`}>
            <div className="flex items-center justify-between mb-8">
              <Link href="/admin" className="flex items-center gap-2 text-lg font-bold" onClick={() => setDrawerOpen(false)}>
                <LayoutDashboard className="h-5 w-5 text-primary" />
                {t("admin.dashboard")}
              </Link>
              <button type="button" onClick={() => setDrawerOpen(false)} className="p-2 -me-2 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-2 text-sm flex-1 overflow-y-auto">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${pathname === l.href ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                >
                  <l.icon className="h-4 w-4" /> {t(l.labelKey)}
                </Link>
              ))}
            </nav>
            <div className="pt-8 space-y-1 border-t border-border">
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                <LangToggle />
                <span className="flex-1">{t("lang.switch")}</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                <Store className="h-4 w-4" />
                <span className="flex-1">{t("admin.night_mode")}</span>
                <ThemeToggle />
              </div>
              <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors" onClick={() => setDrawerOpen(false)}>
                <LogOut className="h-4 w-4" />
                {t("admin.back_to_shop")}
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="desktop-only flex-col w-64 border-l border-border bg-card p-6 shrink-0">
        <Link href="/admin" className="flex items-center gap-2 text-lg font-bold mb-8">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          {t("admin.dashboard")}
        </Link>
        <nav className="flex flex-col gap-2 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${pathname === l.href ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
            >
              <l.icon className="h-4 w-4" /> {t(l.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-8 space-y-1">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground">
            <LangToggle />
            <span className="flex-1">{t("lang.switch")}</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground">
            <Store className="h-4 w-4" />
            <span className="flex-1">{t("admin.night_mode")}</span>
            <ThemeToggle />
          </div>
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
            <LogOut className="h-4 w-4" />
            {t("admin.back_to_shop")}
          </Link>
        </div>
      </aside>

      <div className="flex-1 pb-20 lg:pb-0">
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-only fixed bottom-4 inset-x-4 z-40 items-center rounded-2xl border border-border bg-card shadow-lg px-1 py-2 overflow-x-auto flex-nowrap snap-x snap-mandatory scroll-smooth" style={{ direction: direction }}>
        {links.map((l) => {
          const isActive = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              data-active={isActive ? "true" : undefined}
              className={`flex flex-col items-center gap-0.5 px-1 py-1.5 text-[10px] transition-colors w-1/5 flex-shrink-0 snap-start ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <div className={`flex items-center justify-center h-10 w-10 rounded-xl transition-all ${isActive ? "bg-primary/10 scale-110" : ""}`}>
                <l.icon className={`h-5 w-5 transition-all ${isActive ? "text-primary" : ""}`} />
              </div>
              <span className="truncate font-medium w-full text-center">{t(l.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
