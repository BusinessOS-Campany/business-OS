import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ExternalLink, Plus } from "lucide-react";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { T } from "@/components/translate";
import { getServerTranslations } from "@/lib/i18n/server";
import { localizedName } from "@/lib/i18n/localized";

const PAGE_SIZE = 20;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, t } = await getServerTranslations();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const skip = (page - 1) * PAGE_SIZE;

  let products: any[] = [];
  let totalCount = 0;
  try {
    products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
    });
    totalCount = await prisma.product.count();
  } catch { products = []; totalCount = 0; }
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold"><T k="admin.products" /></h1>
        <Link href="/admin/products/new">
          <Button size="sm" className="w-full sm:w-auto"><Plus className="ml-2 h-4 w-4" /><T k="admin.new_product" /></Button>
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><T k="admin.product_name" /></TableHead>
            <TableHead><T k="admin.price" /></TableHead>
            <TableHead><T k="admin.category_name" /></TableHead>
            <TableHead><T k="admin.stock" /></TableHead>
            <TableHead><T k="admin.featured" /></TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium" data-label={t("admin.product_name")}>{localizedName(p, locale)}</TableCell>
              <TableCell data-label={t("admin.price")}>{Number(p.price).toFixed(2)} <T k="merchant.currency" /></TableCell>
              <TableCell data-label={t("admin.category_name")}>{localizedName(p.category, locale)}</TableCell>
              <TableCell data-label={t("admin.stock")}>
                <Badge variant={p.stock > 0 ? "success" : "danger"}>{p.stock}</Badge>
              </TableCell>
              <TableCell data-label={t("admin.featured")}>{p.featured ? "Yes" : "No"}</TableCell>
              <TableCell data-label="">
                <div className="flex gap-1">
                    <Link href={`/products/${p.slug}`}>
                    <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                  </Link>
                  <Link href={`/admin/products/${p.id}/edit`}>
                    <Button variant="outline" size="sm"><T k="admin.edit" /></Button>
                  </Link>
                  <DeleteProductButton productId={p.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {products.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                <T k="merchant.no_products" />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {page > 1 && (
            <Link href={`/admin/products?page=${page - 1}`}>
              <Button variant="outline" size="sm"><ChevronRight className="h-4 w-4" /></Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/admin/products?page=${page + 1}`}>
              <Button variant="outline" size="sm"><ChevronLeft className="h-4 w-4" /></Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
