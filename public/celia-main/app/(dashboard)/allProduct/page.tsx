import { requirePagePermission } from "@/lib/session";
import { getAllProductSales } from "@/lib/products/queries";
import { getProductOptions } from "@/lib/sales/products";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProductsView } from "@/components/products/products-view";

export const metadata = {
  title: "عرض المنتجات",
  description: "عرض جميع المنتجات التي تم بيعها",
};

export const dynamic = "force-dynamic";

export default async function AllProductPage() {
  await requirePagePermission("sold_products");

  const [rows, products] = await Promise.all([getAllProductSales(), getProductOptions()]);

  return (
    <>
      <PageHeader titleKey="sidebar.viewAllSales" />
      <div className="relative flex w-full flex-col overflow-hidden">
        <div
          className="pointer-events-none absolute -top-10 -end-16 size-60 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-12 -start-16 size-60 rounded-full bg-success/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-6">
          <ProductsView initialRows={rows} products={products} />
        </div>
      </div>
    </>
  );
}
