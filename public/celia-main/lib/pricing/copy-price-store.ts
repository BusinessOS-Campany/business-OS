import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { cached, invalidateCached } from "@/lib/cache";
import { DEFAULT_COPY_PRICE_PER_GB } from "@/lib/pricing/copy-price";

export const COPY_PRICE_SETTINGS_KEY = "copyPricePerGB";

const COPY_PRICE_TTL_MS = 60_000;
const COPY_PRICE_CACHE_KEY = "pricing:copy-price";

export function getCopyPricePerGB(): Promise<number> {
  return cached(COPY_PRICE_CACHE_KEY, COPY_PRICE_TTL_MS, async () => {
    const [row] = await db
      .select({ value: schema.settings.value })
      .from(schema.settings)
      .where(eq(schema.settings.key, COPY_PRICE_SETTINGS_KEY))
      .limit(1);
    if (!row) return DEFAULT_COPY_PRICE_PER_GB;
    const value = Number(row.value);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_COPY_PRICE_PER_GB;
  });
}

export async function setCopyPricePerGB(price: number): Promise<void> {
  await db
    .insert(schema.settings)
    .values({ key: COPY_PRICE_SETTINGS_KEY, value: String(price) })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value: String(price), updatedAt: new Date() },
    });
  invalidateCached(COPY_PRICE_CACHE_KEY);
}
