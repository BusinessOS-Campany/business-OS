import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, RefreshCw } from "lucide-react";
import { DeleteCategoryButton } from "@/components/admin/delete-category-button";
import { resetCategories } from "@/lib/reset-categories-action";
import { T } from "@/components/translate";
import { getServerTranslations } from "@/lib/i18n/server";

export default async function AdminCategoriesPage() {
  const { t } = await getServerTranslations();
  let categories: any[] = [];
  try {
    categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } }, parent: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
  } catch { categories = []; }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold"><T k="admin.categories" /></h1>
        <div className="flex gap-2">
          <form action={resetCategories}>
            <Button type="submit" variant="outline" size="sm" className="w-full sm:w-auto text-red-500 border-red-300 hover:bg-red-50">
              <RefreshCw className="ml-2 h-4 w-4" /><T k="admin.reset_all" />
            </Button>
          </form>
          <Link href="/admin/categories/new">
            <Button size="sm" className="w-full sm:w-auto"><Plus className="ml-2 h-4 w-4" /><T k="admin.new_category" /></Button>
          </Link>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><T k="admin.images" /></TableHead>
            <TableHead><T k="admin.category_name" /></TableHead>
            <TableHead><T k="admin.parent_category" /></TableHead>
            <TableHead><T k="admin.slug" /></TableHead>
            <TableHead><T k="admin.product_count" /></TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((c) => (
            <TableRow key={c.id}>
              <TableCell data-label={t("admin.images")}>
                {c.image ? (
                  <img src={c.image} alt="" className="h-10 w-10 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium" data-label={t("admin.category_name")}>
                {c.name}
                {!c.parentId && <span className="mr-2 text-xs text-primary"><T k="admin.main" /></span>}
              </TableCell>
              <TableCell data-label={t("admin.parent_category")}>{c.parent?.name || "—"}</TableCell>
              <TableCell className="text-muted-foreground" data-label={t("admin.slug")}>{c.slug}</TableCell>
              <TableCell data-label={t("admin.product_count")}>{c._count.products}</TableCell>
              <TableCell data-label="">
                <div className="flex gap-1">
                  <Link href={`/admin/categories/${c.id}/edit`}>
                    <Button variant="outline" size="sm"><T k="admin.edit" /></Button>
                  </Link>
                  <DeleteCategoryButton categoryId={c.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {categories.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                <T k="admin.no_categories" />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}