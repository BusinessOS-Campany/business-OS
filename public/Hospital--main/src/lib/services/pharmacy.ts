import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getPendingPrescriptions = cache(async () => {
  return prisma.prescription.findMany({
    where: {
      status: { in: ["ACTIVE", "ACTIVE_STATION"] },
      items: { some: { isDispensed: false } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true, phone: true } },
      doctor: { select: { id: true, nameAr: true, nameEn: true } },
      encounter: { select: { id: true, encounterNo: true, department: { select: { nameAr: true, nameEn: true } } } },
      items: true,
    },
  });
});

export const getPrescriptionById = cache(async (id: string) => {
  return prisma.prescription.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true, phone: true, gender: true, age: true, allergies: true } },
      doctor: { select: { id: true, nameAr: true, nameEn: true } },
      encounter: { select: { id: true, encounterNo: true, department: { select: { id: true, nameAr: true, nameEn: true } } } },
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          item: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true,
              unit: true,
              reorderLevel: true,
              batches: {
                where: { quantity: { gt: 0 } },
                orderBy: { expiryDate: "asc" },
                include: { warehouse: { select: { id: true, nameAr: true, nameEn: true } } },
              },
            },
          },
        },
      },
    },
  });
});

export const getInventoryItems = cache(async (opts?: { category?: string; lowStock?: boolean }) => {
  const where: Record<string, unknown> = { isActive: true };
  if (opts?.category) where.category = opts.category;

  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy: { nameEn: "asc" },
    take: 500,
    include: {
      batches: {
        orderBy: { expiryDate: "asc" },
        include: { warehouse: { select: { id: true, nameAr: true, nameEn: true } } },
      },
    },
  });

  const result = items.map((it) => {
    const totalStock = it.batches.reduce((s, b) => s + b.quantity, 0);
    const expiringSoon = it.batches.filter(
      (b) => b.expiryDate && b.expiryDate.getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000 && b.quantity > 0
    );
    return {
      ...it,
      totalStock,
      isLowStock: totalStock <= it.reorderLevel,
      expiringSoonCount: expiringSoon.length,
      nearestExpiry: it.batches.find((b) => b.expiryDate && b.expiryDate.getTime() > Date.now() && b.quantity > 0)?.expiryDate ?? null,
    };
  });

  if (opts?.lowStock) return result.filter((it) => it.isLowStock);
  return result;
});

export const getInventoryItemById = cache(async (id: string) => {
  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    include: {
      batches: {
        orderBy: { expiryDate: "asc" },
        include: { warehouse: { select: { id: true, nameAr: true, nameEn: true } } },
      },
      movements: {
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          batch: { select: { id: true, batchNo: true } },
          fromWarehouse: { select: { nameAr: true, nameEn: true } },
          toWarehouse: { select: { nameAr: true, nameEn: true } },
        },
      },
    },
  });
  if (!item) return null;
  const totalStock = item.batches.reduce((s, b) => s + b.quantity, 0);
  return { ...item, totalStock, isLowStock: totalStock <= item.reorderLevel };
});

export const getSuppliers = cache(async () => {
  return prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { nameEn: "asc" },
    include: { _count: { select: { purchaseOrders: true } } },
  });
});

export const getWarehouses = cache(async () => {
  return prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: { nameEn: "asc" },
  });
});

export const getPurchaseOrders = cache(async (opts?: { status?: string }) => {
  return prisma.purchaseOrder.findMany({
    where: opts?.status ? { status: opts.status as never } : undefined,
    orderBy: { orderedAt: "desc" },
    take: 200,
    include: {
      supplier: { select: { id: true, nameAr: true, nameEn: true } },
      warehouse: { select: { nameAr: true, nameEn: true } },
      items: {
        include: {
          item: { select: { id: true, nameAr: true, nameEn: true } },
          warehouse: { select: { nameAr: true, nameEn: true } },
        },
      },
    },
  });
});

export const getPurchaseOrderById = cache(async (id: string) => {
  return prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, nameAr: true, nameEn: true, phone: true, email: true, taxNo: true } },
      warehouse: { select: { id: true, nameAr: true, nameEn: true } },
      items: {
        include: {
          item: { select: { id: true, nameAr: true, nameEn: true, unit: true } },
          warehouse: { select: { id: true, nameAr: true, nameEn: true } },
        },
      },
    },
  });
});

export const getPharmacyStats = cache(async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [pendingCount, lowStockCount, totalItems, recentMovements, expiringCount] = await Promise.all([
    prisma.prescription.count({
      where: { status: { in: ["ACTIVE", "ACTIVE_STATION"] }, items: { some: { isDispensed: false } } },
    }),
    prisma.inventoryItem.count({ where: { isActive: true, batches: { some: { quantity: { lte: 10 } } } } }),
    prisma.inventoryItem.count({ where: { isActive: true } }),
    prisma.stockMovement.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.stockBatch.count({
      where: { quantity: { gt: 0 }, expiryDate: { gt: now, lt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return { pendingCount, lowStockCount, totalItems, recentMovements, expiringCount };
});
