import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { FileText, ShieldCheck, Building2, User } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getClaimById } from "@/lib/services/insurance";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClaimStatusActions } from "@/features/insurance/claim-actions";
import { statusLabel, statusVariant } from "@/lib/insurance-statuses";

export const metadata = { title: "Insurance Claim Detail" };

function fmtDate(s: string | null | undefined, locale: string) {
  if (!s) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-YE" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s));
  } catch {
    return s;
  }
}

function fmtCurrency(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const claim = await getClaimById(id);
  if (!claim) notFound();

  const patientName = locale === "ar" ? claim.patient.nameAr : claim.patient.nameEn;
  const companyName = locale === "ar" ? claim.company.nameAr : claim.company.nameEn;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${t("insurance.claimNo")}: ${claim.claimNo}`}
        description={t("insurance.claimDetail")}
        icon={<ShieldCheck />}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/insurance/claims">{t("insurance.claims")}</Link>
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4 text-primary" />
              {t("insurance.claimDetail")}
              <Badge variant={statusVariant(claim.status)} className="ml-auto">{t(statusLabel(claim.status))}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-muted-foreground">{t("insurance.claimNo")}: </span>
                <span className="font-semibold tabular-nums">{claim.claimNo}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("insurance.claimAmount")}: </span>
                <span className="tabular-nums font-semibold">{fmtCurrency(Number(claim.amount))}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("insurance.approvedAmount")}: </span>
                <span className="tabular-nums">{fmtCurrency(claim.approvedAmount != null ? Number(claim.approvedAmount) : null)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("insurance.policyNo")}: </span>
                <span>{claim.policyNo ?? "—"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-muted-foreground">{t("insurance.submittedAt")}: </span>
                <span>{fmtDate(claim.submittedAt?.toISOString(), locale)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("insurance.decisionAt")}: </span>
                <span>{fmtDate(claim.decisionAt?.toISOString(), locale)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("insurance.claimDetail")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="size-4 text-primary" />
                <span className="font-medium">{patientName}</span>
                <span className="text-muted-foreground">({claim.patient.mrn})</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                <span className="font-medium">{companyName}</span>
                {claim.policyNo ? <span className="text-muted-foreground">· {t("insurance.policyNo")}: {claim.policyNo}</span> : null}
              </div>
              {claim.company.phone ? <div className="text-xs text-muted-foreground">{t("common.phone")}: {claim.company.phone}</div> : null}
              {claim.patient.phone ? <div className="text-xs text-muted-foreground">{t("common.patient")}: {claim.patient.phone}</div> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-primary" />
                {t("insurance.invoice")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">{t("insurance.invoiceNo")}: </span>
                  <Button asChild variant="link" size="sm" className="p-0 h-auto font-semibold tabular-nums">
                    <Link href={`/billing/${claim.invoice.id}`}>{claim.invoice.invoiceNo}</Link>
                  </Button>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("insurance.dueAmount")}: </span>
                  <span className="tabular-nums font-semibold">{fmtCurrency(Number(claim.invoice.dueAmount))}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("insurance.claimAmount")}: </span>
                  <span className="tabular-nums">{fmtCurrency(Number(claim.invoice.total))}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("common.status")}: </span>
                  <Badge variant={claim.invoice.status === "PAID" ? "success" : "outline"}>{claim.invoice.status}</Badge>
                </div>
              </div>

              {claim.invoice.items.length > 0 && (
                <div className="mt-3 space-y-1 rounded border p-3 text-xs">
                  <p className="font-medium">{t("insurance.invoiceItems")}</p>
                  {claim.invoice.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.description}</span>
                      <span className="tabular-nums">{fmtCurrency(Number(item.total))}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("insurance.claimActions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ClaimStatusActions claimId={claim.id} status={claim.status} approvedAmount={claim.approvedAmount != null ? Number(claim.approvedAmount) : null} />
        </CardContent>
      </Card>
    </div>
  );
}