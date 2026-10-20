"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon, BookOpenIcon, SaveIcon, Loader2Icon, CalculatorIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createJournalEntryAction } from "@/actions/accounting";
import { type ActionResult } from "@/lib/result";

export type AccountOption = { id: string; code: string; nameAr: string; nameEn: string };

interface LineDatum {
  key: number;
  accountId: string;
  debit: string;
  credit: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function JournalForm({ accounts, locale }: { accounts: AccountOption[]; locale: string }) {
  const t = useTranslations("accounting");
  const tp = useTranslations("payments");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = React.useState(todayISO());
  const [lines, setLines] = React.useState<LineDatum[]>([{ key: 1, accountId: "", debit: "", credit: "" }]);
  const [description, setDescription] = React.useState("");
  const [reference, setReference] = React.useState("");

  const wrapped = React.useCallback(
    (prev: ActionResult<{ id: string }> | null, formData: FormData) => createJournalEntryAction(prev, formData),
    []
  );
  const [state, action, pending] = useActionState(wrapped, null);

  React.useEffect(() => {
    if (state?.ok && state.data?.id) {
      toast.success(tc("saved"));
      router.replace(`/accounting/journal/${state.data.id}`);
    } else if (state && !state.ok) {
      toast.error(tc("error"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);

  const submit = (formData: FormData) => {
    formData.set("date", date);
    formData.set("description", description || "");
    formData.set("reference", reference || "");
    const payload = lines
      .filter((l) => l.accountId !== "")
      .map((l) => ({
        accountId: l.accountId,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      }));
    formData.set("lines", JSON.stringify(payload));
    startTransition(() => action(formData));
  };

  const totalDebit = round2(lines.reduce((s, l) => s + (Number(l.debit) || 0), 0));
  const totalCredit = round2(lines.reduce((s, l) => s + (Number(l.credit) || 0), 0));
  const balanced = totalDebit === totalCredit && totalDebit > 0;
  const busy = pending || isPending;

  const nameOf = (a: AccountOption) => (locale === "ar" ? a.nameAr : a.nameEn);

  return (
    <form action={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{tc("date")} *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{tp("reference")}</Label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} className="h-8 text-sm" placeholder="REF-..." />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{tc("description")}</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-8 text-sm" />
      </div>

      <div className="space-y-2 rounded-md border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{t("journal")}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setLines((all) => [...all, { key: Date.now(), accountId: "", debit: "", credit: "" }])}
          >
            <PlusIcon className="size-3.5" />
            {tc("add")}
          </Button>
        </div>

        <div className="grid grid-cols-[1fr_6rem_6rem_2.25rem] gap-2">
          <p className="hidden text-xs text-muted-foreground sm:block">{t("account")}</p>
          <p className="hidden text-xs text-muted-foreground sm:block">{t("debit")}</p>
          <p className="hidden text-xs text-muted-foreground sm:block">{t("credit")}</p>
          <span className="hidden sm:block" />
        </div>

        {lines.map((line) => (
          <div key={line.key} className="grid grid-cols-[1fr_6rem_6rem_2.25rem] items-center gap-2">
            <Select
              value={line.accountId}
              onValueChange={(v) => setLines((all) => all.map((x) => (x.key === line.key ? { ...x, accountId: v } : x)))}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder={t("account")} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} · {nameOf(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={line.debit}
              onChange={(e) => setLines((all) => all.map((x) => (x.key === line.key ? { ...x, debit: e.target.value } : x)))}
              className="h-8 text-sm text-end tabular-nums"
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={line.credit}
              onChange={(e) => setLines((all) => all.map((x) => (x.key === line.key ? { ...x, credit: e.target.value } : x)))}
              className="h-8 text-sm text-end tabular-nums"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={lines.length === 1}
              onClick={() => setLines((all) => all.filter((x) => x.key !== line.key))}
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        ))}

        <div className="grid grid-cols-[1fr_6rem_6rem_2.25rem] items-center gap-2 border-t pt-2 text-sm font-medium">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <CalculatorIcon className="size-4" /> {t("balance")}
          </span>
          <span className="text-end tabular-nums">{totalDebit.toLocaleString(locale === "ar" ? "ar-YE" : "en-US", { maximumFractionDigits: 2 })}</span>
          <span className="text-end tabular-nums">{totalCredit.toLocaleString(locale === "ar" ? "ar-YE" : "en-US", { maximumFractionDigits: 2 })}</span>
          <span />
        </div>
        <p className={`text-xs ${balanced ? "text-success" : "text-destructive"}`}>
          {balanced ? `${t("debit")} = ${t("credit")}` : t("debit") + " ≠ " + t("credit")}
        </p>
      </div>

      <Button type="submit" size="sm" className="gap-1.5" disabled={busy || !balanced}>
        {busy ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
        {busy ? tc("saving") : (
          <span className="inline-flex items-center gap-1.5">
            <BookOpenIcon className="size-4" />
            {t("newEntry")}
          </span>
        )}
      </Button>
    </form>
  );
}