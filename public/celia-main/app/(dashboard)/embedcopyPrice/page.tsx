import { requirePagePermission } from "@/lib/session";
import { getCopyPricePerGB } from "@/lib/pricing/copy-price-store";
import { PageHeader } from "@/components/dashboard/page-header";
import { CopyPriceSettings } from "@/components/pricing/copy-price-settings";

export const metadata = {
  title: "سعر النسخ",
  description: "تحديد سعر النسخ بالجيجابايت",
};

export const dynamic = "force-dynamic";

export default async function CopyPricePage() {
  const { session } = await requirePagePermission("set_copy_price");

  const pricePerGB = await getCopyPricePerGB();

  return (
    <>
      <PageHeader titleKey="sidebar.copyPrice" />
      <div className="relative flex w-full flex-col overflow-hidden min-h-[calc(100dvh-14rem)]">
        <div
          className="pointer-events-none absolute -top-10 -end-16 size-60 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-12 -start-16 size-60 rounded-full bg-warning/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex-1">
          <CopyPriceSettings isAdmin={session.user.role === "admin"} initialPrice={pricePerGB} />
        </div>
      </div>
    </>
  );
}
