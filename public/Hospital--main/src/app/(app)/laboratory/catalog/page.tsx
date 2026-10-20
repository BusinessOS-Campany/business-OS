import { cookies } from "next/headers";
import { FlaskConical } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getLabTests } from "@/lib/services/laboratory";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LabTestForm } from "@/features/lab/lab-test-form";
import { LabTestToggle } from "@/features/lab/lab-test-toggle";

export const metadata = { title: "Test Catalog" };

export default async function LabCatalogPage() {
  await requirePermission("laboratory");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const tests = await getLabTests();

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("laboratory.testCatalog")}
        description={t("laboratory.activeTests")}
        icon={<FlaskConical />}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              {tests.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("laboratory.noOrders")}</p>
              ) : (
                <ul className="divide-y">
                  {tests.map((test) => (
                    <li key={test.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{locale === "ar" ? test.nameAr : test.nameEn}</span>
                          <Badge variant={test.isActive ? "success" : "muted"}>
                            {test.isActive ? t("laboratory.activeStatus") : t("laboratory.inactiveStatus")}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {test.code} · {test.category} · {test.sampleType} · {test.price.toFixed(2)} YER
                        </p>
                      </div>
                      <LabTestToggle testId={test.id} isActive={test.isActive} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <LabTestForm />
      </div>
    </div>
  );
}