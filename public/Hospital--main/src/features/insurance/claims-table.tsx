"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ShieldCheck, MoreHorizontal, Loader2Icon, Send, Eye, CheckCircle2, Percent, XCircle, BadgeCheck } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { submitClaimAction, sendToReviewAction, decideClaimAction, markClaimPaidAction } from "@/actions/insurance";
import { STATUS_VARIANT, STATUS_LABEL } from "@/lib/insurance-statuses";

export type ClaimRow = {
  id: string;
  claimNo: string;
  invoiceNo: string;
  invoiceHref: string;
  patientNameAr: string;
  patientNameEn: string;
  mrn: string;
  companyNameAr: string;
  companyNameEn: string;
  policyNo: string | null;
  amount: number;
  approvedAmount: number | null;
  status: string;
  submittedAt: string | null;
  decisionAt: string | null;
};

function buildColumns(
  locale: string,
  t: (k: string) => string,
  onAction: (row: ClaimRow, action: string) => void
): ColumnDef<ClaimRow>[] {
  return [
    {
      id: "claimNo",
      header: t("insurance.claimNo"),
      renderRow: (row) => <Link href={`/insurance/claims/${row.id}`} className="font-medium hover:underline">{row.claimNo}</Link>,
      sortValue: (row) => row.claimNo,
    },
    {
      id: "invoice",
      header: t("insurance.invoiceNo"),
      renderRow: (row) => (
        <Link href={`/billing/${row.invoiceHref}`} className="truncate tabular-nums hover:underline">
          {row.invoiceNo}
        </Link>
      ),
    },
    {
      id: "patient",
      header: t("common.patient"),
      renderRow: (row) => (
        <span className="truncate">
          {locale === "ar" ? row.patientNameAr : row.patientNameEn}
          <span className="text-muted-foreground ml-1 text-xs">({row.mrn})</span>
        </span>
      ),
    },
    {
      id: "company",
      header: t("insurance.company"),
      renderRow: (row) => <span className="truncate">{locale === "ar" ? row.companyNameAr : row.companyNameEn}</span>,
    },
    {
      id: "amount",
      header: t("insurance.claimAmount"),
      renderRow: (row) => <span className="tabular-nums font-medium">{row.amount}</span>,
      sortValue: (row) => row.amount,
    },
    {
      id: "approved",
      header: t("insurance.approvedAmount"),
      renderRow: (row) => <span className="tabular-nums">{row.approvedAmount ?? "—"}</span>,
      sortValue: (row) => row.approvedAmount ?? -1,
    },
    {
      id: "status",
      header: t("common.status"),
      renderRow: (row) => <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>{t(STATUS_LABEL[row.status] ?? row.status)}</Badge>,
    },
    {
      id: "actions",
      header: "",
      renderRow: (row) => (
        <ClaimActions row={row} onAction={onAction} />
      ),
    },
  ];
}

function ClaimActions({ row, onAction }: { row: ClaimRow; onAction: (row: ClaimRow, action: string) => void }) {
  const t = useTranslations();
  const items: Array<{ value: string; icon: typeof Send; labelKey: string; danger?: boolean }> = [];
  if (row.status === "DRAFT") items.push({ value: "submit", icon: Send, labelKey: "insurance.submit" });
  if (row.status === "SUBMITTED") items.push({ value: "review", icon: Eye, labelKey: "insurance.inReview" });
  if (row.status === "SUBMITTED" || row.status === "IN_REVIEW") {
    items.push({ value: "approve", icon: CheckCircle2, labelKey: "insurance.approve" });
    items.push({ value: "partial", icon: Percent, labelKey: "insurance.approvePartial" });
    items.push({ value: "reject", icon: XCircle, labelKey: "insurance.reject", danger: true });
  }
  if (row.status === "APPROVED" || row.status === "PARTIALLY_APPROVED") {
    items.push({ value: "paid", icon: BadgeCheck, labelKey: "insurance.markPaid" });
  }

  if (items.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => onAction(row, item.value)}
            className={item.danger ? "text-destructive focus:text-destructive" : undefined}
          >
            <item.icon className="size-4" /> {t(item.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ClaimsTable({ rows, locale }: { rows: ClaimRow[]; locale: string }) {
  const tr = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [partial, setPartial] = useState<{ id: string; amount: string; open: boolean }>({ id: "", amount: "", open: false });

  const run = (row: ClaimRow, action: string) => {
    if (action === "partial") {
      setPartial({ id: row.id, amount: String(row.approvedAmount ?? row.amount), open: true });
      return;
    }
    startTransition(async () => {
      const res = await runAction(row, action, null);
      handleResult(res, action);
    });
  };

  const runAction = (row: ClaimRow, action: string, formData: FormData | null) => {
    const fd = formData ?? new FormData();
    switch (action) {
      case "submit": return submitClaimAction(row.id, null, fd);
      case "review": return sendToReviewAction(row.id, null, fd);
      case "approve": return decideClaimAction(row.id, "APPROVED", null, fd);
      case "reject": return decideClaimAction(row.id, "REJECTED", null, fd);
      case "paid": return markClaimPaidAction(row.id, null, fd);
      default: return Promise.resolve(null);
    }
  };

  const handleResult = (res: { ok: boolean; error?: string } | null, action: string) => {
    if (res?.ok) {
      toast.success(tr("common.updated"));
      router.refresh();
    } else {
      const key = res?.error ?? "common.error";
      toast.error(key.startsWith("common.") || key.startsWith("insurance.") ? tr(key) : tr("common.error"));
    }
  };

  const confirmPartial = () => {
    const amt = Number(partial.amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    setPartial((p) => ({ ...p, open: false }));
    const fd = new FormData();
    fd.set("approvedAmount", String(amt));
    startTransition(async () => {
      const res = await decideClaimAction(partial.id, "PARTIALLY_APPROVED", null, fd);
      handleResult(res, "partial");
    });
  };

  return (
    <>
      <DataTable
        columns={buildColumns(locale, tr, run)}
        data={rows}
        rowKey={(r) => r.id}
        searchPlaceholder={`${tr("common.search")} ${tr("insurance.claims")}`}
        searchValue={(r) => `${r.claimNo} ${r.invoiceNo} ${r.patientNameAr} ${r.patientNameEn} ${r.mrn} ${r.companyNameAr} ${r.companyNameEn}`}
        emptyIcon={ShieldCheck}
        emptyTitle={tr("insurance.noClaims")}
        loading={isPending}
        showColumnsControl={false}
      />
      <Dialog open={partial.open} onOpenChange={(o) => setPartial((p) => ({ ...p, open: o }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{tr("insurance.approvePartial")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">{tr("insurance.approvedAmount")}</Label>
            <Input
              type="number"
              className="h-8 text-sm"
              value={partial.amount}
              onChange={(e) => setPartial((p) => ({ ...p, amount: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPartial((p) => ({ ...p, open: false }))}>
              {tr("common.cancel")}
            </Button>
            <Button size="sm" onClick={confirmPartial}>
              {tr("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isPending && <p className="text-muted-foreground flex items-center gap-2 text-xs"><Loader2Icon className="size-3 animate-spin" /> {tr("common.loading")}</p>}
    </>
  );
}