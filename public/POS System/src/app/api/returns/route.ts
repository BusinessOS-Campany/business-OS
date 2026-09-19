import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/session";
import { lineTotal } from "@/lib/money";
import { created, fail, forbidden, unauthorized, serverError, zodErrors } from "@/lib/api";

const ReturnItemSchema = z.object({
  saleItemId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const ReturnSchema = z.object({
  saleId: z.string().min(1),
  reason: z.enum(["DEFECTIVE", "WRONG_ITEM", "EXPIRED", "DAMAGED", "CHANGE_OF_MIND", "OTHER"]).default("OTHER"),
  note: z.string().max(500).optional().default(""),
  refundMethod: z.enum(["CASH", "ORIGINAL_PAYMENT", "STORE_CREDIT", "EXCHANGE"]).default("CASH"),
  restock: z.boolean().default(true),
  items: z.array(ReturnItemSchema).min(1),
});

async function nextReturnNo(companyId: string) {
  const last = await prisma.saleReturn.findFirst({
    where: { companyId },
    orderBy: { returnNo: "desc" },
    select: { returnNo: true },
  });
  let next = 1;
  if (last) {
    const m = /RET-(\d+)/.exec(last.returnNo);
    if (m) next = parseInt(m[1], 10) + 1;
  }
  return `RET-${String(next).padStart(6, "0")}`;
}

async function nextReturnJournalNo(companyId: string) {
  const last = await prisma.journalEntry.findFirst({
    where: { companyId, entryNo: { startsWith: "JE-R-" } },
    orderBy: { entryNo: "desc" },
    select: { entryNo: true },
  });
  let next = 1;
  if (last) {
    const m = /JE-R-(\d+)/.exec(last.entryNo);
    if (m) next = parseInt(m[1], 10) + 1;
  }
  return `JE-R-${String(next).padStart(6, "0")}`;
}

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  if (!session.user.isSuperAdmin && !permissions.has("sale.refund")) return { cred: null };
  return { cred: { companyId: session.user.companyId, userId: session.user.id } };
}

export async function POST(req: Request) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  const { companyId } = cred;
  const actorId = cred.userId;

  const body = await req.json().catch(() => null);
  const parsed = ReturnSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);

  const d = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: d.saleId, companyId },
        select: {
          id: true, invoiceNo: true, branchId: true,
          customerId: true, dueAmount: true,
          items: {
            select: {
              id: true, productId: true, nameAr: true, nameEn: true, sku: true,
              quantity: true, price: true, cost: true, total: true,
            },
          },
        },
      });
      if (!sale) throw { code: "sale_not_found" };
      if (sale.items.length === 0) throw { code: "not_refundable" };

      const existing = await tx.saleReturn.findMany({
        where: { saleId: sale.id },
        select: { items: { select: { saleItemId: true, quantity: true } } },
      });
      const returnedQty = new Map<string, bigint>();
      for (const r of existing) for (const it of r.items) returnedQty.set(it.saleItemId, (returnedQty.get(it.saleItemId) ?? 0n) + it.quantity);

      const byId = new Map(sale.items.map((i) => [i.id, i]));
      let refundTotal = 0n;
      let refundCost = 0n;
      const rows: { saleItem: (typeof sale.items)[number]; quantity: bigint; total: bigint }[] = [];

      for (const item of d.items) {
        const saleItem = byId.get(item.saleItemId);
        if (!saleItem) throw { code: "invalid_items" };
        const qq = BigInt(item.quantity);
        if ((returnedQty.get(item.saleItemId) ?? 0n) + qq > saleItem.quantity) throw { code: "over_return" };
        const lt = BigInt(lineTotal(item.quantity, Number(saleItem.price)));
        refundTotal += lt;
        refundCost += (saleItem.cost * qq) / 1000n;
        rows.push({ saleItem, quantity: qq, total: lt });
      }
      if (refundTotal <= 0n) throw { code: "empty_return" };

      const warehouse = await tx.warehouse.findFirst({
        where: { companyId, isMain: true, branches: { some: { id: sale.branchId } } },
        select: { id: true },
      });

      const returnNo = await nextReturnNo(companyId);
      const createdReturn = await tx.saleReturn.create({
        data: {
          companyId, branchId: sale.branchId, saleId: sale.id,
          customerId: sale.customerId, returnNo,
          reason: d.reason, note: d.note,
          refundMethod: d.refundMethod, refundAmount: refundTotal,
          refundToBalance: d.refundMethod === "STORE_CREDIT" ? refundTotal : 0n,
          createdById: actorId,
          items: {
            create: rows.map((r) => ({
              saleItemId: r.saleItem.id,
              productId: r.saleItem.productId,
              quantity: r.quantity,
              price: r.saleItem.price,
              cost: r.saleItem.cost,
              total: r.total,
            })),
          },
        },
      });

      // fully refunded only when every item has been returned in full
      const nowReturned = new Map<string, bigint>(returnedQty);
      for (const r of rows) {
        const prev = nowReturned.get(r.saleItem.id) ?? 0n;
        nowReturned.set(r.saleItem.id, prev + r.quantity);
      }
      const allFullyReturned = sale.items.every((i) => (nowReturned.get(i.id) ?? 0n) >= i.quantity);
      await tx.sale.update({
        where: { id: sale.id },
        data: { status: allFullyReturned ? "REFUNDED" : "PARTIALLY_REFUNDED" },
      });

      // ---- restock ----
      if (d.restock) {
        for (const r of rows) {
          if (!r.saleItem.productId || !warehouse) continue;
          await tx.inventory.upsert({
            where: { productId_warehouseId: { productId: r.saleItem.productId, warehouseId: warehouse.id } },
            create: { companyId, warehouseId: warehouse.id, productId: r.saleItem.productId, quantity: r.quantity },
            update: { quantity: { increment: r.quantity } },
          });
          await tx.inventoryTransaction.create({
            data: {
              companyId, warehouseId: warehouse.id, productId: r.saleItem.productId,
              type: "TRANSFER_IN", quantity: r.quantity,
              unitAmount: r.saleItem.cost, totalAmount: (r.saleItem.cost * r.quantity) / 1000n,
              refType: "SALE_RETURN", refId: createdReturn.id,
            },
          });
        }
      }

      // ---- customer balance ----
      if (d.refundMethod === "STORE_CREDIT" && sale.customerId) {
        await tx.customer.update({ where: { id: sale.customerId }, data: { balance: { increment: refundTotal } } });
      } else if (sale.customerId && sale.dueAmount > 0n) {
        const credit = sale.dueAmount < refundTotal ? sale.dueAmount : refundTotal;
        if (credit > 0n) {
          await tx.customer.update({ where: { id: sale.customerId }, data: { balance: { decrement: credit } } });
        }
      }

      // ---- accounting ----
      if (d.refundMethod !== "EXCHANGE") {
        const accounts = await tx.account.findMany({
          where: { companyId, code: { in: ["4000", "4100", "1300", "1000", "1100", "1200"] } },
          select: { id: true, code: true, type: true },
        });
        const byCode = new Map(accounts.map((a) => [a.code, a]));

        const linesData: { accountId: string; debit: bigint; credit: bigint }[] = [];
        const revenue = byCode.get("4000");
        const creditCode = d.refundMethod === "STORE_CREDIT" ? "1200" : d.refundMethod === "ORIGINAL_PAYMENT" ? "1100" : "1000";
        const refundAcct = byCode.get(creditCode);
        if (revenue) linesData.push({ accountId: revenue.id, debit: refundTotal, credit: 0n });
        if (refundAcct) linesData.push({ accountId: refundAcct.id, debit: 0n, credit: refundTotal });

        const invAcct = byCode.get("1300");
        const cogsAcct = byCode.get("4100");
        if (d.restock && refundCost > 0n && invAcct && cogsAcct) {
          linesData.push({ accountId: invAcct.id, debit: refundCost, credit: 0n });
          linesData.push({ accountId: cogsAcct.id, debit: 0n, credit: refundCost });
        }

        if (linesData.length > 0) {
          const jeNo = await nextReturnJournalNo(companyId);
          await tx.journalEntry.create({
            data: {
              companyId,
              entryNo: jeNo,
              refType: "RETURN",
              refId: createdReturn.id,
              description: `Return ${returnNo} / ${sale.invoiceNo}`,
              date: new Date(),
              createdById: actorId,
              lines: { create: linesData },
            },
          });

          const delta = new Map<string, { accountId: string; amount: number }>();
          const applyBalance = (accountId: string, debit: bigint, credit: bigint) => {
            const a = accounts.find((x) => x.id === accountId);
            if (!a) return;
            let d = 0;
            if (debit > 0n) d += Number(debit) * (a.type === "ASSET" || a.type === "EXPENSE" ? 1 : -1);
            if (credit > 0n) d += Number(credit) * (a.type === "ASSET" || a.type === "EXPENSE" ? -1 : 1);
            const prev = delta.get(accountId)?.amount ?? 0;
            delta.set(accountId, { accountId, amount: prev + d });
          };
          for (const l of linesData) applyBalance(l.accountId, l.debit, l.credit);
          for (const [accountId, { amount }] of delta) {
            if (amount !== 0) {
              await tx.account.update({
                where: { id: accountId },
                data: { balance: { increment: BigInt(amount) } },
              });
            }
          }
        }
      }

      // ---- cash movement ----
      if (d.refundMethod === "CASH") {
        await tx.cashMovement.create({
          data: {
            companyId, branchId: sale.branchId, userId: actorId,
            type: "REFUND", amount: refundTotal,
            reference: returnNo, note: `Return ${returnNo}`,
          },
        });
      }

      return {
        id: createdReturn.id, returnNo, refundAmount: Number(refundTotal),
        status: allFullyReturned ? "REFUNDED" : "PARTIALLY_REFUNDED",
        method: d.refundMethod,
      };
    });

    return created({ data: result });
  } catch (e) {
    if (typeof e === "object" && e && "code" in e && typeof e.code === "string") {
      const code = e.code as string;
      if (code === "sale_not_found") return fail("sale_not_found", 404);
      if (["empty_return", "invalid_items", "over_return", "not_refundable"].includes(code)) {
        return fail(code, 400);
      }
    }
    console.error("return error", e);
    return serverError();
  }
}