import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/session";
import { toMinor } from "@/lib/money";
import { created, fail, forbidden, notFound, unauthorized, getIp, serverError, zodErrors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const PaymentSchema = z.object({
  amount: z.number().positive(),
  methodId: z.string().optional().default(""),
  note: z.string().max(255).default(""),
});

async function nextPaymentJournalNo(companyId: string) {
  const rows = await prisma.journalEntry.findMany({
    where: { companyId, entryNo: { startsWith: "JE-C-" } },
    select: { entryNo: true },
  });
  let max = 0;
  for (const r of rows) {
    const m = /^JE-C-(\d+)$/.exec(r.entryNo);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `JE-C-${String(max + 1).padStart(6, "0")}`;
}

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  if (!session.user.isSuperAdmin && !permissions.has("credit.manage")) return { cred: null };
  return { cred: { companyId: session.user.companyId, userId: session.user.id } };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = PaymentSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const d = parsed.data;
  const amount = BigInt(toMinor(d.amount));

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(cast(hashtext(${cred.companyId}) as bigint))`;

      const customer = await tx.customer.findFirst({ where: { id, companyId: cred.companyId } });
      if (!customer) throw { code: "not_found" };
      if (amount <= 0n) throw { code: "invalid_amount" };
      if (amount > customer.balance) throw { code: "over_payment" };

      let method: { id: string; nameAr: string; nameEn: string; type: string } | null = null;
      if (d.methodId) {
        method = await tx.paymentMethod.findFirst({ where: { id: d.methodId, companyId: cred.companyId, isActive: true } });
        if (!method) throw { code: "invalid_fields" };
      }
      const isCash = (method?.type ?? "CASH") === "CASH";

      const branch = await tx.branch.findFirst({ where: { companyId: cred.companyId } });
      if (!branch) throw { code: "invalid_fields" };

      await tx.customer.update({
        where: { id },
        data: { balance: { decrement: amount } },
      });

      const jeNo = await nextPaymentJournalNo(cred.companyId);
      const accounts = await tx.account.findMany({
        where: { companyId: cred.companyId, code: { in: ["1000", "1100", "1200"] } },
        select: { id: true, code: true, type: true },
      });
      const acct = new Map(accounts.map((a) => [a.code, a]));
      const cashAcct = acct.get(isCash ? "1000" : "1100");
      const arAcct = acct.get("1200");
      if (cashAcct && arAcct) {
        const linesData = [
          { accountId: cashAcct.id, debit: amount, credit: 0n },
          { accountId: arAcct.id, debit: 0n, credit: amount },
        ];
        await tx.journalEntry.create({
          data: {
            companyId: cred.companyId,
            entryNo: jeNo,
            refType: "PAYMENT",
            refId: id,
            description: `Payment received from ${customer.name}${customer.nameAr ? ` (${customer.nameAr})` : ""}`,
            date: new Date(),
            createdById: cred.userId,
            lines: { create: linesData },
          },
        });

        const delta = new Map<string, number>();
        const applyBalance = (accountId: string, debit: bigint, credit: bigint) => {
          const a = accounts.find((x) => x.id === accountId);
          if (!a) return;
          let dv = 0;
          if (debit > 0n) dv += Number(debit) * (a.type === "ASSET" || a.type === "EXPENSE" ? 1 : -1);
          if (credit > 0n) dv += Number(credit) * (a.type === "ASSET" || a.type === "EXPENSE" ? -1 : 1);
          delta.set(accountId, (delta.get(accountId) ?? 0) + dv);
        };
        for (const l of linesData) applyBalance(l.accountId, l.debit, l.credit);
        for (const [accountId, balDelta] of delta) {
          if (balDelta !== 0) {
            await tx.account.update({ where: { id: accountId }, data: { balance: { increment: BigInt(balDelta) } } });
          }
        }
      }

      if (isCash) {
        await tx.cashMovement.create({
          data: {
            companyId: cred.companyId,
            branchId: branch.id,
            userId: cred.userId,
            type: "DEPOSIT",
            amount,
            methodNameAr: method?.nameAr ?? "Cash",
            methodNameEn: method?.nameEn ?? "Cash",
            reference: jeNo,
            note: d.note || `Payment from ${customer.name}`,
          },
        });
      }

      await writeAudit(tx, {
        companyId: cred.companyId,
        userId: cred.userId,
        action: "COLLECT",
        entity: "customer",
        entityId: id,
        ip: getIp(request),
        newValue: { amount: Number(amount), journalNo: jeNo, balanceAfter: Number(customer.balance - amount) },
      });

      return { customerId: id, amount: Number(amount), balance: Number(customer.balance - amount), journalNo: jeNo };
    });

    return created({ data: result });
  } catch (e) {
    if (typeof e === "object" && e && "code" in e) {
      const code = (e as { code?: unknown }).code;
      if (code === "not_found") return notFound();
      if (code === "over_payment") return fail("over_payment", 400);
      if (code === "invalid_amount" || code === "invalid_fields") return fail("invalid_fields", 400);
    }
    console.error("customer payment error", e);
    return serverError();
  }
}