import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { FadeIn } from "@/components/motion-wrappers";
import { T } from "@/components/translate";
import { ProductsContent } from "./products-content";

export const revalidate = 60;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string; featured?: string; q?: string; sort?: string; minPrice?: string; maxPrice?: string; inStock?: string; brand?: string; color?: string; size?: string; minRating?: string; newArrivals?: string; onSale?: string; page?: string }> }) {
  const params = await searchParams;

  return (
    <FadeIn>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {params.q ? (
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Search className="h-6 w-6" />
              <T k="products.search_results" />: &quot;{params.q}&quot;
            </h1>
          </div>
        ) : (
          <h1 className="text-2xl font-bold mb-8"><T k="products.title" /></h1>
        )}

        <Suspense fallback={<ProductsSkeleton />}>
          <ProductsContent searchParams={params} />
        </Suspense>
      </div>
    </FadeIn>
  );
}

function ProductsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-8 w-20 bg-muted rounded-full animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="rounded-xl border border-border overflow-hidden">
            <div className="aspect-square bg-muted animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
              <div className="h-4 w-1/4 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
