"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";

const MOVEMENT_TYPES = ["PURCHASE", "RECEIPT", "TRANSFER_IN", "TRANSFER_OUT", "CONSUMPTION", "DISPENSE", "ISSUE", "RETURN", "ADJUSTMENT", "EXPIRY", "WASTAGE", "INITIAL"] as const;

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function num(formData: FormData, key: string): number | undefined {
  const v = formData.get(key);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function jsonArray(formData: FormData, key: string): Record<string, unknown>[] {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function dispensePrescriptionItemAction(
  prescriptionItemId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("pharmacy");

  const parsed = z
    .object({
      dispensedQty: z.coerce.number().int().min(1),
      batchId: z.string().min(1),
    })
    .safeParse({
      dispensedQty: num(formData, "dispensedQty") ?? 1,
      batchId: str(formData, "batchId"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const pi = await prisma.prescriptionItem.findUnique({
      where: { id: prescriptionItemId },
      include: { prescription: { select: { id: true, prescriptionNo: true } } },
    });
    if (!pi) return failure("common.notFound");

    const remaining = pi.quantity - pi.dispensedQty;
    if (remaining <= 0) return failure("pharmacy.alreadyDispensed");
    const qty = Math.min(parsed.data.dispensedQty, remaining);

    const batch = await prisma.stockBatch.findUnique({ where: { id: parsed.data.batchId } });
    if (!batch) return failure("common.notFound");
    if (batch.quantity < qty) return failure("pharmacy.insufficientStock");

    await prisma.$transaction(async (tx) => {
      await tx.stockBatch.update({
        where: { id: batch.id },
        data: { quantity: { decrement: qty } },
      });

      await tx.stockMovement.create({
        data: {
          itemId: pi.itemId ?? batch.itemId,
          batchId: batch.id,
          type: "DISPENSE",
          quantity: -qty,
          toWarehouseId: batch.warehouseId,
          reference: `${pi.prescription.prescriptionNo} · ${prescriptionItemId.slice(0, 8)}`,
          note: `Dispensed from prescription ${pi.prescription.prescriptionNo}`,
          createdById: user.employeeId ?? undefined,
        },
      });

      const newDispensedQty = pi.dispensedQty + qty;
      await tx.prescriptionItem.update({
        where: { id: prescriptionItemId },
        data: {
          dispensedQty: newDispensedQty,
          isDispensed: newDispensedQty >= pi.quantity,
        },
      });
    });

    await audit({
      userId: user.id,
      action: "dispense",
      module: "pharmacy",
      recordId: prescriptionItemId,
      description: `${pi.prescription.prescriptionNo} · ${pi.medicineNameEn} × ${qty}`,
    });

    return success("common.saved");
  } catch (err) {
    console.error("dispensePrescriptionItemAction failed", err);
    return failure("common.error");
  }
}

export async function adjustStockAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("inventory");

  const parsed = z
    .object({
      itemId: z.string().min(1),
      batchId: z.string().optional(),
      batchNo: z.string().optional(),
      warehouseId: z.string().optional(),
      quantity: z.coerce.number().int(),
      expiryDate: z.string().optional(),
      note: z.string().optional(),
    })
    .safeParse({
      itemId: str(formData, "itemId"),
      batchId: str(formData, "batchId"),
      batchNo: str(formData, "batchNo"),
      warehouseId: str(formData, "warehouseId"),
      quantity: num(formData, "quantity"),
      expiryDate: str(formData, "expiryDate"),
      note: str(formData, "note"),
    });

  if (!parsed.success) return failure("common.error");
  if (parsed.data.quantity === 0) return failure("pharmacy.zeroQuantity");

  try {
    const item = await prisma.inventoryItem.findUnique({ where: { id: parsed.data.itemId }, select: { id: true, nameEn: true } });
    if (!item) return failure("common.notFound");

    let batchId = parsed.data.batchId;

    await prisma.$transaction(async (tx) => {
      if (!batchId) {
        const batchNo = parsed.data.batchNo ?? `ADJ-${Date.now().toString(36).toUpperCase()}`;
        const batch = await tx.stockBatch.create({
          data: {
            itemId: parsed.data.itemId,
            warehouseId: parsed.data.warehouseId,
            batchNo,
            quantity: Math.max(0, parsed.data.quantity),
            expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : undefined,
          },
        });
        batchId = batch.id;
      } else {
        const batch = await tx.stockBatch.findUnique({ where: { id: batchId } });
        if (!batch) throw new Error("Batch not found");
        const newQty = batch.quantity + parsed.data.quantity;
        if (newQty < 0) throw new Error("Insufficient stock");
        await tx.stockBatch.update({ where: { id: batchId }, data: { quantity: newQty } });
      }

      await tx.stockMovement.create({
        data: {
          itemId: parsed.data.itemId,
          batchId,
          type: "ADJUSTMENT",
          quantity: parsed.data.quantity,
          toWarehouseId: parsed.data.warehouseId,
          note: parsed.data.note,
          createdById: user.employeeId ?? undefined,
        },
      });
    });

    await audit({
      userId: user.id,
      action: "adjust",
      module: "inventory",
      recordId: parsed.data.itemId,
      description: `${item.nameEn} · ${parsed.data.quantity > 0 ? "+" : ""}${parsed.data.quantity}`,
    });

    return success("common.saved");
  } catch (err) {
    console.error("adjustStockAction failed", err);
    return failure(err instanceof Error && err.message === "Insufficient stock" ? "pharmacy.insufficientStock" : "common.error");
  }
}

export async function createInventoryItemAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("inventory", "create");

  const parsed = z
    .object({
      nameAr: z.string().min(1),
      nameEn: z.string().min(1),
      category: z.enum(["MEDICINE", "MEDICAL_SUPPLY", "LABORATORY_SUPPLY", "SURGICAL_SUPPLY", "OFFICE_SUPPLY", "CLEANING_SUPPLY", "EQUIPMENT", "OTHER"]).default("MEDICINE"),
      genericName: z.string().optional(),
      manufacturer: z.string().optional(),
      unit: z.string().default("unit"),
      strength: z.string().optional(),
      reorderLevel: z.coerce.number().int().min(0).default(10),
      price: z.coerce.number().min(0).optional(),
    })
    .safeParse({
      nameAr: str(formData, "nameAr"),
      nameEn: str(formData, "nameEn"),
      category: str(formData, "category"),
      genericName: str(formData, "genericName"),
      manufacturer: str(formData, "manufacturer"),
      unit: str(formData, "unit"),
      strength: str(formData, "strength"),
      reorderLevel: num(formData, "reorderLevel"),
      price: num(formData, "price"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const existing = await prisma.inventoryItem.findFirst({
      where: { nameEn: parsed.data.nameEn, isActive: true },
    });
    if (existing) return failure("pharmacy.duplicateItem");

    const code = `INV-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const item = await prisma.inventoryItem.create({
      data: {
        code,
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        category: parsed.data.category,
        genericName: parsed.data.genericName,
        manufacturer: parsed.data.manufacturer,
        unit: parsed.data.unit,
        strength: parsed.data.strength,
        reorderLevel: parsed.data.reorderLevel,
        price: parsed.data.price,
      },
    });

    await audit({
      userId: user.id,
      action: "create",
      module: "inventory",
      recordId: item.id,
      description: `${item.code} · ${parsed.data.nameEn}`,
    });

    return success("common.saved", { id: item.id });
  } catch (err) {
    console.error("createInventoryItemAction failed", err);
    return failure("common.error");
  }
}

export async function createPurchaseOrderAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("procurement", "create");

  const parsed = z
    .object({
      supplierId: z.string().min(1),
      warehouseId: z.string().optional(),
      expectedAt: z.string().optional(),
      note: z.string().optional(),
    })
    .safeParse({
      supplierId: str(formData, "supplierId"),
      warehouseId: str(formData, "warehouseId"),
      expectedAt: str(formData, "expectedAt"),
      note: str(formData, "note"),
    });

  if (!parsed.success) return failure("common.error");

  const rawItems = jsonArray(formData, "items")
    .filter((it) => typeof it.itemId === "string" && it.itemId !== "")
    .map((it) => ({
      itemId: String(it.itemId),
      warehouseId: parsed.data.warehouseId,
      quantity: Math.max(1, Math.min(99999, Number(it.quantity) || 1)),
      unitPrice: Math.max(0, Number(it.unitPrice) || 0),
      expiryDate: typeof it.expiryDate === "string" && it.expiryDate ? it.expiryDate : undefined,
      batchNo: typeof it.batchNo === "string" && it.batchNo ? it.batchNo : undefined,
    }));

  if (rawItems.length === 0) return failure("common.error");

  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: parsed.data.supplierId }, select: { id: true } });
    if (!supplier) return failure("common.notFound");

    const total = rawItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
    const poNo = `PO-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNo,
        supplierId: parsed.data.supplierId,
        warehouseId: parsed.data.warehouseId,
        status: "DRAFT",
        total,
        expectedAt: parsed.data.expectedAt ? new Date(parsed.data.expectedAt) : undefined,
        note: parsed.data.note,
        createdById: user.employeeId ?? undefined,
        items: {
          create: rawItems.map((it) => ({
            itemId: it.itemId,
            warehouseId: it.warehouseId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            total: it.quantity * it.unitPrice,
            expiryDate: it.expiryDate ? new Date(it.expiryDate) : undefined,
            batchNo: it.batchNo,
          })),
        },
      },
    });

    await audit({
      userId: user.id,
      action: "create",
      module: "procurement",
      recordId: po.id,
      description: `${po.poNo} · ${total} YER`,
    });

    return success("common.saved", { id: po.id });
  } catch (err) {
    console.error("createPurchaseOrderAction failed", err);
    return failure("common.error");
  }
}

export async function updatePurchaseOrderStatusAction(
  poId: string,
  newStatus: string,
  _prev: ActionResult | null
): Promise<ActionResult> {
  const user = await requirePermission("procurement");

  const allowed: Record<string, string[]> = {
    SUBMITTED: ["DRAFT"],
    APPROVED: ["SUBMITTED"],
    CANCELLED: ["DRAFT", "SUBMITTED"],
    RECEIVED: ["APPROVED", "PARTIALLY_RECEIVED"],
  };

  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, include: { items: true } });
    if (!po) return failure("common.notFound");
    if (!allowed[newStatus]?.includes(po.status)) return failure("pharmacy.invalidTransition");

    const data: Record<string, unknown> = { status: newStatus };
    if (newStatus === "RECEIVED") data.receivedAt = new Date();

    await prisma.purchaseOrder.update({ where: { id: poId }, data });

    if (newStatus === "RECEIVED") {
      for (const item of po.items) {
        let batch = null as { id: string } | null;
        if (item.batchNo) {
          batch = await prisma.stockBatch.findFirst({ where: { batchNo: item.batchNo, itemId: item.itemId } });
        }
        if (!batch) {
          batch = await prisma.stockBatch.create({
            data: {
              itemId: item.itemId,
              warehouseId: item.warehouseId ?? po.warehouseId,
              batchNo: item.batchNo ?? `PO-${po.poNo}-${item.itemId.slice(0, 6)}`,
              quantity: item.quantity,
              costPrice: item.unitPrice,
              purchasePrice: item.unitPrice,
              expiryDate: item.expiryDate,
            },
          });
        } else {
          await prisma.stockBatch.update({
            where: { id: batch.id },
            data: { quantity: { increment: item.quantity } },
          });
        }

        await prisma.stockMovement.create({
          data: {
            itemId: item.itemId,
            batchId: batch.id,
            type: "PURCHASE",
            quantity: item.quantity,
            toWarehouseId: item.warehouseId ?? po.warehouseId,
            reference: po.poNo,
            note: `Received from PO ${po.poNo}`,
            createdById: user.employeeId ?? undefined,
          },
        });
      }
    }

    await audit({
      userId: user.id,
      action: newStatus === "RECEIVED" ? "receive" : "update",
      module: "procurement",
      recordId: poId,
      description: `${po.poNo} → ${newStatus}`,
    });

    return success("common.updated");
  } catch (err) {
    console.error("updatePurchaseOrderStatusAction failed", err);
    return failure("common.error");
  }
}

export async function createSupplierAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("procurement", "create");

  const parsed = z
    .object({
      nameAr: z.string().min(1),
      nameEn: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      address: z.string().optional(),
      taxNo: z.string().optional(),
    })
    .safeParse({
      nameAr: str(formData, "nameAr"),
      nameEn: str(formData, "nameEn"),
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      address: str(formData, "address"),
      taxNo: str(formData, "taxNo"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const code = `SUP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const supplier = await prisma.supplier.create({
      data: { code, ...parsed.data },
    });

    await audit({
      userId: user.id,
      action: "create",
      module: "procurement",
      recordId: supplier.id,
      description: `${supplier.code} · ${parsed.data.nameEn}`,
    });

    return success("common.saved", { id: supplier.id });
  } catch (err) {
    console.error("createSupplierAction failed", err);
    return failure("common.error");
  }
}