"use client";

import Link from "next/link";
import { Package2, AlertTriangle, PackagePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type MedicineRow = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  category: string;
  unit: string;
  strength: string;
  totalStock: number;
  reorderLevel: number;
  isLowStock: boolean;
  expiringSoonCount: number;
  nearestExpiry: string | null;
}

export function MedicinesTable({ rows, locale }: { rows: MedicineRow[]; locale: string }) {
  const t = useTranslations("pharmacy");
  const localeName = (r: MedicineRow) => (locale === "ar" ? r.nameAr : r.nameEn);

  const columns: ColumnDef<MedicineRow>[] = [
    {
      id: "name",
      header: t("itemName"),
      accessorKey: "nameEn",
      sortValue: (r) => localeName(r),
      renderRow: (r) => (
        <Link href={`/pharmacy/medicines/${r.id}`} className="font-medium hover:underline">
          {localeName(r)}
        </Link>
      ),
    },
    {
      id: "code",
      header: "SKU",
      accessorKey: "code",
      renderRow: (r) => <span className="text-muted-foreground font-mono text-xs">{r.code}</span>,
      hideable: true,
    },
    {
      id: "category",
      header: t("category"),
      accessorKey: "category",
      renderRow: (r) => <span className="text-muted-foreground text-xs">{t(`categories.${r.category}`)}</span>,
    },
    {
      id: "unit",
      header: t("unit"),
      accessorKey: "unit",
      hideable: true,
    },
    {
      id: "stock",
      header: t("stock"),
      accessorKey: "totalStock",
      sortValue: (r) => r.totalStock,
      renderRow: (r) => (
        <div className="flex items-center gap-2">
          <span className={r.isLowStock ? "font-semibold text-destructive" : "tabular-nums"}>{r.totalStock}</span>
          {r.isLowStock ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="size-3" />
              {t("lowStock")}
            </Badge>
          ) : null}
          {r.expiringSoonCount > 0 ? (
            <Badge variant="warning" className="gap-1">
              {t("expiringSoon")} · {r.expiringSoonCount}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      id: "reorder",
      header: t("reorderLevel"),
      accessorKey: "reorderLevel",
      hideable: true,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={t("selectMedicine")}
      searchValue={(r) => [r.nameAr, r.nameEn, r.code].join(" ")}
      emptyIcon={Package2}
      emptyTitle={t("noMedicines")}
      emptyHint={t("addFirstMedicine")}
      emptyActionLabel={t("newItem")}
      emptyActionHref="/pharmacy/medicines/new"
      toolbarActions={
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/pharmacy/medicines/new">
            <PackagePlus className="size-3.5" />
            {t("newItem")}
          </Link>
        </Button>
      }
      exportFilename="medicines"
    />
  );
}