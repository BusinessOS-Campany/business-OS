import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Wallet, ArrowLeft } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getPayrollRunById } from "@/lib/services/payroll";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RunActions } from "@/features/payroll/run-actions";
import { LinesTable, type LineRow } from "@/features/payroll/lines-table";
import { LineEditForm, type EditableLine } from "@/features/payroll/line-edit-form";

const STATUS_VARIANT: Record<string, "secondary" | "info" | "success" | "outline"> = {
  DRAFT: "secondary",
  APPROVED: "info",
  PAID: "success",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "payroll.statusDraft",
  APPROVED: "payroll.statusApproved",
  PAID: "payroll.statusPaid",
};

export default async function PayrollRunPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("payroll");
  const { id } = await params;
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const run = await getPayrollRunById(id);
  if (!run) notFound();

  const periodName = locale === "ar" ? run.period.nameAr : run.period.nameEn;

  const rows: LineRow[] = run.lines.map((l) => ({
    id: l.id,
    employeeId: l.employee.id,
    employeeNameAr: l.employee.nameAr,
    employeeNameEn: l.employee.nameEn ?? l.employee.nameAr,
    employeeNo: l.employee.employeeNo,
    baseSalary: Number(l.baseSalary),
    allowances: Number(l.allowances),
    deductions: Number(l.deductions),
    overtime: Number(l.overtime),
    bonuses: Number(l.bonuses),
    advances: Number(l.advances),
    loans: Number(l.loans),
    net: Number(l.net),
    currency: l.currency,
  }));

  const editable: EditableLine[] = run.lines.map((l) => ({
    id: l.id,
    label: `${l.employee.employeeNo} — ${locale === "ar" ? l.employee.nameAr : l.employee.nameEn ?? l.employee.nameAr}`,
    baseSalary: Number(l.baseSalary),
    allowances: Number(l.allowances),
    deductions: Number(l.deductions),
    overtime: Number(l.overtime),
    bonuses: Number(l.bonuses),
    advances: Number(l.advances),
    loans: Number(l.loans),
    note: l.note,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${t("payroll.run")} · ${periodName}`}
        description={`${run.lines.length} ${t("employees.title")}`}
        icon={<Wallet />}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[run.status] ?? "outline"}>{t(STATUS_LABEL[run.status] ?? run.status)}</Badge>
            <RunActions runId={run.id} status={run.status} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/payroll/${run.periodId}`}>
                <ArrowLeft className="size-4" /> {t("common.back")}
              </Link>
            </Button>
          </div>
        }
      />

      {run.status === "DRAFT" && <LineEditForm lines={editable} />}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-4 text-primary" />
            {t("payroll.net")} ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("common.noResults")}</p>
          ) : (
            <LinesTable rows={rows} locale={locale} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
