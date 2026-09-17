"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Power } from "lucide-react";
import { setUserActiveAction } from "@/actions/admin";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type UserRow = {
  id: string;
  nameAr: string;
  nameEn: string;
  email: string;
  username: string;
  roleNameAr: string;
  roleNameEn: string;
  branchNameAr: string;
  branchNameEn: string;
  isActive: boolean;
  lastLoginAt: string | null;
};

function ActiveToggle({ userId, isActive }: { userId: string; isActive: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await setUserActiveAction(userId, !isActive);
          if (res.ok) {
            toast.success(t("common.updated"));
            router.refresh();
          } else {
            toast.error(t(res.error));
          }
        })
      }
    >
      <Power className="size-3.5" />
      {isActive ? t("common.deactivate") : t("common.activate")}
    </Button>
  );
}

function buildColumns(locale: string, t: (k: string) => string): ColumnDef<UserRow>[] {
  return [
    {
      id: "name",
      header: t("common.name"),
      renderRow: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{locale === "ar" ? row.nameAr : row.nameEn || row.nameAr || "—"}</span>
          <span className="text-xs text-muted-foreground">{row.email}</span>
        </div>
      ),
      sortValue: (row) => row.nameEn || row.nameAr,
    },
    {
      id: "role",
      header: t("admin.role"),
      renderRow: (row) => (
        <Badge variant="secondary">{locale === "ar" ? row.roleNameAr : row.roleNameEn}</Badge>
      ),
    },
    {
      id: "branch",
      header: t("settings.branchesSettings"),
      renderRow: (row) => (
        <span className="text-sm">{locale === "ar" ? row.branchNameAr : row.branchNameEn || "—"}</span>
      ),
    },
    {
      id: "status",
      header: t("common.status"),
      renderRow: (row) => (
        <Badge variant={row.isActive ? "success" : "muted"}>
          {row.isActive ? t("admin.isActive") : t("assets.statusInactive")}
        </Badge>
      ),
    },
    {
      id: "lastLogin",
      header: t("common.date"),
      renderRow: (row) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      renderRow: (row) => <ActiveToggle userId={row.id} isActive={row.isActive} />,
    },
  ];
}

export function UsersTable({ rows, locale }: { rows: UserRow[]; locale: string }) {
  const tr = useTranslations();
  return (
    <DataTable
      columns={buildColumns(locale, tr)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("admin.users")}`}
      searchValue={(r) => `${r.nameAr} ${r.nameEn} ${r.email} ${r.username}`}
      emptyIcon={Users}
      emptyTitle={tr("admin.noUsers")}
      emptyHint={tr("admin.createFirstUser")}
      showColumnsControl={false}
    />
  );
}
