import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";

export const dynamic = "force-dynamic";

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || role !== "MERCHANT") redirect("/login");

  const userId = (session.user as any).id;
  const store = await prisma.store.findUnique({ where: { userId }, select: { name: true, nameEn: true, logo: true, slug: true } });

  return (
    <MerchantSidebar storeName={store?.name || ""} storeNameEn={store?.nameEn || ""} storeLogo={store?.logo} storeSlug={store?.slug}>
      {children}
    </MerchantSidebar>
  );
}
