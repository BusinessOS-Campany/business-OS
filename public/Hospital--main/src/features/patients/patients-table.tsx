"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { UsersIcon, UserRoundPlus, ArrowUpRightIcon } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";

export type PatientTableRow = {
  id: string;
  mrn: string;
  nameAr: string;
  nameEn: string;
  gender: string;
  dateOfBirth: string | null;
  age: number | null;
  phone: string | null;
  bloodGroup: string;
  cityNameAr: string | null;
  cityNameEn: string | null;
  govNameAr: string | null;
  govNameEn: string | null;
  appointmentCount: number;
  invoiceCount: number;
  createdAt: string;
  patientStatus: string;
} & Record<string, unknown>;

const BLOOD_KEY: Record<string, string> = {
  UNKNOWN: "bgUnknown",
  A_POS: "bgAPos",
  A_NEG: "bgANeg",
  B_POS: "bgBPos",
  B_NEG: "bgBNeg",
  AB_POS: "bgABPos",
  AB_NEG: "bgABNeg",
  O_POS: "bgOPos",
  O_NEG: "bgONeg",
};

export function PatientsTable({
  rows,
  locale,
  total,
}: {
  rows: PatientTableRow[];
  locale: string;
  total: number;
}) {
  const t = useTranslations("patients");
  const tc = useTranslations("common");

  const columns: ColumnDef<PatientTableRow>[] = [
    {
      id: "name",
      header: tc("name"),
      renderRow: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarFallback>{initials(row.nameEn || row.nameAr || "?")}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{locale === "ar" ? row.nameAr : row.nameEn}</p>
            <p className="truncate text-xs text-muted-foreground">
              {locale === "ar" ? row.nameEn : row.nameAr}
            </p>
          </div>
        </div>
      ),
      sortValue: (row) => row.nameAr,
      exportValue: (row) => `${row.nameAr} ${row.nameEn}`,
      className: "min-w-56",
    },
    {
      id: "mrn",
      header: t("mrn"),
      accessorKey: "mrn",
      sortValue: (row) => row.mrn,
      className: "whitespace-nowrap",
    },
    {
      id: "age",
      header: t("age"),
      renderRow: (row) =>
        row.age != null ? (
          <span className="tabular-nums">{row.age}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortValue: (row) => row.age ?? -1,
    },
    {
      id: "phone",
      header: tc("phone"),
      renderRow: (row) =>
        row.phone ? (
          <span dir="ltr" className="tabular-nums">{row.phone}</span>
        ) : (
          <span className="text-muted-foreground">{t("noPhone")}</span>
        ),
      exportValue: (row) => row.phone ?? "",
    },
    {
      id: "location",
      header: t("city"),
      renderRow: (row) => (
        <span className="text-muted-foreground">
          {locale === "ar" ? row.cityNameAr ?? "—" : row.cityNameEn ?? "—"}
          {row.govNameAr
            ? ` · ${locale === "ar" ? row.govNameAr : row.govNameEn}`
            : ""}
        </span>
      ),
      exportValue: (row) => `${row.cityNameEn ?? ""} ${row.govNameEn ?? ""}`,
    },
    {
      id: "blood",
      header: t("bloodGroup"),
      renderRow: (row) => (
        <Badge variant="outline" className="tabular-nums">
          {t(BLOOD_KEY[row.bloodGroup] ?? "bgUnknown")}
        </Badge>
      ),
      exportValue: (row) => row.bloodGroup,
    },
    {
      id: "visits",
      header: t("visitHistory"),
      renderRow: (row) => (
        <div className="flex items-center gap-3 tabular-nums text-muted-foreground">
          <span>{row.appointmentCount} APT</span>
          <span>{row.invoiceCount} INV</span>
        </div>
      ),
      exportValue: (row) => `${row.appointmentCount} appointments, ${row.invoiceCount} invoices`,
      hideable: true,
    },
    {
      id: "actions",
      header: "",
      className: "w-12",
      hideable: false,
      renderRow: (row) => (
        <Link
          href={`/patients/${row.id}`}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={tc("view")}
        >
          <ArrowUpRightIcon className="size-4" />
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={t("search")}
      searchValue={(row) => `${row.nameAr} ${row.nameEn} ${row.mrn} ${row.phone ?? ""}`}
      emptyIcon={UsersIcon}
      emptyTitle={t("noPatientsYet")}
      emptyHint={t("noPatientsYetHint")}
      emptyActionLabel={t("registerFirst")}
      emptyActionHref="/patients/new"
      exportFilename="patients"
      toolbarActions={
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/patients/new">
            <UserRoundPlus className="size-3.5" />
            {t("registerFirst")}
          </Link>
        </Button>
      }
    />
  );
}