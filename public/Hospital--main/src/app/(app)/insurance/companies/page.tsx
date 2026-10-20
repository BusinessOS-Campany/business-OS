import Link from "next/link";
import { cookies } from "next/headers";
import { Building2 } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getInsuranceCompanies } from "@/lib/services/insurance";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompaniesTable, type CompanyRow } from "@/features/insurance/companies-table";
import { CompanyForm } from "@/features/insurance/company-form";

export const metadata = { title: "Insurance Companies" };

export default async function CompaniesPage() {
  await requirePermission("insurance");

  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const companies = await getInsuranceCompanies();

  const rows: CompanyRow[] = companies.map((c) => ({
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

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("insurance.companies")}
        description={t("insurance.companies")}
        icon={<Building2 />}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/insurance">{t("insurance.title")}</Link>
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-primary" />
              {t("insurance.companies")} ({rows.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("insurance.noCompanies")}</p>
            ) : (
              <CompaniesTable rows={rows} locale={locale} />
            )}
          </CardContent>
        </Card>

        <CompanyForm />
      </div>
    </div>
  );
}