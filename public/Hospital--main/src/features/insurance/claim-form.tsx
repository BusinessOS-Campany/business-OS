"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileText, Loader2Icon } from "lucide-react";
import { createClaimAction } from "@/actions/insurance";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type ClaimableInvoice = {
  id: string;
  invoiceNo: string;
  patientNameAr: string;
  patientNameEn: string;
  mrn: string;
  companyId: string;
  companyNameAr: string;
  companyNameEn: string;
  policyNo: string | null;
  coverageRate: number | null;
  dueAmount: number;
};

type State = { ok: boolean; error?: string } | null;

export function ClaimForm({ invoices, locale }: { invoices: ClaimableInvoice[]; locale: string }) {
  const t = useTranslations("insurance");
  const tc = useTranslations("common");
  const router = useRouter();
  const [invoiceId, setInvoiceId] = useState("");
  const [policyNo, setPolicyNo] = useState("");

  const selected = invoices.find((i) => i.id === invoiceId);

  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      if (!invoiceId) return { ok: false, error: "common.error" };
      formData.set("policyNo", policyNo);
      const res = await createClaimAction(invoiceId, null, formData);
      if (res?.ok && res.data?.id) {
        toast.success(t("claimCreated"));
        router.push(`/insurance/claims/${res.data.id}`);
        return { ok: true };
      }
      const key = res && !res.ok && res.error ? res.error : "common.error";
      toast.error(key.startsWith("insurance.") ? t(key) : tc(key));
      return { ok: false, error: key };
    },
    null
  );

  const onInvoiceSelect = (id: string) => {
    setInvoiceId(id);
    const inv = invoices.find((i) => i.id === id);
    setPolicyNo(inv?.policyNo ?? "");
  };

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">{t("selectInvoice")} *</Label>
        {invoices.length === 0 ? (
          <p className="text-muted-foreground rounded-md border bg-muted/40 px-3 py-2 text-xs">{t("noClaimable")}</p>
        ) : (
          <Select value={invoiceId} onValueChange={onInvoiceSelect}>
            <SelectTrigger className="h-9 text-sm w-full">
              <SelectValue placeholder={t("selectInvoicePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {invoices.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.invoiceNo} — {locale === "ar" ? i.patientNameAr : i.patientNameEn} ({i.mrn}) · {i.dueAmount.toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selected && (
        <Card>
          <CardContent className="space-y-2 pt-4 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <FileText className="size-4 text-primary" />
              {t("claimDetail")}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[13px]">
              <div>
                <span className="text-muted-foreground">{tc("patient")}: </span>
                <span>{locale === "ar" ? selected.patientNameAr : selected.patientNameEn}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("insuranceCompany")}: </span>
                <span>{locale === "ar" ? selected.companyNameAr : (selected.companyNameEn ?? selected.companyNameAr)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("claimAmount")}: </span>
                <span className="font-semibold tabular-nums">{selected.dueAmount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("coverageRate")}: </span>
                <span className="tabular-nums">{selected.coverageRate != null ? `${selected.coverageRate}%` : "—"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">{t("invoiceNo")}: </span>
                <span className="tabular-nums">{selected.invoiceNo}</span>
              </div>
            </div>
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs">{t("policyNo")}</Label>
              <Input value={policyNo} onChange={(e) => setPolicyNo(e.target.value)} placeholder="—" className="h-8 text-sm" />
            </div>
          </CardContent>
        </Card>
      )}

      {state && !state.ok && (
        <p className="text-xs text-destructive">{state.error ? (state.error.startsWith("insurance.") ? t(state.error) : tc(state.error)) : tc("error")}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !invoiceId || invoices.length === 0} className="gap-2">
          {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {t("createClaim")}
        </Button>
      </div>
    </form>
  );
}