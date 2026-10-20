import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/session";
import { ok, fail, forbidden, notFound, unauthorized, getIp, serverError, zodErrors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ExpensePatchSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  if (!session.user.isSuperAdmin && !permissions.has("expense.manage")) return { cred: null };
  return { cred: { companyId: session.user.companyId, userId: session.user.id } };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = ExpensePatchSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const status = parsed.data.status;

  try {
    const expense = await prisma.expense.findFirst({ where: { id, companyId: cred.companyId } });
    if (!expense) return notFound();

    if (status === "APPROVED") {
      if (expense.status !== "PENDING") return fail("invalid_state", 400);
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(cast(hashtext(${cred.companyId}) as bigint))`;
        const updated = await tx.expense.update({
          where: { id },
          data: { status: "APPROVED", approvedById: cred.userId, approvedAt: new Date() },
        });
        const accounts = await tx.account.findMany({
          where: { companyId: cred.companyId, code: { in: ["5000", "1000", "1100"] } },
          select: { id: true, code: true, type: true },
        });
        const byCode = new Map(accounts.map((a) => [a.code, a]));
        const expenseAcct = byCode.get("5000");
        const creditAcct = byCode.get(updated.methodType === "CASH" ? "1000" : "1100");
        if (expenseAcct && creditAcct) {
          const rows = await tx.journalEntry.findMany({
            where: { companyId: cred.companyId, entryNo: { startsWith: "JE-E-" } },
            select: { entryNo: true },
          });
          let max = 0;
          for (const r of rows) {
            const mm = /^JE-E-(\d+)$/.exec(r.entryNo);
            if (mm) max = Math.max(max, parseInt(mm[1], 10));
          }
          const jeNo = `JE-E-${String(max + 1).padStart(6, "0")}`;

          const linesData = [
            { accountId: expenseAcct.id, debit: updated.amount, credit: 0n },
            { accountId: creditAcct.id, debit: 0n, credit: updated.amount },
          ];
          await tx.journalEntry.create({
            data: {
              companyId: cred.companyId,
              entryNo: jeNo,
              refType: "EXPENSE",
              refId: updated.id,
              description: `Expense ${updated.expenseNo}`,
              date: updated.date,
              createdById: cred.userId,
              lines: { create: linesData },
            },
          });

          const delta = new Map<string, number>();
          const applyBalance = (accountId: string, debit: bigint, credit: bigint) => {
            const a = accounts.find((x) => x.id === accountId);
            if (!a) return;
            let d = 0;
            if (debit > 0n) d += Number(debit) * (a.type === "ASSET" || a.type === "EXPENSE" ? 1 : -1);
            if (credit > 0n) d += Number(credit) * (a.type === "ASSET" || a.type === "EXPENSE" ? -1 : 1);
            delta.set(accountId, (delta.get(accountId) ?? 0) + d);
          };
          for (const l of linesData) applyBalance(l.accountId, l.debit, l.credit);
          for (const [accountId, amount] of delta) {
            if (amount !== 0) {
              await tx.account.update({ where: { id: accountId }, data: { balance: { increment: BigInt(amount) } } });
            }
          }
        }

        if (updated.methodType === "CASH") {
          await tx.cashMovement.create({
            data: {
              companyId: cred.companyId,
              branchId: updated.branchId,
              userId: cred.userId,
              type: "EXPENSE",
              amount: updated.amount,
              reference: updated.expenseNo,
              note: `Expense ${updated.expenseNo}`,
            },
          });
        }

        await writeAudit(tx, {
          companyId: cred.companyId,
          userId: cred.userId,
          action: "APPROVE",
          entity: "expense",
          entityId: updated.id,
          ip: getIp(request),
          newValue: { expenseNo: updated.expenseNo, amount: Number(updated.amount) },
        });
      });
      return ok({ data: { id, status: "APPROVED" } });
    }

    if (status === "REJECTED") {
      if (expense.status === "APPROVED") return fail("invalid_state", 400);
      await prisma.expense.update({ where: { id }, data: { status: "REJECTED" } });
      await writeAudit(prisma, {
        companyId: cred.companyId,
        userId: cred.userId,
        action: "REJECT",
        entity: "expense",
        entityId: expense.id,
        ip: getIp(request),
        newValue: { expenseNo: expense.expenseNo, amount: Number(expense.amount) },
      });
      return ok({ data: { id, status: "REJECTED" } });
    }

    if (expense.status === "REJECTED") {
      await prisma.expense.update({ where: { id }, data: { status: "PENDING" } });
      return ok({ data: { id, status: "PENDING" } });
    }
    return fail("invalid_state", 400);
  } catch (e) {
    console.error("expense update error", e);
    return serverError();
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;
  try {
    const expense = await prisma.expense.findFirst({ where: { id, companyId: cred.companyId } });
    if (!expense) return notFound();
    if (expense.status !== "PENDING") return fail("in_use", 400);
    await prisma.expense.delete({ where: { id } });
    await writeAudit(prisma, {
      companyId: cred.companyId,
      userId: cred.userId,
      action: "DELETE",
      entity: "expense",
      entityId: id,
      ip: getIp(request),
      oldValue: { expenseNo: expense.expenseNo, amount: Number(expense.amount) },
    });
    return ok({ data: { id } });
  } catch (e) {
    console.error("expense delete error", e);
    return serverError();
  }
}