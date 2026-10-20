"use client";
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export const USD_TO_YER = 535;
export const USD_TO_SAR = 535 / 140;

export type Currency = "yer" | "usd" | "sar";

interface CurrencyContext {
  currency: Currency;
  toggleCurrency: () => void;
}

const CurrencyCtx = createContext<CurrencyContext>({
  currency: "yer",
  toggleCurrency: () => {},
});

const cycle: Currency[] = ["yer", "usd", "sar"];

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("yer");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("currency") as Currency | null;
    if (stored && cycle.includes(stored)) setCurrency(stored);
    setMounted(true);
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrency((p) => {
      const idx = cycle.indexOf(p);
      const next = cycle[(idx + 1) % cycle.length];
      localStorage.setItem("currency", next);
      return next;
    });
  }, []);

  if (!mounted) return <>{children}</>;

  return (
    <CurrencyCtx.Provider value={{ currency, toggleCurrency }}>
      {children}
    </CurrencyCtx.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyCtx);
}
