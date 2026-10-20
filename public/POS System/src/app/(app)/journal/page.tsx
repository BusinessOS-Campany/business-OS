import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { b2n } from "@/lib/format";
import { JournalClient } from "@/components/accounting/journal-client";

export const dynamic = "force-dynamic";

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; type?: string }> }) {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";
  const sp = await searchParams;

  if (!can(tenant, "accounting.manage") && !can(tenant, "report.view")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية عرض القيود" : "No permission to view journal"}</p>
      </div>
    );
  }

  const from = sp.from ? new Date(sp.from + "T00:00:00") : undefined;
  const to = sp.to ? new Date(sp.to + "T23:59:59") : undefined;
  const type = sp.type || "ALL";

  const entries = await prisma.journalEntry.findMany({
    where: {
      companyId: tenant.companyId,
      ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      ...(type && type !== "ALL" ? { refType: type } : {}),
    },
    select: {
      id: true, entryNo: true, refType: true, refId: true, description: true,
      date: true, createdAt: true,
      createdBy: { select: { name: true } },
      lines: {
        select: {
          id: true, debit: true, credit: true,
          account: { select: { code: true, name: true, nameAr: true } },
        },
      },
    },
    orderBy: [{ date: "desc" }, { entryNo: "desc" }],
    take: 300,
  });

  const refTypes = await prisma.journalEntry.findMany({
    where: { companyId: tenant.companyId },
    distinct: ["refType"],
    select: { refType: true },
  });

  return (
    <JournalClient
      lang={lang}
      currency={tenant.currency}
      from={sp.from ?? ""}
      to={sp.to ?? ""}
      type={type}
      refTypes={[ ...new Set(refTypes.map((r) => r.refType).filter(Boolean)) ]}
      entries={entries.map((e) => ({
        id: e.id,
        entryNo: e.entryNo,
        refType: e.refType,
        description: e.description,
        date: e.date.toISOString(),
        createdByName: e.createdBy?.name ?? "",
        lines: e.lines.map((l) => ({
          id: l.id,
          debit: b2n(l.debit),
          credit: b2n(l.credit),
          accountCode: l.account.code,
          accountName: lang === "ar" ? l.account.nameAr || l.account.name : l.account.name || l.account.nameAr,
        })),
      }))}
    />
  );
}