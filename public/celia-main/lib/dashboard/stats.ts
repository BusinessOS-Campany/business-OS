import type { SQL } from "drizzle-orm";
import { cached } from "@/lib/cache";
import { getCopyPricePerGB } from "@/lib/pricing/copy-price-store";

export interface DayStats {
  completedCopies: number;
  uncompletedCopies: number;
  sizeGB: number;
  hobaniIncome: number;
  balanceTotal: number;
}

export interface SalesPoint {
  day: string;
  total: number;
}

export interface RevenuePeriod {
  current: number;
  previous: number;
  changePercent: number;
}

export interface RevenueCards {
  daily: RevenuePeriod;
  weekly: RevenuePeriod;
  monthly: RevenuePeriod;
}

export interface MonthlyRevenuePoint {
  month: string;
  profit: number;
  expenses: number;
  advance: number;
}

export interface RevenueChartStats {
  months: MonthlyRevenuePoint[];
}

export interface DashboardStats {
  today: DayStats;
  yesterday: DayStats;
  sales: SalesPoint[];
  revenue: RevenueCards;
  revenueChart: RevenueChartStats;
}

export const REFERENCE_REVENUE_MONTHS: MonthlyRevenuePoint[] = [
  { month: "يناير", profit: 0, expenses: 0, advance: 0 },
  { month: "فبراير", profit: 0, expenses: 0, advance: 0 },
  { month: "مارس", profit: 0, expenses: 0, advance: 0 },
  { month: "أبريل", profit: 0, expenses: 0, advance: 0 },
  { month: "مايو", profit: 0, expenses: 0, advance: 0 },
  { month: "يونيو", profit: 0, expenses: 0, advance: 0 },
  { month: "يوليو", profit: 0, expenses: 0, advance: 0 },
  { month: "أغسطس", profit: 0, expenses: 0, advance: 0 },
  { month: "سبتمبر", profit: 0, expenses: 0, advance: 0 },
  { month: "أكتوبر", profit: 0, expenses: 0, advance: 0 },
  { month: "نوفمبر", profit: 0, expenses: 0, advance: 0 },
  { month: "ديسمبر", profit: 0, expenses: 0, advance: 0 },
];

const EMPTY_DAY: DayStats = {
  completedCopies: 0,
  uncompletedCopies: 0,
  sizeGB: 0,
  hobaniIncome: 0,
  balanceTotal: 0,
};

const REVENUE_TTL_MS = 10_000;
const DASHBOARD_STATS_TTL_MS = 15_000;
const MONTHLY_ADVANCES_TTL_MS = 60_000;

