"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { House, ShoppingBag, Tags, Heart, Package, Search, User, X, DollarSign } from "lucide-react";
import { motion, animate } from "motion/react";
import { useI18n } from "@/lib/i18n/provider";
import { useCurrency } from "@/lib/currency/context";
import { cartCount } from "@/lib/cart/store";
import { useCart } from "@/components/shop/cart-context";
import { SearchSuggestions } from "./search-suggestions";

const INDICATOR_W = 68;

export function MobileNav({ session, role }: { session: any; role: string | undefined }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [badge, setBadge] = useState(0);
  const { t, direction } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const isRtl = direction === "rtl";
  const scrollRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<SVGSVGElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const { setOpen } = useCart();

  const links = [
    { href: "/", labelKey: "nav.home", icon: House },
    { href: "/products", labelKey: "nav.products", icon: ShoppingBag },
    { href: "/categories", labelKey: "nav.categories", icon: Tags },
    { href: "/favorites", labelKey: "nav.favorites", icon: Heart },
    { href: "/orders", labelKey: "nav.my_orders", icon: Package },
    { href: "/track", labelKey: "track.nav_link", icon: Package },
  ];

  function getActiveIndex() {
    if (pathname === "/") return 0;
    for (let i = 1; i < links.length; i++) {
      if (pathname.startsWith(links[i].href)) return i;
    }
    return -1;
  }

  function posX(li: HTMLElement) {
    const outer = outerRef.current;
    if (!outer) return 0;
    const liRect = li.getBoundingClientRect();
    const outerRect = outer.getBoundingClientRect();
    return liRect.left + liRect.width / 2 - outerRect.left - INDICATOR_W / 2;
  }

  function moveIndicator(entry: HTMLElement) {
    animate(indicatorRef.current!, { x: posX(entry) }, { type: "spring", stiffness: 400, damping: 28 });
  }

  const activeIndex = getActiveIndex();

  function updateIndicator() {
    if (activeIndex < 0 || !outerRef.current || !indicatorRef.current) return;
    const li = outerRef.current.querySelectorAll("li")[activeIndex] as HTMLElement;
    if (li) indicatorRef.current.style.transform = `translateX(${posX(li)}px)`;
  }

  useEffect(() => { updateIndicator(); }, [activeIndex]);

  useEffect(() => {
    setBadge(cartCount());
    const handler = () => setBadge(cartCount());
    window.addEventListener("cartUpdated", handler);
    return () => window.removeEventListener("cartUpdated", handler);
  }, []);

  return (
    <>
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/95 backdrop-blur-sm pt-4 md:hidden">
          <div className="relative w-full max-w-md mx-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? "بحث عن منتجات..." : "Search products..."}
              className="w-full rounded-full border border-border bg-muted/50 px-4 py-3 ps-12 text-sm outline-none focus:border-primary transition-colors"
              autoFocus
            />
            <button onClick={() => { if (searchQuery.trim()) { const h = JSON.parse(localStorage.getItem("searchHistory") || "[]") as string[]; const next = h.filter(x => x !== searchQuery.trim()); next.unshift(searchQuery.trim()); localStorage.setItem("searchHistory", JSON.stringify(next.slice(0, 8))); router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`); setSearchOpen(false); setSearchQuery(""); } }} className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? "right-4" : "left-4"} text-muted-foreground`}>
              <Search className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setSearchOpen(false)} className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? "left-4" : "right-4"} text-muted-foreground hover:text-foreground`}>
              <X className="h-4 w-4" />
            </button>
            <SearchSuggestions query={searchQuery} onClose={() => {}} closeSearch={() => { setSearchOpen(false); setSearchQuery(""); }} />
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 inset-x-0 z-40 md:hidden"
        style={{ WebkitTapHighlightColor: "transparent" }}
        dir={direction}
      >
        <div ref={outerRef} className="relative rounded-t-[25px] bg-card shadow-lg border border-border overflow-hidden">
          <svg
            ref={indicatorRef}
            className="absolute z-[1] left-0 bottom-0 w-[68px] h-[72px] overflow-visible pointer-events-none"
            viewBox="0 0 68 72"
            fill="none"
          >
            <defs>
              <filter id="goo" x="-50%" width="200%" y="-50%" height="200%" colorInterpolationFilters="sRGB">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -7" result="cm" />
              </filter>
            </defs>
            <g filter="url(#goo)">
              <motion.path
                d="M34 54C45.4078 54 48.3887 66.7534 68 72H0C19.6113 66.7534 22.5922 54 34 54Z"
                fill="#EA580C"
              />
              <motion.circle cx="34" cy="66" r="4" fill="#EA580C" />
            </g>
          </svg>

          <div
            ref={scrollRef}
            onScroll={updateIndicator}
            className="overflow-x-auto scrollbar-none"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <ul className="relative z-[1] flex items-center h-[72px] px-2 m-0 list-none w-full">
              {links.map((l, i) => {
                const isActive = i === activeIndex;
                const Icon = l.icon;
                return (
                  <li key={l.href} className="px-[13px]">
                    <Link
                      href={l.href}
                      onClick={(e) => moveIndicator(e.currentTarget.parentElement!)}
                      className="relative flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors no-underline"
                    >
                      <div className="relative w-7 h-7">
                        <Icon
                          className={`absolute inset-0 w-7 h-7 transition-[clip-path] duration-300 ${isActive ? "text-white" : "text-[var(--primary)]"}`}
                          style={{ clipPath: isActive ? "circle(28px at 50% 100%)" : "circle(0px at 50% 100%)" }}
                        />
                        <Icon className="w-7 h-7 text-[var(--primary)]" />
                      </div>
                      <span className={`truncate font-medium ${isActive ? "text-[var(--primary)]" : ""}`}>
                        {t(l.labelKey)}
                      </span>
                    </Link>
                  </li>
                );
              })}

              <li className="px-[13px]">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="relative flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div className="relative w-7 h-7">
                    <Search className="w-7 h-7 text-[var(--primary)]" />
                  </div>
                  <span className="truncate font-medium">{t("nav.search")}</span>
                </button>
              </li>

              <li className="px-[13px]">
                <button
                  onClick={() => setOpen(true)}
                  className="relative flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div className="relative w-7 h-7">
                    <ShoppingBag className="w-7 h-7 text-[var(--primary)]" />
                    {badge > 0 && (
                      <span className="absolute -top-1 -end-1 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground px-1">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </div>
                  <span className="truncate font-medium">{t("nav.cart")}</span>
                </button>
              </li>

              <li className="px-[13px]">
                <CurrencyToggleButton />
              </li>

              <li className="px-[13px]">
                <Link
                  href={session ? (role === "ADMIN" ? "/admin" : role === "MERCHANT" ? "/merchant" : "/favorites") : "/login"}
                  className="relative flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors no-underline"
                >
                  <div className="relative w-7 h-7">
                    <User className="w-7 h-7 text-[var(--primary)]" />
                  </div>
                  <span className="truncate font-medium">{session ? t("nav.account") : t("nav.login")}</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}

function CurrencyToggleButton() {
  const { currency, toggleCurrency } = useCurrency();

  const labels: Record<string, string> = { yer: "ريال", usd: "$", sar: "رس" };
  const cycle = ["yer", "usd", "sar"];

  function nextLabel() {
    const idx = cycle.indexOf(currency);
    return labels[cycle[(idx + 1) % cycle.length]];
  }

  return (
    <button
      onClick={toggleCurrency}
      className="relative flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
    >
      <div className="relative w-7 h-7">
        <DollarSign className="w-7 h-7 text-[var(--primary)]" />
      </div>
      <span className="truncate font-medium">{nextLabel()}</span>
    </button>
  );
}
