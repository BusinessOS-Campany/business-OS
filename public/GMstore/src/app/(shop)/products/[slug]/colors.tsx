"use client";
import { useI18n } from "@/lib/i18n/provider";

export function ProductColors({ colors, colorStock, totalStock, selected, onSelect }: { colors: string[]; colorStock?: Record<string, number> | null; totalStock?: number; selected: string; onSelect: (c: string) => void }) {
  const { t } = useI18n();
  const hasColorStock = colorStock && Object.keys(colorStock).length > 0;
  const selectedStock = hasColorStock ? (colorStock[selected] ?? totalStock ?? 0) : (totalStock ?? 0);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        {t("detail.colors")} <span className="text-foreground font-semibold">{selected}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => {
          const cs = colorStock?.[c];
          const isOut = cs !== undefined && cs <= 0;
          return (
            <div key={c} className="relative">
              <button
                type="button"
                onClick={() => !isOut && onSelect(c)}
                disabled={isOut}
                className={`h-8 w-8 rounded-full border-2 transition-all ${
                  selected === c
                    ? "border-foreground scale-110 ring-2 ring-foreground/20"
                    : isOut
                      ? "border-border opacity-30 cursor-not-allowed"
                      : "border-border hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
              {isOut && <span className="absolute inset-0 flex items-center justify-center"><span className="h-full w-0.5 bg-red-500 rotate-45 absolute" /></span>}
            </div>
          );
        })}
      </div>
      {hasColorStock && (
        <p className={`text-xs ${selectedStock <= 5 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
          {t("detail.color_stock")} {selectedStock} {selectedStock <= 5 ? t("detail.low_stock") : ""}
        </p>
      )}
    </div>
  );
}