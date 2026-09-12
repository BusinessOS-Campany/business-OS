import { getIncomeSummary } from "./summary";
import type { IncomeSummaryProduct, IncomeSummaryStats } from "./summary";

export type DailyIncomeStats = IncomeSummaryStats;
export type DailyIncomeProduct = IncomeSummaryProduct;

function startOfLocalDay(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function getDailyIncomeStats(): Promise<DailyIncomeStats> {
  return getIncomeSummary(startOfLocalDay());
}
