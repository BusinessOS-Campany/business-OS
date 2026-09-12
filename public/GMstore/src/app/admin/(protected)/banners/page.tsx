import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { DeleteBannerButton } from "@/components/admin/delete-banner-button";
import { T } from "@/components/translate";
import { getServerTranslations } from "@/lib/i18n/server";

export default async function AdminBannersPage() {
  const { t } = await getServerTranslations();
  let banners: any[] = [];
  try {
    banners = await prisma.banner.findMany({ orderBy: { order: "asc" } });
  } catch { banners = []; }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold"><T k="admin.banners" /></h1>
        <Link href="/admin/banners/new">
          <Button size="sm" className="w-full sm:w-auto"><Plus className="ml-2 h-4 w-4" /><T k="admin.new_banner" /></Button>
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><T k="admin.images" /></TableHead>
            <TableHead><T k="admin.title" /></TableHead>
            <TableHead><T k="admin.order_label" /></TableHead>
            <TableHead><T k="admin.active" /></TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {banners.map((b) => (
            <TableRow key={b.id}>
              <TableCell data-label={t("admin.images")}>
                <img src={b.image} alt="" className="h-14 w-28 rounded-lg object-cover border border-border" />
              </TableCell>
              <TableCell className="font-medium" data-label={t("admin.title")}>{b.title || b.titleEn || "-"}</TableCell>
              <TableCell data-label={t("admin.order_label")}>{b.order}</TableCell>
              <TableCell data-label={t("admin.active")}>{b.active ? t("admin.yes") : t("admin.no")}</TableCell>
              <TableCell data-label="">
                <div className="flex gap-1">
                  <Link href={`/admin/banners/${b.id}/edit`}>
                    <Button variant="outline" size="sm"><T k="admin.edit" /></Button>
                  </Link>
                  <DeleteBannerButton bannerId={b.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {banners.length === 0 && (
            <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  <T k="admin.no_banners" />
                </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
