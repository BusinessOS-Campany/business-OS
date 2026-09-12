"use client";
import Link from "next/link";
import { TrendingDown } from "lucide-react";
import { motion } from "motion/react";
import { useI18n } from "@/lib/i18n/provider";
import { CountdownTimer } from "@/components/shop/countdown-timer";
import { SwipeableProductCard } from "@/components/shop/swipeable-product-card";

export function DealsSection({ products, target, isLoggedIn, favoriteIds }: { products: any[]; target: string; isLoggedIn: boolean; favoriteIds: Set<string> }) {
  const { t } = useI18n();
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingDown className="h-6 w-6 text-red-500" />
          <h2 className="text-2xl font-bold">{t("home.deals")}</h2>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{t("home.deal_ends")}</span>
            <CountdownTimer target={target} />
          </div>
        </div>
        <Link href="/products?onSale=true" className="text-sm text-primary hover:underline">{t("home.view_all")}</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {products.map((p: any) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <SwipeableProductCard product={p} isLoggedIn={isLoggedIn} favoriteIds={favoriteIds} />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
