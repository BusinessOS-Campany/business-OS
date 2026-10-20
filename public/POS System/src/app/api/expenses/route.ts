import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/session";
import { toMinor } from "@/lib/money";
import { created, fail, forbidden, unauthorized, getIp, serverError, zodErrors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ExpenseSchema = z.object({
  branchId: z.string().min(1),
  categoryId: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().optional(),
  description: z.string().max(500).default(""),
  methodId: z.string().optional().default(""),
  status: z.enum(["PENDING", "APPROVED"]).default("PENDING"),
});

async function nextExpenseNo(companyId: string) {
  const rows = await prisma.expense.findMany({
    where: { companyId },
    select: { expenseNo: true },
  });
  let max = 0;
  for (const r of rows) {
    const m = /^EXP-(\d+)$/.exec(r.expenseNo);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `EXP-${String(max + 1).padStart(6, "0")}`;
}

async function nextExpenseJournalNo(companyId: string) {
  const rows = await prisma.journalEntry.findMany({
    where: { companyId, entryNo: { startsWith: "JE-E-" } },
    select: { entryNo: true },
  });
  let max = 0;
  for (const r of rows) {
    const m = /^JE-E-(\d+)$/.exec(r.entryNo);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `JE-E-${String(max + 1).padStart(6, "0")}`;
}

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

export async function POST(request: Request) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = ExpenseSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const d = parsed.data;
  const amount = BigInt(toMinor(d.amount));
  const date = d.date ? new Date(d.date) : new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(cast(hashtext(${cred.companyId}) as bigint))`;

      const branch = await tx.branch.findFirst({ where: { id: d.branchId, companyId: cred.companyId } });
      if (!branch) throw { code: "invalid_fields" };
      const category = await tx.expenseCategory.findFirst({ where: { id: d.categoryId, companyId: cred.companyId } });
      if (!category) throw { code: "invalid_fields" };

      let method: { id: string; nameAr: string; nameEn: string; type: string } | null = null;
      if (d.methodId) {
        method = await tx.paymentMethod.findFirst({ where: { id: d.methodId, companyId: cred.companyId, isActive: true } });
        if (!method) throw { code: "invalid_fields" };
      }

      const expenseNo = await nextExpenseNo(cred.companyId);
      const isApproved = d.status === "APPROVED";
      const expense = await tx.expense.create({
        data: {
          companyId: cred.companyId,
          branchId: branch.id,
          categoryId: category.id,
          expenseNo,
          amount,
          date,
          description: d.description,
          methodId: method?.id ?? null,
          methodNameAr: method?.nameAr ?? "Cash",
          methodNameEn: method?.nameEn ?? "Cash",
          methodType: (method?.type ?? "CASH") as never,
          createdById: cred.userId,
          status: (isApproved ? "APPROVED" : "PENDING") as never,
          approvedById: isApproved ? cred.userId : null,
          approvedAt: isApproved ? new Date() : null,
        },
      });

      if (isApproved) {
        const accounts = await tx.account.findMany({
          where: { companyId: cred.companyId, code: { in: ["5000", "1000", "1100"] } },
          select: { id: true, code: true, type: true },
        });
        const byCode = new Map(accounts.map((a) => [a.code, a]));
        const expenseAcct = byCode.get("5000");
        const creditAcct = byCode.get(expense.methodType === "CASH" ? "1000" : "1100");
        if (expenseAcct && creditAcct) {
          const jeNo = await nextExpenseJournalNo(cred.companyId);
          const linesData = [
            { accountId: expenseAcct.id, debit: amount, credit: 0n },
            { accountId: creditAcct.id, debit: 0n, credit: amount },
          ];
          await tx.journalEntry.create({
            data: {
              companyId: cred.companyId,
              entryNo: jeNo,
              refType: "EXPENSE",
              refId: expense.id,
              description: `Expense ${expenseNo}`,
              date,
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
              await tx.account.update({
                where: { id: accountId },
                data: { balance: { increment: BigInt(balDelta) } },
              });
            }
          }
        }

        if (expense.methodType === "CASH") {
          await tx.cashMovement.create({
            data: {
              companyId: cred.companyId,
              branchId: branch.id,
              userId: cred.userId,
              type: "EXPENSE",
              amount,
              reference: expenseNo,
              note: `Expense ${expenseNo}`,
            },
          });
        }
      }

      await writeAudit(tx, {
        companyId: cred.companyId,
        userId: cred.userId,
        action: isApproved ? "APPROVE" : "CREATE",
        entity: "expense",
        entityId: expense.id,
        ip: getIp(request),
        newValue: { expenseNo, amount: Number(amount), categoryId: category.id, branchId: branch.id },
      });

      return { id: expense.id, expenseNo, status: expense.status as string };
    });

    return created({ data: { id: result.id, expenseNo: result.expenseNo } });
  } catch (e) {
    if (typeof e === "object" && e && "code" in e && (e as { code?: unknown }).code === "invalid_fields") {
      return fail("invalid_fields", 400);
    }
    console.error("expense create error", e);
    return serverError();
  }
}