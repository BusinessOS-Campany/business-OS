"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Building2, Pencil } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toggleCompanyAction } from "@/actions/insurance";

export type CompanyRow = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  phone: string | null;
  email: string | null;
  schemesCount: number;
  patientsCount: number;
  claimsCount: number;
  isActive: boolean;
};

function buildColumns(
  locale: string,
  t: (k: string) => string,
  onToggle: (row: CompanyRow) => void,
  togglingId: string | null
): ColumnDef<CompanyRow>[] {
  return [
    {
      id: "company",
      header: t("insurance.company"),
      renderRow: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{locale === "ar" ? row.nameAr : (row.nameEn ?? row.nameAr)}</span>
          {row.nameEn && locale === "ar" ? null : null}
        </div>
      ),
    },
    {
      id: "code",
      header: t("insurance.companyCode"),
      renderRow: (row) => <span className="tabular-nums">{row.code}</span>,
    },
    {
      id: "schemes",
      header: t("insurance.schemes"),
      renderRow: (row) => <span className="tabular-nums">{row.schemesCount}</span>,
    },
    {
      id: "patients",
      header: t("insurance.patientsCount"),
      renderRow: (row) => <span className="tabular-nums">{row.patientsCount}</span>,
    },
    {
      id: "claims",
      header: t("insurance.claims"),
      renderRow: (row) => <span className="tabular-nums">{row.claimsCount}</span>,
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
            <Link href={`/insurance/companies/${row.id}`}>
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

export function CompaniesTable({ rows, locale }: { rows: CompanyRow[]; locale: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const onToggle = (row: CompanyRow) => {
    setTogglingId(row.id);
    startTransition(async () => {
      const res = await toggleCompanyAction(row.id, null, new FormData());
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
      searchPlaceholder={`${t("common.search")} ${t("insurance.companies")}`}
      searchValue={(r) => `${r.nameAr} ${r.nameEn ?? ""} ${r.code}`}
      emptyIcon={Building2}
      emptyTitle={t("insurance.noCompanies")}
      showColumnsControl={false}
    />
  );
}