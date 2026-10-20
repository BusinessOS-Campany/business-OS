import Link from "next/link";
import { cookies } from "next/headers";
import { Plus } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getClaimableInvoices } from "@/lib/services/insurance";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClaimForm, type ClaimableInvoice } from "@/features/insurance/claim-form";

export const metadata = { title: "Create Insurance Claim" };

export default async function NewClaimPage() {
  await requirePermission("insurance", "create");

  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const invoices = (await getClaimableInvoices()).map((i): ClaimableInvoice => ({
    id: i.id,
    invoiceNo: i.invoiceNo,
    patientNameAr: i.patientNameAr,
    patientNameEn: i.patientNameEn,
    mrn: i.mrn,
    companyId: i.companyId,
    companyNameAr: i.companyNameAr,
    companyNameEn: i.companyNameEn,
    policyNo: i.policyNo,
    coverageRate: i.coverageRate != null ? Number(i.coverageRate) : null,
    dueAmount: i.dueAmount,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("insurance.newClaim")}
        description={t("insurance.newClaim")}
        icon={<Plus />}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/insurance/claims">{t("insurance.claims")}</Link>
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4 text-primary" />
            {t("insurance.claimDetail")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClaimForm invoices={invoices} locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}