import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { lineTotal } from "@/lib/money";
import { b2n } from "@/lib/format";

export const purchaseItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(), // thousandths of unit
  price: z.number().int().nonnegative(), // minor units (unit cost)
});

export const purchasePaymentSchema = z.object({
  methodId: z.string().min(1),
  amount: z.number().int().nonnegative(),
  reference: z.string().default(""),
});

export const createPurchaseSchema = z.object({
  supplierId: z.string().min(1),
  warehouseId: z.string().nullable().optional(),
  discount: z.number().int().nonnegative().default(0),
  notes: z.string().default(""),
  items: z.array(purchaseItemSchema).min(1),
  payments: z.array(purchasePaymentSchema).default([]),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export class PurchaseError extends Error {}

interface PurchaseActor {
  companyId: string;
  userId: string;
  branchId: string;
}

/**
 * Create a purchase atomically:
 *  - validates supplier, warehouse and products
 *  - increments inventory + writes PURCHASE transactions
 *  - updates product cost to latest purchase price
 *  - writes purchase, items, payments
 *  - posts a double-entry journal entry and updates account balances
 *  - records cash movement for cash payments
 */
export async function createPurchase(actor: PurchaseActor, input: CreatePurchaseInput) {
  const { companyId, userId, branchId } = actor;

  return prisma.$transaction(async (tx) => {
    const [company, supplier, branch] = await Promise.all([
      tx.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } }),
      tx.supplier.findFirst({ where: { id: input.supplierId, companyId, isActive: true } }),
      tx.branch.findFirst({ where: { id: branchId, companyId }, select: { id: true, warehouseId: true } }),
    ]);
    if (!company) throw new PurchaseError("company_not_found");
    if (!supplier) throw new PurchaseError("supplier_not_found");
    if (!branch) throw new PurchaseError("invalid_branch");

    const warehouseId = input.warehouseId ?? branch.warehouseId ?? null;
    let warehouse = null;
    if (warehouseId) {
      warehouse = await tx.warehouse.findFirst({ where: { id: warehouseId, companyId } });
      if (!warehouse) throw new PurchaseError("warehouse_not_found");
    }

    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const methodIds = [...new Set(input.payments.map((p) => p.methodId))];

    const [products, methods] = await Promise.all([
      tx.product.findMany({
        where: { companyId, id: { in: productIds } },
        select: { id: true, nameAr: true, nameEn: true, sku: true, barcode: true, trackInventory: true, type: true },
      }),
      tx.paymentMethod.findMany({
        where: { companyId, id: { in: methodIds }, isActive: true },
        select: { id: true, nameAr: true, nameEn: true, type: true, requiresReference: true },
      }),
    ]);
    const productById = new Map(products.map((p) => [p.id, p]));
    const methodById = new Map(methods.map((m) => [m.id, m]));

    // ---- authoritative totals ----
    let subtotal = 0;
    const lines = input.items.map((it) => {
      const p = productById.get(it.productId);
      if (!p) throw new PurchaseError(`product_not_found:${it.productId}`);
      const total = lineTotal(it.quantity, it.price);
      subtotal += total;
      return { product: p, quantity: it.quantity, price: it.price, total };
    });

    const discount = Math.min(subtotal, input.discount);
    const total = subtotal - discount;
    if (total < 0) throw new PurchaseError("invalid_total");

    // ---- invoice number ----
    const existing = await tx.purchase.findMany({ where: { companyId }, select: { invoiceNo: true } });
    let maxNo = 4000;
    for (const s of existing) {
      const m = /^PO-(\d+)$/.exec(s.invoiceNo);
      if (m) maxNo = Math.max(maxNo, parseInt(m[1], 10));
    }
    const nextNo = maxNo + 1;
    const invoiceNo = `PO-${nextNo}`;

    // ---- payments ----
    let paid = 0;
    let cashPaid = 0;
    let bankPaid = 0;
    let dueAmount = total;
    const paymentRows: { methodId: string | null; nameAr: string; nameEn: string; type: string; amount: number; reference: string }[] = [];
    const pmts = input.payments.filter((p) => p.amount > 0);
    for (const pm of pmts) {
      const m = methodById.get(pm.methodId);
      if (!m) throw new PurchaseError(`invalid_payment_method:${pm.methodId}`);
      paid += pm.amount;
      if (m.type === "CASH") cashPaid += pm.amount;
      else bankPaid += pm.amount;
      paymentRows.push({
        methodId: pm.methodId,
        nameAr: m.nameAr || m.nameEn,
        nameEn: m.nameEn,
        type: m.type,
        amount: pm.amount,
        reference: pm.reference,
      });
    }
    if (paid > total) throw new PurchaseError("overpaid");
    dueAmount = total - paid;

    const purchase = await tx.purchase.create({
      data: {
        companyId,
        branchId: branch.id,
        supplierId: supplier.id,
        warehouseId: warehouseId,
        invoiceNo,
        subtotal: BigInt(subtotal),
        discount: BigInt(discount),
        tax: 0n,
        total: BigInt(total),
        paidAmount: BigInt(paid),
        dueAmount: BigInt(dueAmount),
        notes: input.notes,
        createdById: userId,
      },
    });

    // ---- items + inventory ----
    for (const line of lines) {
      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: line.product.id,
          quantity: BigInt(line.quantity),
          price: BigInt(line.price),
          cost: BigInt(line.price),
          total: BigInt(line.total),
        },
      });

      if (warehouseId && line.product.trackInventory && line.product.type !== "SERVICE") {
        const inv = await tx.inventory.findUnique({
          where: { productId_warehouseId: { productId: line.product.id, warehouseId } },
        });
        if (inv) {
          await tx.inventory.update({
            where: { id: inv.id },
            data: { quantity: { increment: BigInt(line.quantity) } },
          });
        } else {
          await tx.inventory.create({
            data: { companyId, productId: line.product.id, warehouseId, quantity: BigInt(line.quantity) },
          });
        }
        await tx.inventoryTransaction.create({
          data: {
            companyId,
            productId: line.product.id,
            warehouseId,
            type: "PURCHASE",
            quantity: BigInt(line.quantity),
            unitAmount: BigInt(line.price),
            totalAmount: BigInt(line.total),
            refType: "PURCHASE",
            refId: purchase.id,
            createdById: userId,
          },
        });
      }

      // latest purchase price becomes product cost
      await tx.product.update({
        where: { id: line.product.id },
        data: { cost: BigInt(line.price) },
      });
    }

    // ---- payments ----
    for (const row of paymentRows) {
      await tx.purchasePayment.create({
        data: {
          purchaseId: purchase.id,
          methodId: row.methodId,
          methodNameAr: row.nameAr,
          methodNameEn: row.nameEn,
          methodType: row.type as never,
          amount: BigInt(row.amount),
          reference: row.reference,
          confirmed: true,
        },
      });
    }

    const cashRow = paymentRows.find((r) => r.type === "CASH" && r.amount > 0);
    if (cashRow && cashPaid > 0) {
      await tx.cashMovement.create({
        data: {
          companyId,
          branchId: branch.id,
          userId,
          type: "PURCHASE",
          amount: BigInt(cashPaid),
          methodNameAr: cashRow.nameAr,
          methodNameEn: cashRow.nameEn,
          reference: invoiceNo,
          note: `Purchase ${invoiceNo}`,
        },
      });
    }

    // ---- accounting ----
    if (total > 0) {
      const accounts = await tx.account.findMany({
        where: { companyId, code: { in: ["1000", "1100", "2000", "1300"] } },
        select: { id: true, code: true, type: true },
      });
      const accountByCode = new Map(accounts.map((a) => [a.code, a]));

      const debitLines: { code: string; amount: number }[] = [{ code: "1300", amount: total }];
      const creditLines: { code: string; amount: number }[] = [];
      if (cashPaid > 0) creditLines.push({ code: "1000", amount: cashPaid });
      if (bankPaid > 0) creditLines.push({ code: "1100", amount: bankPaid });
      if (dueAmount > 0) creditLines.push({ code: "2000", amount: dueAmount });

      const linesData = [
        ...debitLines
          .filter((l) => accountByCode.has(l.code))
          .map((l) => ({ accountId: accountByCode.get(l.code)!.id, debit: BigInt(l.amount), credit: 0n })),
        ...creditLines
          .filter((l) => accountByCode.has(l.code))
          .map((l) => ({ accountId: accountByCode.get(l.code)!.id, debit: 0n, credit: BigInt(l.amount) })),
      ];

      if (linesData.length > 0) {
        await tx.journalEntry.create({
          data: {
            companyId,
            entryNo: `JE-P-${invoiceNo}`,
            refType: "PURCHASE",
            refId: purchase.id,
            description: `Purchase ${invoiceNo}`,
            date: new Date(),
            createdById: userId,
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
          delta.set(accountId, { accountId, amount: (delta.get(accountId)?.amount ?? 0) + d });
        };
        for (const l of linesData) applyBalance(l.accountId, l.debit, l.credit);
        for (const [accountId, { amount }] of delta) {
          if (amount !== 0) {
            await tx.account.update({ where: { id: accountId }, data: { balance: { increment: BigInt(amount) } } });
          }
        }
      }
    }

    return {
      id: purchase.id,
      invoiceNo: purchase.invoiceNo,
      total,
      paidAmount: paid,
      dueAmount,
    };
  });
}