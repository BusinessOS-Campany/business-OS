import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/dal";
import { LANG_COOKIE, localeFrom } from "@/lib/i18n";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Group = { title: string; hrefPrefix: string; items: Array<{ id: string; label: string; sub?: string }> };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const cookieStore = await cookies();
  const locale = localeFrom(cookieStore.get(LANG_COOKIE)?.value);
  await requirePermission("search:view");
  const { q = "" } = await searchParams;
  const query = q.trim();

  const groups: Group[] = [];

  if (query) {
    const contains = { contains: query, mode: "insensitive" as const };

    const [medicines, customers, suppliers, invoices, prescriptions] = await Promise.all([
      prisma.medicine.findMany({ where: { OR: [{ nameAr: contains }, { nameEn: contains }, { barcode: contains }, { sku: contains }] }, take: 20 }),
      prisma.customer.findMany({ where: { OR: [{ name: contains }, { phone: contains }] }, take: 20 }),
      prisma.supplier.findMany({ where: { OR: [{ name: contains }, { nameAr: contains }, { phone: contains }] }, take: 20 }),
      prisma.salesInvoice.findMany({ where: { invoiceNumber: contains }, take: 20 }),
      prisma.prescription.findMany({ where: { prescriptionNo: contains }, take: 20 }),
    ]);

    if (medicines.length) groups.push({
      title: locale === "ar" ? "الأدوية" : "Medicines",
      hrefPrefix: "/medicines",
      items: medicines.map((m) => ({ id: m.id, label: m.nameAr, sub: m.nameEn ?? m.barcode ?? undefined })),
    });
    if (customers.length) groups.push({
      title: locale === "ar" ? "العملاء" : "Customers",
      hrefPrefix: "/customers",
      items: customers.map((c) => ({ id: c.id, label: c.name, sub: c.phone ?? undefined })),
    });
    if (suppliers.length) groups.push({
      title: locale === "ar" ? "الموردون" : "Suppliers",
      hrefPrefix: "/suppliers",
      items: suppliers.map((s) => ({ id: s.id, label: s.nameAr ?? s.name, sub: s.phone ?? undefined })),
    });
    if (invoices.length) groups.push({
      title: locale === "ar" ? "الفواتير" : "Invoices",
      hrefPrefix: "/sales",
      items: invoices.map((i) => ({ id: i.id, label: i.invoiceNumber, sub: i.issuedAt.toLocaleDateString(locale === "ar" ? "ar-YE" : "en-GB") })),
    });
    if (prescriptions.length) groups.push({
      title: locale === "ar" ? "الوصفات" : "Prescriptions",
      hrefPrefix: "/prescriptions",
      items: prescriptions.map((p) => ({ id: p.id, label: p.prescriptionNo, sub: p.issueDate.toLocaleDateString(locale === "ar" ? "ar-YE" : "en-GB") })),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title={locale === "ar" ? "بحث شامل" : "Global search"} description={locale === "ar" ? "ابحث في الأدوية والعملاء والموردين والفواتير" : "Search medicines, customers, suppliers and invoices"} />

      <form className="relative max-w-xl">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="ps-9 py-5 text-base" name="q" defaultValue={query} placeholder={locale === "ar" ? "اكتب للبحث..." : "Type to search..."} autoFocus />
        <button type="submit" className="hidden" />
      </form>

      {!query ? (
        <p className="text-sm text-muted-foreground">{locale === "ar" ? "ابدأ بالكتابة للبحث في النظام." : "Start typing to search the system."}</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{locale === "ar" ? "لا توجد نتائج." : "No results."}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((g) => (
            <Card key={g.title}>
              <CardHeader><CardTitle className="text-base">{g.title}</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {g.items.map((item) => (
                  <Link key={item.id} href={g.hrefPrefix} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted">
                    <span className="font-medium">{item.label}</span>
                    {item.sub ? <span className="text-muted-foreground">{item.sub}</span> : null}
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}