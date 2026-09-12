import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getServerTranslations } from "@/lib/i18n/server";
import { localizedName } from "@/lib/i18n/localized";
import { ChevronDown, Shield, RefreshCw, Truck, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductPageClient } from "./product-page-client";
import { ProductReviews } from "@/components/shop/product-reviews";
import { DeleteProductButton } from "@/components/admin/delete-product-button";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug?.normalize("NFC") ?? "";
  let sessionUserId: string | undefined;
  let sessionRole: string | undefined;
  try {
    const session = await auth();
    sessionUserId = (session?.user as any)?.id;
    sessionRole = (session?.user as any)?.role;
  } catch { sessionUserId = undefined; sessionRole = undefined; }

  let product: any = null;
  let avgRating = 0;
  let reviewCount = 0;
  try {
    product = await prisma.product.findFirst({
      where: { slug },
      include: { category: true },
    });
    if (!product) notFound();

    const reviewAgg = await prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: true,
    });
    avgRating = reviewAgg._avg.rating ?? 0;
    reviewCount = reviewAgg._count;
  } catch { notFound(); }

  const priceNum = Number(product.price);
  const specs = product.specs as Record<string, string> | null;

  const { t, locale } = await getServerTranslations();

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 space-y-6" dir={locale === "ar" ? "rtl" : "ltr"}>
      {(sessionRole) === "ADMIN" && (
        <div className="flex gap-2">
          <Link href={`/admin/products/${product.id}/edit`}>
            <Button variant="outline" size="sm">{t("general.edit")}</Button>
          </Link>
          <DeleteProductButton productId={product.id} redirectTo="/admin/products" />
        </div>
      )}

      <nav className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">{t("nav.home")}</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-foreground transition-colors">{t("nav.products")}</Link>
        {product.category && (
          <>
            <span>/</span>
            <Link href={`/categories?parent=${product.category.slug}`} className="hover:text-foreground transition-colors">
              {localizedName(product.category, locale)}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <ProductPageClient product={{
        id: product.id, name: product.name, price: priceNum, discount: product.discount,
        images: product.images, colors: product.colors, sizes: product.sizes, stock: product.stock,
        category: product.category, description: product.description,
        colorStock: product.colorStock as Record<string, number> | null,
        colorImages: product.colorImages as Record<string, string> | null,
        videoUrl: product.videoUrl,
      }} avgRating={avgRating} reviewCount={reviewCount} locale={locale} />

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          {specs && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold">{t("detail.specs")}</h2>
              <div className="divide-y rounded-xl border">
                {Object.entries(specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <ProductReviews productId={product.id} sessionUserId={sessionUserId} />

          <section className="space-y-3">
            <h2 className="text-lg font-bold">{t("detail.faq")}</h2>
            <div className="divide-y rounded-xl border">
              {[1, 2, 3, 4].map((i) => (
                <details key={i} className="group px-4 py-3">
                  <summary className="flex cursor-pointer items-center justify-between text-sm font-medium">
                    {t(`detail.faq_${i}_q`)}
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-xs text-muted-foreground">{t(`detail.faq_${i}_a`)}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-bold">{t("detail.why_trust")}</h3>
            <div className="space-y-3">
              {[
                { icon: Shield, key: "secure_payment" },
                { icon: RefreshCw, key: "money_back" },
                { icon: Truck, key: "free_shipping" },
                { icon: MessageCircle, key: "contact_us" },
              ].map(({ icon: Icon, key }) => (
                <div key={key} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{t(`detail.${key}`)}</p>
                    <p className="text-xs text-muted-foreground">{t(`detail.${key}_desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

    </div>
  );
}