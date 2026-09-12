"use client";

import { useMemo, useState } from "react";
import { Calculator, CheckCircle2, HardDrive, Info, Receipt, Save, XCircle } from "lucide-react";
import { computeCopyPrice } from "@/lib/pricing/copy-price";
import { useLocale } from "@/lib/i18n/locale-provider";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

const headerGradient = `linear-gradient(135deg, color-mix(in srgb, var(--primary) 60%, white), var(--primary) 50%, color-mix(in srgb, var(--primary) 75%, black))`;

const EXAMPLE_SIZES = [1, 2, 5, 10, 25, 50, 100];

interface CopyPriceSettingsProps {
  isAdmin: boolean;
  initialPrice: number;
}

export function CopyPriceSettings({ isAdmin, initialPrice }: CopyPriceSettingsProps) {
  const { t } = useLocale();
  const [price, setPrice] = useState(initialPrice);
  const [size, setSize] = useState("");
  const [priceInput, setPriceInput] = useState(isAdmin ? String(initialPrice) : "");
  const [sizeError, setSizeError] = useState<string | undefined>(undefined);
  const [priceError, setPriceError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | undefined>(undefined);

  const parsed = useMemo(() => {
    const value = Number(size);
    return size.trim() === "" || !Number.isFinite(value) || value < 0 ? null : value;
  }, [size]);

  function handleSizeChange(value: string) {
    setSize(value);
    if (value.trim() === "") {
      setSizeError(undefined);
      return;
    }
    const num = Number(value);
    setSizeError(num >= 0 && Number.isFinite(num) ? undefined : t.copyPriceSettings.sizeError);
  }

  function handlePriceChange(value: string) {
    setPriceInput(value);
    setNotice(undefined);
    if (value.trim() === "") {
      setPriceError(undefined);
      return;
    }
    const num = Number(value);
    setPriceError(num > 0 && Number.isFinite(num) ? undefined : t.copyPriceSettings.priceError);
  }

  async function handleSave() {
    const value = Number(priceInput);
    if (priceInput.trim() === "" || !Number.isFinite(value) || value <= 0) {
      setPriceError(t.copyPriceSettings.priceError);
      return;
    }
    setSaving(true);
    setNotice(undefined);
    try {
      const res = await fetch("/api/pricing/copy-price", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricePerGB: value }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (res.ok) {
        setPrice(value);
        setPriceInput(String(value));
        setNotice({ kind: "success", text: data?.message ?? t.copyPriceSettings.saved });
      } else {
        setNotice({ kind: "error", text: data?.error ?? t.copyPriceSettings.saveError });
      }
    } catch {
      setNotice({ kind: "error", text: t.copyPriceSettings.saveError });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div
          className="flex items-center gap-3 px-5 py-5 text-white sm:px-6"
          style={{ backgroundImage: headerGradient }}
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-inner">
            <Receipt className="size-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-extrabold">{t.copyPriceSettings.title}</h2>
            <p className="text-xs font-medium text-white/80">{t.copyPriceSettings.subtitle}</p>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                {t.copyPriceSettings.currentPrice}
              </p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">
                {formatNumber(price)}
                <span className="ms-1.5 text-sm font-bold text-muted-foreground">
                  {t.copyPriceSettings.perGbSuffix}
                </span>
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary" dir="ltr">
              {t.copyPriceSettings.formulaHint.replace("{price}", formatNumber(price))}
            </div>
          </div>

          {isAdmin ? (
            <div className="space-y-4 rounded-xl border border-border bg-background p-4 sm:p-5">
              <FormField label={t.copyPriceSettings.priceLabel} htmlFor="copy-price" error={priceError}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex-1">
                    <Input
                      id="copy-price"
                      name="pricePerGB"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      dir="ltr"
                      placeholder={t.copyPriceSettings.pricePlaceholder}
                      value={priceInput}
                      onChange={(event) => handlePriceChange(event.target.value)}
                      startIcon={<HardDrive className="size-4" aria-hidden="true" />}
                      hasError={!!priceError}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSave}
                    loading={saving}
                    disabled={saving || !!priceError}
                    className="sm:w-auto"
                  >
                    <Save className="size-4" aria-hidden="true" />
                    {saving ? t.copyPriceSettings.saving : t.copyPriceSettings.save}
                  </Button>
                </div>
              </FormField>

              {notice && (
                <p
                  role="status"
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-semibold",
                    notice.kind === "success" ? "text-success" : "text-destructive",
                  )}
                >
                  {notice.kind === "success" ? (
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  ) : (
                    <XCircle className="size-4" aria-hidden="true" />
                  )}
                  {notice.text}
                </p>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground">
              <Info className="size-4 shrink-0 text-primary" aria-hidden="true" />
              {t.copyPriceSettings.adminOnly}
            </p>
          )}

          <form
            onSubmit={(event) => event.preventDefault()}
            noValidate
            className="space-y-4"
          >
            <FormField label={t.copyPriceSettings.sizeLabel} htmlFor="copy-size" error={sizeError}>
              <Input
                id="copy-size"
                name="sizeGB"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                dir="ltr"
                placeholder={t.copyPriceSettings.sizePlaceholder}
                value={size}
                onChange={(event) => handleSizeChange(event.target.value)}
                startIcon={<HardDrive className="size-4" aria-hidden="true" />}
                hasError={!!sizeError}
              />
            </FormField>

            <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3.5">
              <Calculator className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">
                  {t.copyPriceSettings.computedPrice}
                </p>
                <p className="mt-0.5 text-xl font-extrabold tabular-nums text-foreground" dir="ltr">
                  {parsed === null ? "—" : formatCurrency(computeCopyPrice(parsed, price))}
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h3 className="mb-4 text-sm font-extrabold text-foreground">
          {t.copyPriceSettings.examplesTitle}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold text-muted-foreground">
                <th className="pb-2.5 pe-3">{t.copyPriceSettings.exampleSize}</th>
                <th className="pb-2.5 text-left">{t.copyPriceSettings.examplePrice}</th>
              </tr>
            </thead>
            <tbody>
              {EXAMPLE_SIZES.map((example) => (
                <tr key={example} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pe-3 font-semibold text-foreground" dir="ltr">
                    {formatNumber(example)} GB
                  </td>
                  <td className="py-2.5 tabular-nums text-foreground" dir="ltr">
                    {formatCurrency(computeCopyPrice(example, price))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {t.copyPriceSettings.constantNotice}
        </p>
      </section>
    </div>
  );
}
