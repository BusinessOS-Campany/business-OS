import { toArabicDigits } from "@/lib/utils";
import { fromMinor, fromThousandths } from "@/lib/money";

export interface CurrencyFormat {
  symbol: string;
  symbolAr: string;
  precision: number;
  decimalSeparator: string;
  thousandsSeparator: string;
}

export interface AppCurrency {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  symbol: string;
  symbolAr: string;
  precision: number;
  decimalSeparator: string;
  thousandsSeparator: string;
  isBase: boolean;
}

export const DEFAULT_CURRENCY: AppCurrency = {
  id: "",
  code: "YER",
  name: "Yemeni Rial",
  nameAr: "ريال يمني",
  symbol: "YER",
  symbolAr: "ر.ي",
  precision: 2,
  decimalSeparator: ".",
  thousandsSeparator: ",",
  isBase: true,
};

function numberWithSeparators(
  n: number,
  currency: Pick<AppCurrency, "precision" | "decimalSeparator" | "thousandsSeparator">
): string {
  const fixed = n.toFixed(currency.precision);
  let [intPart, decPart] = fixed.split(".");
  const sign = intPart.startsWith("-") ? "-" : "";
  if (sign) intPart = intPart.slice(1);
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSeparator);
  const result = decPart !== undefined && Number(decPart) !== 0 && currency.precision > 0
    ? `${grouped}${currency.decimalSeparator}${decPart}`
    : grouped;
  return sign + result;
}

/** Format a minor-unit amount for display. */
export function formatMoney(
  amountMinor: number,
  currency: AppCurrency = DEFAULT_CURRENCY,
  lang = "en",
  showSymbol = true
): string {
  const major = fromMinor(amountMinor);
  const formatted = numberWithSeparators(major, currency);
  const display = lang === "ar"
    ? `${toArabicDigits(formatted)} ${currency.symbolAr}`
    : `${currency.symbol} ${formatted}`;
  return showSymbol ? display : lang === "ar" ? toArabicDigits(formatted) : formatted;
}

/** Format a quantity in thousandths for display. */
export function formatQty(qtyThousandths: number, lang = "en", precision = 2): string {
  const val = fromThousandths(qtyThousandths);
  const fixed = val.toFixed(precision);
  const intPart = fixed.split(".")[0];
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const result = fixed.includes(".")
    ? `${grouped}.${fixed.split(".")[1]}`
    : grouped;
  return lang === "ar" ? toArabicDigits(result) : result;
}

/** BigInt -> number (safe for realistic minor-unit amounts). */
export function b2n(v: bigint | number): number {
  return typeof v === "bigint" ? Number(v) : v;
}

/** Serialize a Prisma object converting BigInt fields to numbers. */
export function serialize(obj: unknown): unknown {
  if (typeof obj === "bigint") return Number(obj);
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serialize);
  if (obj !== null && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = serialize(v);
    return out;
  }
  return obj;
}

export function formatPercent(p: number, lang = "en"): string {
  return lang === "ar" ? `${toArabicDigits(p)}٪` : `${p}%`;
}