import Link from "next/link";
import { cookies } from "next/headers";
import { ShieldCheck, Building2, Layers, FileText, Clock, CheckCircle2, BadgeCheck, Banknote } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getClaimStats, getInsuranceCompanies, getClaims } from "@/lib/services/insurance";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ClaimsTable, type ClaimRow } from "@/features/insurance/claims-table";
import { CompaniesTable, type CompanyRow } from "@/features/insurance/companies-table";

export const metadata = { title: "Insurance" };

export default async function InsurancePage() {
  await requirePermission("insurance");

  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [stats, companies, claims] = await Promise.all([
    getClaimStats(),
    getInsuranceCompanies(),
    getClaims({ limit: 10 }),
  ]);

  const companyRows: CompanyRow[] = companies.map((c) => ({
    id: c.id,
    code: c.code,
    nameAr: c.nameAr,
    nameEn: c.nameEn,
    phone: c.phone,
    email: c.email,
    schemesCount: c._count.schemes,
    patientsCount: c._count.patients,
    claimsCount: c._count.claims,
    isActive: c.isActive,
  }));

  const claimRows: ClaimRow[] = claims.map((c) => ({
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

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("insurance.title")}
        description={t("insurance.title")}
        icon={<ShieldCheck />}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/insurance/companies">
                <Building2 className="size-4" /> {t("insurance.companies")}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/insurance/claims">
                <FileText className="size-4" /> {t("insurance.claims")}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Building2} label={t("insurance.companies")} value={String(stats.companies)} variant="info" />
        <StatCard icon={Layers} label={t("insurance.schemes")} value={String(stats.schemes)} variant="primary" />
        <StatCard icon={FileText} label={t("insurance.claimsTotal")} value={String(stats.totalClaims)} variant="default" />
        <StatCard icon={Clock} label={t("insurance.claimsPending")} value={String(stats.pending)} variant="warning" />
        <StatCard icon={CheckCircle2} label={t("insurance.claimsApproved")} value={String(stats.approved)} variant="success" />
        <StatCard icon={BadgeCheck} label={t("insurance.claimsPaid")} value={String(stats.paid)} variant="info" />
        <StatCard
          icon={Banknote}
          label={t("insurance.paidToday")}
          value={stats.paidAmountToday.toLocaleString(locale === "ar" ? "ar-YE" : "en-US", { maximumFractionDigits: 2 })}
          variant="success"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4 text-primary" />
            {t("insurance.companies")} ({companyRows.length})
            <span className="ml-auto">
              <Button asChild variant="outline" size="sm">
                <Link href="/insurance/companies">{t("insurance.newCompany")}</Link>
              </Button>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {companyRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("insurance.noCompanies")}. {t("insurance.addFirstCompany")}
            </p>
          ) : (
            <CompaniesTable rows={companyRows} locale={locale} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-primary" />
            {t("insurance.recentClaims")} ({claimRows.length})
            <span className="ml-auto">
              <Button asChild variant="outline" size="sm">
                <Link href="/insurance/claims">{t("insurance.claims")}</Link>
              </Button>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {claimRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("insurance.noClaims")}</p>
          ) : (
            <ClaimsTable rows={claimRows} locale={locale} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}