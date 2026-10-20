import { prisma } from "@/lib/prisma";
import { Store, Package, Star, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { T } from "@/components/translate";
import { getServerTranslations } from "@/lib/i18n/server";

const PAGE_SIZE = 20;

export default async function AdminMerchantsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const skip = (page - 1) * PAGE_SIZE;

  const { t } = await getServerTranslations();
  let merchants: any[] = [];
  let totalMerchants = 0;
  try {
    [merchants, totalMerchants] = await Promise.all([
      prisma.user.findMany({
        where: { role: "MERCHANT" },
        include: {
          store: true,
          _count: { select: { products: true, reviews: true } },
        },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip,
      }),
      prisma.user.count({ where: { role: "MERCHANT" } }),
    ]);
  } catch { merchants = []; totalMerchants = 0; }
  const totalPages = Math.ceil(totalMerchants / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Store className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold"><T k="admin.merchants" /></h1>
        <span className="text-sm text-muted-foreground">({totalMerchants})</span>
      </div>

      <div className="max-md:hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><T k="admin.merchant_name" /></TableHead>
              <TableHead><T k="auth.email" /></TableHead>
              <TableHead><T k="admin.store_name" /></TableHead>
              <TableHead><T k="admin.products" /></TableHead>
              <TableHead><T k="admin.reviews" /></TableHead>
              <TableHead><T k="admin.registration_date" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchants.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8"><T k="admin.no_merchants" /></TableCell></TableRow>
            ) : merchants.map((m) => (
              <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link href={`/admin/merchants/${m.id}`} className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {m.name?.[0] || "?"}
                    </div>
                    <span className="font-medium hover:text-primary transition-colors">{m.name || "—"}</span>
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{m.email}</TableCell>
                <TableCell>
                  <span className="text-sm">{m.store ? (m.store.name || m.store.nameEn || "—") : "—"}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    {m._count.products}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 text-muted-foreground" />
                    {m._count.reviews}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {m.createdAt.toLocaleDateString("ar-SA")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {merchants.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground"><T k="admin.no_merchants" /></CardContent></Card>
        ) : merchants.map((m) => (
          <Link href={`/admin/merchants/${m.id}`} key={m.id}>
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {m.name?.[0] || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Store className="h-3 w-3" />{m.store?.name || m.store?.nameEn || t("admin.no_store")}</span>
                <span className="flex items-center gap-1"><Package className="h-3 w-3" />{m._count.products} {t("admin.products")}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{m.createdAt.toLocaleDateString("ar-SA")}</span>
              </div>
            </CardContent>
          </Card>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={`/admin/merchants?page=${page - 1}`}>
              <Button variant="outline" size="sm"><ChevronRight className="h-4 w-4" /></Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`/admin/merchants?page=${page + 1}`}>
              <Button variant="outline" size="sm"><ChevronLeft className="h-4 w-4" /></Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
