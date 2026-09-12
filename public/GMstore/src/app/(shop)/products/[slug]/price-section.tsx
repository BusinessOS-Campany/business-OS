"use client";
import { useCurrency, USD_TO_YER } from "@/lib/currency/context";
import { useI18n } from "@/lib/i18n/provider";
import type { Currency } from "@/lib/currency/context";

const symbols: Record<Currency, string> = { yer: "YER", usd: "USD", sar: "SAR" };

function convert(yer: number, c: Currency): { value: number; decimals: number } {
  const usd = yer / USD_TO_YER;
  if (c === "sar") return { value: usd * (USD_TO_YER / 140), decimals: 2 };
  if (c === "usd") return { value: usd, decimals: 2 };
  return { value: yer, decimals: 0 };
}

export function ProductPriceSection({ price, discount }: { price: number; discount: number }) {
  const { currency, toggleCurrency } = useCurrency();
  const { t } = useI18n();
  const finalPrice = discount > 0 ? price * (1 - discount / 100) : price;
  const dp = convert(finalPrice, currency);
  const op = discount > 0 ? convert(price, currency) : null;
  const next = currency === "yer" ? t("general.usd") : currency === "usd" ? t("general.sar") : t("general.yer");

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-2xl font-bold text-foreground">
        {dp.value.toFixed(dp.decimals)} {symbols[currency]}
      </span>
      {op && (
        <span className="text-lg text-muted-foreground line-through">
          {op.value.toFixed(op.decimals)} {symbols[currency]}
        </span>
      )}
      {discount > 0 && (
        <span className="inline-block bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded">
          -{discount}%
        </span>
      )}
      <button
        onClick={toggleCurrency}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
      >
        {next}
      </button>
    </div>
  );
}