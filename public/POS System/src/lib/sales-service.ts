import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { lineTotal } from "@/lib/money";
import { b2n } from "@/lib/format";

export const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(), // thousandths of unit
  price: z.number().int().nonnegative().optional(), // minor units
});

export const paymentSchema = z.object({
  methodId: z.string().min(1),
  amount: z.number().int().nonnegative(),
  reference: z.string().default(""),
});

export const createSaleSchema = z.object({
  branchId: z.string().min(1),
  terminalId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  status: z.enum(["COMPLETED", "HELD"]).default("COMPLETED"),
  heldSaleId: z.string().nullable().optional(),
  holdKey: z.string().default(""),
  discount: z.number().int().nonnegative().default(0),
  discountPercent: z.number().min(0).max(100).default(0),
  notes: z.string().default(""),
  items: z.array(saleItemSchema).min(1),
  payments: z.array(paymentSchema).default([]),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export class SaleError extends Error {}

const DEBIT_ACCOUNTS = ["1000", "1100", "1200", "4000", "4100", "1300"];

interface SaleActor {
  companyId: string;
  userId: string;
  branchId: string;
  terminalId: string | null;
}

/**
 * Create a POS sale atomically:
 *  - validates products, prices and stock
 *  - decrements inventory + writes inventory transactions
 *  - writes sale, items, payments
 *  - posts a double-entry journal entry and updates account balances
 *  - records cash movements, low-stock notifications and customer balances
 */
export async function createSale(actor: SaleActor, input: CreateSaleInput) {
  const { companyId, userId } = actor;

  return prisma.$transaction(async (tx) => {
    const [company, branch] = await Promise.all([
      tx.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, invoicePrefix: true, invoiceNextNo: true } }),
      tx.branch.findUnique({ where: { id: input.branchId }, select: { id: true, companyId: true, code: true, warehouseId: true, status: true } }),
    ]);
    if (!company) throw new SaleError("company_not_found");
    if (!branch || branch.companyId !== companyId) throw new SaleError("invalid_branch");

    const warehouseId = branch.warehouseId ?? null;

    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const methodIds = [...new Set(input.payments.map((p) => p.methodId))];

    const [products, methods] = await Promise.all([
      tx.product.findMany({
        where: { companyId, id: { in: productIds } },
        select: {
          id: true, nameAr: true, nameEn: true, sku: true, barcode: true,
          price: true, cost: true, minPrice: true, minStock: true,
          allowNegativeStock: true, trackInventory: true, type: true, isActive: true,
        },
      }),
      tx.paymentMethod.findMany({
        where: { companyId, id: { in: methodIds }, isActive: true },
        select: { id: true, nameAr: true, nameEn: true, type: true, requiresReference: true },
      }),
    ]);
    const productById = new Map(products.map((p) => [p.id, p]));
    const methodById = new Map(methods.map((m) => [m.id, m]));

    // ---- validate + compute lines server-side (authoritative totals) ----
    let subtotal = 0;
    let costTotal = 0;
    const lines = input.items.map((it) => {
      const p = productById.get(it.productId);
      if (!p || !p.isActive) throw new SaleError(`product_not_found:${it.productId}`);
      const price = it.price ?? b2n(p.price);
      const cost = b2n(p.cost);
      if (b2n(p.minPrice) > 0 && price < b2n(p.minPrice)) throw new SaleError(`price_below_min:${p.id}`);
      const total = lineTotal(it.quantity, price);
      const lineCost = Math.round((it.quantity * cost) / 1000);
      subtotal += total;
      costTotal += lineCost;
      return {
        product: p,
        quantity: it.quantity,
        price,
        cost,
        total,
        lineCost,
      };
    });

    const discount = input.discountPercent > 0
      ? Math.min(subtotal, Math.round((subtotal * input.discountPercent) / 100))
      : Math.min(subtotal, input.discount);
    const total = subtotal - discount;
    if (total < 0) throw new SaleError("invalid_total");

    const isHeld = input.status === "HELD";

    // ---- invoice number ----
    const prefix = company.invoicePrefix || "INV";
    let invoiceNo: string;
    let nextNo = 0;
    if (isHeld) {
      invoiceNo = `${prefix}-H-${Date.now().toString(36).toUpperCase()}`;
    } else {
      const existing = await tx.sale.findMany({
        where: { companyId },
        select: { invoiceNo: true },
        orderBy: { createdAt: "desc" },
      });
      let maxNum = 0;
      for (const s of existing) {
        const m = s.invoiceNo.match(/^INV-(\d+)$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      }
      nextNo = Math.max(b2n(company.invoiceNextNo), maxNum + 1);
      invoiceNo = `${prefix}-${String(nextNo).padStart(6, "0")}`;
    }

    // ---- payments ----
    let paid = 0;
    let cashPaid = 0;
    let bankPaid = 0;
    let creditPaid = 0;
    let changeAmount = 0;
    let dueAmount = total;
    let paymentRows: { methodId: string | null; nameAr: string; nameEn: string; type: string; amount: number; reference: string }[] = [];

    if (isHeld) {
      paid = 0;
      dueAmount = total;
    } else {
      const pmts = input.payments.filter((p) => p.amount > 0);
      for (const pm of pmts) {
        const m = methodById.get(pm.methodId);
        if (!m) throw new SaleError(`invalid_payment_method:${pm.methodId}`);
        paid += pm.amount;
        if (m.type === "CASH") cashPaid += pm.amount;
        else if (m.type === "CREDIT") creditPaid += pm.amount;
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
      changeAmount = Math.max(0, paid - total);
      dueAmount = Math.max(0, total - paid);
    }

    // ---- stock validation + decrement (COMPLETED only) ----
    if (!isHeld && warehouseId) {
      const invs = await tx.inventory.findMany({
        where: { productId: { in: productIds }, warehouseId },
        select: { productId: true, quantity: true, id: true },
      });
      const stockByProduct = new Map(invs.map((i) => [i.productId, b2n(i.quantity)]));

      for (const line of lines) {
        const p = line.product;
        if (!p.trackInventory || p.type === "SERVICE") continue;
        const onHand = stockByProduct.get(p.id) ?? 0;
        if (!p.allowNegativeStock && onHand < line.quantity) {
          throw new SaleError(`insufficient_stock:${p.id}`);
        }
      }
    }

    const sale = await tx.sale.create({
      data: {
        companyId,
        branchId: branch.id,
        terminalId: input.terminalId ?? actor.terminalId,
        cashierId: userId,
        customerId: input.customerId || null,
        invoiceNo,
        type: "POS",
        status: isHeld ? "HELD" : "COMPLETED",
        subtotal: BigInt(subtotal),
        discount: BigInt(discount),
        discountPercent: input.discountPercent,
        tax: 0n,
        total: BigInt(total),
        costTotal: BigInt(costTotal),
        profit: BigInt(Math.max(0, total - costTotal)),
        paidAmount: BigInt(isHeld ? 0 : paid),
        changeAmount: BigInt(changeAmount),
        dueAmount: BigInt(isHeld ? total : dueAmount),
        notes: input.notes,
        holdKey: input.holdKey ?? "",
        ...(isHeld ? {} : { closedById: userId, closedAt: new Date() }),
      },
    });

    // ---- items ----
    for (const line of lines) {
      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: line.product.id,
          nameAr: line.product.nameAr,
          nameEn: line.product.nameEn,
          sku: line.product.sku,
          barcode: line.product.barcode,
          quantity: BigInt(line.quantity),
          price: BigInt(line.price),
          cost: BigInt(line.cost),
          total: BigInt(line.total),
        },
      });
    }

    // ---- inventory transactions + stock decrement ----
    if (!isHeld) {
      for (const line of lines) {
        const p = line.product;
        if (!warehouseId || !p.trackInventory || p.type === "SERVICE") continue;
        const inv = await tx.inventory.findUnique({
          where: { productId_warehouseId: { productId: p.id, warehouseId } },
        });
        const onHand = inv ? b2n(inv.quantity) : 0;
        const newQty = onHand - line.quantity;
        if (inv) {
          await tx.inventory.update({
            where: { id: inv.id },
            data: { quantity: BigInt(newQty) },
          });
        } else {
          await tx.inventory.create({
            data: {
              companyId,
              productId: p.id,
              warehouseId,
              quantity: BigInt(newQty),
            },
          });
        }
        await tx.inventoryTransaction.create({
          data: {
            companyId,
            productId: p.id,
            warehouseId,
            type: "SALE",
            quantity: BigInt(line.quantity),
            unitAmount: BigInt(line.cost),
            totalAmount: BigInt(line.lineCost),
            refType: "SALE",
            refId: sale.id,
            createdById: userId,
          },
        });

        // low stock notifications
        const minStock = Number(String(p.minStock ?? 0));
        if (minStock > 0 && newQty <= Math.round(minStock * 1000)) {
          await tx.notification.create({
            data: {
              companyId,
              type: "LOW_STOCK",
              title: "Low stock alert",
              titleAr: "تنبيه مخزون منخفض",
              body: `${p.nameAr || p.nameEn} is below reorder level`,
              bodyAr: `${p.nameAr || p.nameEn} أقل من حد إعادة الطلب`,
            },
          });
        }
      }
    }

    // ---- payments (SalePayment rows) + cash movement ----
    if (!isHeld) {
      for (const row of paymentRows) {
        await tx.salePayment.create({
          data: {
            saleId: sale.id,
            methodId: row.methodId,
            methodNameAr: row.nameAr,
            methodNameEn: row.nameEn,
            methodType: row.type as never,
            amount: BigInt(row.amount),
            amountInBase: BigInt(row.amount),
            reference: row.reference,
            confirmed: true,
          },
        });
      }

      const cashMovMethod = paymentRows.find((r) => r.type === "CASH" && r.amount > 0);
      if (cashMovMethod && cashPaid > 0) {
        await tx.cashMovement.create({
          data: {
            companyId,
            branchId: branch.id,
            userId,
            type: "SALE",
            amount: BigInt(cashPaid),
            methodNameAr: cashMovMethod.nameAr,
            methodNameEn: cashMovMethod.nameEn,
            reference: invoiceNo,
            note: `Sale ${invoiceNo}`,
          },
        });
      }
    }

    // ---- accounting (COMPLETED only) ----
    if (!isHeld && total > 0) {
      let remaining = total;
      let cashAmt = 0;
      let bankAmt = 0;
      let arAmt = 0;
      for (const row of paymentRows) {
        const amt = Math.min(row.amount, Math.max(0, remaining));
        remaining -= amt;
        if (row.type === "CASH") cashAmt += amt;
        else if (row.type === "CREDIT") arAmt += amt;
        else bankAmt += amt;
      }
      if (remaining > 0) arAmt += remaining; // unpaid -> accounts receivable

      const accounts = await tx.account.findMany({
        where: { companyId, code: { in: DEBIT_ACCOUNTS } },
        select: { id: true, code: true, type: true },
      });
      const accountByCode = new Map(accounts.map((a) => [a.code, a]));

      const debitLines: { code: string; amount: number }[] = [];
      if (cashAmt > 0) debitLines.push({ code: "1000", amount: cashAmt });
      if (bankAmt > 0) debitLines.push({ code: "1100", amount: bankAmt });
      if (arAmt > 0) debitLines.push({ code: "1200", amount: arAmt });

      const linesData = [
        ...debitLines
          .filter((l) => accountByCode.has(l.code))
          .map((l) => ({ accountId: accountByCode.get(l.code)!.id, debit: BigInt(l.amount), credit: 0n })),
        ...(accountByCode.has("4000") ? [{ accountId: accountByCode.get("4000")!.id, debit: 0n, credit: BigInt(total) }] : []),
        ...(costTotal > 0 && accountByCode.has("4100")
          ? [{ accountId: accountByCode.get("4100")!.id, debit: BigInt(costTotal), credit: 0n }]
          : []),
        ...(costTotal > 0 && accountByCode.has("1300")
          ? [{ accountId: accountByCode.get("1300")!.id, debit: 0n, credit: BigInt(costTotal) }]
          : []),
      ];

      if (linesData.length > 0) {
        await tx.journalEntry.create({
          data: {
            companyId,
            entryNo: `JE-S-${String(nextNo).padStart(6, "0")}`,
            refType: "SALE",
            refId: sale.id,
            description: `Sale ${invoiceNo}`,
            date: new Date(),
            createdById: userId,
            lines: { create: linesData },
          },
        });

        // reflect movements on account balances (double-entry convention)
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

    // ---- customer balance (credit / partial payment) ----
    if (!isHeld && input.customerId && dueAmount > 0) {
      await tx.customer.update({
        where: { id: input.customerId },
        data: { balance: { increment: BigInt(dueAmount) } },
      });
    }

    // ---- consume held sale if this completes a resumed sale ----
    if (!isHeld && input.heldSaleId) {
      await tx.sale.deleteMany({ where: { id: input.heldSaleId, companyId, status: "HELD" } });
    }

    // ---- advance invoice counter ----
    if (!isHeld) {
      await tx.company.update({ where: { id: companyId }, data: { invoiceNextNo: BigInt(nextNo + 1) } });
    }

    return {
      id: sale.id,
      invoiceNo: sale.invoiceNo,
      total,
      paidAmount: isHeld ? 0 : paid,
      dueAmount: isHeld ? total : dueAmount,
      changeAmount,
    };
  });
}