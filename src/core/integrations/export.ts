import type { PrismaClient } from "@/core/db/generated/prisma/client";
import { ApiError } from "@/core/http/api";
import { writeAuditLog } from "@/core/audit/service";
import { getStorage } from "./storage";

type ExportEntityType = "products" | "customers" | "suppliers" | "sales" | "purchases" | "inventory" | "expenses";

export interface ExportResult {
  jobId: string;
  entityType: ExportEntityType;
  format: string;
  rowCount: number;
  fileUrl: string;
  fileSize: number;
  sha256: string;
}

/**
 * Generate a CSV export of the specified entity type.
 * Returns the export job record with file metadata.
 */
export async function generateExport(
  prisma: PrismaClient,
  tenant: { organizationId: string; userId: string },
  entityType: ExportEntityType,
  format: "csv" | "xlsx" = "csv",
): Promise<ExportResult> {
  const rows = await fetchExportRows(prisma, tenant.organizationId, entityType);
  const csv = toCsv(entityType, rows);
  const buffer = Buffer.from(csv, "utf-8");

  // Write to storage
  const storage = getStorage();
  const path = `exports/${tenant.organizationId}/${entityType}-${Date.now()}.csv`;
  const fileUrl = await storage.write(path, buffer);

  // Compute SHA-256
  const { createHash } = await import("node:crypto");
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  const job = await prisma.dataExport.create({
    data: {
      organizationId: tenant.organizationId,
      entityType,
      format,
      status: "completed",
      rowCount: rows.length,
      fileUrl,
      fileSize: buffer.length,
      sha256,
      createdByUserId: tenant.userId,
      completedAt: new Date(),
    },
  });

  await writeAuditLog(prisma as never, tenant, {
    action: "export.completed",
    entityType: "dataExport",
    entityId: job.id,
    after: { entityType, rowCount: rows.length, format },
  } as never);

  return {
    jobId: job.id,
    entityType,
    format,
    rowCount: rows.length,
    fileUrl,
    fileSize: buffer.length,
    sha256,
  };
}

async function fetchExportRows(
  prisma: PrismaClient,
  organizationId: string,
  entityType: ExportEntityType,
): Promise<Record<string, unknown>[]> {
  const where = { organizationId };

  switch (entityType) {
    case "products": {
      const items = await prisma.product.findMany({ where, orderBy: { createdAt: "desc" } });
      return items.map((p) => ({
        sku: p.sku,
        barcode: p.barcode ?? "",
        nameAr: p.nameAr,
        nameEn: p.nameEn ?? "",
        costPrice: Number(p.costPrice),
        salePrice: Number(p.salePrice),
        taxRateBps: p.taxRateBps,
        trackStock: p.trackStock,
        isActive: p.isActive,
      }));
    }
    case "customers": {
      const items = await prisma.customer.findMany({ where, orderBy: { createdAt: "desc" } });
      return items.map((c) => ({
        name: c.name,
        phone: c.phone ?? "",
        email: c.email ?? "",
        creditLimit: Number(c.creditLimit),
        balance: Number(c.balance),
        isActive: c.isActive,
      }));
    }
    case "suppliers": {
      const items = await prisma.supplier.findMany({ where, orderBy: { createdAt: "desc" } });
      return items.map((s) => ({
        name: s.name,
        phone: s.phone ?? "",
        balance: Number(s.balance),
        isActive: s.isActive,
      }));
    }
    case "sales": {
      const items = await prisma.salesInvoice.findMany({ where, orderBy: { createdAt: "desc" } });
      return items.map((s) => ({
        number: s.number,
        issuedAt: s.issuedAt.toISOString(),
        subtotal: Number(s.subtotal),
        taxTotal: Number(s.taxTotal),
        total: Number(s.total),
        paidTotal: Number(s.paidTotal),
        status: s.status,
      }));
    }
    case "purchases": {
      const items = await prisma.purchase.findMany({ where, orderBy: { createdAt: "desc" } });
      return items.map((p) => ({
        number: p.number,
        issuedAt: p.issuedAt.toISOString(),
        subtotal: Number(p.subtotal),
        taxTotal: Number(p.taxTotal),
        total: Number(p.total),
        paidTotal: Number(p.paidTotal),
        status: p.status,
      }));
    }
    case "inventory": {
      const items = await prisma.stockLevel.findMany({
        where,
      });
      // Fetch product names
      const productIds = [...new Set(items.map((i) => i.productId))];
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, sku: true, nameAr: true },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));
      return items.map((i) => {
        const prod = productMap.get(i.productId);
        return {
          sku: prod?.sku ?? "",
          productName: prod?.nameAr ?? "",
          warehouseId: i.warehouseId,
          quantity: String(i.qty),
        };
      });
    }
    case "expenses": {
      const items = await prisma.expense.findMany({ where, orderBy: { createdAt: "desc" } });
      return items.map((e) => ({
        amount: Number(e.amount),
        note: e.note ?? "",
        spentAt: e.spentAt.toISOString(),
        categoryId: e.categoryId ?? "",
      }));
    }
    default:
      throw ApiError.badRequest(`Unsupported export entity: ${entityType}`);
  }
}

function toCsv(_entityType: string, rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    const values = headers.map((h) => {
      const v = row[h];
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    });
    lines.push(values.join(","));
  }
  return lines.join("\n");
}

/** List export jobs for an org. */
export async function listExports(
  prisma: PrismaClient,
  organizationId: string,
  limit = 50,
) {
  return prisma.dataExport.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      entityType: true,
      format: true,
      status: true,
      rowCount: true,
      fileUrl: true,
      sha256: true,
      createdAt: true,
      completedAt: true,
    },
  });
}

/** Download an export by ID. */
export async function downloadExport(
  prisma: PrismaClient,
  tenant: { organizationId: string },
  exportId: string,
): Promise<{ buffer: Buffer; fileUrl: string; sha256: string }> {
  const exp = await prisma.dataExport.findFirst({
    where: { id: exportId, organizationId: tenant.organizationId },
  });
  if (!exp) throw ApiError.notFound("Export not found");
  if (exp.status !== "completed" || !exp.fileUrl) {
    throw ApiError.badRequest("Export is not ready");
  }

  const storage = getStorage();
  const buffer = await storage.read(exp.fileUrl);
  return { buffer, fileUrl: exp.fileUrl, sha256: exp.sha256 ?? "" };
}
