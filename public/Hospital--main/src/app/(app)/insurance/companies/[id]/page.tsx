import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Building2, Layers, Users, FileText } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getInsuranceCompanyById, getInsuranceCompanies } from "@/lib/services/insurance";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchemesTable, type SchemeRow } from "@/features/insurance/schemes-table";
import { CompanyForm, type CompanyInitial } from "@/features/insurance/company-form";
import { SchemeForm } from "@/features/insurance/scheme-form";

export const metadata = { title: "Insurance Company" };

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("insurance");
  const { id } = await params;

  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const company = await getInsuranceCompanyById(id);
  if (!company) notFound();

  const companies = (await getInsuranceCompanies()).map((c) => ({
    id: c.id,
    code: c.code,
    nameAr: c.nameAr,
    nameEn: c.nameEn,
  }));

  const initial: CompanyInitial = {
    id: company.id,
    code: company.code,
    nameAr: company.nameAr,
    nameEn: company.nameEn,
    phone: company.phone,
    email: company.email,
    address: company.address,
    isActive: company.isActive,
  };

  const schemeRows: SchemeRow[] = company.schemes.map((s) => ({
    id: s.id,
    companyId: company.id,
    companyNameAr: company.nameAr,
    companyNameEn: company.nameEn,
    code: company.code,
    nameAr: s.nameAr,
    nameEn: s.nameEn,
    coverageRate: Number(s.coverageRate),
    annualLimit: s.annualLimit != null ? Number(s.annualLimit) : null,
    isActive: s.isActive,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={locale === "ar" ? company.nameAr : (company.nameEn ?? company.nameAr)}
        description={t("insurance.company")}
        icon={<Building2 />}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/insurance/companies">{t("insurance.companies")}</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers className="size-3.5" /> {t("insurance.schemes")}
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums">{company.schemes.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-3.5" /> {t("insurance.patientsCount")}
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums">{company._count.patients}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="size-3.5" /> {t("insurance.claims")}
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums">{company._count.claims}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">{t("insurance.companyCode")}</div>
          <p className="mt-1 text-xl font-semibold tabular-nums">{company.code}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="size-4 text-primary" />
              {t("insurance.schemes")} ({schemeRows.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schemeRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("insurance.noSchemes")}. {t("insurance.newScheme")}
              </p>
            ) : (
              <SchemesTable rows={schemeRows} locale={locale} />
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("insurance.editCompany")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CompanyForm initial={initial} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("insurance.newScheme")}</CardTitle>
            </CardHeader>
            <CardContent>
              <SchemeForm companies={companies} defaultCompanyId={company.id} locale={locale} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}