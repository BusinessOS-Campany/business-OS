import Link from "next/link";
import { cookies } from "next/headers";
import { Users, Phone } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getSuppliers } from "@/lib/services/pharmacy";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SupplierForm } from "@/features/pharmacy/supplier-form";

export const metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  await requirePermission("procurement");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>(
      (o, k) => (o as Record<string, unknown>)?.[k],
      messages
    );
    return typeof value === "string" ? value : key;
  };

  const suppliers = await getSuppliers();

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("pharmacy.suppliers")}
        description={t("procurement.purchaseOrders")}
        icon={<Users />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          {suppliers.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {t("procurement.suppliers")} — {t("pharmacy.newSupplier")}
              </CardContent>
            </Card>
          ) : (
            suppliers.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{locale === "ar" ? s.nameAr : s.nameEn}</p>
                    <p className="text-xs text-muted-foreground font-mono">{s.code}</p>
                  </div>
                  <Badge variant="outline">
                    {t("procurement.purchaseOrders")}: {s._count.purchaseOrders}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {s.phone ? (
                    <span dir="ltr" className="inline-flex items-center gap-1 tabular-nums">
                      <Phone className="size-3" /> {s.phone}
                    </span>
                  ) : null}
                  {s.email ? <span dir="ltr">{s.email}</span> : null}
                  {s.taxNo ? <span className="font-mono">{s.taxNo}</span> : null}
                </div>
              </Card>
            ))
          )}
          <div>
            <Button asChild size="sm" variant="outline">
              <Link href="/procurement" className="gap-1.5">
                {t("pharmacy.purchaseOrders")}
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <SupplierForm onCreated={() => {}} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}