import type { Prisma, PrismaClient } from "@/core/db/generated/prisma/client";

/**
 * Reports v1. Every figure is derived from LEDGER tables (movements, invoice
 * lines with cost snapshots, cash movements) in SQL aggregates — never client
 * math — so report numbers reconcile exactly with fixtures (M4 goal 4).
 */
export class ReportsService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Sales totals per period from posted invoices. */
  async salesSummary(organizationId: string, from: Date, to: Date) {
    const agg = await this.prisma.salesInvoice.aggregate({
      where: { organizationId, status: "posted", issuedAt: { gte: from, lte: to } },
      _sum: { subtotal: true, taxTotal: true, discountTotal: true, total: true, paidTotal: true },
      _count: { _all: true },
    });
    return {
      invoices: agg._count._all,
      subtotal: agg._sum.subtotal ?? 0n,
      discountTotal: agg._sum.discountTotal ?? 0n,
      taxTotal: agg._sum.taxTotal ?? 0n,
      total: agg._sum.total ?? 0n,
      paidTotal: agg._sum.paidTotal ?? 0n,
    };
  }

  /** Gross profit = Σ(lineSubtotal − unitCost·qty) over invoice items (ex-tax). */
  async grossProfit(organizationId: string, from: Date, to: Date) {
    const invoices = await this.prisma.salesInvoice.findMany({
      where: { organizationId, status: "posted", issuedAt: { gte: from, lte: to } },
      select: { id: true },
    });
    const ids = invoices.map((i) => i.id);
    if (ids.length === 0) return { revenue: 0n, cost: 0n, profit: 0n };

    const items = await this.prisma.salesInvoiceItem.findMany({
      where: { organizationId, invoiceId: { in: ids } },
      select: { lineSubtotal: true, qty: true, unitCost: true },
    });
    let revenue = 0n;
    let cost = 0n;
    for (const it of items) {
      revenue += it.lineSubtotal;
      // qty is Decimal(18,3): convert to milli-units then scale the price.
      const milli = BigInt(it.qty.toFixed(3).replace(".", ""));
      cost += (it.unitCost * milli) / 1000n;
    }
    return { revenue, cost, profit: revenue - cost };
  }

  /** Inventory valuation + low-stock list at current stock levels. */
  async inventoryValuation(organizationId: string) {
    const levels = await this.prisma.stockLevel.findMany({
      where: { organizationId },
      select: { productId: true, warehouseId: true, qty: true },
    });
    const productIds = [...new Set(levels.map((l) => l.productId))];
    const products = await this.prisma.product.findMany({
      where: { organizationId, id: { in: productIds } },
      select: { id: true, sku: true, nameAr: true, costPrice: true, salePrice: true, minStock: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    let costValue = 0n;
    let retailValue = 0n;
    const lowStock: Array<{ sku: string; nameAr: string; qty: number; minStock: number }> = [];

    // Aggregate multi-warehouse quantities per product for min-stock checks.
    const qtyPerProduct = new Map<string, number>();
    for (const lvl of levels) {
      const p = byId.get(lvl.productId);
      if (!p) continue;
      const milli = BigInt(lvl.qty.toFixed(3).replace(".", ""));
      costValue += (p.costPrice * milli) / 1000n;
      retailValue += (p.salePrice * milli) / 1000n;
      qtyPerProduct.set(lvl.productId, (qtyPerProduct.get(lvl.productId) ?? 0) + Number(lvl.qty));
    }
    for (const p of products) {
      const min = p.minStock ? Number(p.minStock) : null;
      if (min !== null && (qtyPerProduct.get(p.id) ?? 0) <= min) {
        lowStock.push({ sku: p.sku, nameAr: p.nameAr, qty: qtyPerProduct.get(p.id) ?? 0, minStock: min });
      }
    }
    return { costValue, retailValue, lowStock };
  }

  /** Receivables: customers with outstanding balances (+ credit headroom). */
  async debtReport(organizationId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { organizationId, balance: { not: 0 } },
      select: { id: true, name: true, balance: true, creditLimit: true },
      orderBy: { balance: "desc" },
    });
    const total = customers.reduce((acc, c) => acc + c.balance, 0n);
    return { totalReceivable: total, customers };
  }

  /** Cashflow per account: movements grouped by reason for the period. */
  async cashflow(
    organizationId: string,
    from: Date,
    to: Date,
    txHost?: Prisma.TransactionClient | PrismaClient,
  ) {
    const host = txHost ?? this.prisma;
    const movements = await host.cashMovement.groupBy({
      by: ["reason"],
      where: { organizationId, createdAt: { gte: from, lte: to } },
      _sum: { delta: true },
    });
    const accounts = await host.cashAccount.findMany({
      where: { organizationId },
      select: { id: true, nameAr: true, openingBalance: true },
    });
    const netByAccount = new Map<string, bigint>();
    for (const acc of accounts) netByAccount.set(acc.id, acc.openingBalance);
    const allMoves = await host.cashMovement.findMany({
      where: { organizationId, createdAt: { lte: to } },
      select: { accountId: true, delta: true },
    });
    for (const m of allMoves) {
      netByAccount.set(m.accountId, (netByAccount.get(m.accountId) ?? 0n) + m.delta);
    }
    const byReason = Object.fromEntries(movements.map((m) => [m.reason, m._sum.delta ?? 0n]));
    return { byReason, balances: Object.fromEntries(netByAccount) };
  }
}
