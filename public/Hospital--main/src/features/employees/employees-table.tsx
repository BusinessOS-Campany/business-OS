"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export type EmployeeRow = {
  id: string;
  employeeNo: string;
  nameAr: string;
  nameEn: string;
  employeeType: string;
  departmentNameAr: string | null;
  departmentNameEn: string | null;
  positionNameAr: string | null;
  positionNameEn: string | null;
  specialtyNameAr: string | null;
  specialtyNameEn: string | null;
  phone: string | null;
  email: string | null;
  employeeStatus: string;
} & Record<string, unknown>;

const EMPLOYEE_TYPE_KEY: Record<string, string> = {
  DOCTOR: "employees.typeDoctor",
  NURSE: "employees.typeNurse",
  PHARMACIST: "employees.typePharmacist",
  LAB_TECHNICIAN: "employees.typeLabTechnician",
  RADIOLOGIST: "employees.typeRadiologist",
  RADIOLOGY_TECHNICIAN: "employees.typeOther",
  RECEPTIONIST: "employees.typeReceptionist",
  ACCOUNTANT: "employees.typeAccountant",
  CASHIER: "employees.typeCashier",
  HR: "employees.typeHR",
  ADMINISTRATOR: "employees.typeAdministrator",
  CLEANER: "employees.typeOther",
  TECHNICIAN: "employees.typeTechnician",
  AMBULANCE_STAFF: "employees.typeAmbulanceStaff",
  OTHER: "employees.typeOther",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  SUSPENDED: "Suspended",
  TERMINATED: "Terminated",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted" | "destructive" | "default"> = {
  ACTIVE: "success",
  ON_LEAVE: "warning",
  SUSPENDED: "muted",
  TERMINATED: "destructive",
};

function buildColumns(locale: string, t: (k: string) => string, tc: (k: string) => string): ColumnDef<EmployeeRow>[] {
  return [
    {
      id: "employeeNo",
      header: t("employees.employeeNo"),
      renderRow: (row) => (
        <Link href={`/employees/${row.id}`} className="font-medium hover:underline">
          {row.employeeNo}
        </Link>
      ),
      sortValue: (row) => row.employeeNo,
    },
    {
      id: "name",
      header: tc("name"),
      renderRow: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{locale === "ar" ? row.nameAr : row.nameEn}</p>
          <p className="truncate text-xs text-muted-foreground">{locale === "ar" ? row.nameEn : row.nameAr}</p>
        </div>
      ),
      sortValue: (row) => (locale === "ar" ? row.nameAr : row.nameEn),
    },
    {
      id: "employeeType",
      header: t("employees.employeeType"),
      renderRow: (row) => (
        <span className="truncate">{t(EMPLOYEE_TYPE_KEY[row.employeeType] ?? row.employeeType)}</span>
      ),
    },
    {
      id: "department",
      header: t("employees.department"),
      renderRow: (row) => (
        <span className="max-w-[160px] truncate">{locale === "ar" ? row.departmentNameAr : row.departmentNameEn ?? "—"}</span>
      ),
    },
    {
      id: "position",
      header: t("employees.position"),
      renderRow: (row) => (
        <span className="max-w-[160px] truncate">{locale === "ar" ? row.positionNameAr : row.positionNameEn ?? "—"}</span>
      ),
    },
    {
      id: "specialty",
      header: t("employees.specialty"),
      renderRow: (row) => (
        <span className="max-w-[140px] truncate">{locale === "ar" ? row.specialtyNameAr : row.specialtyNameEn ?? "—"}</span>
      ),
    },
    {
      id: "phone",
      header: tc("phone"),
      renderRow: (row) => <span className="tabular-nums text-xs">{row.phone ?? "—"}</span>,
    },
    {
      id: "status",
      header: tc("status"),
      renderRow: (row) => (
        <Badge variant={STATUS_VARIANT[row.employeeStatus] ?? "default"}>{STATUS_LABEL[row.employeeStatus] ?? row.employeeStatus}</Badge>
      ),
    },
  ];
}

export function EmployeesTable({ rows, locale }: { rows: EmployeeRow[]; locale: string }) {
  const t = useTranslations();
  const tc = useTranslations("common");
  return (
    <DataTable
      columns={buildColumns(locale, t, tc)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tc("search")} ${t("employees.title")}`}
      searchValue={(r) =>
        `${r.employeeNo} ${r.nameAr} ${r.nameEn} ${r.phone ?? ""} ${r.email ?? ""} ${r.departmentNameAr ?? ""} ${r.departmentNameEn ?? ""}`
      }
      emptyIcon={Users}
      emptyTitle={t("employees.noEmployees")}
      emptyHint={t("employees.addFirstEmployee")}
      showColumnsControl={false}
    />
  );
}