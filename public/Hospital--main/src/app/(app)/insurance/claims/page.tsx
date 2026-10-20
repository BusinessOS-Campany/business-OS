import Link from "next/link";
import { cookies } from "next/headers";
import { FileText, Plus } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import type { ClaimStatus } from "@prisma/client";
import { getClaims } from "@/lib/services/insurance";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClaimsTable, type ClaimRow } from "@/features/insurance/claims-table";
import { statusLabel } from "@/lib/insurance-statuses";

export const metadata = { title: "Insurance Claims" };

const STATUSES: ClaimStatus[] = ["DRAFT", "SUBMITTED", "IN_REVIEW", "APPROVED", "PARTIALLY_APPROVED", "REJECTED", "PAID"];

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; q?: string }>;
}) {
  await requirePermission("insurance");
  const params = searchParams ? await searchParams : {};
  const activeStatus = STATUSES.includes(params.status as ClaimStatus) ? (params.status as ClaimStatus) : undefined;

  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const claims = await getClaims({ status: activeStatus, q: params.q, limit: 100 });

  const rows: ClaimRow[] = claims.map((c) => ({
    id: c.id,
    claimNo: c.claimNo,
    invoiceNo: c.invoice.invoiceNo,
    invoiceHref: c.invoice.id,
    patientNameAr: c.patient.nameAr,
    patientNameEn: c.patient.nameEn,
    mrn: c.patient.mrn,
    companyNameAr: c.company.nameAr,
    companyNameEn: c.company.nameEn,
    policyNo: c.policyNo,
    amount: Number(c.amount),
    approvedAmount: c.approvedAmount != null ? Number(c.approvedAmount) : null,
    status: c.status,
    submittedAt: c.submittedAt?.toISOString() ?? null,
    decisionAt: c.decisionAt?.toISOString() ?? null,
  }));

  const chip = (labelKey: string, href: string, active = false) => (
    <Link href={href}>
      <Badge variant={active ? "default" : "outline"} className="cursor-pointer hover:shadow-sm">
        {t(labelKey)}
      </Badge>
    </Link>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("insurance.claims")}
        description={t("insurance.claims")}
        icon={<FileText />}
        actions={
          <Button asChild size="sm">
            <Link href="/insurance/claims/new">
              <Plus className="size-4" /> {t("insurance.newClaim")}
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {chip("common.all", `/insurance/claims${params.q ? `?q=${params.q}` : ""}`, !activeStatus)}
        {STATUSES.map((s) => (
          <span key={s}>{chip(statusLabel(s), `/insurance/claims?status=${s}${params.q ? `&q=${params.q}` : ""}`, activeStatus === s)}</span>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-primary" />
            {activeStatus ? t(statusLabel(activeStatus)) : t("insurance.claims")} ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("insurance.noClaims")}</p>
          ) : (
            <ClaimsTable rows={rows} locale={locale} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}