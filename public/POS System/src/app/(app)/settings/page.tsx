import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { SettingsClient } from "@/components/settings/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";

  if (!can(tenant, "settings.manage")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية الإعدادات" : "No permission to manage settings"}</p>
      </div>
    );
  }

  const company = await prisma.company.findUnique({
    where: { id: tenant.companyId },
    select: {
      id: true, name: true, nameAr: true, nameEn: true, businessType: true,
      regNumber: true, taxNumber: true, phone: true, phoneAlt: true,
      email: true, address: true, governorate: true, district: true,
      invoicePrefix: true, timezone: true, status: true,
    },
  });
  if (!company) return null;

  const [branchCount, warehouseCount, userCount, productCount] = await Promise.all([
    prisma.branch.count({ where: { companyId: tenant.companyId } }),
    prisma.warehouse.count({ where: { companyId: tenant.companyId } }),
    prisma.user.count({ where: { companyId: tenant.companyId } }),
    prisma.product.count({ where: { companyId: tenant.companyId } }),
  ]);

  return (
    <SettingsClient
      lang={lang}
      company={{
        name: company.name, nameAr: company.nameAr, nameEn: company.nameEn,
        businessType: company.businessType, regNumber: company.regNumber,
        taxNumber: company.taxNumber, phone: company.phone, phoneAlt: company.phoneAlt,
        email: company.email, address: company.address, governorate: company.governorate,
        district: company.district, invoicePrefix: company.invoicePrefix,
      }}
      counts={{ branches: branchCount, warehouses: warehouseCount, users: userCount, products: productCount }}
    />
  );
}