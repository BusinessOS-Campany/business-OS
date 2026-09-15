import "server-only";
import { prisma } from "@/lib/prisma";

const DEFAULT_PREFIXES: Record<string, string> = {
  patient: "PAT",
  invoice: "INV",
  appointment: "APT",
  encounter: "ENC",
  lab: "LAB",
  radiology: "RAD",
  prescription: "RX",
  admission: "ADM",
  surgery: "SUR",
  payment: "PAY",
  refund: "REF",
  ticket: "Q",
  claim: "CLM",
  po: "PO",
  asset: "AST",
  maintenance: "MNT",
  expense: "EXP",
  trip: "TRP",
  employee: "EMP",
};

/**
 * Atomically generate the next sequential number for a given type.
 * Format: {PREFIX}-{YEAR}-{000001}
 * The prefix can be overridden with a NumberingSeq row (hospital setting).
 */
export async function nextNumber(
  type: string,
  branchId: string = "MAIN"
): Promise<string> {
  const year = new Date().getFullYear();

  const seq = await prisma.$transaction(async (tx) => {
    const row = await tx.numberingSeq.upsert({
      where: {
        branchId_type_year: { branchId, type, year },
      },
      update: { seq: { increment: 1 } },
      create: {
        branchId,
        type,
        year,
        prefix: DEFAULT_PREFIXES[type] ?? type.toUpperCase(),
        seq: 1,
      },
    });
    return row;
  });

  const prefix = seq.prefix || (DEFAULT_PREFIXES[type] ?? type.toUpperCase());
  return `${prefix}-${year}-${String(seq.seq).padStart(6, "0")}`;
}

export async function previewNumber(
  type: string,
  branchId: string = "MAIN"
): Promise<{ number: string; prefix: string; seq: number }> {
  const year = new Date().getFullYear();
  const row = await prisma.numberingSeq.findUnique({
    where: { branchId_type_year: { branchId, type, year } },
  });
  const prefix = (row?.prefix ?? "") || (DEFAULT_PREFIXES[type] ?? type.toUpperCase());
  const seq = (row?.seq ?? 0) + 1;
  return { number: `${prefix}-${year}-${String(seq).padStart(6, "0")}`, prefix, seq };
}