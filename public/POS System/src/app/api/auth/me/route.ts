import { prisma } from "@/lib/prisma";
import { ok, unauthorized, serverError } from "@/lib/api";
import { getSession } from "@/server/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const user = session.user;
    const permissions = new Set<string>();
    for (const ur of session.user.roles) {
      for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
    }

    let branches: { id: string; name: string; nameAr: string; code: string }[] = [];
    let currency = null;
    if (user.companyId) {
      branches = (
        await prisma.branch.findMany({
          where: { companyId: user.companyId, status: "ACTIVE" },
          select: { id: true, name: true, nameAr: true, code: true },
          orderBy: { createdAt: "asc" },
        })
      ).map((b) => b);
      const cc = await prisma.companyCurrency.findFirst({
        where: { companyId: user.companyId, isDefault: true },
        include: { currency: true },
      });
      const cur = cc ?? await prisma.companyCurrency.findFirst({
        where: { companyId: user.companyId },
        include: { currency: true },
      });
      if (cur) {
        currency = {
          code: cur.currency.code,
          symbol: cur.currency.symbol,
          symbolAr: cur.currency.symbolAr,
          isBase: cur.isDefault,
        };
      }
    }

    return ok({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        language: user.language,
        theme: user.theme,
        phone: user.phone,
        avatar: user.avatar,
        isSuperAdmin: user.isSuperAdmin,
        companyId: user.companyId,
        branchId: user.branchId,
        terminalId: user.terminalId,
      },
      company: user.company
        ? {
            id: user.company.id,
            name: user.company.name,
            nameAr: user.company.nameAr,
            nameEn: user.company.nameEn,
            slug: user.company.slug,
          }
        : null,
      permissions: [...permissions],
      branches,
      currency,
      lang: user.language === "en" ? "en" : "ar",
    });
  } catch (e) {
    console.error("me error", e);
    return serverError();
  }
}