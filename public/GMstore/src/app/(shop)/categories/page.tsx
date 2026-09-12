import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { FadeIn, StaggerContainer, StaggerItem, HoverCard } from "@/components/motion-wrappers";
import { T } from "@/components/translate";
import { getServerLocale } from "@/lib/i18n/server";
import { localizedName } from "@/lib/i18n/localized";
import { ChevronLeft, Home } from "lucide-react";

function catImage(cat: { image: string | null }) {
  return cat.image ?? undefined;
}

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ parent?: string }> }) {
  const locale = await getServerLocale();
  const params = await searchParams;
  const parentSlug = params.parent;

  if (parentSlug) {
    let parent: any = null;
    let children: any[] = [];
    try {
      parent = await prisma.category.findUnique({ where: { slug: parentSlug }, select: { id: true, name: true, nameEn: true, slug: true } });
      if (!parent) {
        return <div className="mx-auto max-w-7xl px-4 py-8 text-center text-muted-foreground"><T k="categories.not_found" /></div>;
      }
      children = await prisma.category.findMany({
        where: { parentId: parent.id },
        select: { id: true, name: true, nameEn: true, slug: true, image: true, _count: { select: { products: true } } },
        orderBy: { name: "asc" },
      });
    } catch { parent = null; children = []; }
    return (
      <FadeIn>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground"><Home className="h-4 w-4" /></Link>
            <ChevronLeft className="h-4 w-4" />
            <Link href="/categories" className="hover:text-foreground"><T k="categories.title" /></Link>
            <ChevronLeft className="h-4 w-4" />
            <span className="text-foreground font-medium">{localizedName(parent, locale)}</span>
          </nav>
          <h1 className="text-2xl font-bold">{localizedName(parent, locale)}</h1>
          <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((c) => (
              <StaggerItem key={c.id}>
                <Link href={`/products?category=${c.slug}`}>
                  <HoverCard>
                    <Card className="hover:shadow-lg transition-shadow overflow-hidden">
                      <div className="aspect-[2/1] overflow-hidden bg-muted">
                        {catImage(c) ? (
                          <img src={catImage(c)} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-muted" />
                        )}
                      </div>
                      <CardContent className="p-4 text-center space-y-1">
                        <h2 className="text-lg font-semibold">{localizedName(c, locale)}</h2>
                        <p className="text-sm text-muted-foreground">{c._count.products} <T k="categories.product_count" /></p>
                      </CardContent>
                    </Card>
                  </HoverCard>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </FadeIn>
    );
  }

  let categories: any[] = [];
  try {
    categories = await prisma.category.findMany({
      where: { parentId: null },
      include: { _count: { select: { products: true, children: true } } },
      orderBy: { name: "asc" },
    });
  } catch { categories = []; }

  return (
    <FadeIn>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <h1 className="text-2xl font-bold"><T k="categories.title" /></h1>
        <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <StaggerItem key={c.id}>
              <Link href={`/categories?parent=${c.slug}`}>
                <HoverCard>
                  <Card className="hover:shadow-lg transition-shadow overflow-hidden">
                    <div className="aspect-[2/1] overflow-hidden bg-muted">
                      {catImage(c) ? (
                        <img src={catImage(c)} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted" />
                      )}
                    </div>
                    <CardContent className="p-4 text-center space-y-1">
                      <h2 className="text-lg font-semibold">{localizedName(c, locale)}</h2>
                      <p className="text-sm text-muted-foreground">
                        {c._count.children} <T k="categories.subcategories" /> &middot; {c._count.products} <T k="categories.product_count" />
                      </p>
                    </CardContent>
                  </Card>
                </HoverCard>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </FadeIn>
  );
}