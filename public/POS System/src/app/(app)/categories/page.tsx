import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { b2n } from "@/lib/format";
import { CategoriesClient } from "@/components/categories/categories-client";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";
  const canManage = can(tenant, "category.manage");

  if (!canManage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية إدارة الأقسام" : "No permission to manage categories"}</p>
      </div>
    );
  }

  const cats = await prisma.category.findMany({
    where: { companyId: tenant.companyId },
    select: {
      id: true, name: true, nameAr: true, icon: true, color: true, sortOrder: true, isActive: true,
      _count: { select: { products: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <CategoriesClient
      lang={lang}
      categories={cats.map((c) => ({
        id: c.id,
        name: c.name,
        nameAr: c.nameAr,
        icon: c.icon,
        color: c.color,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        productCount: c._count.products,
      }))}
    />
  );
}