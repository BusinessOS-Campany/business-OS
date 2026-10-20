"use client";
import { useCurrency, USD_TO_YER, USD_TO_SAR, type Currency } from "@/lib/currency/context";

export function CurrencyToggle({ priceYer }: { priceYer: number }) {
  const { currency, toggleCurrency } = useCurrency();

  const labels: Record<Currency, string> = { yer: "ريال", usd: "$", sar: "رس" };
  const cycle: Currency[] = ["yer", "usd", "sar"];

  function formatPrice(c: Currency) {
    if (c === "usd") return (priceYer / USD_TO_YER).toFixed(2);
    if (c === "sar") return (priceYer / USD_TO_YER * USD_TO_SAR).toFixed(2);
    return priceYer.toFixed(2);
  }

  function nextLabel() {
    const idx = cycle.indexOf(currency);
    return labels[cycle[(idx + 1) % cycle.length]];
  }

  return (
    <div className="flex items-center gap-2">
      <p className="text-3xl font-bold text-[var(--primary)]">{formatPrice(currency)}</p>
      <span className="text-lg text-muted-foreground">{labels[currency]}</span>
      <button
        type="button"
        onClick={toggleCurrency}
        className="text-xs text-muted-foreground hover:text-primary transition-colors px-1.5 py-0.5 rounded border border-border"
      >
        {nextLabel()}
      </button>
    </div>
  );
}
