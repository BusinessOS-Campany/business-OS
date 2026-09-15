"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Layers, Pencil } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toggleSchemeAction } from "@/actions/insurance";

export type SchemeRow = {
  id: string;
  companyId: string;
  companyNameAr: string;
  companyNameEn: string | null;
  code: string;
  nameAr: string;
  nameEn: string | null;
  coverageRate: number;
  annualLimit: number | null;
  isActive: boolean;
};

function buildColumns(
  locale: string,
  t: (k: string) => string,
  onToggle: (row: SchemeRow) => void,
  togglingId: string | null
): ColumnDef<SchemeRow>[] {
  return [
    {
      id: "company",
      header: t("insurance.company"),
      renderRow: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{locale === "ar" ? row.companyNameAr : (row.companyNameEn ?? row.companyNameAr)}</span>
          <span className="text-muted-foreground text-xs">{row.code}</span>
        </div>
      ),
    },
    {
      id: "scheme",
      header: t("insurance.schemes"),
      renderRow: (row) => <span className="font-medium">{locale === "ar" ? row.nameAr : (row.nameEn ?? row.nameAr)}</span>,
    },
    {
      id: "coverage",
      header: t("insurance.coverageRate"),
      renderRow: (row) => <span className="tabular-nums">{row.coverageRate}%</span>,
    },
    {
      id: "limit",
      header: t("insurance.annualLimit"),
      renderRow: (row) => <span className="tabular-nums">{row.annualLimit != null ? row.annualLimit.toLocaleString() : "—"}</span>,
      sortValue: (row) => row.annualLimit ?? -1,
    },
    {
      id: "status",
      header: t("common.status"),
      renderRow: (row) => (
        <Badge variant={row.isActive ? "success" : "secondary"}>{row.isActive ? t("insurance.active") : t("insurance.inactive")}</Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      renderRow: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={`/insurance/companies/${row.companyId}`}>
              <Pencil className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" disabled={togglingId === row.id} onClick={() => onToggle(row)}>
            {t(row.isActive ? "common.deactivate" : "common.activate")}
          </Button>
        </div>
      ),
    },
  ];
}

export function SchemesTable({ rows, locale }: { rows: SchemeRow[]; locale: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const onToggle = (row: SchemeRow) => {
    setTogglingId(row.id);
    startTransition(async () => {
      const res = await toggleSchemeAction(row.id, null, new FormData());
      setTogglingId(null);
      if (res?.ok) {
        toast.success(t("common.updated"));
        router.refresh();
      } else {
        const key = res?.error ?? "common.error";
        toast.error(key.startsWith("common.") || key.startsWith("insurance.") ? t(key) : t("common.error"));
      }
    });
  };

  return (
    <DataTable
      columns={buildColumns(locale, t, onToggle, togglingId)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${t("common.search")} ${t("insurance.schemes")}`}
      searchValue={(r) => `${r.companyNameAr} ${r.companyNameEn ?? ""} ${r.nameAr} ${r.nameEn ?? ""} ${r.code}`}
      emptyIcon={Layers}
      emptyTitle={t("insurance.noSchemes")}
      showColumnsControl={false}
    />
  );
}