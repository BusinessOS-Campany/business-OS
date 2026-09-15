"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Droplets } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export type DonorRow = {
  id: string;
  nameAr: string;
  nameEn: string;
  phone: string | null;
  gender: string | null;
  bloodGroup: string;
  donationCount: number;
  lastDonation: string | null;
};

const BLOOD_VARIANT: Record<string, "destructive" | "warning" | "info" | "secondary" | "outline" | "default" | "success" | "muted"> = {
  A_POS: "destructive",
  A_NEG: "warning",
  B_POS: "info",
  B_NEG: "secondary",
  AB_POS: "outline",
  AB_NEG: "default",
  O_POS: "success",
  O_NEG: "warning",
  UNKNOWN: "muted",
};

function buildColumns(locale: string, t: (k: string) => string): ColumnDef<DonorRow>[] {
  return [
    {
      id: "name",
      header: t("common.name"),
      renderRow: (row) => (
        <span className="font-medium">{locale === "ar" ? row.nameAr : row.nameEn}</span>
      ),
      sortValue: (row) => (locale === "ar" ? row.nameAr : row.nameEn),
    },
    {
      id: "bloodGroup",
      header: t("bloodbank.bloodGroup"),
      renderRow: (row) => <Badge variant={BLOOD_VARIANT[row.bloodGroup] ?? "outline"}>{row.bloodGroup.replace("_", " ")}</Badge>,
    },
    {
      id: "gender",
      header: t("common.gender"),
      renderRow: (row) => <span>{row.gender ?? "—"}</span>,
    },
    {
      id: "phone",
      header: t("common.phone"),
      renderRow: (row) => <span className="tabular-nums">{row.phone ?? "—"}</span>,
    },
    {
      id: "donations",
      header: t("bloodbank.donations"),
      renderRow: (row) => <span className="tabular-nums">{row.donationCount}</span>,
      sortValue: (row) => row.donationCount,
    },
    {
      id: "lastDonation",
      header: t("bloodbank.donations"),
      renderRow: (row) => <span className="text-xs tabular-nums">{row.lastDonation ?? "—"}</span>,
      sortValue: (row) => row.lastDonation ?? "",
    },
  ];
}

export function DonorTable({ rows, locale, showDetails }: { rows: DonorRow[]; locale: string; showDetails: boolean }) {
  const tr = useTranslations();
  const cols = buildColumns(locale, tr);
  return (
    <DataTable
      columns={cols}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("bloodbank.donors")}`}
      searchValue={(r) => `${r.nameAr} ${r.nameEn} ${r.phone ?? ""} ${r.bloodGroup}`}
      emptyIcon={Droplets}
      emptyTitle={tr("bloodbank.donors")}
      showColumnsControl={false}
    />
  );
}