export type StatusVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "muted";

export const STATUS_VARIANT: Record<string, StatusVariant> = {
  DRAFT: "muted",
  SUBMITTED: "info",
  IN_REVIEW: "warning",
  APPROVED: "success",
  PARTIALLY_APPROVED: "secondary",
  REJECTED: "destructive",
  PAID: "default",
};

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "insurance.statusDraft",
  SUBMITTED: "insurance.statusSubmitted",
  IN_REVIEW: "insurance.statusInReview",
  APPROVED: "insurance.statusApproved",
  PARTIALLY_APPROVED: "insurance.statusPartiallyApproved",
  REJECTED: "insurance.statusRejected",
  PAID: "insurance.statusPaid",
};

export function statusVariant(status: string): StatusVariant {
  return STATUS_VARIANT[status] ?? "outline";
}

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}