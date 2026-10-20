import type { ClaimStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function getInsuranceCompanies() {
  return prisma.insuranceCompany.findMany({
    orderBy: { code: "asc" },
    include: { _count: { select: { schemes: true, patients: true, claims: true } } },
    take: 100,
  });
}

export function getInsuranceCompanyById(id: string) {
  return prisma.insuranceCompany.findUnique({
    where: { id },
    include: { schemes: { orderBy: { nameEn: "asc" } }, _count: { select: { patients: true, claims: true } } },
  });
}

export async function getInsuranceSchemes() {
  return prisma.insuranceScheme.findMany({
    orderBy: [{ company: { code: "asc" } }, { nameEn: "asc" }],
    include: { company: { select: { id: true, code: true, nameAr: true, nameEn: true } } },
    take: 200,
  });
}

export function getClaims(opts: { status?: ClaimStatus; q?: string; limit?: number } = {}) {
  return prisma.insuranceClaim.findMany({
    where: {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.q
        ? {
            OR: [
              { claimNo: { contains: opts.q, mode: "insensitive" as const } },
              { policyNo: { contains: opts.q, mode: "insensitive" as const } },
              { patient: { OR: [{ nameAr: { contains: opts.q } }, { nameEn: { contains: opts.q } }, { mrn: { contains: opts.q } }] } },
            ],
          }
        : {}),
    },
    include: {
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true, insurancePolicyNo: true, insuranceCompanyId: true } },
      company: { select: { id: true, code: true, nameAr: true, nameEn: true } },
      invoice: { select: { id: true, invoiceNo: true, total: true, dueAmount: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 100,
  });
}

export function getClaimById(id: string) {
  return prisma.insuranceClaim.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true, phone: true, insurancePolicyNo: true } },
      company: { select: { id: true, code: true, nameAr: true, nameEn: true, phone: true } },
      invoice: {
        select: {
          id: true, invoiceNo: true, total: true, paidAmount: true, dueAmount: true, status: true, issuedAt: true,
          items: { select: { description: true, quantity: true, unitPrice: true, total: true } },
        },
      },
    },
  });
}

export async function getClaimStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [companies, schemes, totalClaims, pending, approved, paid, paidAmountToday] = await Promise.all([
    prisma.insuranceCompany.count(),
    prisma.insuranceScheme.count({ where: { isActive: true } }),
    prisma.insuranceClaim.count(),
    prisma.insuranceClaim.count({ where: { status: { in: ["DRAFT", "SUBMITTED", "IN_REVIEW"] } } }),
    prisma.insuranceClaim.count({ where: { status: { in: ["APPROVED", "PARTIALLY_APPROVED"] } } }),
    prisma.insuranceClaim.count({ where: { status: "PAID" } }),
    prisma.insuranceClaim.aggregate({
      where: { status: "PAID", decisionAt: { gte: startOfToday } },
      _sum: { approvedAmount: true },
    }),
  ]);

  return {
    companies,
    schemes,
    totalClaims,
    pending,
    approved,
    paid,
    paidAmountToday: paidAmountToday._sum.approvedAmount ?? 0,
  };
}

export async function getClaimableInvoices() {
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ["ISSUED", "PARTIALLY_PAID"] },
      dueAmount: { gt: 0 },
      insuranceClaim: { is: null },
      patient: { insuranceCompanyId: { not: null } },
    },
    orderBy: { issuedAt: "desc" },
    take: 100,
    include: {
      patient: {
        select: {
          id: true, mrn: true, nameAr: true, nameEn: true,
          insuranceCompanyId: true, insurancePolicyNo: true,
          insuranceCompany: { select: { nameAr: true, nameEn: true } },
          insuranceScheme: { select: { id: true, nameAr: true, nameEn: true, coverageRate: true } },
        },
      },
    },
  });
  return invoices.map((inv) => ({
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    patientId: inv.patientId,
    patientNameAr: inv.patient.nameAr,
    patientNameEn: inv.patient.nameEn,
    mrn: inv.patient.mrn,
    companyId: inv.patient.insuranceCompanyId!,
    companyNameAr: inv.patient.insuranceCompany!.nameAr,
    companyNameEn: inv.patient.insuranceCompany!.nameEn,
    policyNo: inv.patient.insurancePolicyNo,
    schemeNameAr: inv.patient.insuranceScheme?.nameAr ?? null,
    schemeNameEn: inv.patient.insuranceScheme?.nameEn ?? null,
    coverageRate: inv.patient.insuranceScheme?.coverageRate ?? null,
    dueAmount: Number(inv.dueAmount),
    total: Number(inv.total),
  }));
}