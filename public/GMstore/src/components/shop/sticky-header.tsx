"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Store, LogIn, LayoutDashboard, UserPlus, LogOut, Heart } from "lucide-react";
import { T } from "@/components/translate";
import { SearchInput } from "@/components/shop/search-input";
import { UserGreeting } from "@/components/shop/user-greeting";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { LangToggle } from "@/components/lang-toggle";
import { useCurrency, type Currency } from "@/lib/currency/context";
import { cartCount } from "@/lib/cart/store";
import { useCart } from "@/components/shop/cart-context";


export function StickyHeader({ session, role, signOutForm }: { session: any; role: string | undefined; signOutForm: React.ReactNode }) {
  const { theme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const { setOpen } = useCart();
  const [badge, setBadge] = useState(0);
  const { currency, toggleCurrency } = useCurrency();

  useEffect(() => {
    setBadge(cartCount());
    const handler = () => setBadge(cartCount());
    window.addEventListener("cartUpdated", handler);
    return () => window.removeEventListener("cartUpdated", handler);
  }, []);

  const currencyLabels: Record<string, string> = { yer: "ريال", usd: "$", sar: "رس" };

  function nextCurrency() {
    const cycle = ["yer", "usd", "sar"] as const;
    const idx = cycle.indexOf(currency);
    return cycle[(idx + 1) % cycle.length];
  }
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 80); }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full h-[70px] z-50 flex items-center justify-between px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
        isHome && !scrolled
          ? "bg-transparent text-white"
          : "bg-white/90 dark:bg-card/90 backdrop-blur-md text-black dark:text-white shadow-sm"
      }`}
    >
      <Link href="/" className="flex items-center gap-2">
        <img src={theme === "dark" ? "/light.png" : "/dark.png"} alt="WANOSTORE" className="h-9 w-auto" />
        <span className="text-lg font-bold text-[var(--primary)]"><T k="nav.store_name" /></span>
      </Link>
      <nav className="max-md:hidden flex items-center gap-4 text-sm font-medium">
        <Link href="/products" className="hover:opacity-80 transition-opacity"><T k="nav.products" /></Link>
        <Link href="/categories" className="hover:opacity-80 transition-opacity"><T k="nav.categories" /></Link>
        <Link href="/orders" className="hover:opacity-80 transition-opacity"><T k="nav.my_orders" /></Link>
        <Link href="/favorites" className="hover:opacity-80 transition-opacity flex items-center gap-1">
          <Heart className="h-4 w-4 text-rose-500" />
          <T k="nav.favorites" />
        </Link>
        <div className="border-e h-5" style={{ borderColor: scrolled ? "currentColor" : "rgba(255,255,255,0.3)" }} />
        <SearchInput />
      </nav>
      <div className="flex items-center gap-1 sm:gap-2">
        <LangToggle />
        <ThemeToggle />
        {session ? (
          <>
            <UserGreeting userName={(session.user as any)?.name} />
            {role === "MERCHANT" && (
              <Link href="/merchant" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-black/10 transition-colors">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline"><T k="nav.my_merchant" /></span>
              </Link>
            )}
            {role === "ADMIN" && (
              <Link href="/admin" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-black/10 transition-colors">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline"><T k="nav.admin" /></span>
              </Link>
            )}
            {signOutForm}
          </>
        ) : (
          <div className="flex items-center gap-0 sm:gap-2">
            <Link href="/register" className="flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-sm font-medium hover:bg-black/10 transition-colors">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline"><T k="nav.register" /></span>
            </Link>
            <Link href="/login" className="flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-sm font-medium hover:bg-black/10 transition-colors">
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline"><T k="nav.login" /></span>
            </Link>
          </div>
        )}
        <button
          type="button"
          onClick={toggleCurrency}
          className="max-md:hidden text-xs font-medium text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded border border-border"
        >
          {currencyLabels[nextCurrency()]}
        </button>
        <button onClick={() => setOpen(true)} className="relative p-2 hover:opacity-80 transition-opacity">
          <ShoppingCart className="h-5 w-5" />
          {badge > 0 && (
            <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
