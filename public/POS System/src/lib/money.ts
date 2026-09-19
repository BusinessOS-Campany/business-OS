/**
 * Money and quantity arithmetic.
 *
 * Convention (matches Prisma schema):
 *  - Money values are integers in MINOR UNITS (hundredths) of the base currency.
 *    e.g. 125000 YER => 12_500_000 minor units.
 *  - Quantity values are integers in THOUSANDTHS (scale 1000).
 *    e.g. 2.5 kg => 2500.
 *
 * All arithmetic below works on integers only -> no floating point errors.
 */

export const MONEY_PRECISION = 2;
export const QTY_SCALE = 1000;

export function toMinor(major: number): number {
  return Math.round(major * 100);
}

export function fromMinor(minor: number): number {
  return minor / 100;
}

export function toThousandths(qty: number): number {
  return Math.round(qty * QTY_SCALE);
}

export function fromThousandths(th: number): number {
  return th / QTY_SCALE;
}

/** Multiply a minor-unit amount by a rate with rounding. */
export function minorMul(a: number, rate: number): number {
  return Math.round(a * rate);
}

export function minorAdd(a: number, b: number): number {
  return a + b;
}

export function minorSub(a: number, b: number): number {
  return a - b;
}

/** Apply a percentage discount (percent like 10 for 10%) to minor units. */
export function minorDiscountPercent(minor: number, percent: number): number {
  return Math.round((minor * percent) / 100);
}

/** Calculate line total: qty(thousandths) * price(minor) -> minor. */
export function lineTotal(qtyThousandths: number, unitPriceMinor: number): number {
  return Math.round((qtyThousandths * unitPriceMinor) / QTY_SCALE);
}

export function clampMoney(n: number): number {
  return Math.round(n);
}

export function isMoneyEqual(a: number, b: number): boolean {
  return Math.round(a) === Math.round(b);
}

/** Split a total into payment portions without rounding drift. */
export function splitAmount(total: number, ratios: number[]): number[] {
  const parts = ratios.map((r) => Math.round(total * r));
  const diff = total - parts.reduce((s, v) => s + v, 0);
  if (Math.abs(diff) > 0 && parts.length > 0) {
    // distribute the rounding residual on the largest part
    let idx = 0;
    for (let i = 1; i < parts.length; i++) if (parts[i] > parts[idx]) idx = i;
    parts[idx] += diff;
  }
  return parts;
}