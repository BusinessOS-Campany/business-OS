import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Wallet, ArrowLeft, Eye, CalendarRange } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getPayrollPeriodById } from "@/lib/services/payroll";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateRunButton, RunActions } from "@/features/payroll/run-actions";

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

export default async function PayrollPeriodPage({ params }: { params: Promise<{ id: string }> }) {
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

  const period = await getPayrollPeriodById(id);
  if (!period) notFound();

  const name = locale === "ar" ? period.nameAr : period.nameEn;
  const fmt = (d: Date) => new Date(d).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB");

  return (
    <div className="space-y-5">
      <PageHeader
        title={name}
        description={`${fmt(period.startDate)} — ${fmt(period.endDate)}`}
        icon={<Wallet />}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[period.status] ?? "outline"}>{t(STATUS_LABEL[period.status] ?? period.status)}</Badge>
            <GenerateRunButton periodId={period.id} />
            <Button asChild variant="outline" size="sm">
              <Link href="/payroll">
                <ArrowLeft className="size-4" /> {t("common.back")}
              </Link>
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="size-4 text-primary" />
            {t("payroll.newRunTitle")} ({period.runs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {period.runs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("payroll.noPeriods")}</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {period.runs.map((run) => (
                <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Badge variant={STATUS_VARIANT[run.status] ?? "outline"}>{t(STATUS_LABEL[run.status] ?? run.status)}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {run.lines.length} {t("employees.title")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RunActions runId={run.id} status={run.status} />
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/payroll/runs/${run.id}`}>
                        <Eye className="size-4" /> {t("common.view")}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
