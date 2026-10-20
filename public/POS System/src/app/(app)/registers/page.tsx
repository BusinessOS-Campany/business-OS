import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { fromMinor } from "@/lib/money";
import { RegistersClient } from "@/components/registers/registers-client";

export const dynamic = "force-dynamic";

export default async function RegistersPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";

  if (!can(tenant, "register.manage")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية صناديق النقد" : "No permission to manage registers"}</p>
      </div>
    );
  }

  const [sessions, branches, terminals] = await Promise.all([
    prisma.registerSession.findMany({
      where: { companyId: tenant.companyId },
      select: {
        id: true, openingCash: true, expectedCash: true, actualCash: true, difference: true,
        status: true, openedAt: true, closedAt: true, note: true,
        branch: { select: { name: true, nameAr: true } },
        user: { select: { name: true } },
        closedBy: { select: { name: true } },
      },
      orderBy: { openedAt: "desc" },
      take: 200,
    }),
    prisma.branch.findMany({
      where: { companyId: tenant.companyId },
      select: { id: true, name: true, nameAr: true },
    }),
    prisma.terminal.findMany({
      where: { companyId: tenant.companyId },
      select: { id: true, name: true, branchId: true },
    }),
  ]);

  return (
    <RegistersClient
      lang={lang}
      selfId={tenant.user.id}
      sessions={sessions.map((s) => ({
        id: s.id, status: s.status, openedAt: s.openedAt.toISOString(), closedAt: s.closedAt?.toISOString() ?? null,
        openingCash: fromMinor(Number(s.openingCash)), expectedCash: fromMinor(Number(s.expectedCash)),
        actualCash: fromMinor(Number(s.actualCash)), difference: fromMinor(Number(s.difference)), note: s.note,
        branchName: lang === "ar" ? s.branch.nameAr || s.branch.name : s.branch.name,
        userName: s.user.name, closedByName: s.closedBy?.name ?? "",
      }))}
      branches={branches.map((b) => ({ id: b.id, name: lang === "ar" ? b.nameAr || b.name : b.name }))}
      terminals={terminals.map((t) => ({ id: t.id, name: t.name }))}
    />
  );
}