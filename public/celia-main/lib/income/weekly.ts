import { getIncomeSummary, type IncomeSummaryStats } from "@/lib/income/summary";

function startOfWeek(): Date {
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  since.setDate(since.getDate() - 6);
  return since;
}

export async function getWeeklyIncomeStats(): Promise<IncomeSummaryStats> {
  return getIncomeSummary(startOfWeek());
}