function startOfLocalDay(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

async function loadTodayTransferDayStats(day: Date): Promise<DayStats> {
  try {
    const { db, schema } = await import("@/lib/db");
    const { gte, count, sql } = await import("drizzle-orm");
    const rows = await db
      .select({
        status: schema.transferJobs.status,
        files: count(),
        bytes: sql<number>`coalesce(sum(${schema.transferJobs.transferredSize}), 0)`,
      })
      .from(schema.transferJobs)
      .where(gte(schema.transferJobs.createdAt, day))
      .groupBy(schema.transferJobs.status);

    const stats: DayStats = { ...EMPTY_DAY };
    for (const row of rows) {
      if (row.status === "COMPLETED") {
        stats.completedCopies = row.files;
        stats.sizeGB = Number((Number(row.bytes ?? 0) / 1024 ** 3).toFixed(2));
      }
      if (row.status === "FAILED" || row.status === "CANCELLED") {
        stats.uncompletedCopies += row.files;
      }
    }
    return stats;
  } catch {
    return EMPTY_DAY;
  }
}

async function loadHobaniIncomeFor(day: Date): Promise<number> {
  try {
    const { db, schema } = await import("@/lib/db");
    const { gte, lt, and, sql } = await import("drizzle-orm");
    const end = new Date(day);
    end.setDate(end.getDate() + 1);
    const [row] = await db
      .select({ income: sql<number>`coalesce(sum(${schema.hobaniIncome.income}), 0)` })
      .from(schema.hobaniIncome)
      .where(and(gte(schema.hobaniIncome.createdAt, day), lt(schema.hobaniIncome.createdAt, end)));
    return Number(row?.income ?? 0);
  } catch {
    return 0;
  }
}

async function loadBalanceTotal(): Promise<number> {
  try {
    const { db, schema } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");
    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${schema.balanceCharge.amount}::numeric), 0)` })
      .from(schema.balanceCharge);
    return Number(row?.total ?? 0);
  } catch {
    return 0;
  }
}

function changePercent(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

type RevenueWindowLabel = "today" | "yesterday" | "week" | "prevWeek" | "month" | "prevMonth";

const REVENUE_WINDOW_LABELS: RevenueWindowLabel[] = [
  "today",
  "yesterday",
  "week",
  "prevWeek",
  "month",
  "prevMonth",
];

interface RevenueWindows {
  copy: Record<RevenueWindowLabel, number>;
  hobani: Record<RevenueWindowLabel, number>;
  sales: Record<RevenueWindowLabel, number>;
  wallet: Record<RevenueWindowLabel, number>;
}

function buildWindows(): { windows: Record<RevenueWindowLabel, [Date, Date]>; earliest: Date } {
  const todayStart = startOfLocalDay();
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const prevMonthStart = new Date(monthStart);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);

  const windows: Record<RevenueWindowLabel, [Date, Date]> = {
    today: [todayStart, tomorrowStart],
    yesterday: [yesterdayStart, todayStart],
    week: [weekStart, tomorrowStart],
    prevWeek: [prevWeekStart, weekStart],
    month: [monthStart, tomorrowStart],
    prevMonth: [prevMonthStart, monthStart],
  };

  return { windows, earliest: prevMonthStart };
}

/**
 * Computes all six revenue windows for a single table in one pass instead of
 * one query per window, cutting the dashboard's revenue work ~6x.
 */
function windowSumExpressions(
  value: unknown,
  createdAt: unknown,
  windows: Record<RevenueWindowLabel, [Date, Date]>,
  sql: typeof import("drizzle-orm").sql,
): Record<RevenueWindowLabel, SQL<number>> {
  const out = {} as Record<RevenueWindowLabel, SQL<number>>;
  for (const label of REVENUE_WINDOW_LABELS) {
    const [from, to] = windows[label];
    out[label] = sql<number>`coalesce(sum(case when ${createdAt} >= ${from} and ${createdAt} < ${to} then ${value} end), 0)`;
  }
  return out;
}

function toWindowRecord(row: Record<RevenueWindowLabel, number> | undefined): Record<RevenueWindowLabel, number> {
  const out: Record<RevenueWindowLabel, number> = {
    today: 0,
    yesterday: 0,
    week: 0,
    prevWeek: 0,
    month: 0,
    prevMonth: 0,
  };
  if (!row) return out;
  for (const label of REVENUE_WINDOW_LABELS) {
    out[label] = Number(row[label] ?? 0);
  }
  return out;
}

async function loadRevenueWindows(): Promise<RevenueWindows> {
  try {
    const { db, schema } = await import("@/lib/db");
    const { and, eq, gte, sql } = await import("drizzle-orm");
    const { windows, earliest } = buildWindows();

    const copySelect = windowSumExpressions(
      schema.transferJobs.transferredSize,
      schema.transferJobs.createdAt,
      windows,
      sql,
    );
    const hobaniSelect = windowSumExpressions(
      schema.hobaniIncome.income,
      schema.hobaniIncome.createdAt,
      windows,
      sql,
    );
    const salesSelect = windowSumExpressions(
      schema.productSales.total,
      schema.productSales.createdAt,
      windows,
      sql,
    );
    const walletSelect = windowSumExpressions(
      schema.balanceCharge.amount,
      schema.balanceCharge.createdAt,
      windows,
      sql,
    );

    const [copyRows, hobaniRows, salesRows, walletRows] = await Promise.all([
      db
        .select(copySelect)
        .from(schema.transferJobs)
        .where(
          and(eq(schema.transferJobs.status, "COMPLETED"), gte(schema.transferJobs.createdAt, earliest)),
        ),
      db.select(hobaniSelect).from(schema.hobaniIncome).where(gte(schema.hobaniIncome.createdAt, earliest)),
      db.select(salesSelect).from(schema.productSales).where(gte(schema.productSales.createdAt, earliest)),
      db.select(walletSelect).from(schema.balanceCharge).where(gte(schema.balanceCharge.createdAt, earliest)),
    ]);

    return {
      copy: toWindowRecord(copyRows[0]),
      hobani: toWindowRecord(hobaniRows[0]),
      sales: toWindowRecord(salesRows[0]),
      wallet: toWindowRecord(walletRows[0]),
    };
  } catch {
    return {
      copy: { today: 0, yesterday: 0, week: 0, prevWeek: 0, month: 0, prevMonth: 0 },
      hobani: { today: 0, yesterday: 0, week: 0, prevWeek: 0, month: 0, prevMonth: 0 },
      sales: { today: 0, yesterday: 0, week: 0, prevWeek: 0, month: 0, prevMonth: 0 },
      wallet: { today: 0, yesterday: 0, week: 0, prevWeek: 0, month: 0, prevMonth: 0 },
    };
  }
}

function buildRevenueCards(values: Record<RevenueWindowLabel, number>): RevenueCards {
  return {
    daily: {
      current: values.today,
      previous: values.yesterday,
      changePercent: changePercent(values.today, values.yesterday),
    },
    weekly: {
      current: values.week,
      previous: values.prevWeek,
      changePercent: changePercent(values.week, values.prevWeek),
    },
    monthly: {
      current: values.month,
      previous: values.prevMonth,
      changePercent: changePercent(values.month, values.prevMonth),
    },
  };
}

async function computeRevenueWindows(): Promise<{ revenue: RevenueCards; copyRevenue: RevenueCards }> {
  const [pricePerGB, windows] = await Promise.all([getCopyPricePerGB(), loadRevenueWindows()]);

  const copyValue: Record<RevenueWindowLabel, number> = {
    today: 0,
    yesterday: 0,
    week: 0,
    prevWeek: 0,
    month: 0,
    prevMonth: 0,
  };
  const revenueValue: Record<RevenueWindowLabel, number> = {
    today: 0,
    yesterday: 0,
    week: 0,
    prevWeek: 0,
    month: 0,
    prevMonth: 0,
  };

  for (const label of REVENUE_WINDOW_LABELS) {
    const copy = (Number(windows.copy[label] ?? 0) / 1024 ** 3) * pricePerGB;
    copyValue[label] = copy;
    revenueValue[label] =
      copy + (Number(windows.hobani[label] ?? 0) + Number(windows.sales[label] ?? 0) + Number(windows.wallet[label] ?? 0));
  }

  return {
    revenue: buildRevenueCards(revenueValue),
    copyRevenue: buildRevenueCards(copyValue),
  };
}

function getRevenueWindowsCached(): Promise<{ revenue: RevenueCards; copyRevenue: RevenueCards }> {
  return cached("stats:revenue-windows", REVENUE_TTL_MS, computeRevenueWindows);
}

export function getRevenueCards(): Promise<RevenueCards> {
  return getRevenueWindowsCached().then((result) => result.revenue);
}

export function getCopyRevenueCards(): Promise<RevenueCards> {
  return getRevenueWindowsCached().then((result) => result.copyRevenue);
}

async function loadMonthlyRevenuePoints(months: MonthlyRevenuePoint[]): Promise<MonthlyRevenuePoint[]> {
  try {
    const { db, schema } = await import("@/lib/db");
    const { eq, sql, sum } = await import("drizzle-orm");
    const year = new Date().getFullYear();
    const monthOf = (col: unknown) => sql<number>`extract(month from ${col})`;
    const yearOf = (col: unknown) => sql<number>`extract(year from ${col})`;

    const [copyRows, hobaniRows, salesRows, walletRows, expenseRows, advanceRows] = await Promise.all([
      db
        .select({ month: monthOf(schema.copyRecords.copiedAt), total: sql<number>`coalesce(sum(${schema.copyRecords.price}::numeric), 0)` })
        .from(schema.copyRecords)
        .where(eq(yearOf(schema.copyRecords.copiedAt), year))
        .groupBy(monthOf(schema.copyRecords.copiedAt)),
      db
        .select({ month: monthOf(schema.hobaniIncome.createdAt), total: sql<number>`coalesce(sum(${schema.hobaniIncome.income}::numeric), 0)` })
        .from(schema.hobaniIncome)
        .where(eq(yearOf(schema.hobaniIncome.createdAt), year))
        .groupBy(monthOf(schema.hobaniIncome.createdAt)),
      db
        .select({ month: monthOf(schema.productSales.createdAt), total: sql<number>`coalesce(sum(${schema.productSales.total}::numeric), 0)` })
        .from(schema.productSales)
        .where(eq(yearOf(schema.productSales.createdAt), year))
        .groupBy(monthOf(schema.productSales.createdAt)),
      db
        .select({ month: monthOf(schema.balanceCharge.createdAt), total: sql<number>`coalesce(sum(${schema.balanceCharge.amount}::numeric), 0)` })
        .from(schema.balanceCharge)
        .where(eq(yearOf(schema.balanceCharge.createdAt), year))
        .groupBy(monthOf(schema.balanceCharge.createdAt)),
      db
        .select({ month: monthOf(schema.expenses.expenseDate), total: sql<number>`coalesce(sum(${schema.expenses.amount}::numeric), 0)` })
        .from(schema.expenses)
        .where(eq(yearOf(schema.expenses.expenseDate), year))
        .groupBy(monthOf(schema.expenses.expenseDate)),
      db
        .select({ month: monthOf(schema.advances.advanceDate), total: sql<number>`coalesce(sum(${schema.advances.amount}::numeric), 0)` })
        .from(schema.advances)
        .where(eq(yearOf(schema.advances.advanceDate), year))
        .groupBy(monthOf(schema.advances.advanceDate)),
    ]);

    const monthTotal = (rows: { month: number; total: number }[]): Record<number, number> => {
      const out: Record<number, number> = {};
      for (const row of rows) out[Number(row.month)] = Number(row.total ?? 0);
      return out;
    };

    const copy = monthTotal(copyRows);
    const hobani = monthTotal(hobaniRows);
    const sales = monthTotal(salesRows);
    const wallet = monthTotal(walletRows);
    const expenses = monthTotal(expenseRows);
    const advance = monthTotal(advanceRows);

    return months.map((m, index) => {
      const month = index + 1;
      return {
        ...m,
        profit: (copy[month] ?? 0) + (hobani[month] ?? 0) + (sales[month] ?? 0) + (wallet[month] ?? 0),
        expenses: expenses[month] ?? 0,
        advance: advance[month] ?? 0,
      };
    });
  } catch {
    return months;
  }
}

function getMonthlyRevenuePoints(year: number): Promise<MonthlyRevenuePoint[]> {
  return cached(`stats:revenue-chart:${year}`, MONTHLY_ADVANCES_TTL_MS, () =>
    loadMonthlyRevenuePoints(REFERENCE_REVENUE_MONTHS),
  );
}

async function computeDashboardStats(): Promise<DashboardStats> {
  const todayStart = startOfLocalDay();
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const [today, yesterday, revenue, revenueChartMonths, balanceTotal] = await Promise.all([
    loadTodayTransferDayStats(todayStart).then(async (stats) => {
      stats.hobaniIncome = await loadHobaniIncomeFor(todayStart);
      return stats;
    }),
    loadTodayTransferDayStats(yesterdayStart).then(async (stats) => {
      stats.hobaniIncome = await loadHobaniIncomeFor(yesterdayStart);
      return stats;
    }),
    getRevenueCards(),
    getMonthlyRevenuePoints(new Date().getFullYear()),
    loadBalanceTotal(),
  ]);

  today.balanceTotal = balanceTotal;

  return {
    today,
    yesterday,
    sales: [],
    revenue,
    revenueChart: {
      months: revenueChartMonths,
    },
  };
}

export function getDashboardStats(): Promise<DashboardStats> {
  return cached("stats:dashboard", DASHBOARD_STATS_TTL_MS, computeDashboardStats);
}
