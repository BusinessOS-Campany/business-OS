import Link from "next/link";
import { cookies } from "next/headers";
import { Layers } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getInsuranceSchemes } from "@/lib/services/insurance";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchemesTable, type SchemeRow } from "@/features/insurance/schemes-table";

export const metadata = { title: "Insurance Schemes" };

export default async function SchemesPage() {
  await requirePermission("insurance");

  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const schemes = await getInsuranceSchemes();

  const rows: SchemeRow[] = schemes.map((s) => ({
    id: s.id,
    companyId: s.company.id,
    companyNameAr: s.company.nameAr,
    companyNameEn: s.company.nameEn,
    code: s.company.code,
    nameAr: s.nameAr,
    nameEn: s.nameEn,
    coverageRate: Number(s.coverageRate),
    annualLimit: s.annualLimit != null ? Number(s.annualLimit) : null,
    isActive: s.isActive,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("insurance.schemes")}
        description={t("insurance.schemes")}
        icon={<Layers />}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/insurance/companies">{t("insurance.companies")}</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="size-4 text-primary" />
            {t("insurance.schemes")} ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("insurance.noSchemes")}. {t("insurance.addFirstCompany")}
            </p>
          ) : (
            <SchemesTable rows={rows} locale={locale} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}