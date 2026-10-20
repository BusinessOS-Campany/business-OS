import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/session";
import { lineTotal } from "@/lib/money";
import { ok, fail, forbidden, notFound, unauthorized, getIp, serverError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  if (!session.user.isSuperAdmin && !permissions.has("purchase.manage")) return { cred: null };
  return { cred: { companyId: session.user.companyId, userId: session.user.id } };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(cast(hashtext(${cred.companyId}) as bigint))`;

      const order = await tx.purchaseOrder.findFirst({
        where: { id, companyId: cred.companyId },
        include: { items: true },
      });
      if (!order) throw { code: "not_found" };
      if (order.status !== "APPROVED" && order.status !== "PARTIALLY_RECEIVED") throw { code: "invalid_state" };

      const pending = order.items
        .map((it) => ({ item: it, remaining: it.quantity - it.receivedQty }))
        .filter((x) => x.remaining > 0n);
      if (pending.length === 0) throw { code: "invalid_state" };

      const productIds = pending.map((x) => x.item.productId);
      const products = await tx.product.findMany({
        where: { companyId: cred.companyId, id: { in: productIds } },
        select: { id: true, trackInventory: true, type: true },
      });
      const productById = new Map(products.map((p) => [p.id, p]));

      let subtotal = 0;
      const lineRows = pending.map((x) => {
        const total = lineTotal(Number(x.remaining), Number(x.item.price));
        subtotal += total;
        return { productId: x.item.productId, quantity: x.remaining, price: x.item.price, total: BigInt(total), itemId: x.item.id };
      });
      if (subtotal <= 0) throw { code: "invalid_state" };

      const existing = await tx.purchase.findMany({ where: { companyId: cred.companyId }, select: { invoiceNo: true } });
      let maxNo = 0;
      for (const p of existing) {
        const m = /^PO-(\d+)$/.exec(p.invoiceNo);
        if (m) maxNo = Math.max(maxNo, parseInt(m[1], 10));
      }
      const invoiceNo = `PO-${maxNo + 1}`;

      const warehouseId = order.warehouseId ?? null;

      const purchase = await tx.purchase.create({
        data: {
          companyId: cred.companyId,
          branchId: order.branchId,
          supplierId: order.supplierId,
          warehouseId,
          purchaseOrderId: order.id,
          invoiceNo,
          invoiceDate: new Date(),
          subtotal: BigInt(subtotal),
          discount: 0n,
          tax: 0n,
          total: BigInt(subtotal),
          paidAmount: 0n,
          dueAmount: BigInt(subtotal),
          notes: order.notes,
          createdById: cred.userId,
        },
      });

      for (const line of lineRows) {
        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: line.productId,
            quantity: line.quantity,
            price: line.price,
            cost: line.price,
            total: line.total,
          },
        });

        await tx.purchaseOrderItem.update({
          where: { id: line.itemId },
          data: { receivedQty: { increment: line.quantity } },
        });

        const product = productById.get(line.productId);
        if (warehouseId && product?.trackInventory && product.type !== "SERVICE") {
          const inv = await tx.inventory.findUnique({
            where: { productId_warehouseId: { productId: line.productId, warehouseId } },
          });
          if (inv) {
            await tx.inventory.update({ where: { id: inv.id }, data: { quantity: { increment: line.quantity } } });
          } else {
            await tx.inventory.create({
              data: { companyId: cred.companyId, productId: line.productId, warehouseId, quantity: line.quantity },
            });
          }
          await tx.inventoryTransaction.create({
            data: {
              companyId: cred.companyId,
              productId: line.productId,
              warehouseId,
              type: "PURCHASE",
              quantity: line.quantity,
              unitAmount: line.price,
              totalAmount: line.total,
              refType: "PURCHASE",
              refId: purchase.id,
              createdById: cred.userId,
            },
          });
        }

        await tx.product.update({ where: { id: line.productId }, data: { cost: line.price } });
      }

      const accounts = await tx.account.findMany({
        where: { companyId: cred.companyId, code: { in: ["1300", "2000"] } },
        select: { id: true, code: true, type: true },
      });
      const acct = new Map(accounts.map((a) => [a.code, a]));
      const invAcct = acct.get("1300");
      const apAcct = acct.get("2000");
      if (invAcct && apAcct) {
        const linesData = [
          { accountId: invAcct.id, debit: BigInt(subtotal), credit: 0n },
          { accountId: apAcct.id, debit: 0n, credit: BigInt(subtotal) },
        ];
        await tx.journalEntry.create({
          data: {
            companyId: cred.companyId,
            entryNo: `JE-P-${invoiceNo}`,
            refType: "PURCHASE",
            refId: purchase.id,
            description: `Purchase order ${order.orderNo} received`,
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
          const liab = a.type === "LIABILITY" || a.type === "EQUITY" || a.type === "REVENUE";
          if (debit > 0n) dv += Number(debit) * (liab ? -1 : 1);
          if (credit > 0n) dv += Number(credit) * (liab ? 1 : -1);
          delta.set(accountId, (delta.get(accountId) ?? 0) + dv);
        };
        for (const l of linesData) applyBalance(l.accountId, l.debit, l.credit);
        for (const [accountId, balDelta] of delta) {
          if (balDelta !== 0) {
            await tx.account.update({ where: { id: accountId }, data: { balance: { increment: BigInt(balDelta) } } });
          }
        }
      }

      await tx.purchaseOrder.update({ where: { id: order.id }, data: { status: "RECEIVED" } });

      await writeAudit(tx, {
        companyId: cred.companyId,
        userId: cred.userId,
        action: "RECEIVE",
        entity: "purchaseOrder",
        entityId: order.id,
        ip: getIp(request),
        oldValue: { status: order.status },
        newValue: { status: "RECEIVED", purchaseId: purchase.id, invoiceNo, total: subtotal },
      });

      return { orderId: order.id, purchaseId: purchase.id, invoiceNo, total: subtotal, status: "RECEIVED" };
    });

    return ok({ data: result });
  } catch (e) {
    if (typeof e === "object" && e && "code" in e) {
      const code = (e as { code?: unknown }).code;
      if (code === "not_found") return notFound();
      if (code === "invalid_state") return fail("invalid_state", 400);
    }
    console.error("purchase order receive error", e);
    return serverError();
  }
}