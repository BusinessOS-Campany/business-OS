"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Store, LayoutDashboard, ShoppingBag, Package, Star, Settings, Wallet, ArrowRight, LogOut, Menu, X, XCircle, Eye } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { T } from "@/components/translate";
import { ThemeToggle } from "@/components/theme-toggle";
import { LangToggle } from "@/components/lang-toggle";

const links = [
  { href: "/merchant", labelKey: "merchant.dashboard", icon: LayoutDashboard },
  { href: "/merchant/products", labelKey: "merchant.products_page", icon: Package },
  { href: "/merchant/orders", labelKey: "merchant.orders", icon: ShoppingBag },
  { href: "/merchant/orders/cancelled", labelKey: "merchant.cancelled_orders", icon: XCircle },
  { href: "/merchant/store", labelKey: "merchant.store_settings", icon: Store },
  { href: "/merchant/reviews", labelKey: "merchant.reviews", icon: Star },
  { href: "/merchant/withdrawals", labelKey: "merchant.withdrawals", icon: Wallet },
  { href: "/merchant/settings", labelKey: "merchant.account_settings", icon: Settings },
];

function StoreLink({ storeSlug, direction, t }: { storeSlug?: string | null; direction: string; t: (key: string) => string }) {
  if (!storeSlug) return null;
  return (
    <Link
      href={`/store/${storeSlug}`}
      target="_blank"
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-primary/10 text-primary`}
    >
      <Eye className="h-4 w-4" />
      <span>{t("merchant.view_store")}</span>
      <ArrowRight className={`h-3 w-3 ${direction === "rtl" ? "rotate-180" : ""}`} />
    </Link>
  );
}

export function MerchantSidebar({ children, storeName, storeNameEn, storeLogo, storeSlug }: { children: React.ReactNode; storeName: string; storeNameEn: string; storeLogo?: string | null; storeSlug?: string | null }) {
  const pathname = usePathname();
  const { direction, t } = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

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

      {/* Hamburger — mobile only */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="mobile-only fixed top-4 z-50 h-9 w-9 items-center justify-center rounded-lg border border-border bg-card shadow-sm text-muted-foreground hover:text-foreground transition-colors"
        style={{ [direction === "rtl" ? "right" : "left"]: "1rem" }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Drawer overlay — mobile only */}
      {drawerOpen && (
        <div className="mobile-only-block fixed inset-0 z-50 hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className={`absolute top-0 bottom-0 ${direction === "rtl" ? "right-0" : "left-0"} w-72 bg-card border-l border-border shadow-2xl flex flex-col p-6`}>
            <div className="flex items-center justify-between mb-8">
              <Link href="/merchant" className="flex items-center gap-2 text-lg font-bold" onClick={() => setDrawerOpen(false)}>
                {storeLogo ? (
                  <img src={storeLogo} alt="" className="h-7 w-7 rounded-lg object-cover" />
                ) : (
                  <Store className="h-5 w-5 text-primary" />
                )}
                <span className="truncate">{storeName || storeNameEn}</span>
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
                  <l.icon className="h-4 w-4" /> <T k={l.labelKey} />
                </Link>
              ))}
              <StoreLink storeSlug={storeSlug} direction={direction} t={t} />
            </nav>
            <div className="pt-8 space-y-1 border-t border-border">
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                <LangToggle />
                <span className="flex-1"><T k="lang.switch" /></span>
              </div>
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                <Store className="h-4 w-4" />
                <span className="flex-1"><T k="admin.night_mode" /></span>
                <ThemeToggle />
              </div>
              <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors" onClick={() => setDrawerOpen(false)}>
                <ArrowRight className="h-4 w-4" />
                <T k="nav.back_to_shop" />
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="desktop-only flex-col w-64 border-e border-border bg-card p-6 shrink-0">
        <Link href="/merchant" className="flex items-center gap-2 text-lg font-bold mb-8">
          {storeLogo ? (
            <img src={storeLogo} alt="" className="h-7 w-7 rounded-lg object-cover" />
          ) : (
            <Store className="h-5 w-5 text-primary" />
          )}
          <span className="truncate">{storeName || storeNameEn}</span>
        </Link>
        <nav className="flex flex-col gap-2 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${pathname === l.href ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
            >
              <l.icon className="h-4 w-4" /> <T k={l.labelKey} />
            </Link>
          ))}
          <StoreLink storeSlug={storeSlug} direction={direction} t={t} />
        </nav>
        <div className="mt-auto pt-8 space-y-1 border-t border-border">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground">
            <LangToggle />
            <span className="flex-1"><T k="lang.switch" /></span>
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground">
            <Store className="h-4 w-4" />
            <span className="flex-1"><T k="admin.night_mode" /></span>
            <ThemeToggle />
          </div>
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
            <ArrowRight className="h-4 w-4" />
            <T k="nav.back_to_shop" />
          </Link>
        </div>
      </aside>

      {/* Main content */}
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
              <span className="truncate font-medium w-full text-center"><T k={l.labelKey} /></span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
