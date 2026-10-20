import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { FadeIn } from "@/components/motion-wrappers";
import { T } from "@/components/translate";
import { ComparisonClient } from "./client";

export default async function ComparisonPage() {
  let isLoggedIn = false;
  let favoriteIds: string[] = [];
  try {
    const session = await auth();
    const sessionUserId = (session?.user as any)?.id;
    isLoggedIn = !!sessionUserId;
    if (isLoggedIn) {
      const favs = await prisma.favorite.findMany({ where: { userId: sessionUserId! }, select: { productId: true } });
      favoriteIds = favs.map((f) => f.productId);
    }
  } catch { isLoggedIn = false; favoriteIds = []; }

  return (
    <FadeIn>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-8"><T k="comparison.title" /></h1>
        <ComparisonClient isLoggedIn={isLoggedIn} initialFavIds={favoriteIds} />
      </div>
    </FadeIn>
  );
}
