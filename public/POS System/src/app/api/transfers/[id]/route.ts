import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { ok, fail, forbidden, notFound, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["approve", "receive", "cancel"]),
});

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  const companyId = session.user.isSuperAdmin || permissions.has("transfer.manage") ? session.user.companyId : "";
  return { cred: { companyId, userId: session.user.id } };
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { cred } = await guard();
    if (!cred) return unauthorized();
    if (!cred.companyId) return forbidden();

    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) return fail(zodErrors(parsed.error), 400);
    const action = parsed.data.action;

    const transfer = await prisma.stockTransfer.findFirst({
      where: { id, companyId: cred.companyId },
      include: { items: { select: { productId: true, quantity: true } } },
    });
    if (!transfer) return notFound();
    if (transfer.status !== "REQUESTED" && transfer.status !== "APPROVED") {
      return fail("invalid_state", 400);
    }

    if (action === "cancel") {
      await prisma.stockTransfer.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return ok({ status: "CANCELLED" });
    }

    if (action === "approve") {
      await prisma.stockTransfer.update({
        where: { id },
        data: { status: "APPROVED", approvedById: cred.userId, approvedAt: new Date() },
      });
      return ok({ status: "APPROVED" });
    }

    // ---- receive: atomically move stock ----
    const result = await prisma.$transaction(async (tx) => {
      const productIds = transfer.items.map((i) => i.productId);
      const [products, fromInvs, toInvs] = await Promise.all([
        tx.product.findMany({
          where: { companyId: cred.companyId, id: { in: productIds } },
          select: { id: true, cost: true, allowNegativeStock: true },
        }),
        tx.inventory.findMany({
          where: { productId: { in: productIds }, warehouseId: transfer.fromWarehouseId },
        }),
        tx.inventory.findMany({
          where: { productId: { in: productIds }, warehouseId: transfer.toWarehouseId },
        }),
      ]);
      const productById = new Map(products.map((p) => [p.id, p]));
      const fromById = new Map(fromInvs.map((i) => [i.productId, i]));
      const toById = new Map(toInvs.map((i) => [i.productId, i]));

      for (const item of transfer.items) {
        const p = productById.get(item.productId);
        const fromInv = fromById.get(item.productId);
        const onHand = fromInv ? fromInv.quantity : 0n;
        if (!p) throw new Error("product_not_found");
        if (!p.allowNegativeStock && onHand < item.quantity) throw new Error("insufficient_stock");

        // decrement source
        if (fromInv) {
          await tx.inventory.update({
            where: { id: fromInv.id },
            data: { quantity: onHand - item.quantity },
          });
        } else {
          await tx.inventory.create({
            data: {
              companyId: cred.companyId,
              productId: item.productId,
              warehouseId: transfer.fromWarehouseId,
              quantity: -item.quantity,
            },
          });
        }
        // increment destination
        if (toById.get(item.productId)) {
          await tx.inventory.update({
            where: { id: toById.get(item.productId)!.id },
            data: { quantity: { increment: item.quantity } },
          });
        } else {
          await tx.inventory.create({
            data: {
              companyId: cred.companyId,
              productId: item.productId,
              warehouseId: transfer.toWarehouseId,
              quantity: item.quantity,
            },
          });
        }

        const totalAmount = (item.quantity * p.cost) / 1000n;
        await tx.inventoryTransaction.create({
          data: {
            companyId: cred.companyId,
            productId: item.productId,
            warehouseId: transfer.fromWarehouseId,
            type: "TRANSFER_OUT",
            quantity: item.quantity,
            unitAmount: p.cost,
            totalAmount,
            refType: "TRANSFER",
            refId: transfer.id,
            createdById: cred.userId,
          },
        });
        await tx.inventoryTransaction.create({
          data: {
            companyId: cred.companyId,
            productId: item.productId,
            warehouseId: transfer.toWarehouseId,
            type: "TRANSFER_IN",
            quantity: item.quantity,
            unitAmount: p.cost,
            totalAmount,
            refType: "TRANSFER",
            refId: transfer.id,
            createdById: cred.userId,
          },
        });
      }

      await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: { status: "RECEIVED", receivedById: cred.userId, receivedAt: new Date() },
      });

      return { status: "RECEIVED" };
    });

    return ok(result);
  } catch (e) {
    if (e instanceof z.ZodError) return fail(zodErrors(e), 400);
    if (e instanceof Error && e.message === "insufficient_stock") return fail("insufficient_stock", 400);
    console.error("transfer action error", e);
    return serverError();
  }
}