export type ComparisonStatus = "up" | "down" | "same";

export interface Comparison {
  diff: number;
  percent: number;
  status: ComparisonStatus;
}

export function compare(today: number, yesterday: number): Comparison {
  const diff = today - yesterday;
  const percent = yesterday !== 0 ? (diff / yesterday) * 100 : 0;
  const status: ComparisonStatus = diff > 0 ? "up" : diff < 0 ? "down" : "same";
  return { diff, percent, status };
}
